const express = require('express');
const {
  getUsers,
  deactivateUser,
  activateUser,
  makeUserAdmin
} = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const router = express.Router();

// Admin routes
router.get('/', authenticate, isAdmin, getUsers);
router.put('/:id/deactivate', authenticate, isAdmin, deactivateUser);
router.put('/:id/activate', authenticate, isAdmin, activateUser);
router.put('/:id/make-admin', authenticate, isAdmin, makeUserAdmin);

module.exports = router;