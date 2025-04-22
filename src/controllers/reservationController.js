// src/controllers/reservationController.js
const pool = require('../config/db');
const QRCode = require('qrcode');

// Helper function to get available dates
function getAvailableDates() {
  const dates = [];
  const today = new Date();
  
  // Add the next 8 days
  for (let i = 1; i <= 8; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    
    // Format as YYYY-MM-DD
    const formattedDate = date.toISOString().split('T')[0];
    dates.push(formattedDate);
  }
  
  return dates;
}

// @desc    Get available seats for a specific cinema hall and date
// @route   GET /api/reservations/seats/:hallId/:date
// @access  Private
exports.getAvailableSeats = async (req, res) => {
  try {
    const { hallId, date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Validate date is within the next 8 days
    const availableDates = getAvailableDates();
    if (!availableDates.includes(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be within the next 8 days'
      });
    }
    
    // Get cinema hall
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
    
    const hall = halls[0];
    
    // Get reserved seats for the selected date
    const [reservedSeats] = await pool.execute(
      'SELECT seat_row, seat_column FROM reservations WHERE hall_id = ? AND reservation_date = ?',
      [hallId, date]
    );
    
    // Create a matrix of seats
    const seatsMatrix = [];
    for (let row = 1; row <= hall.rows; row++) {
      const rowSeats = [];
      for (let col = 1; col <= hall.columns; col++) {
        // Check if this seat is reserved
        const isReserved = reservedSeats.some(
          seat => seat.seat_row === row && seat.seat_column === col
        );
        
        rowSeats.push({
          row,
          column: col,
          isReserved
        });
      }
      seatsMatrix.push(rowSeats);
    }
    
    res.status(200).json({
      success: true,
      data: {
        hall,
        date,
        seatsMatrix,
        availableDates: getAvailableDates()
      }
    });
  } catch (err) {
    console.error('Get available seats error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Private
exports.createReservation = async (req, res) => {
  try {
    const { hallId, date, seats } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!hallId || !date || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide hallId, date and seats'
      });
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Validate date is within the next 8 days
    const availableDates = getAvailableDates();
    if (!availableDates.includes(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be within the next 8 days'
      });
    }
    
    // Validate each seat has row and column
    for (const seat of seats) {
      if (!seat.row || !seat.column) {
        return res.status(400).json({
          success: false,
          message: 'Each seat must have row and column'
        });
      }
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
    
    const hall = halls[0];
    
    // Validate seats are within the hall dimensions
    for (const seat of seats) {
      if (seat.row < 1 || seat.row > hall.rows || seat.column < 1 || seat.column > hall.columns) {
        return res.status(400).json({
          success: false,
          message: `Seat (${seat.row}, ${seat.column}) is out of bounds`
        });
      }
    }
    
    // Check if any of the seats are already reserved
    const seatParams = seats.map(() => '(?, ?, ?)').join(' OR ');
    const values = seats.flatMap(seat => [hallId, seat.row, seat.column]);
    
    const [reservedSeats] = await pool.execute(
      `SELECT seat_row, seat_column FROM reservations 
       WHERE hall_id = ? AND reservation_date = ? AND
       (${seatParams})`,
      [hallId, date, ...values]
    );
    
    if (reservedSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some seats are already reserved',
        reservedSeats
      });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert each seat reservation
      for (const seat of seats) {
        await connection.execute(
          'INSERT INTO reservations (user_id, hall_id, seat_row, seat_column, reservation_date) VALUES (?, ?, ?, ?, ?)',
          [userId, hallId, seat.row, seat.column, date]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      // Generate QR code with reservation info
      const reservationInfo = {
        userId,
        hallId,
        hallName: hall.name,
        movieTitle: hall.movie_title,
        date,
        seats: seats
      };
      
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(reservationInfo));
      
      // Return reservation details with QR code
      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: {
          ...reservationInfo,
          qrCode: qrCodeDataURL
        }
      });
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get user reservations
// @route   GET /api/reservations/my
// @access  Private
exports.getUserReservations = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get user reservations
      const [reservations] = await pool.execute(`
        SELECT 
          r.id, r.seat_row, r.seat_column, r.reservation_date, r.created_at,
          ch.id as hall_id, ch.name as hall_name, ch.movie_title, ch.movie_poster
        FROM reservations r
        JOIN cinema_halls ch ON r.hall_id = ch.id
        WHERE r.user_id = ? AND r.reservation_date >= CURDATE()
        ORDER BY r.reservation_date, ch.name, r.seat_row, r.seat_column
      `, [userId]);
      
      // Group reservations by hall and date
      const groupedReservations = {};
      reservations.forEach(reservation => {
        const key = `${reservation.hall_id}_${reservation.reservation_date}`;
        
        if (!groupedReservations[key]) {
          groupedReservations[key] = {
            hallId: reservation.hall_id,
            hallName: reservation.hall_name,
            movieTitle: reservation.movie_title,
            moviePoster: reservation.movie_poster,
            date: reservation.reservation_date,
            seats: []
          };
        }
        
        groupedReservations[key].seats.push({
          row: reservation.seat_row,
          column: reservation.seat_column
        });
      });
      
      // Convert to array
      const result = Object.values(groupedReservations);
      
      // Generate QR code for each reservation group
      for (const reservation of result) {
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(reservation));
        reservation.qrCode = qrCodeDataURL;
      }
      
      res.status(200).json({
        success: true,
        count: result.length,
        data: result
      });
    } catch (err) {
      console.error('Get user reservations error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  };
  
  // @desc    Cancel a reservation
  // @route   DELETE /api/reservations/:hallId/:date
  // @access  Private
  exports.cancelReservation = async (req, res) => {
    try {
      const { hallId, date } = req.params;
      const userId = req.user.id;
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
      
      // Check if reservations exist
      const [reservations] = await pool.execute(
        'SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND hall_id = ? AND reservation_date = ?',
        [userId, hallId, date]
      );
      
      if (reservations[0].count === 0) {
        return res.status(404).json({
          success: false,
          message: 'No reservations found for this hall and date'
        });
      }
      
      // Delete reservations
      await pool.execute(
        'DELETE FROM reservations WHERE user_id = ? AND hall_id = ? AND reservation_date = ?',
        [userId, hallId, date]
      );
      
      res.status(200).json({
        success: true,
        message: 'Reservations cancelled successfully'
      });
    } catch (err) {
      console.error('Cancel reservation error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  };