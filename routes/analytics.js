const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

// Dashboard Summary
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE is_overdue = true) as overdue_tasks
       FROM tasks 
       WHERE user_id = $1`,
      [userId]
    );

    const total = parseInt(stats.rows[0].total_tasks);
    const completed = parseInt(stats.rows[0].completed_tasks);
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    res.json({
      summary: {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: parseInt(stats.rows[0].pending_tasks),
        in_progress_tasks: parseInt(stats.rows[0].in_progress_tasks),
        overdue_tasks: parseInt(stats.rows[0].overdue_tasks),
        completion_rate: parseFloat(completionRate)
      }
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// Productivity Trends
router.get('/trends', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as tasks_created,
         COUNT(*) FILTER (WHERE status = 'Completed') as tasks_completed
       FROM tasks
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.userId]
    );

    res.json({ trends: result.rows });
  } catch (error) {
    logger.error('Trends error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;