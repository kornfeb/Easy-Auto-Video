#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Easy Auto Video Project...${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "${BLUE}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT)
trap cleanup SIGINT

# Check for virtual environment
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Please create one with 'python3 -m venv .venv'"
    exit 1
fi

# 1. Start Backend
echo -e "${GREEN}Starting Backend (FastAPI)...${NC}"
source .venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID)"
cd ..

# 2. Start Frontend
echo -e "${GREEN}Starting Frontend (Vite)...${NC}"
cd frontend
npm run dev -- --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "Frontend running (PID: $FRONTEND_PID)"
cd ..

echo -e "${BLUE}=======================================${NC}"
echo -e "   Easy Auto Video is running!"
echo -e "   Frontend: \033[4;36mhttp://localhost:5173\033[0m"
echo -e "   Backend:  \033[4;36mhttp://localhost:8000/docs\033[0m"
echo -e "${BLUE}=======================================${NC}"
echo -e "Logs are hidden to keep this window clean."
echo -e "Press Ctrl+C to stop all services."

# Wait for processes
wait
