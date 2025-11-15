# 🧠 Migraine Tracker API

Mock backend API server for the Migraine Tracker application.

## Features

- ✅ Authentication (register, login, logout)
- ✅ JWT token-based authentication
- ✅ Full CRUD operations for migraine entries
- ✅ Dashboard statistics
- ✅ In-memory data storage (data resets on restart)
- ✅ CORS enabled for frontend integration

## Quick Start

### Installation

```bash
npm install
```

### Run Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### Development Mode (with auto-reload)

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Migraine Entries

- `GET /api/migraine` - Get all entries (paginated)
- `GET /api/migraine/:id` - Get single entry
- `POST /api/migraine` - Create new entry
- `PUT /api/migraine/:id` - Update entry
- `DELETE /api/migraine/:id` - Delete entry
- `GET /api/migraine/statistics` - Get dashboard stats
- `GET /api/migraine/recent` - Get recent entries

### Health Check

- `GET /api/health` - Check if API is running

## Test Credentials

You can register any user, or use these test credentials:

**Email:** `test@example.com`
**Password:** `password123`

(Register this user first via the frontend or API)

## Notes

- Data is stored in-memory and will be lost when server restarts
- For production, replace with a real database (MongoDB, PostgreSQL, etc.)
- JWT secret should be changed in production
- Password hashing should be added for production use

