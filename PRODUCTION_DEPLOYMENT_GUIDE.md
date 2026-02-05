# Yahoo Finance Widget - Production Deployment & Troubleshooting Guide

## 🔍 Quick Diagnosis

Run the diagnostic script to identify issues:

```bash
./diagnose_production.sh https://api.drpitz.club/api
```

This will test all endpoints and tell you exactly what's broken.

---

## 🚨 Common Issues & Solutions

### Issue 1: Widget Not Appearing on Frontend

**Symptoms:**
- Stock Portfolio page loads but no watchlist/widget visible
- Console shows no errors

**Solutions:**
1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Verify frontend was rebuilt:**
   ```bash
   cd frontend
   npm run build
   # Deploy the build/ folder
   ```
3. **Check if you're logged in** - the widget requires authentication
   - Widget uses `localStorage.getItem('authUser')`
   - If not logged in, widget won't load

---

### Issue 2: Watchlist API Returns 500 Error

**Symptoms:**
- Console error: `Failed to fetch watchlist`
- Backend logs show: `Table 'watched_stocks' doesn't exist`

**Solutions:**

#### Option A: Run Migration Endpoint (Recommended)
```bash
curl -X POST https://api.drpitz.club/api/admin/migrate-db \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
```

Expected response:
```json
{
  "message": "Migration completed successfully",
  "migrations_applied": ["ticker_symbol", "currency", "units", "watched_stocks_table"]
}
```

#### Option B: Manually Create Table
Connect to your MySQL database and run:
```sql
CREATE TABLE IF NOT EXISTS watched_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ticker_symbol VARCHAR(20) NOT NULL,
    stock_name VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_ticker (username, ticker_symbol),
    INDEX idx_username (username),
    INDEX idx_ticker_symbol (ticker_symbol)
);
```

#### Option C: Restart Backend to Trigger init_db()
```bash
# Docker
docker-compose restart backend

# Systemd
sudo systemctl restart your-backend-service

# PM2
pm2 restart backend
```

The `init_db()` function runs on startup and should create all missing tables.

---

### Issue 3: Stock Search Not Working

**Symptoms:**
- Typing in search box shows no results
- Console error: `ModuleNotFoundError: No module named 'yfinance'`
- Backend /api/portfolio/search-stocks returns 500

**Solutions:**

1. **Install yfinance package:**
   ```bash
   # SSH into your backend server
   pip install yfinance==0.2.40
   ```

2. **Update requirements.txt** (should already be there):
   ```
   yfinance==0.2.40
   ```

3. **Restart backend service** after installing

4. **Check if yfinance can access Yahoo Finance:**
   ```bash
   python3 -c "import yfinance as yf; print(yf.Ticker('AAPL').info.get('currentPrice'))"
   ```

---

### Issue 4: Missing Columns Error

**Symptoms:**
- Backend logs: `Unknown column 'ticker_symbol' in 'field list'`
- Creating/updating portfolio entries fails

**Solution:**

The backend should handle this automatically with dynamic queries, but if it doesn't work:

```bash
# Run migration endpoint
curl -X POST https://api.drpitz.club/api/admin/migrate-db \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
```

Or manually add columns:
```sql
ALTER TABLE stock_portfolio ADD COLUMN ticker_symbol VARCHAR(20);
ALTER TABLE stock_portfolio ADD COLUMN currency VARCHAR(3) DEFAULT 'ILS';
ALTER TABLE stock_portfolio ADD COLUMN units DECIMAL(12,4) DEFAULT 1;
```

---

### Issue 5: CORS Errors

**Symptoms:**
- Console error: `blocked by CORS policy`
- API calls fail with network errors

**Solution:**

Check backend CORS configuration in `app.py`:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://drpitz.club", "https://www.drpitz.club"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

Make sure your frontend domain is in the `origins` list.

---

### Issue 6: Prices Not Updating

**Symptoms:**
- Watchlist shows but prices are "N/A"
- Prices don't refresh every 30 seconds

**Solutions:**

1. **Check if yfinance can fetch data:**
   ```bash
   python3 << EOF
   import yfinance as yf
   ticker = yf.Ticker('AAPL')
   print(ticker.info.get('currentPrice'))
   EOF
   ```

2. **Check backend logs** for yfinance errors

3. **Verify stock tickers are valid:**
   - US stocks: `AAPL`, `GOOGL`, `MSFT`
   - Some tickers might need exchange suffix: `0700.HK`

