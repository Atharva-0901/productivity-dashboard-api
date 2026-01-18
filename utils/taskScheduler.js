const pool = require('../config/database');
const logger = require('./logger');

const checkOverdueTasks = async () => {
  try {
    const result = await pool.query(
      `UPDATE tasks 
       SET is_overdue = true 
       WHERE deadline < NOW() 
         AND status != 'Completed' 
         AND is_overdue = false
       RETURNING id`
    );

    if (result.rows.length > 0) {
      logger.info(`Marked ${result.rows.length} tasks as overdue`);
    }
  } catch (error) {
    logger.error('Error checking overdue tasks:', error);
  }
};

module.exports = { checkOverdueTasks };