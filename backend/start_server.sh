#!/bin/bash

# Script to start Flask server for Task Manager App

cd "$(dirname "$0")"

# Kill any existing Flask processes
echo "Stopping any existing Flask servers..."
pkill -f "python.*app.py" 2>/dev/null
sleep 2

# Activate virtual environment and start server
echo "Starting Flask server..."
source venv/bin/activate
python3 app.py
