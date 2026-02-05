# Quick Start - Local Staging Environment

You're on branch: `claude/local-staging-branch-dLnVf`

## First Time Setup (One Time Only)

### 1. Setup Database
```bash
./setup-local-db.sh
```
This will:
- Start MySQL in Docker container
- Create the `task_tracker` database
- Optionally import your data

If you don't have Docker, see `LOCAL_STAGING_SETUP.md` for alternative MySQL installation.

### 2. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

## Daily Usage (Every Time You Work)

### Start the Application

**Terminal 1 - Backend:**
```bash
./run-backend.sh
```
Backend runs on: http://localhost:5001

**Terminal 2 - Frontend:**
```bash
./run-frontend.sh
```
Frontend runs on: http://localhost:3000

### Access the App
Open browser to: http://localhost:3000

**Login credentials:**
- Username: `pitz`
- Password: `dev123`

## Workflow

1. **Make Changes** - Edit code in your IDE
2. **Test Locally** - Both servers auto-reload on changes
3. **Verify** - Test in browser at http://localhost:3000
4. **Commit** - When satisfied:
   ```bash
   git add .
   git commit -m "Your description"
   ```
5. **Push** - When ready to share:
   ```bash
   git push -u origin claude/local-staging-branch-dLnVf
   ```

## Configuration Files Created

- `.env` - Backend config (local development keys & DB)
- `frontend/.env.local` - Frontend API endpoint config
- `LOCAL_STAGING_SETUP.md` - Detailed setup guide
- `run-backend.sh` - Backend startup script
- `run-frontend.sh` - Frontend startup script
- `setup-local-db.sh` - Database setup script

**All config files are gitignored** - they won't be committed.

## Common Tasks

### Restart MySQL
```bash
docker stop mysql-local
docker start mysql-local
```

### Reset Database
```bash
docker stop mysql-local
docker rm mysql-local
./setup-local-db.sh
```

### Check What's Running
```bash
# Check MySQL
docker ps | grep mysql-local

# Check if backend is running
curl http://localhost:5001/api/health

# Check if frontend is running
curl http://localhost:3000
```

## Troubleshooting

### "Connection refused" errors
- Make sure MySQL is running: `docker ps | grep mysql-local`
- Start it: `docker start mysql-local`
- Or run: `./setup-local-db.sh`

### Backend won't start
- Check `.env` file exists in project root
- Verify Python dependencies: `pip list | grep Flask`
- Check if port 5001 is already in use: `lsof -i :5001`

### Frontend won't connect to backend
- Verify backend is running: `curl http://localhost:5001/api/health`
- Check `frontend/.env.local` exists
- Clear browser cache and reload

## Need Help?

See `LOCAL_STAGING_SETUP.md` for comprehensive documentation.
