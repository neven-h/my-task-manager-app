#!/bin/bash

# Production Diagnostic Script for Yahoo Finance Widget
# This script helps diagnose what's not working in production

echo "========================================="
echo "Yahoo Finance Widget - Production Diagnostic"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="${1:-https://api.drpitz.club/api}"

echo "Testing backend URL: $BACKEND_URL"
echo ""

# Test 1: Check if backend is reachable
echo -e "${YELLOW}[TEST 1]${NC} Checking if backend is reachable..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200\|404"; then
    echo -e "${GREEN}✓${NC} Backend is reachable"
else
    echo -e "${RED}✗${NC} Backend is NOT reachable"
    echo "  → Check if backend service is running"
    echo "  → Check firewall/security group settings"
fi
echo ""

# Test 2: Check watchlist endpoint
echo -e "${YELLOW}[TEST 2]${NC} Testing watchlist endpoint..."
WATCHLIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/portfolio/watchlist?username=test&role=admin")
WATCHLIST_CODE=$(echo "$WATCHLIST_RESPONSE" | tail -n1)
WATCHLIST_BODY=$(echo "$WATCHLIST_RESPONSE" | head -n-1)

if [ "$WATCHLIST_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Watchlist endpoint is working (HTTP $WATCHLIST_CODE)"
    echo "  Response: $WATCHLIST_BODY"
elif [ "$WATCHLIST_CODE" = "500" ]; then
    echo -e "${RED}✗${NC} Watchlist endpoint returned error (HTTP $WATCHLIST_CODE)"
    echo "  Response: $WATCHLIST_BODY"
    echo "  → This likely means the 'watched_stocks' table doesn't exist"
    echo "  → Run the migration endpoint (see below)"
else
    echo -e "${RED}✗${NC} Watchlist endpoint failed (HTTP $WATCHLIST_CODE)"
    echo "  Response: $WATCHLIST_BODY"
fi
echo ""

# Test 3: Check stock search endpoint
echo -e "${YELLOW}[TEST 3]${NC} Testing stock search endpoint..."
SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/portfolio/search-stocks?q=AAPL")
SEARCH_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)
SEARCH_BODY=$(echo "$SEARCH_RESPONSE" | head -n-1)

if [ "$SEARCH_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Stock search endpoint is working (HTTP $SEARCH_CODE)"
    echo "  Response preview: $(echo "$SEARCH_BODY" | cut -c1-100)..."
elif [ "$SEARCH_CODE" = "500" ]; then
    echo -e "${RED}✗${NC} Stock search endpoint returned error (HTTP $SEARCH_CODE)"
    echo "  Response: $SEARCH_BODY"
    echo "  → Check if 'yfinance' package is installed in backend"
    echo "  → Check backend logs for yfinance errors"
else
    echo -e "${RED}✗${NC} Stock search endpoint failed (HTTP $SEARCH_CODE)"
fi
echo ""

# Test 4: Check watchlist prices endpoint
echo -e "${YELLOW}[TEST 4]${NC} Testing watchlist prices endpoint..."
PRICES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/portfolio/watchlist/prices?username=test")
PRICES_CODE=$(echo "$PRICES_RESPONSE" | tail -n1)
PRICES_BODY=$(echo "$PRICES_RESPONSE" | head -n-1)

if [ "$PRICES_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Watchlist prices endpoint is working (HTTP $PRICES_CODE)"
elif [ "$PRICES_CODE" = "500" ]; then
    echo -e "${RED}✗${NC} Watchlist prices endpoint returned error (HTTP $PRICES_CODE)"
    echo "  Response: $PRICES_BODY"
else
    echo -e "${YELLOW}⚠${NC} Watchlist prices endpoint returned (HTTP $PRICES_CODE)"
    echo "  This is expected if watchlist is empty"
fi
echo ""

# Summary and recommendations
echo "========================================="
echo "RECOMMENDATIONS"
echo "========================================="
echo ""

if [ "$WATCHLIST_CODE" = "500" ]; then
    echo -e "${YELLOW}1. RUN DATABASE MIGRATION${NC}"
    echo "   The watched_stocks table might not exist. Run:"
    echo ""
    echo "   curl -X POST $BACKEND_URL/admin/migrate-db \\"
    echo "     -H \"Authorization: Bearer YOUR_MIGRATION_SECRET\""
    echo ""
fi

if [ "$SEARCH_CODE" = "500" ]; then
    echo -e "${YELLOW}2. CHECK YFINANCE INSTALLATION${NC}"
    echo "   The yfinance package might not be installed. On your backend server:"
    echo ""
    echo "   pip install yfinance==0.2.40"
    echo "   # Then restart the backend service"
    echo ""
fi

echo -e "${YELLOW}3. CHECK BACKEND LOGS${NC}"
echo "   Look for errors related to:"
echo "   - Database connection issues"
echo "   - Missing tables (watched_stocks)"
echo "   - Missing columns (ticker_symbol, currency, units)"
echo "   - yfinance import errors"
echo ""

echo -e "${YELLOW}4. ENSURE BACKEND HAS BEEN RESTARTED${NC}"
echo "   After deploying new code, restart your backend service:"
echo "   - Docker: docker-compose restart backend"
echo "   - Systemd: systemctl restart your-backend-service"
echo "   - PM2: pm2 restart backend"
echo ""

echo -e "${YELLOW}5. CHECK FRONTEND DEPLOYMENT${NC}"
echo "   Ensure the frontend was rebuilt and deployed:"
echo "   - Run: npm run build"
echo "   - Deploy the build/ folder to your hosting"
echo "   - Clear browser cache (Ctrl+Shift+R)"
echo ""

echo "========================================="
echo "For more help, check backend logs or contact support"
echo "========================================="
