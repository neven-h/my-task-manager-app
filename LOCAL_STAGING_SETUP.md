# Local Staging Environment Setup

This guide helps you set up a complete local staging environment to test changes before pushing to your main branch.

## Current Branch
You're on: `claude/local-staging-branch-dLnVf`

This is your local staging branch where you can test changes safely.

## Prerequisites

1. **Python 3.x** - Already installed
2. **Node.js & npm** - For frontend
3. **MySQL Database** - Choose one option below:

### Option A: MySQL with Docker (Recommended)
```bash
# Start MySQL container
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=local123 \
  -e MYSQL_DATABASE=task_tracker \
  -p 3306:3306 \
  -d mysql:8

# Verify it's running
docker ps | grep mysql-local
```

### Option B: Install MySQL Locally
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server

# Start MySQL
sudo systemctl start mysql
sudo mysql -u root -p

# Create database
CREATE DATABASE task_tracker;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'local123';
GRANT ALL PRIVILEGES ON task_tracker.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Setup Steps

### 1. Database Initialization

The `.env` file is already configured for local development.

Initialize your database with sample data:

```bash
# If using Docker MySQL:
docker exec -i mysql-local mysql -uroot -plocal123 task_tracker < local_data_export.sql

# If using local MySQL:
mysql -uroot -plocal123 task_tracker < local_data_export.sql
```

### 2. Backend Setup

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Return to root
cd ..
```

### 3. Frontend Setup

```bash
# Install Node dependencies
cd frontend
npm install

# Return to root
cd ..
```

## Running the Local Environment

### Quick Start (Use the provided scripts)

```bash
# Start backend (from root directory)
./run-backend.sh

# In another terminal, start frontend
./run-frontend.sh
```

### Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
python3 app.py
# Backend will run on http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:3000
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api
- **Login**: Username: `pitz`, Password: `dev123` (as configured in .env)

## Configuration Files

### Backend: `.env`
- Located at project root
- Contains all backend configuration
- Already set up with secure local keys
- **DO NOT commit this file**

### Frontend: `frontend/.env.local`
- Points to local backend API
- **DO NOT commit this file**

## Testing Workflow

1. Make your changes on this branch (`claude/local-staging-branch-dLnVf`)
2. Test locally using the setup above
3. When satisfied, commit your changes
4. Merge or push to main branch when ready

## Database Management

### Reset Database
```bash
# Stop and remove container
docker stop mysql-local
docker rm mysql-local

# Start fresh
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=local123 \
  -e MYSQL_DATABASE=task_tracker \
  -p 3306:3306 \
  -d mysql:8

# Re-import data
docker exec -i mysql-local mysql -uroot -plocal123 task_tracker < local_data_export.sql
```

### Backup Local Database
```bash
docker exec mysql-local mysqldump -uroot -plocal123 task_tracker > my_local_backup.sql
```

## Troubleshooting

### Backend won't start
- Check if MySQL is running: `docker ps | grep mysql-local`
- Verify database credentials in `.env`
- Check Python dependencies: `pip list`

### Frontend won't connect to backend
- Verify backend is running on port 5001
- Check `frontend/.env.local` has correct API URL
- Check browser console for CORS errors

### Database connection errors
- Ensure MySQL is running
- Verify database exists: `docker exec -it mysql-local mysql -uroot -plocal123 -e "SHOW DATABASES;"`
- Check DB credentials in `.env`

## Security Notes

- This is a LOCAL DEVELOPMENT setup only
- Encryption keys are generated for local use
- Default password is `dev123` - only for local testing
- Never use these credentials in production
- The `.env` and `frontend/.env.local` files are gitignored

## Next Steps

Once your changes are tested and working:
1. Commit your changes: `git add . && git commit -m "Your message"`
2. Push to this branch: `git push -u origin claude/local-staging-branch-dLnVf`
3. Create a PR or merge to main when ready
