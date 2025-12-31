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
- Click "New" → "Database" → "MySQL"
- Railway auto-configures connection variables

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
