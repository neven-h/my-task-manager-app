#!/bin/bash

# Script to check if portfolio data exists in the database
# Run this to diagnose if data is actually gone or just not displaying

echo "=========================================="
echo "Portfolio Data Diagnostic"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓${NC} Railway CLI found"
    echo ""
    echo "To check your production database:"
    echo "1. Run: railway connect mysql"
    echo "2. Then run these SQL queries:"
    echo ""
    echo "   -- Check if portfolio tabs exist"
    echo "   SELECT COUNT(*) as tab_count FROM portfolio_tabs;"
    echo "   SELECT * FROM portfolio_tabs;"
    echo ""
    echo "   -- Check if portfolio entries exist"
    echo "   SELECT COUNT(*) as entry_count FROM stock_portfolio;"
    echo "   SELECT id, name, ticker_symbol, tab_id, created_by, entry_date FROM stock_portfolio LIMIT 10;"
    echo ""
    echo "   -- Check entries per tab"
    echo "   SELECT tab_id, COUNT(*) as count FROM stock_portfolio GROUP BY tab_id;"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} Railway CLI not found"
    echo "Install it with: npm i -g @railway/cli"
fi

echo ""
echo "=========================================="
echo "API Endpoint Tests"
echo "=========================================="
echo ""
echo "Test these endpoints (replace YOUR_USERNAME and YOUR_ROLE):"
echo ""
echo "1. Check portfolio tabs:"
echo "   curl 'https://api.drpitz.club/api/portfolio-tabs?username=YOUR_USERNAME&role=admin'"
echo ""
echo "2. Check ALL portfolio entries (no tab filter):"
echo "   curl 'https://api.drpitz.club/api/portfolio?username=YOUR_USERNAME&role=admin'"
echo ""
echo "3. Check portfolio summary:"
echo "   curl 'https://api.drpitz.club/api/portfolio/summary?username=YOUR_USERNAME&role=admin'"
echo ""
echo "4. Check entries for a specific tab (replace TAB_ID):"
echo "   curl 'https://api.drpitz.club/api/portfolio?username=YOUR_USERNAME&role=admin&tab_id=TAB_ID'"
echo ""

echo "=========================================="
echo "Common Issues"
echo "=========================================="
echo ""
echo "1. If tabs exist but entries are empty:"
echo "   - Entries might be in a different tab"
echo "   - Check tab_id in the database"
echo ""
echo "2. If everything is empty:"
echo "   - Data might have been deleted"
echo "   - Check Railway backups"
echo ""
echo "3. If API returns errors:"
echo "   - Check Railway backend logs"
echo "   - Verify username/role parameters"
echo ""
