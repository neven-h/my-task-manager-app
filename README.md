# Task Manager App - drpitz.club

Personal Assistant Task Management System with Hebrew support.

## Features
- ✅ Task tracking with categories and tags
- ✅ Duration tracking for billing
- ✅ Hebrew language support
- ✅ Auto-save drafts
- ✅ CSV export
- ✅ Statistics dashboard

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment to Railway

### 1. Create Railway Account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### 2. Create New Project
- Click "New Project" → "Deploy from GitHub repo"
- Select this repository

### 3. Add MySQL Database

**Option A: Use Railway's Built-in MySQL (Recommended)**
- Click "New" → "Database" → "MySQL"
- Railway auto-configures connection variables

**Option B: Deploy Custom MySQL from this Repository**
- Click "New" → "Deploy from GitHub repo"
- Select this repository and set the root directory to `mysql/`
- This uses a custom Dockerfile that fixes entrypoint issues
- **Important**: If you see `docker-entrypoint.sh: command not found` errors, use this option or ensure no custom start command is set in the MySQL service settings

### 4. Set Environment Variables
In the Railway dashboard, add these variables:
```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
FRONTEND_URL=https://drpitz.club
```

### 5. Configure Domain
- Go to Settings → Networking → Custom Domain
- Add: `api.drpitz.club` (for backend API)
- Update DNS at GoDaddy with the provided CNAME

### 6. Deploy Frontend (Separate Service)
For the frontend, either:
- Deploy to Vercel/Netlify (recommended for static sites)
- Or create another Railway service

## Environment Variables

See `.env.example` for all configuration options.
