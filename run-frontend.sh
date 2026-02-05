#!/bin/bash

# Local Frontend Startup Script
# Starts the Vite development server for local development

echo "=========================================="
echo "Starting Frontend Server (Local Staging)"
echo "=========================================="
echo ""
echo "Branch: $(git branch --show-current)"
echo "Frontend will run on: http://localhost:3000"
echo ""

# Check if .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "WARNING: frontend/.env.local file not found!"
    echo "Frontend may not connect to local backend properly"
    echo ""
fi

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

echo ""
echo "Starting Vite development server..."
echo "Press Ctrl+C to stop"
echo ""

# Start the Vite dev server
npm run dev
