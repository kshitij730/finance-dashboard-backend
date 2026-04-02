# Finance Dashboard Backend

A production-ready RESTful API for a finance dashboard system with role-based access control, financial record management, and aggregated analytics.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 18+ | Ubiquitous, async-friendly |
| Framework | Express 4 | Minimal, flexible, well-understood |
| Database | sql.js (SQLite in-memory/file) | Zero native build required; SQLite semantics; portable |
| Auth | JWT (jsonwebtoken) | Stateless, standard |
| Validation | express-validator | Declarative, composable |
| Password hashing | bcryptjs | Pure JS, no native dependency |
| Testing | Jest + Supertest | Industry standard for Node APIs |

---

## Project Structure

```
finance-backend/
├── src/
│   ├── app.js                  # Express app (no listen)
│   ├── server.js               # Entry point — binds port, awaits DB init
│   ├── config/
│   │   ├── database.js         # sql.js wrapper (better-sqlite3-compatible API)
│   │   └── seed.js             # Demo data seeder
│   ├── middleware/
│   │   ├── auth.js             # JWT authenticate + role-based authorize()
│   │   └── errorHandler.js     # Global error handler, 404, validation
│   ├── controllers/            # Thin HTTP handlers — delegate to services
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── recordController.js
│   │   └── dashboardController.js
│   ├── services/               # Business logic, DB access
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── recordService.js
│   │   └── dashboardService.js
│   └── routes/                 # Route definitions with validation rules
│       ├── auth.js
│       ├── users.js
│       ├── records.js
│       └── dashboard.js
└── tests/
    ├── jestSetup.js            # Builds in-memory DB before each test suite
    ├── helpers.js              # Seed utilities (seedUser, seedRecord, etc.)
    ├── auth.test.js
    ├── users.test.js
    ├── records.test.js
    └── dashboard.test.js
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with demo users and records
npm run seed

# Start the server (default port 3000)
npm start

# Development mode with auto-reload
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@finance.com | Admin@123 |
| Analyst | analyst@finance.com | Analyst@123 |
| Viewer | viewer@finance.com | Viewer@123 |

---

## Running Tests

```bash
npm test
```

- **60 tests** across 4 suites (auth, users, records, dashboard)
- Uses an in-memory sql.js database — no file I/O, fully isolated
- Run with `--runInBand` to avoid concurrency issues with shared globals

---

## API Reference

All protected routes require:
```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a new viewer account |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | Any | Get current user profile |

#### POST /api/auth/register
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "Password1"
}
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Alice", "email": "...", "role": "viewer" },
    "token": "eyJ..."
  }
}
```

#### POST /api/auth/login
```json
{ "email": "admin@finance.com", "password": "Admin@123" }
```

---

### Users (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List users (paginated) |
| GET | `/api/users/:id` | Get single user |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update name/role/status |
| DELETE | `/api/users/:id` | Soft-delete (deactivate) user |

**Query params for GET /api/users:**
- `page` (default 1), `limit` (default 20, max 100)
- `role` — filter by `viewer|analyst|admin`
- `status` — filter by `active|inactive`

**POST /api/users body:**
```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "password": "Bob@1234",
  "role": "analyst"
}
```

---

### Financial Records

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/api/records` | All | List records (with filters) |
| GET | `/api/records/:id` | All | Get single record |
| POST | `/api/records` | Admin, Analyst | Create record |
| PATCH | `/api/records/:id` | Admin, Analyst | Update record |
| DELETE | `/api/records/:id` | Admin, Analyst | Soft-delete record |

**Scoping rules:**
- Viewers and analysts see only **their own** records
- Admins see **all** records across all users

**Query params for GET /api/records:**
- `page`, `limit`
- `type` — `income|expense`
- `category` — partial match (case-insensitive)
- `dateFrom`, `dateTo` — format `YYYY-MM-DD`
- `minAmount`, `maxAmount`
- `userId` — admin only, filter by specific user

**POST /api/records body:**
```json
{
  "amount": 50000,
  "type": "income",
  "category": "Salary",
  "date": "2025-04-01",
  "notes": "April payslip"
}
```

---

### Dashboard Analytics

