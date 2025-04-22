// src/controllers/userController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    // Get all users (except the current user)
    const [users] = await pool.execute(
      'SELECT id, username, email, role, active, created_at FROM users WHERE id != ?',
      [req.user.id]
    );
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Deactivate a user
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin only)
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Prevent deactivation of admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate admin users'
      });
    }
    
    // Prevent deactivating yourself
    if (userId == req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    // Deactivate user
    await pool.execute(
      'UPDATE users SET active = false WHERE id = ?',
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Activate a user
// @route   PUT /api/users/:id/activate
// @access  Private (Admin only)
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Activate user
    await pool.execute(
      'UPDATE users SET active = true WHERE id = ?',
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (err) {
    console.error('Activate user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Make a user an admin
// @route   PUT /api/users/:id/make-admin
// @access  Private (Admin only)
exports.makeUserAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Make user an admin
    await pool.execute(
      'UPDATE users SET role = "admin" WHERE id = ?',
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: 'User is now an admin'
    });
  } catch (err) {
    console.error('Make user admin error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};