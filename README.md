# 💰 Finance — Family Finance Tracker

Family finance management app with goals, wishes, budgets, recurring transactions, safety pillow, and analytics.

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15+-blue.svg)](https://www.postgresql.org)
[![Tests](https://img.shields.io/badge/tests-16%2F16-brightgreen.svg)](#-testing)

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment](#-environment)
- [Database](#-database)
- [Development](#-development)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Security](#-security)
- [License](#-license)

---

## ✨ Features

- **Authentication** — JWT-based auth with password reset via email (SMTP)
- **Family Management** — Create family, invite members, role-based access (Owner/Member)
- **Transactions** — Income/expense tracking with categories, private transactions
- **Dashboard** — Personal/family view with balance, recent transactions, goals progress
- **Goals** — Savings goals with auto-contribution from income, deadline tracking
- **Wishes** — Priority-based wishlist with funding progress
- **Budgets** — Monthly category limits with overspend warnings
- **Safety Pillow** — Emergency fund calculation (3/6/12 months coverage)
- **Analytics** — Charts, CSV/Excel export
- **Recurring** — Monthly automated transactions via cron

---

## 🛠 Tech Stack

| Layer | Technology |
|:------|:------------|
| **Backend** | Node.js, Express |
| **ORM** | Prisma |
| **Database** | PostgreSQL 15+ |
| **Validation** | Zod |
| **Logging** | Pino |
| **Auth** | JWT (HS256), bcrypt |
| **Email** | Nodemailer (SMTP) |
| **Export** | ExcelJS |
| **Testing** | Jest, Supertest, Playwright |
| **Security** | Helmet, express-rate-limit |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 15

### Installation
```bash
git clone <repo-url>
cd Finance

npm install
```

### Environment
Create `.env` in project root:
```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finance_db

# Auth (generate: openssl rand -base64 32)
JWT_SECRET=your_secure_secret_key

# Email (optional, for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
SMTP_FROM=Finance <noreply@example.com>

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### Database Setup
```bash
npx prisma generate
npx prisma db push
```

### Run
```bash
# Development
npm run dev

# Or production
npm start
```

Server runs at `http://localhost:5000`

---

## 📦 Environment Variables

| Variable | Required | Description |
|:---------|:---------|:------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT (min 32 chars) |
| `CORS_ORIGINS` | No | Allowed origins (comma-separated) |
| `SMTP_*` | No | Email configuration |

---

## 🗄 Database

### Schema
Located in `prisma/schema.prisma` — defines all models:
- User, Family, Transaction, Category
- Goal, GoalContribution, Wish, WishContribution
- Budget, RecurringTransaction
- SafetyPillow, Notification

### Migrations
```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Seed
```bash
node scripts/prisma-seed.js
```

---

## 🧪 Testing

```bash
# Unit tests (Jest)
npm test

# API smoke tests
npm run test:smoke

# E2E tests (Playwright)
npm run test:e2e
```

**Test files:**
- `tests/api.test.js` — Integration tests
- `tests/dashboard.test.js` — Dashboard tests
- `tests/categories.test.js` — Category tests
- `tests/smoke.js` — API smoke tests
- `tests/e2e/*.ts` — Playwright e2e tests

---

## 📁 Project Structure

```
Finance/
├── client/                    # React frontend (Vite)
├── controllers/                # Express controllers
├── routes/                     # API routes
├── services/                   # Business logic
├── middleware/                # Auth, error handling, health
├── lib/                        # Core modules
│   ├── prisma-client.js       # Prisma client
│   ├── logger.js              # Pino logger
│   ├── validation.js          # Zod schemas
│   └── errors.js               # Error classes
├── prisma/                    # Schema & migrations
├── jobs/                       # Cron jobs
├── tests/                      # Jest & Playwright tests
├── scripts/                    # Seed scripts
├── server.js                   # Entry point
├── package.json
├── SECURITY.md                 # Security audit
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with code |
| GET | `/api/auth/me` | Current user |

### Family
| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/auth/family/create` | Create family |
| POST | `/api/auth/family/join` | Join by invite code |
| POST | `/api/auth/family/leave` | Leave family |

### Transactions
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/transactions` | List with filters |
| POST | `/api/transactions` | Create |
| PUT | `/api/transactions/:id` | Update |
| DELETE | `/api/transactions/:id` | Delete |

### Goals
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/goals` | List |
| POST | `/api/goals` | Create |
| PUT | `/api/goals/:id` | Update |
| DELETE | `/api/goals/:id` | Delete |
| POST | `/api/goals/:id/contribute` | Add contribution |

### Wishes
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/wishes` | List |
| POST | `/api/wishes` | Create |
| POST | `/api/wishes/:id/contribute` | Add contribution |

### Budgets
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/budgets` | List with actuals |
| POST | `/api/budgets` | Create |
| PUT | `/api/budgets/:id` | Update |
| DELETE | `/api/budgets/:id` | Delete |

### Other
| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/dashboard` | Dashboard data |
| GET | `/api/categories` | Categories |
| GET | `/api/safety-pillow/settings` | Safety pillow |
| GET | `/api/reports/*` | Analytics |
| GET | `/api/recurring` | Recurring transactions |

All protected routes require `Authorization: Bearer <token>` header.

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for audit details.

### Implemented
- JWT with explicit HS256 algorithm
- Password hashing (bcrypt, cost factor 10)
- Zod input validation
- Rate limiting on auth endpoints
- Helmet security headers
- CORS configuration
- IDOR protection in all controllers

### Recommendations for Production
- Use secret manager (AWS Secrets Manager, HashiCorp Vault)
- Generate strong secrets: `openssl rand -base64 32`
- Set `CORS_ORIGINS` explicitly
- Enable SSL/TLS
- Configure logging aggregation

---

## 📝 License

ISC License - see [LICENSE](LICENSE) file.