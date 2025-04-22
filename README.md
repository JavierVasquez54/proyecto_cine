# Cinema Reservation System Backend

This is the backend API for a cinema reservation system that allows users to view cinema halls, book seats, and manage reservations. Admin users can manage cinema halls and users.

## Setup and Installation

### Prerequisites
- Node.js (v14+)
- MySQL database

### Installation Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables by creating a `.env` file with the following content:
   ```
   PORT=5000
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=cinema_db
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=7d
   ```
4. Create a MySQL database named `cinema_db`
5. Start the server:
   ```
   npm run dev
   ```
   The server will initialize the database tables on first run.

## Default Admin User

A default admin user is created automatically with the following credentials:
- Username: `admin`
- Password: `admin123`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/me` | Get current user details |

### Cinema Halls

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/cinemas` | Get all cinema halls | All users |
| GET | `/api/cinemas/:id` | Get cinema hall details | All users |
| POST | `/api/cinemas` | Create a new cinema hall | Admin only |
| PUT | `/api/cinemas/:id/movie` | Update cinema hall movie data | Admin only |
| PUT | `/api/cinemas/:id/capacity` | Update cinema hall capacity | Admin only |
| DELETE | `/api/cinemas/:id` | Delete a cinema hall | Admin only |

### Reservations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/reservations/seats/:hallId/:date` | Get available seats | All users |
| POST | `/api/reservations` | Create a reservation | All users |
| GET | `/api/reservations/my` | Get user reservations | All users |
| DELETE | `/api/reservations/:hallId/:date` | Cancel a reservation | All users |

### User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Admin only |
| PUT | `/api/users/:id/deactivate` | Deactivate a user | Admin only |
| PUT | `/api/users/:id/activate` | Activate a user | Admin only |
| PUT | `/api/users/:id/make-admin` | Make a user an admin | Admin only |

## Request/Response Examples

### Register a new user

**Request:**
```json
POST /api/auth/register
{
  "username": "johndoe",
  "password": "password123",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

### Login

**Request:**
```json
POST /api/auth/login
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "client",
    "active": true,
    "created_at": "2025-04-22T12:00:00.000Z"
  }
}
```

### Create a cinema hall (Admin only)

**Request:**
```json
POST /api/cinemas
{
  "name": "Hall A",
  "movieTitle": "Avengers: Endgame",
  "moviePoster": "https://example.com/poster.jpg",
  "rows": 10,
  "columns": 12
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Hall A",
    "movie_title": "Avengers: Endgame",
    "movie_poster": "https://example.com/poster.jpg",
    "rows": 10,
    "columns": 12,
    "created_at": "2025-04-22T12:00:00.000Z"
  }
}
```

### Get available seats

**Request:**
```
GET /api/reservations/seats/1/2025-04-23
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hall": {
      "id": 1,
      "name": "Hall A",
      "movie_title": "Avengers: Endgame",
      "movie_poster": "https://example.com/poster.jpg",
      "rows": 10,
      "columns": 12
    },
    "date": "2025-04-23",
    "seatsMatrix": [
      [
        {"row": 1, "column": 1, "isReserved": false},
        {"row": 1, "column": 2, "isReserved": true},
        // ... more seats
      ],
      // ... more rows
    ],
    "availableDates": [
      "2025-04-23",
      "2025-04-24",
      // ... more dates
    ]
  }
}
```

### Create a reservation

**Request:**
```json
POST /api/reservations
{
  "hallId": 1,
  "date": "2025-04-23",
  "seats": [
    {"row": 3, "column": 4},
    {"row": 3, "column": 5}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reservation created successfully",
  "data": {
    "userId": 2,
    "hallId": 1,
    "hallName": "Hall A",
    "movieTitle": "Avengers: Endgame",
    "date": "2025-04-23",
    "seats": [
      {"row": 3, "column": 4},
      {"row": 3, "column": 5}
    ],
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

Error responses have the following format:
```json
{
  "success": false,
  "message": "Error description"
}
```
