const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: { message: 'No authorization header provided' } 
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: { message: 'No token provided in authorization header' } 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
    req.user = decoded;
    
    // Continue
    next();
    
  } catch (error) {
    logger.warn(`Token validation failed: ${error.message}`);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: { message: 'Invalid token format' } 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: { message: 'Token expired - please login again' } 
      });
    }
    
    return res.status(403).json({ 
      error: { message: 'Token validation failed' } 
    });
  }
};

module.exports = { authenticateToken };
