# Railway Deployment Troubleshooting

## MySQL "docker-entrypoint.sh: command not found" Error

### Symptoms
The MySQL service crashes with repeated errors in Railway logs:
```
[err] /bin/bash: line 1: docker-entrypoint.sh: command not found
```

### Root Cause
This error occurs when a **custom Start Command is configured** for the MySQL database service in Railway's dashboard. MySQL Docker images have their own built-in entrypoint script, and attempting to override it with a custom command causes this failure.

### Fix (Required Manual Steps in Railway Dashboard)

**⚠️ IMPORTANT: This fix must be applied in the Railway dashboard, not in code.**

#### Step 1: Access the MySQL Service Settings
1. Log in to [railway.app](https://railway.app)
2. Select your project
3. Select the environment where MySQL is crashing (e.g., staging-test, production, etc.)
4. Click on the **MySQL service**

#### Step 2: Remove Custom Start Command
1. Click on the **Settings** tab
2. Scroll to the **Deploy** section
3. Look for **Start Command** or **Custom Start Command** field
4. **DELETE/CLEAR** any value in this field (it should be empty)
5. Click **Save** or apply changes

#### Step 3: Redeploy
1. Go to the **Deployments** tab
2. Click **Deploy** or trigger a new deployment
3. Monitor the logs - the MySQL service should now start successfully

### Verification
After the fix, check the Railway logs for the MySQL service. You should see:
- Normal MySQL startup messages
- No "docker-entrypoint.sh: command not found" errors
- The service should reach a "running" state

### Prevention
- **Never add a custom start command** to Railway MySQL database services
- Always use Railway's MySQL database template: New → Database → MySQL
- The template handles all container configuration automatically

### Alternative Solution: Recreate the Service
If clearing the start command doesn't work:

1. **Backup your database:**
   ```bash
   # Export from Railway MySQL
   # Note: You will be prompted to enter the password securely
   mysqldump -h [MYSQLHOST] -P [MYSQLPORT] -u [MYSQLUSER] -p [MYSQLDATABASE] > backup.sql
   ```

2. **Delete the problematic MySQL service** in Railway

3. **Create a new MySQL service:**
   - Click "New" in your Railway project
   - Select "Database" → "MySQL"
   - Railway will create it with correct defaults

4. **Update environment variables** in your backend service to use the new MySQL instance

5. **Restore your data:**
   ```bash
   # Note: You will be prompted to enter the password securely
   mysql -h [NEW_MYSQLHOST] -P [NEW_MYSQLPORT] -u [NEW_MYSQLUSER] -p [NEW_MYSQLDATABASE] < backup.sql
   ```

### Why This Happens
Railway's MySQL template uses the official MySQL Docker image which has a built-in entrypoint. When you set a custom start command, Railway tries to execute it directly, but `docker-entrypoint.sh` is not in the system PATH - it's the container's ENTRYPOINT. This mismatch causes the "command not found" error.

### Related Links
- [Railway MySQL Documentation](https://docs.railway.app/databases/mysql)
- [Railway Service Settings](https://docs.railway.app/deploy/deployments)
