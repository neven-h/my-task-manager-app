# My Task Manager App

A full-stack personal assistant web application built with Flask and React. Manages tasks, bank transactions, and a stock portfolio — with Hebrew language support and a fully responsive mobile interface.

**Live demo → [drpitz.club](https://drpitz.club)**

---
Personal Assistant Task Management System with Hebrew support -
that I created using Claude Code and cursor. 

## Features

### Task Management
- Create, edit, and track tasks with custom categories and tags
- Duration tracking for billing and time reporting
- File attachments via Cloudinary
- CSV export and auto-save drafts
- Statistics dashboard

### Bank Transaction Tracking
- Upload bank CSV/Excel files with automatic Hebrew encoding detection
- Organize transactions into custom tabs
- Manual transaction entry and month-based deletion
- Encrypted storage of all financial data

### Stock Portfolio
- Real-time stock prices via Yahoo Finance
- Watchlist and portfolio tabs
- Yahoo Finance portfolio import

### Security
- JWT authentication with refresh flow
- Two-factor authentication (TOTP + QR code setup)
- AES-256 field-level encryption for sensitive financial data
- Role-based access control (admin / user)
- Rate limiting on all auth endpoints

---

## Tech Stack

**Backend**
- Python / Flask 3.1 · Gunicorn
- MySQL with connection pooling
- PyJWT · bcrypt · cryptography (Fernet)
- Flask-Limiter · Flask-Mail · Flask-CORS
- pandas · openpyxl · yfinance · Cloudinary

**Frontend**
- React 18 · Vite
- React Router v6
- Lucide React icons
- Fully responsive — dedicated mobile prototype views

**DevOps**
- Deployed on [Railway](https://railway.app) (backend + MySQL)
- Frontend on Vercel
- GitHub Actions CI (lint + build on every PR)

---

## Local Development

### Prerequisites
- Python 3.11+
- Node 18+
- MySQL 8 (or Docker)

### 1. Clone and configure
```bash
git clone https://github.com/neven-h/my-task-manager-app.git
cd my-task-manager-app
cp .env.example .env   # fill in your values
```

### 2. Start MySQL (Docker)
```bash
docker run --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=task_tracker \
  -p 3306:3306 -d mysql:8
```

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend runs at `http://localhost:5001`

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask session signing key |
| `JWT_SECRET_KEY` | JWT token signing key |
| `DATA_ENCRYPTION_KEY` | Fernet key for encrypting financial data |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection |
| `FRONTEND_URL` | e.g. `http://localhost:5173` for local dev |
| `USER_PITZ_PASSWORD` | *(optional)* password for built-in admin user |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | *(optional)* Gmail app password for password reset |
| `CLOUDINARY_URL` | *(optional)* for file attachment uploads |

Generate secret keys:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"          # SECRET_KEY / JWT_SECRET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # DATA_ENCRYPTION_KEY
```

> ⚠️ Back up your `DATA_ENCRYPTION_KEY` securely. If lost, encrypted transaction data cannot be recovered.

---

## Deployment (Railway)

1. Create a new project on [Railway](https://railway.app) from this repo
2. Add a **MySQL** database service
3. Set environment variables in the Railway dashboard (use Railway's `${{MySQL.*}}` references for DB vars)
4. Set `FRONTEND_URL` to your frontend domain
5. Deploy frontend separately on Vercel or Netlify

---

## Project Structure

```
├── backend/
│   ├── app.py              # Flask entry point
│   ├── config.py           # App setup, CORS, extensions
│   ├── auth_utils.py       # JWT helpers, decorators
│   ├── db.py               # MySQL connection pool
│   ├── crypto.py           # Field-level encryption
│   ├── finance.py          # Yahoo Finance integration
│   ├── helpers.py          # Shared utilities
│   ├── routes/
│   │   ├── auth.py         # Login, signup, 2FA, password reset
│   │   ├── tasks.py        # Task CRUD
│   │   ├── transactions.py # Bank transaction management
│   │   ├── portfolio.py    # Stock portfolio
│   │   └── admin.py        # Admin endpoints
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── pages/          # TaskTracker, BankTransactions, StockPortfolio, ...
    │   ├── components/     # Shared UI components
    │   └── mobile-prototype/  # Responsive mobile views
    └── package.json
```

---

## License

MIT
