#!/bin/bash

# ===========================================
# Migraine Tracker - Start Script
# ===========================================
# Starts both backend and frontend servers
# Handles graceful shutdown on Ctrl+C
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/migraine-tracker-api"
FRONTEND_DIR="$PROJECT_ROOT/migraine-tracker-web"

# PID storage
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function to kill both processes
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠️  Shutting down servers...${NC}"
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${BLUE}🔴 Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill -TERM $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${BLUE}🔴 Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining node processes from these directories
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "vite.*migraine-tracker-web" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Print header
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   Migraine Tracker - Starting...      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

# Kill any existing processes on the ports
echo -e "${YELLOW}🔍 Checking for existing processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend
echo -e "${BLUE}🚀 Starting backend server...${NC}"
cd "$BACKEND_DIR"
npm start > /tmp/migraine-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}   Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}   Backend URL: http://localhost:3000${NC}"

# Wait a bit for backend to start
sleep 2

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start. Check logs:${NC}"
    tail -n 20 /tmp/migraine-backend.log
    exit 1
fi

# Start frontend
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
cd "$FRONTEND_DIR"
npm run dev > /tmp/migraine-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}   Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}   Frontend URL: http://localhost:5173${NC}"

# Wait a bit for frontend to start
sleep 2

# Check if frontend is still running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start. Check logs:${NC}"
    tail -n 20 /tmp/migraine-frontend.log
    cleanup
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All servers running!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Backend API:${NC}  http://localhost:3000"
echo -e "${BLUE}🌐 Frontend:${NC}     http://localhost:5173"
echo ""
echo -e "${YELLOW}📝 Demo Credentials:${NC}"
echo -e "   Email:    demo@example.com"
echo -e "   Password: demo123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Follow logs (optional - shows combined logs)
echo -e "${BLUE}📋 Server logs:${NC}"
echo "────────────────────────────────────────"

# Wait for both processes (this keeps the script running)
wait $BACKEND_PID $FRONTEND_PID

