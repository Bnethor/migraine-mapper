#!/bin/bash

# ===========================================
# Migraine Tracker - Stop Script
# ===========================================
# Stops all backend and frontend servers
# ===========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping Migraine Tracker servers...${NC}"

# Kill processes by port
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${BLUE}   Stopping backend on port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}   ✅ Backend stopped${NC}"
else
    echo -e "${YELLOW}   ℹ️  No backend process found on port 3000${NC}"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
    echo -e "${BLUE}   Stopping frontend on port 5173...${NC}"
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}   ✅ Frontend stopped${NC}"
else
    echo -e "${YELLOW}   ℹ️  No frontend process found on port 5173${NC}"
fi

# Kill any remaining processes by name
pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}   ✅ Killed remaining backend processes${NC}" || true
pkill -f "vite.*migraine-tracker-web" 2>/dev/null && echo -e "${GREEN}   ✅ Killed remaining frontend processes${NC}" || true

echo ""
echo -e "${GREEN}✅ All servers stopped successfully${NC}"

