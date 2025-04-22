// src/routes/reservationRoutes.js
const express = require('express');
const {
  getAvailableSeats,
  createReservation,
  getUserReservations,
  cancelReservation
} = require('../controllers/reservationController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.get('/seats/:hallId/:date', authenticate, getAvailableSeats);
router.post('/', authenticate, createReservation);
router.get('/my', authenticate, getUserReservations);
router.delete('/:hallId/:date', authenticate, cancelReservation);

module.exports = router;