4. **Check rate limiting:**
   - Yahoo Finance may rate limit requests
   - Wait a few minutes and try again

---

## 📋 Complete Deployment Checklist

### Backend Deployment

- [ ] **1. Set environment variables:**
  ```bash
  MIGRATION_SECRET=your-secure-secret
  DB_HOST=your-database-host
  DB_USER=your-database-user
  DB_PASSWORD=your-database-password
  DB_NAME=your-database-name
  SECRET_KEY=your-flask-secret
  ```

- [ ] **2. Install dependencies:**
  ```bash
  pip install -r requirements.txt
  ```

- [ ] **3. Deploy updated code:**
  ```bash
  git pull origin main
  ```

- [ ] **4. Restart backend:**
  ```bash
  # This triggers init_db() which creates tables
  systemctl restart your-backend-service
  ```

- [ ] **5. Run migration endpoint (if needed):**
  ```bash
  curl -X POST https://api.drpitz.club/api/admin/migrate-db \
    -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
  ```

- [ ] **6. Check logs:**
  ```bash
  tail -f /path/to/backend/logs
  # Look for: "Database initialized successfully"
  ```

### Frontend Deployment

- [ ] **1. Update code:**
  ```bash
  git pull origin main
  ```

- [ ] **2. Install dependencies:**
  ```bash
  cd frontend
  npm install
  ```

- [ ] **3. Build production bundle:**
  ```bash
  npm run build
  ```

- [ ] **4. Deploy build folder:**
  ```bash
  # Copy build/ contents to your web server
  # Example for nginx:
  cp -r build/* /var/www/html/
  ```

- [ ] **5. Clear CDN cache** (if using Cloudflare, etc.)

- [ ] **6. Test in browser** (hard refresh with Ctrl+Shift+R)

---

## 🧪 Manual Testing Steps

1. **Login to your app** at https://drpitz.club

2. **Navigate to Stock Portfolio** section

3. **Verify watchlist appears** (may be empty initially)

4. **Test stock search:**
   - Type "AAPL" in search box
   - Should see "Apple Inc." appear
   - Click "Add to Watchlist"

5. **Verify stock was added** to watchlist with live price

6. **Wait 30 seconds** and verify price updates

7. **Test portfolio entry:**
   - Add a new stock to portfolio
   - Verify ticker_symbol, currency, units fields work

8. **Check browser console** for any errors

---

## 🔐 Security Notes

- **MIGRATION_SECRET:** Use a strong random value (32+ characters)
- **Never commit secrets** to git
- **Use environment variables** for all secrets
- The migration endpoint should only be accessible to admins

---

## 📞 Still Having Issues?

If the widget still doesn't work after following this guide:

1. **Run the diagnostic script:**
   ```bash
   ./diagnose_production.sh https://api.drpitz.club/api
   ```

2. **Check backend logs** for specific error messages

3. **Check browser console** (F12) for frontend errors

4. **Verify database tables exist:**
   ```sql
   SHOW TABLES LIKE 'watched_stocks';
   DESCRIBE stock_portfolio;
   ```

5. **Check if backend can reach Yahoo Finance:**
   ```bash
   curl "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL"
   ```

---

## 📝 Summary of Changes in This Deployment

### Backend Changes (backend/app.py)
- ✅ Added `/api/admin/migrate-db` endpoint for manual migrations
- ✅ Improved `init_db()` with better error handling
- ✅ Enhanced `create_portfolio_entry()` with dynamic query building
- ✅ Enhanced `update_portfolio_entry()` with dynamic query building
- ✅ Creates `watched_stocks` table automatically
- ✅ Adds missing columns (`ticker_symbol`, `currency`, `units`)

### Frontend (Already Deployed)
- ✅ StockPortfolio.jsx with full Yahoo Finance integration
- ✅ Watchlist management
- ✅ Stock search functionality
- ✅ Live price updates every 30 seconds
- ✅ Currency support

### No Database Changes Required (Handled Automatically)
- Tables and columns are created/added by `init_db()` on startup
- Migration endpoint available as fallback
- Graceful handling of missing columns in queries

---

## 🎯 Expected Behavior After Deployment

1. **Stock Portfolio page loads** with tabs
2. **Watchlist section appears** at the top (may be empty)
3. **Search box works** - typing shows stock suggestions
4. **Adding stocks to watchlist works** - shows in list with price
5. **Prices update automatically** every 30 seconds
6. **Portfolio entries** can include ticker symbols
7. **No console errors** related to missing tables/columns

Good luck! 🚀
