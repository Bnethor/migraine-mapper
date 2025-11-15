# PostgreSQL Docker Setup Guide

This guide explains how to set up PostgreSQL using Docker for your Migraine Tracker application.

## Prerequisites

- Docker and Docker Compose installed on your system
- Node.js (v18 or later)

## Quick Start

### 1. Create Environment File

Create a `.env` file in the `migraine-tracker-api` directory:

```bash
cd migraine-tracker-api
cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=migraineuser
DB_PASSWORD=migrainepass
DB_NAME=migrainetracker
EOF
```

### 2. Start PostgreSQL with Docker

From the project root directory:

```bash
# Start PostgreSQL in the background
docker-compose up -d

# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 3. Install Dependencies

```bash
cd migraine-tracker-api
npm install
```

### 4. Start the API Server

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

### 5. Test the Setup

```bash
# Health check
curl http://localhost:3000/api/health

# Login with demo user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

## Docker Commands

### Start Database
```bash
docker-compose up -d
```

### Stop Database
```bash
docker-compose down
```

### Stop Database and Remove Data
```bash
docker-compose down -v
```

### View Database Logs
```bash
docker-compose logs -f postgres
```

### Restart Database
```bash
docker-compose restart postgres
```

## Connecting to PostgreSQL Directly

### Using Docker Exec
```bash
docker exec -it migraine-tracker-db psql -U migraineuser -d migrainetracker
```

### Using psql (if installed locally)
```bash
psql -h localhost -p 5432 -U migraineuser -d migrainetracker
```

Password: `migrainepass`

### Common SQL Queries

```sql
-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View migraine entries
SELECT * FROM migraine_entries;

-- Count entries per user
SELECT u.email, COUNT(m.id) as entry_count
FROM users u
LEFT JOIN migraine_entries m ON u.id = m.user_id
GROUP BY u.email;

-- Exit psql
\q
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Migraine Entries Table
```sql
CREATE TABLE migraine_entries (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
    location VARCHAR(255),
    triggers TEXT,
    symptoms TEXT,
    medication TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Troubleshooting

### Database Connection Issues

1. **Check if Docker is running:**
   ```bash
   docker ps
   ```

2. **Check PostgreSQL logs:**
   ```bash
   docker-compose logs postgres
   ```

3. **Restart the database:**
   ```bash
   docker-compose restart postgres
   ```

4. **Check if port 5432 is available:**
   ```bash
   lsof -i :5432
   # or
   netstat -an | grep 5432
   ```

### Reset Database

If you need to completely reset the database:

```bash
# Stop and remove containers, volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for initialization (check logs)
docker-compose logs -f postgres
```

### API Connection Issues

1. **Verify environment variables:**
   ```bash
   cat migraine-tracker-api/.env
   ```

2. **Test database connection:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Check API logs:**
   Look for "✅ Connected to PostgreSQL database" message

## Production Considerations

### Security
1. **Change default passwords:**
   - Update `POSTGRES_PASSWORD` in `docker-compose.yml`
   - Update `DB_PASSWORD` in `.env`
   - Use a strong `JWT_SECRET`

2. **Use password hashing:**
   - Install bcrypt: `npm install bcrypt`
   - Hash passwords before storing (currently stored in plain text)

3. **Environment variables:**
   - Never commit `.env` files to version control
   - Use secrets management in production

### Database Backups

```bash
# Create backup
docker exec migraine-tracker-db pg_dump -U migraineuser migrainetracker > backup.sql

# Restore backup
docker exec -i migraine-tracker-db psql -U migraineuser -d migrainetracker < backup.sql
```

### Performance

1. **Connection pooling** - Already configured in `db/database.js`
2. **Indexes** - Already added to frequently queried columns
3. **Monitor queries** - Check logs for slow queries

## Demo Data

The database is initialized with:
- Demo user: `demo@example.com` / `demo123`
- 3 sample migraine entries

## API Endpoints

All CRUD operations are now backed by PostgreSQL:

- **Authentication:**
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `GET /api/auth/me` - Get current user
  - `POST /api/auth/logout` - Logout user

- **Migraine Entries:**
  - `GET /api/migraine` - Get all entries (with pagination & search)
  - `GET /api/migraine/:id` - Get single entry
  - `POST /api/migraine` - Create new entry
  - `PUT /api/migraine/:id` - Update entry
  - `DELETE /api/migraine/:id` - Delete entry
  - `GET /api/migraine/statistics` - Get dashboard statistics
  - `GET /api/migraine/recent` - Get recent entries

- **Health:**
  - `GET /api/health` - API and database health check

## Next Steps

1. Start the frontend application
2. Test CRUD operations through the UI
3. Implement password hashing with bcrypt
4. Add database migrations tool (e.g., node-pg-migrate)
5. Set up automated backups

## Resources

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [node-postgres Documentation](https://node-postgres.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)