> Accessible to **Admin** and **Analyst** only. Viewers receive `403`.

> Analysts see only their own data; Admins see aggregated data across all users.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Total income, expenses, net balance, counts |
| GET | `/api/dashboard/categories` | Per-category income/expense/net breakdown |
| GET | `/api/dashboard/trends/monthly` | Monthly income vs expense trend |
| GET | `/api/dashboard/trends/weekly` | Weekly income vs expense trend |
| GET | `/api/dashboard/recent` | Recent transactions |
| GET | `/api/dashboard/top-expenses` | Top expense categories with percentages |

**GET /api/dashboard/summary** response:
```json
{
  "success": true,
  "data": {
    "total_income": 235000,
    "total_expenses": 58000,
    "net_balance": 177000,
    "total_records": 15,
    "income_count": 5,
    "expense_count": 10
  }
}
```

**GET /api/dashboard/trends/monthly?months=6** response:
```json
{
  "success": true,
  "data": [
    { "month": "2025-01", "income": 85000, "expense": 26300, "net": 58700, "count": 4 },
    { "month": "2025-02", "income": 100000, "expense": 21200, "net": 78800, "count": 4 }
  ]
}
```

**GET /api/dashboard/top-expenses?limit=3** response:
```json
{
  "success": true,
  "data": [
    { "category": "Rent", "total": 60000, "count": 3, "percentage": 51.72 },
    { "category": "Utilities", "total": 14700, "count": 3, "percentage": 12.67 }
  ]
}
```

---

## Access Control Matrix

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ |
| View own records | ✅ | ✅ | ✅ |
| View all records | ❌ | ❌ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update own records | ❌ | ✅ | ✅ |
| Update any record | ❌ | ❌ | ✅ |
| Delete own records | ❌ | ✅ | ✅ |
| Delete any record | ❌ | ❌ | ✅ |
| View dashboard | ❌ | ✅ (own data) | ✅ (all data) |
| Manage users | ❌ | ❌ | ✅ |

---

## Error Responses

All errors follow a consistent shape:

```json
{ "success": false, "message": "Human-readable error description" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request (e.g. no fields to update) |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Validation failed — includes `errors` array |
| 429 | Rate limit exceeded (100 req / 15 min per IP) |
| 500 | Internal server error |

**Validation error example:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email is required." },
    { "field": "amount", "message": "Amount must be a positive number." }
  ]
}
```

---

## Design Decisions & Assumptions

### Database
- **sql.js** (SQLite compiled to WebAssembly/JS) was chosen because it requires no native compilation — making the project fully portable with `npm install`. Data is persisted to `data/finance.db` between restarts.
- The API layer uses a thin synchronous wrapper that mirrors the `better-sqlite3` API, keeping service code clean and free of `.then()` chains.

### Soft Deletes
- Both users and records are **soft-deleted** (marked inactive / `is_deleted = 1`). This preserves data integrity (foreign keys, audit trails) and allows recovery.

### Role Model
- Three roles: `viewer`, `analyst`, `admin`.
- **Public registration** always creates a `viewer`. Admins create users with any role via `POST /api/users`.
- **Analyst vs Viewer**: Analysts can create, update, and delete their own records and access dashboard analytics. Viewers are read-only and cannot access the dashboard.

### JWT
- Tokens expire in **24 hours**. The `authenticate` middleware fetches a fresh user row on every request to catch mid-session deactivations.

### Pagination
- All list endpoints accept `page` and `limit` query params and return a `pagination` object: `{ total, page, limit, pages }`.

### Rate Limiting
- 100 requests per 15-minute window per IP via `express-rate-limit`.

### Password Validation
- Minimum 6 characters, at least one uppercase letter, at least one digit.

### Tradeoffs
- sql.js is slower than `better-sqlite3` for write-heavy workloads due to WASM overhead and full DB serialisation on every write. For a production system with high write throughput, switching to `better-sqlite3` (or PostgreSQL) would be appropriate.
- No refresh token mechanism — token expiry requires re-login.
- No email verification on registration.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data/finance.db` | SQLite file path |
| `JWT_SECRET` | `finance_secret_key_change_in_production` | **Change in production!** |
