const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// Create Task
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, status, deadline, tags } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, status, deadline, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.userId,
        title,
        description || null,
        priority || 'Medium',
        status || 'Pending',
        deadline || null,
        tags || []
      ]
    );

    logger.info(`Task created: ${result.rows[0].id} by user ${req.user.userId}`);

    res.status(201).json({
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    logger.error('Task creation error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get All Tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params = [req.user.userId];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${++paramCount}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND priority = $${++paramCount}`;
      params.push(priority);
    }

    if (search) {
      query += ` AND (title ILIKE $${++paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    res.json({ tasks: result.rows });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get Single Task
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    logger.error('Get task error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Update Task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, priority, status, deadline } = req.body;

    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           status = COALESCE($4, status),
           deadline = COALESCE($5, deadline),
           completed_at = CASE WHEN $4 = 'Completed' THEN NOW() ELSE completed_at END
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, description, priority, status, deadline, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }

    logger.info(`Task updated: ${req.params.id} by user ${req.user.userId}`);

    res.json({ message: 'Task updated successfully', task: result.rows[0] });
  } catch (error) {
    logger.error('Update task error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Delete Task
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Task not found' } });
    }

    logger.info(`Task deleted: ${req.params.id} by user ${req.user.userId}`);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;