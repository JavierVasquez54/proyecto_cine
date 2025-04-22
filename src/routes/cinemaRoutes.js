const express = require('express');
const {
  createCinemaHall,
  getCinemaHalls,
  getCinemaHall,
  updateCinemaHallMovie,
  updateCinemaHallCapacity,
  deleteCinemaHall
} = require('../controllers/cinemaController');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const router = express.Router();

// Protected routes
router.get('/', authenticate, getCinemaHalls);
router.get('/:id', authenticate, getCinemaHall);

// Admin routes
router.post('/', authenticate, isAdmin, createCinemaHall);
router.put('/:id/movie', authenticate, isAdmin, updateCinemaHallMovie);
router.put('/:id/capacity', authenticate, isAdmin, updateCinemaHallCapacity);
router.delete('/:id', authenticate, isAdmin, deleteCinemaHall);

module.exports = router;