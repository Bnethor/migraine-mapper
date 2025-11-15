#!/bin/bash

# Setup script for Migraine Tracker with PostgreSQL

set -e  # Exit on any error

echo "🚀 Setting up Migraine Tracker with PostgreSQL..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

echo -e "${GREEN}✅ docker-compose is available${NC}"

# Create .env file if it doesn't exist
if [ ! -f "migraine-tracker-api/.env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > migraine-tracker-api/.env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-$(openssl rand -hex 16)

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=migraineuser
DB_PASSWORD=migrainepass
DB_NAME=migrainetracker
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${BLUE}ℹ️  .env file already exists${NC}"
fi

# Install API dependencies
echo -e "${YELLOW}📦 Installing API dependencies...${NC}"
cd migraine-tracker-api
npm install
cd ..
echo -e "${GREEN}✅ API dependencies installed${NC}"

# Start PostgreSQL with Docker Compose
echo -e "${YELLOW}🐘 Starting PostgreSQL with Docker...${NC}"
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is healthy
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec migraine-tracker-db pg_isready -U migraineuser -d migrainetracker > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}⏳ Still waiting... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 2
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ PostgreSQL failed to start in time. Check logs with: docker-compose logs postgres"
        exit 1
    fi
done

# Verify tables were created
echo -e "${YELLOW}🔍 Verifying database schema...${NC}"
TABLE_COUNT=$(docker exec migraine-tracker-db psql -U migraineuser -d migrainetracker -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -ge "2" ]; then
    echo -e "${GREEN}✅ Database schema created successfully${NC}"
else
    echo "❌ Database schema creation failed"
    exit 1
fi

# Test API connection (optional)
echo -e "${YELLOW}🧪 Starting API server for connection test...${NC}"
cd migraine-tracker-api
npm start > /dev/null 2>&1 &
API_PID=$!
cd ..

sleep 3

if ps -p $API_PID > /dev/null; then
    echo -e "${GREEN}✅ API server started successfully${NC}"
    kill $API_PID 2>/dev/null || true
else
    echo -e "${YELLOW}⚠️  API server test skipped${NC}"
fi

# Mark database files as locally modified (ignore future changes)
echo -e "${YELLOW}🔧 Configuring git to ignore local database file changes...${NC}"
cd migraine-tracker-api
git update-index --assume-unchanged db/init.sql 2>/dev/null || true
git update-index --assume-unchanged db/migration_001_add_clinical_fields.sql 2>/dev/null || true
git update-index --assume-unchanged db/migration_002_user_profile.sql 2>/dev/null || true
cd ..
echo -e "${GREEN}✅ Database files marked as locally ignored${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Database Information:${NC}"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: migrainetracker"
echo "   User: migraineuser"
echo "   Password: migrainepass"
echo ""
echo -e "${BLUE}🔐 Demo User Credentials:${NC}"
echo "   Email: demo@example.com"
echo "   Password: demo123"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "   1. Start the API:       cd migraine-tracker-api && npm run dev"
echo "   2. Start the frontend:  cd migraine-tracker-web && npm run dev"
echo "   3. Open browser:        http://localhost:5173"
echo ""
echo -e "${BLUE}🛠️  Useful Commands:${NC}"
echo "   Stop database:          docker-compose down"
echo "   View logs:              docker-compose logs -f postgres"
echo "   Connect to DB:          docker exec -it migraine-tracker-db psql -U migraineuser -d migrainetracker"
echo "   Health check:           curl http://localhost:3000/api/health"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   See DOCKER_SETUP.md for more information"
echo ""
echo -e "${BLUE}ℹ️  Note:${NC}"
echo "   Database schema files are now marked as 'locally ignored'"
echo "   Your local changes to db/*.sql won't be tracked by git"
echo "   To re-enable tracking: git update-index --no-assume-unchanged db/init.sql"
echo ""



