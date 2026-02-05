#!/bin/bash

# Local Backend Startup Script
# Starts the Flask backend server for local development

echo "=========================================="
echo "Starting Backend Server (Local Staging)"
echo "=========================================="
echo ""
echo "Branch: $(git branch --show-current)"
echo "Backend will run on: http://localhost:5001"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please ensure .env file exists in project root"
    exit 1
fi

# Check if MySQL is running
if ! nc -z localhost 3306 2>/dev/null; then
    echo "WARNING: MySQL doesn't appear to be running on localhost:3306"
    echo ""
    echo "Start MySQL with Docker:"
    echo "  docker run --name mysql-local -e MYSQL_ROOT_PASSWORD=local123 -e MYSQL_DATABASE=task_tracker -p 3306:3306 -d mysql:8"
    echo ""
    echo "Or check LOCAL_STAGING_SETUP.md for other options"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to backend directory
cd backend

# Kill any process using port 5001
if lsof -ti:5001 > /dev/null 2>&1; then
    echo "Stopping existing server on port 5001..."
    lsof -ti:5001 | xargs kill -9
    sleep 1
fi

echo ""
echo "Starting Flask server..."
echo "Press Ctrl+C to stop"
echo ""

# Start the Flask app with Python 3.9
/Library/Frameworks/Python.framework/Versions/3.9/bin/python3 app.py
