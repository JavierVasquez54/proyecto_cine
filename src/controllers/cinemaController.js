// src/controllers/cinemaController.js
const pool = require('../config/db');

// @desc    Create a new cinema hall
// @route   POST /api/cinemas
// @access  Private (Admin only)
exports.createCinemaHall = async (req, res) => {
  try {
    const { name, movieTitle, moviePoster, rows, columns } = req.body;
    
    // Validate input
    if (!name || !movieTitle || !moviePoster || !rows || !columns) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Validate dimensions
    if (rows <= 0 || columns <= 0 || rows > 30 || columns > 30) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rows or columns values. Must be between 1 and 30.'
      });
    }
    
    // Create cinema hall
    const [result] = await pool.execute(
      'INSERT INTO cinema_halls (name, movie_title, movie_poster, rows, columns) VALUES (?, ?, ?, ?, ?)',
      [name, movieTitle, moviePoster, rows, columns]
    );
    
    const cinemaId = result.insertId;
    
    // Get the created cinema hall
    const [rows_cinema] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [cinemaId]
    );
    
    res.status(201).json({
      success: true,
      data: rows_cinema[0]
    });
  } catch (err) {
    console.error('Create cinema hall error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all cinema halls
// @route   GET /api/cinemas
// @access  Private
exports.getCinemaHalls = async (req, res) => {
  try {
    // Get all cinema halls
    const [halls] = await pool.execute(`
      SELECT 
        ch.*, 
        (ch.rows * ch.columns) as total_capacity,
        (
          SELECT COUNT(*) 
          FROM reservations r 
          WHERE r.hall_id = ch.id AND r.reservation_date >= CURDATE()
        ) as reserved_seats
      FROM cinema_halls ch
    `);
    
    // Calculate available seats for each hall
    const hallsWithAvailability = halls.map(hall => {
      return {
        ...hall,
        available_seats: hall.total_capacity - hall.reserved_seats
      };
    });
    
    res.status(200).json({
      success: true,
      count: hallsWithAvailability.length,
      data: hallsWithAvailability
    });
  } catch (err) {
    console.error('Get cinema halls error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single cinema hall
// @route   GET /api/cinemas/:id
// @access  Private
exports.getCinemaHall = async (req, res) => {
  try {
    const hallId = req.params.id;
    
    // Get cinema hall
    const [halls] = await pool.execute(`
      SELECT 
        ch.*, 
        (ch.rows * ch.columns) as total_capacity,
        (
          SELECT COUNT(*) 
          FROM reservations r 
          WHERE r.hall_id = ch.id AND r.reservation_date >= CURDATE()
        ) as reserved_seats
      FROM cinema_halls ch
      WHERE ch.id = ?
    `, [hallId]);
    
    if (halls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cinema hall not found'
      });
    }
    
    const hall = halls[0];
    
    // Calculate available seats
    hall.available_seats = hall.total_capacity - hall.reserved_seats;
    
    res.status(200).json({
      success: true,
      data: hall
    });
  } catch (err) {
    console.error('Get cinema hall error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update movie data for a cinema hall
// @route   PUT /api/cinemas/:id/movie
// @access  Private (Admin only)
exports.updateCinemaHallMovie = async (req, res) => {
  try {
    const hallId = req.params.id;
    const { movieTitle, moviePoster, name } = req.body;
    
    // Validate input
    if (!movieTitle || !moviePoster || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if cinema hall exists
    const [halls] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    if (halls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cinema hall not found'
      });
    }
    
    // Update cinema hall
    await pool.execute(
      'UPDATE cinema_halls SET name = ?, movie_title = ?, movie_poster = ? WHERE id = ?',
      [name, movieTitle, moviePoster, hallId]
    );
    
    // Get updated cinema hall
    const [updated] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    res.status(200).json({
      success: true,
      data: updated[0]
    });
  } catch (err) {
    console.error('Update cinema hall movie error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update capacity of a cinema hall
// @route   PUT /api/cinemas/:id/capacity
// @access  Private (Admin only)
exports.updateCinemaHallCapacity = async (req, res) => {
  try {
    const hallId = req.params.id;
    const { rows, columns } = req.body;
    
    // Validate input
    if (!rows || !columns) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rows and columns'
      });
    }
    
    // Validate dimensions
    if (rows <= 0 || columns <= 0 || rows > 30 || columns > 30) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rows or columns values. Must be between 1 and 30.'
      });
    }
    
    // Check if cinema hall exists
    const [halls] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    if (halls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cinema hall not found'
      });
    }
    
    // Check if there are reservations for this hall
    const [reservations] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE hall_id = ? AND reservation_date >= CURDATE()',
      [hallId]
    );
    
    if (reservations[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update capacity as there are active reservations for this hall'
      });
    }
    
    // Update cinema hall capacity
    await pool.execute(
      'UPDATE cinema_halls SET rows = ?, columns = ? WHERE id = ?',
      [rows, columns, hallId]
    );
    
    // Get updated cinema hall
    const [updated] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    res.status(200).json({
      success: true,
      data: updated[0]
    });
  } catch (err) {
    console.error('Update cinema hall capacity error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete a cinema hall
// @route   DELETE /api/cinemas/:id
// @access  Private (Admin only)
exports.deleteCinemaHall = async (req, res) => {
  try {
    const hallId = req.params.id;
    
    // Check if cinema hall exists
    const [halls] = await pool.execute(
      'SELECT * FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    if (halls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cinema hall not found'
      });
    }
    
    // Check if there are reservations for this hall
    const [reservations] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE hall_id = ?',
      [hallId]
    );
    
    if (reservations[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete hall as there are reservations associated with it'
      });
    }
    
    // Delete cinema hall
    await pool.execute(
      'DELETE FROM cinema_halls WHERE id = ?',
      [hallId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Cinema hall deleted successfully'
    });
  } catch (err) {
    console.error('Delete cinema hall error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};