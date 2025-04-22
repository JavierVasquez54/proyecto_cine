/ src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Middleware to verify user is authenticated
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authorization = req.headers.authorization;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }
    
    // Verify token
    const token = authorization.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists and is active
      const [rows] = await pool.execute(
        'SELECT id, username, role, active FROM users WHERE id = ?',
        [decoded.id]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = rows[0];
      
      if (!user.active) {
        return res.status(401).json({
          success: false,
          message: 'User account is disabled'
        });
      }
      
      // Add user info to request
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = authenticate;