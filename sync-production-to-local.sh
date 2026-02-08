#!/bin/bash

# Script to sync database data from production to local staging
# This exports data from production and imports it into local MySQL

set -e  # Exit on error

echo "🔄 Syncing Production Database to Local Staging"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please create .env file first (copy from .env.example)"
    exit 1
fi

# Load production database credentials from .env
# Note: You may need to create a separate .env.production file for production credentials
# For now, we'll assume production credentials are in environment variables or Railway

echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "This script will:"
echo "  1. Export data from PRODUCTION database"
echo "  2. Import it into LOCAL database (will overwrite existing data!)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Production database credentials (update these with your production values)
# Option 1: Use Railway CLI
# Option 2: Set environment variables
# Option 3: Use a .env.production file

PROD_DB_HOST="${PROD_DB_HOST:-your-production-host.railway.app}"
PROD_DB_USER="${PROD_DB_USER:-root}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD}"
PROD_DB_NAME="${PROD_DB_NAME:-task_tracker}"
PROD_DB_PORT="${PROD_DB_PORT:-3306}"

# Local database credentials (from .env or defaults)
LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_USER="${LOCAL_DB_USER:-root}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-local123}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-task_tracker}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-3306}"

# Check if using Railway CLI
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓${NC} Railway CLI detected"
    echo "Using Railway CLI to connect to production database..."
    
    # Export from production using Railway
    EXPORT_FILE="production_export_$(date +%Y%m%d_%H%M%S).sql"
    echo "Exporting production database to $EXPORT_FILE..."
    
    # Try using railway run with mysqldump (requires mysqldump installed locally)
    if command -v mysqldump &> /dev/null; then
        echo "Attempting export via Railway environment variables..."
        railway run mysqldump -h "$MYSQLHOST" -P "$MYSQLPORT" -u "$MYSQLUSER" -p"$MYSQLPASSWORD" \
            --single-transaction --routines --triggers \
            "$MYSQLDATABASE" > "$EXPORT_FILE" 2>/dev/null && {
            echo -e "${GREEN}✓${NC} Export via Railway successful"
        } || {
            echo -e "${YELLOW}⚠️  Railway run method failed, trying direct connection...${NC}"
            # Fall back to direct connection
            if [ -z "$PROD_DB_PASSWORD" ]; then
                echo -e "${RED}❌ Error: PROD_DB_PASSWORD not set${NC}"
                echo "Please set production database credentials:"
                echo "  export PROD_DB_HOST=your-host.railway.app"
                echo "  export PROD_DB_USER=root"
                echo "  export PROD_DB_PASSWORD=your-password"
                echo "  export PROD_DB_NAME=task_tracker"
                echo ""
                echo "Or get credentials from Railway:"
                echo "  railway variables --service mysql"
                exit 1
            fi
            mysqldump -h "$PROD_DB_HOST" -P "$PROD_DB_PORT" -u "$PROD_DB_USER" -p"$PROD_DB_PASSWORD" \
                --single-transaction --routines --triggers \
                "$PROD_DB_NAME" > "$EXPORT_FILE" || {
                echo -e "${RED}❌ Failed to export from production${NC}"
                echo "Please check your production database credentials"
                exit 1
            }
        }
    else
        echo -e "${YELLOW}⚠️  mysqldump not found, using direct connection...${NC}"
        if [ -z "$PROD_DB_PASSWORD" ]; then
            echo -e "${RED}❌ Error: PROD_DB_PASSWORD not set${NC}"
            echo "Please set production database credentials:"
            echo "  export PROD_DB_HOST=your-host.railway.app"
            echo "  export PROD_DB_USER=root"
            echo "  export PROD_DB_PASSWORD=your-password"
            echo "  export PROD_DB_NAME=task_tracker"
            echo ""
            echo "Or get credentials from Railway:"
            echo "  railway variables --service mysql"
            exit 1
        fi
        mysqldump -h "$PROD_DB_HOST" -P "$PROD_DB_PORT" -u "$PROD_DB_USER" -p"$PROD_DB_PASSWORD" \
            --single-transaction --routines --triggers \
            "$PROD_DB_NAME" > "$EXPORT_FILE" || {
            echo -e "${RED}❌ Failed to export from production${NC}"
            exit 1
        }
    fi
else
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo "Attempting direct MySQL connection..."
    
    if [ -z "$PROD_DB_PASSWORD" ]; then
        echo -e "${RED}❌ Error: PROD_DB_PASSWORD not set${NC}"
        echo "Please set production database credentials:"
        echo "  export PROD_DB_HOST=your-host.railway.app"
        echo "  export PROD_DB_USER=root"
        echo "  export PROD_DB_PASSWORD=your-password"
        echo "  export PROD_DB_NAME=task_tracker"
        exit 1
    fi
    
    EXPORT_FILE="production_export_$(date +%Y%m%d_%H%M%S).sql"
    echo "Exporting production database to $EXPORT_FILE..."
    
    mysqldump -h "$PROD_DB_HOST" -P "$PROD_DB_PORT" -u "$PROD_DB_USER" -p"$PROD_DB_PASSWORD" \
        --single-transaction --routines --triggers \
        "$PROD_DB_NAME" > "$EXPORT_FILE" || {
        echo -e "${RED}❌ Failed to export from production${NC}"
        exit 1
    }
fi

if [ ! -f "$EXPORT_FILE" ] || [ ! -s "$EXPORT_FILE" ]; then
    echo -e "${RED}❌ Export file is empty or doesn't exist${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Production data exported successfully"
echo ""

# Check if local MySQL is running (Docker or local)
if docker ps | grep -q mysql-local; then
    echo -e "${GREEN}✓${NC} Local MySQL Docker container detected"
    echo "Importing into local Docker MySQL..."
    
    # Import into local Docker MySQL
    docker exec -i mysql-local mysql -uroot -p"$LOCAL_DB_PASSWORD" "$LOCAL_DB_NAME" < "$EXPORT_FILE" || {
        echo -e "${RED}❌ Failed to import into local database${NC}"
        exit 1
    }
elif command -v mysql &> /dev/null; then
    echo -e "${GREEN}✓${NC} Local MySQL detected"
    echo "Importing into local MySQL..."
    
    # Import into local MySQL
    mysql -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASSWORD" \
        "$LOCAL_DB_NAME" < "$EXPORT_FILE" || {
        echo -e "${RED}❌ Failed to import into local database${NC}"
        exit 1
    }
else
    echo -e "${RED}❌ Error: No local MySQL found${NC}"
    echo "Please ensure MySQL is running (Docker or local installation)"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Successfully synced production data to local staging!${NC}"
echo ""
echo "Export file saved as: $EXPORT_FILE"
echo "You can keep this as a backup or delete it."
echo ""
echo "Next steps:"
echo "  1. Restart your local backend: ./run-backend.sh"
echo "  2. Test the application at http://localhost:3000"
echo ""
