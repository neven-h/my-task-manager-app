#!/bin/bash

# Local Database Setup Script
# Sets up MySQL database for local development

echo "=========================================="
echo "Local Database Setup (Docker MySQL)"
echo "=========================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    echo "Please install Docker or set up MySQL manually"
    echo "See LOCAL_STAGING_SETUP.md for instructions"
    exit 1
fi

# Check if container already exists
if docker ps -a | grep -q mysql-local; then
    echo "MySQL container 'mysql-local' already exists"
    echo ""
    read -p "Do you want to remove it and start fresh? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and removing existing container..."
        docker stop mysql-local 2>/dev/null
        docker rm mysql-local 2>/dev/null
    else
        echo "Keeping existing container. Starting it if stopped..."
        docker start mysql-local
        echo ""
        echo "MySQL is running on localhost:3306"
        echo "Database: task_tracker"
        echo "Username: root"
        echo "Password: local123"
        exit 0
    fi
fi

echo "Creating MySQL container..."
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=local123 \
  -e MYSQL_DATABASE=task_tracker \
  -p 3306:3306 \
  -d mysql:8

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 10

# Check if container is running
if ! docker ps | grep -q mysql-local; then
    echo "ERROR: MySQL container failed to start"
    docker logs mysql-local
    exit 1
fi

echo ""
echo "MySQL container started successfully!"
echo ""

# Import data if available
if [ -f "local_data_export.sql" ]; then
    read -p "Import data from local_data_export.sql? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Importing data..."
        docker exec -i mysql-local mysql -uroot -plocal123 task_tracker < local_data_export.sql
        echo "Data imported successfully!"
    fi
else
    echo "No local_data_export.sql found. Skipping data import."
    echo "You can import data later with:"
    echo "  docker exec -i mysql-local mysql -uroot -plocal123 task_tracker < your_data.sql"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "MySQL is running on localhost:3306"
echo "Database: task_tracker"
echo "Username: root"
echo "Password: local123"
echo ""
echo "To stop MySQL:"
echo "  docker stop mysql-local"
echo ""
echo "To start MySQL:"
echo "  docker start mysql-local"
echo ""
echo "To remove MySQL:"
echo "  docker stop mysql-local && docker rm mysql-local"
echo ""
