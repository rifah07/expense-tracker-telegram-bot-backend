# 💸 Expense Tracker Bot — Backend

> A production-ready Telegram bot that tracks your daily expenses using AI-powered natural language parsing. Built with Node.js, Express, TypeScript, Prisma ORM, and Google Gemini AI.


---

## 🔗 Links

| Resource | URL |
|---|---|
| 🤖 Telegram Bot | [@ExpenseTrack_R_Bot](https://t.me/ExpenseTrack_R_Bot) |
| 🖥️ Backend API | [expense-tracker-backend.vercel.app](https://expense-tracker-telegram-bot-backen-eight.vercel.app/) |
| 🎨 Frontend Dashboard | [expense-tracker-frontend.vercel.app](https://expense-tracker-telegram-bot-fronte.vercel.app/login) |
| 📦 Frontend Repo | [github.com/rifah07/expense-tracker-telegram-bot-frontend](https://github.com/rifah07/expense-tracker-telegram-bot-frontend) |

---

## ✨ Features

- 🤖 **Telegram Bot** — Send `250 lunch` to instantly log an expense
- 🧠 **AI Parsing** — Google Gemini converts free text to structured data
- ⚡ **Keyword Matching** — Instant local categorization before hitting AI
- 📊 **Reports** — `/today`, `/week`, `/month` summaries inside Telegram
- 💰 **Budget Alerts** — Get notified at 80% and 100% of monthly budget
- 🔐 **JWT Auth** — Secure dashboard login via Telegram ID
- 🌐 **REST API** — Full API for the React dashboard
---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Neon.tech) |
| Bot | Telegraf |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Logging | Winston |
| Deployment | Vercel (serverless) |

---

## 📁 Project Structure

```
expense-tracker-backend/
│
├── api/
│   └── index.ts                  ← Vercel serverless entry
│
├── prisma/
│   ├── schema.prisma             ← DB schema (User, Expense, Budget)
│   └── seed.ts                   ← Sample data for local dev
│
├── src/
│   ├── config/
│   │   ├── env.ts                ← Zod env validation
│   │   ├── logger.ts             ← Winston logger
│   │   └── database.ts           ← Prisma singleton
│   │
│   ├── types/
│   │   └── index.ts              ← Shared TypeScript types
│   │
│   ├── middlewares/
│   │   ├── auth.ts               ← JWT middleware
│   │   ├── errorHandler.ts       ← Global error handler
│   │   └── requestLogger.ts      ← HTTP request logger
│   │
│   ├── services/
│   │   └── ai.service.ts         ← Gemini AI expense parser
│   │
│   ├── modules/
│   │   ├── user/                 ← Auth + user profile
│   │   ├── expense/              ← Expense CRUD + reports
│   │   ├── budget/               ← Budget management + alerts
│   │   └── bot/                  ← Telegram bot handlers
│   │
│   ├── app.ts                    ← Express app factory
│   └── server.ts                 ← Local dev server
│
├── env.example                   ← Copy to .env
├── vercel.json                   ← Vercel config
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repo
```bash
git clone https://github.com/rifah07/expense-tracker-telegram-bot-backend
cd expense-tracker-telegram-bot-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → New Project → Connection string |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → /newbot |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

### 4. Set up the database
```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed          # optional: adds sample data
```

### 5. Start the server
```bash
npm run dev
```

Server runs at `http://localhost:3001`
Bot starts in polling mode automatically.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login with Telegram ID → get JWT | ❌ |
| GET | `/api/auth/me` | Get current user profile | ✅ |

### Expenses
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/expenses` | Create expense | ✅ |
| GET | `/api/expenses/today` | Today's expenses + summary | ✅ |
| GET | `/api/expenses/week` | This week's expenses + summary | ✅ |
| GET | `/api/expenses/month` | This month's expenses + summary | ✅ |
| GET | `/api/expenses/recent` | Recent expenses (limit query) | ✅ |
| GET | `/api/expenses/breakdown` | Category breakdown by date range | ✅ |
| DELETE | `/api/expenses/:id` | Delete an expense | ✅ |

### Budget
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/budgets` | Set monthly budget | ✅ |
| GET | `/api/budgets/status` | Budget + spending status | ✅ |
| DELETE | `/api/budgets` | Remove budget | ✅ |

### Bot
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bot/webhook` | Telegram webhook receiver |
| GET | `/api/bot/info` | Bot info (debug) |
| GET | `/health` | Health check |

---

## 🤖 Bot Commands

| Command | Description |
|---|---|
| `/start` | Welcome message + instructions |
| `/today` | Today's expenses |
| `/week` | This week's summary by category |
| `/month` | This month's summary + budget status |
| `/budget` | Current budget status with progress bar |
| `/setbudget 10000` | Set monthly budget to ৳10,000 |
| `/help` | Show help message |

**Adding expenses (just type naturally):**
```
250 lunch
80 rickshaw to office
500 uber ride yesterday
1200 grocery shopping 2 days ago
600 netflix subscription
```

---

## 🗄️ Database Schema

```
User
 ├── id (cuid)
 ├── telegramId (unique)
 ├── name
 ├── username
 ├── expenses → [Expense]
 └── budget   → Budget

Expense
 ├── id (cuid)
 ├── amount
 ├── category (Food|Transport|Shopping|Bills|Health|Entertainment|Others)
 ├── note
 ├── date
 └── userId → User

Budget
 ├── id (cuid)
 ├── monthlyLimit
 ├── alertPercent (default: 80)
 └── userId → User (unique)
```

---

## 🧠 AI Parsing Flow

```
User sends: "500 uber ride yesterday"
          │
          ▼
Keyword match? → "uber" found → Transport ✅
          │
          ▼
Simple pattern match?
"500 uber ride yesterday" → no clean number+word match
          │
          ▼
Gemini AI called →
{
  amount: 500,
  category: "Transport",
  note: "uber ride",
  date: "2024-03-14"   ← yesterday resolved
}
          │
          ▼
Saved to DB → Bot replies with confirmation
```