# Portfolio Data Recovery Guide

## Critical Finding: CASCADE DELETE

Your `stock_portfolio` table has a foreign key with `ON DELETE CASCADE`:
```sql
FOREIGN KEY (tab_id) REFERENCES portfolio_tabs(id) ON DELETE CASCADE
```

**This means:** If a portfolio tab is deleted, ALL entries in that tab are automatically deleted by the database.

## What Likely Happened

1. **Portfolio tabs were deleted** (either accidentally or due to an error)
2. **All entries were cascade deleted** automatically by MySQL
3. **Data is gone from the database** (not just hidden)

## Step 1: Verify Data is Actually Gone

### Check via Railway MySQL:
```bash
railway connect mysql
```

Then run:
```sql
-- Check if any tabs exist
SELECT COUNT(*) FROM portfolio_tabs;
SELECT * FROM portfolio_tabs;

-- Check if any entries exist
SELECT COUNT(*) FROM stock_portfolio;
SELECT * FROM stock_portfolio LIMIT 10;

-- Check if entries exist without tabs (orphaned)
SELECT COUNT(*) FROM stock_portfolio WHERE tab_id IS NOT NULL 
  AND tab_id NOT IN (SELECT id FROM portfolio_tabs);
```

## Step 2: Check Railway Backups

Railway may have automatic database backups:

1. Go to Railway Dashboard → MySQL service
2. Check for **Backups** or **Snapshots** section
3. Look for recent backups before the data disappeared
4. Restore from backup if available

## Step 3: Check if Data Exists Elsewhere

### Check API endpoints:
```bash
# Check tabs
curl 'https://api.drpitz.club/api/portfolio-tabs?username=YOUR_USERNAME&role=admin'

# Check entries (without tab filter)
curl 'https://api.drpitz.club/api/portfolio?username=YOUR_USERNAME&role=admin'
```

If these return empty arrays `[]`, the data is gone.

## Step 4: Prevention for Future

I can modify the code to:
1. **Add a confirmation dialog** before deleting tabs
2. **Add a backup before delete** feature
3. **Change CASCADE to SET NULL** (so entries aren't deleted, just orphaned)
4. **Add a recycle bin** - soft delete instead of hard delete

## Step 5: If Data is Gone

Unfortunately, if the data was cascade deleted and there's no backup, it cannot be recovered. However:

1. **Check Railway logs** - see when tabs were deleted
2. **Check if you exported data** - any CSV exports or backups?
3. **Check browser localStorage** - might have cached some data
4. **Recreate the data** - start fresh with new tabs

## Immediate Action

**Check if data still exists:**
```bash
# Run the diagnostic script
./check-portfolio-data.sh

# Or check directly via Railway
railway connect mysql
# Then run the SQL queries above
```

## If You Want to Prevent This in the Future

I can modify the delete endpoint to:
- Require explicit confirmation
- Create a backup before deleting
- Use soft delete (mark as deleted, don't actually delete)
- Change CASCADE to SET NULL

Let me know if you want me to implement any of these safeguards!
