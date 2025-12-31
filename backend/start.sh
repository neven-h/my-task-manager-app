#!/bin/bash

# Activate virtual environment and start Flask backend
cd "$(dirname "$0")"
source venv/bin/activate
python3 app.py
