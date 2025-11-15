# 🚀 Quick Start Guide

Get your Migraine Tracker up and running with PostgreSQL in Docker!

## Step 1: Start PostgreSQL

```bash
# From the project root
docker-compose up -d
```

This will:
- Download PostgreSQL Docker image (if needed)
- Create and start the database container
- Initialize the database schema
- Add demo user and sample data

## Step 2: Create Environment File

```bash
cd migraine-tracker-api
cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
DB_HOST=localhost
DB_PORT=5432
DB_USER=migraineuser
DB_PASSWORD=migrainepass
DB_NAME=migrainetracker
EOF
```

## Step 3: Install Dependencies & Start API

```bash
# Still in migraine-tracker-api directory
npm install
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
🚀 Migraine Tracker API running on http://localhost:3000
```

## Step 4: Start Frontend

```bash
# In a new terminal
cd migraine-tracker-web
npm run dev
```

## Step 5: Test It!

Open http://localhost:5173 in your browser and login with:
- **Email:** demo@example.com
- **Password:** demo123

## Troubleshooting

### Database not connecting?

```bash
# Check if PostgreSQL is running
docker ps

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port already in use?

```bash
# Check what's using port 5432
lsof -i :5432

# Or change the port in docker-compose.yml
```

### Reset everything?

```bash
# Stop and remove database (deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d
cd migraine-tracker-api && npm install && npm run dev
```

## What's Working Now?

✅ **PostgreSQL Database** - Running in Docker
✅ **User Authentication** - Register, login, JWT tokens
✅ **CRUD Operations** - Create, read, update, delete migraine entries  
✅ **Dashboard Statistics** - Analytics and insights
✅ **Data Persistence** - All data saved to PostgreSQL
✅ **Automatic Schema** - Tables created on first run

## Next Steps

- Change default passwords in `docker-compose.yml` and `.env`
- Implement password hashing with bcrypt
- Add database migrations
- Set up automated backups

## Useful Commands

```bash
# Stop database (keeps data)
docker-compose stop

# Start database
docker-compose start

# View logs
docker-compose logs -f

# Connect to database
docker exec -it migraine-tracker-db psql -U migraineuser -d migrainetracker

# Create backup
docker exec migraine-tracker-db pg_dump -U migraineuser migrainetracker > backup.sql

# API health check
curl http://localhost:3000/api/health
```

For more details, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

