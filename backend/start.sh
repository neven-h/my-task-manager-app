#!/bin/bash
# Backend startup script for drpitz.club

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${GREEN}Starting drpitz.club backend...${NC}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "${YELLOW}Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
    echo "${GREEN}Virtual environment created!${NC}"
fi

# Activate virtual environment
echo "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies
echo "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Run the app
echo "${GREEN}Starting Flask server...${NC}"
python app.py
