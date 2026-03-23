# World Wide Pitz — Personal Assistant App

A full-stack personal assistant web application for managing tasks, budgets, renovation projects, bank transactions, stock portfolios, and client relationships — with Hebrew language support, a brutalist design system, and a native iOS companion app.

**Live → [drpitz.club](https://drpitz.club)**

> **📖 Looking for the full technical deep dive?** See [ARCHITECTURE.md](ARCHITECTURE.md) — covers every architectural decision, database schema, security implementation, design system, and an interview Q&A cheat sheet.

---

## Features

### Task Management
- Create, edit, and track tasks with multiple categories and tags
- Duration tracking for billing and time reporting
- Completed vs. uncompleted task distinction for workflow efficiency
- File attachments via Cloudinary
- CSV export, auto-save drafts, and exit confirmation dialogs
- Statistics dashboard with frequency analysis

### Budget Tracker
- Monthly income and expense tracking with category breakdowns
- Sidebar-based month navigation with summary cards
- Expense charts (pie + bar) with filtered views
- Filter by date range, category, and type
- CSV export

### Renovation Tracker
- Track renovation items grouped by area, contractor, or category
- Per-item payment tracking with running totals
- Status workflow: Planned → In Progress → Done
- Summary bar with estimated, paid, remaining, and over-budget calculations
- SVG pie chart and estimated-vs-paid comparison bars
- Filter by search, status, area, contractor, category, and date range
- File attachments per item
- CSV export

### Bank Transaction Tracking
- Upload bank CSV/Excel files with automatic Hebrew encoding detection
- Organize transactions into custom tabs
- Manual transaction entry and month-based deletion
- AES-256 encrypted storage of all financial data

### Stock Portfolio
- Real-time stock prices via Yahoo Finance
- Watchlist and portfolio tabs
- Yahoo Finance portfolio import

### Clients Management
- Client directory with contact details
- Role-based visibility (admin-only section)

### Security & Auth
- JWT authentication with refresh token flow
- Two-factor authentication (TOTP + QR code setup)
- AES-256 field-level encryption for sensitive financial data
- Role-based access control (admin / limited user)
- Rate limiting on all auth endpoints
- Password reset via email

---

## Design System

The app uses a **brutalist design aesthetic** — no rounded corners, no soft shadows, bold geometric UI. The color palette is built around three primaries:

| Role | Color |
|------|-------|
| Primary | `#0000FF` (blue) |
| Accent | `#FF0000` (red) |
| Highlight | `#FFD500` (yellow) |

Typography uses Inter/Helvetica Neue with heavy weights, uppercase labels, and tight letter-spacing. Currency is displayed in ₪ (Israeli Shekel) with tabular-nums formatting. The interface supports Hebrew text in an LTR layout.

---

## Tech Stack

**Backend**
- Python 3.11 / Flask 3.1 · Gunicorn
- MySQL 8 with connection pooling
- PyJWT · bcrypt · cryptography (Fernet)
- Flask-Limiter · Flask-Mail · Flask-CORS
- pandas · openpyxl · yfinance · Cloudinary

**Frontend**
- React 18 · Vite
- React Router v6
- Lucide React icons
- Component-driven architecture (max 200 lines per file)
- Fully responsive with dedicated mobile views

**iOS**
- Capacitor for native iOS builds
- Portrait-optimized background images
- Touch-friendly UI with 44px minimum tap targets

**DevOps**
- Backend + MySQL deployed on [Railway](https://railway.app)
- Frontend on [Vercel](https://vercel.com)
- GitHub Actions CI (lint + build on every PR)
- Automatic database backups on task create/update

---

## Project Structure

```
├── backend/
│   ├── app.py                    # Flask entry point
│   ├── config.py                 # App setup, CORS, extensions
│   ├── auth_utils.py             # JWT helpers, decorators
│   ├── db.py                     # MySQL connection pool
│   ├── crypto.py                 # Field-level AES-256 encryption
│   ├── finance.py                # Yahoo Finance integration
│   ├── helpers.py                # Shared utilities
│   ├── routes/
│   │   ├── auth.py               # Login, signup, 2FA, password reset
│   │   ├── tasks.py              # Task CRUD
│   │   ├── task_export.py        # CSV export
│   │   ├── taxonomy.py           # Categories and tags
│   │   ├── attachments.py        # File attachment management
│   │   ├── budget.py             # Budget CRUD + export
│   │   ├── renovation.py         # Renovation items, payments, attachments, export
│   │   ├── transactions.py       # Bank transaction management
│   │   ├── transaction_tabs.py   # Transaction tab management
│   │   ├── transaction_query.py  # Transaction querying
│   │   ├── portfolio.py          # Stock portfolio
│   │   ├── portfolio_market.py   # Market data
│   │   ├── portfolio_tabs.py     # Portfolio tab management
│   │   ├── portfolio_yahoo.py    # Yahoo Finance import
│   │   └── admin.py              # Admin endpoints
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js                # API helpers + auth headers
    │   ├── config.js             # Environment config
    │   │
    │   ├── TaskTracker.jsx       # Task management page
    │   ├── BankTransactions.jsx  # Bank transactions page
    │   ├── StockPortfolio.jsx    # Stock portfolio page
    │   ├── ClientsManagement.jsx # Client directory
    │   ├── Budget.jsx            # Budget orchestrator
    │   ├── Renovation.jsx        # Renovation orchestrator
    │   │
    │   ├── components/
    │   │   ├── budget/           # BudgetHeader, BudgetSummaryBar,
    │   │   │                     # BudgetExpenseChart, BudgetFilterBar, ...
    │   │   ├── renovation/       # RenovationHeader, RenovationSummaryBar,
    │   │   │                     # RenovationItem, RenovationItemForm,
    │   │   │                     # RenovationPaymentList, RenovationPaymentForm,
    │   │   │                     # RenovationFilterBar, RenovationGroupToggle,
    │   │   │                     # RenovationChart, RenovationAttachmentList,
    │   │   │                     # RenovationAreaGroup, RenovationStatusBadge,
    │   │   │                     # renovationConstants.js
    │   │   ├── tasks/            # Task UI components
    │   │   ├── transactions/     # Transaction UI components
    │   │   ├── portfolio/        # Portfolio UI components
    │   │   └── common/           # Shared UI (ButtonFactory, etc.)
    │   │
    │   ├── hooks/                # useRenovation, useRenovationFilters,
    │   │                         # useBudget, useBudgetFilters, ...
    │   ├── context/              # React context providers
    │   ├── utils/                # Utility functions
    │   ├── ios/                  # iOS-specific components and styles
    │   └── mobile-prototype/     # Responsive mobile views
    │
    ├── ios/                      # Capacitor iOS project
    └── package.json
```

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

## Deployment

| Service | Platform |
|---------|----------|
| Backend + MySQL | [Railway](https://railway.app) |
| Frontend | [Vercel](https://vercel.com) |
| iOS | Capacitor → TestFlight |

Hosting runs approximately $5–6/month.

---

## Built With AI

This project was developed with the help of AI tools at every stage:

- **Claude Code** — Architecture decisions, agentic feature implementation, security audit, debugging
- **Claude (chat + projects)** — Planning, prompt engineering, phased development specs, code review
- **Cursor** — Feature implementation, refactoring, rapid iteration
- **GitHub Copilot** — Code completion, boilerplate generation

All AI-generated code was reviewed, tested, and adapted by the author. The overall architecture, feature design, and product decisions are my own.

---

## License

MIT
