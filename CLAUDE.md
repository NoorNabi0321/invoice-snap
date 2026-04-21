# CLAUDE.md — InvoiceSnap Project Guide

## Project Overview

InvoiceSnap is a full-stack invoice management application for freelancers and small businesses. Users can create professional invoices, manage clients, track payment statuses, download PDF invoices, and view revenue analytics from a dashboard.

**Live Stack:**
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS 3
- **Backend:** Node.js + Express 4 + TypeScript
- **Database:** PostgreSQL 15+
- **Deployment:** Docker + Docker Compose + Nginx (Ubuntu VM via VirtualBox)

---

## Project Structure

```
invoice_snap/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Reusable primitives (Button, Input, Modal, Card, Badge, Select, Table, Spinner)
│   │   │   ├── layout/         # Sidebar, Header, MainLayout
│   │   │   └── invoice/        # InvoiceForm, LineItemRow, InvoicePreview, InvoicePDF
│   │   ├── pages/              # One file per route (Dashboard, Invoices, InvoiceCreate, InvoiceView, Clients, Settings, Login, Register)
│   │   ├── hooks/              # useAuth, useInvoices, useClients, useDashboard, useDebounce
│   │   ├── services/           # api.ts (axios instance), auth.service.ts, invoice.service.ts, client.service.ts, dashboard.service.ts
│   │   ├── context/            # AuthContext.tsx
│   │   ├── types/              # index.ts — all shared interfaces
│   │   ├── utils/              # formatCurrency.ts, formatDate.ts, validators.ts, cn.ts (classnames helper)
│   │   ├── App.tsx             # Router + AuthProvider wrapper
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind directives + custom base styles
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts           # PostgreSQL pool (pg)
│   │   │   └── env.ts          # Validated environment variables
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verification, attaches req.user
│   │   │   ├── errorHandler.ts # Global error handler
│   │   │   └── validate.ts     # Request validation with express-validator
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── invoice.routes.ts
│   │   │   ├── client.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── controllers/        # One controller per route file
│   │   ├── models/             # Raw SQL query functions per entity
│   │   ├── utils/
│   │   │   ├── pdfGenerator.ts # PDFKit invoice generation
│   │   │   └── invoiceNumber.ts # Auto-increment INV-XXXX logic
│   │   ├── types/
│   │   │   └── index.ts        # Express req extensions, DB row types
│   │   └── app.ts              # Express app init + route mounting
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── tsconfig.json
│
├── docker/
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── nginx.conf
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── CLAUDE.md                   # ← This file
└── README.md
```

---

## Commands

### Client (from `client/`)
```bash
npm install                     # Install dependencies
npm run dev                     # Start dev server on :5173
npm run build                   # Production build to dist/
npm run preview                 # Preview production build locally
npx tsc --noEmit                # Type-check without emitting
```

### Server (from `server/`)
```bash
npm install                     # Install dependencies
npm run dev                     # Start with tsx watch on :5000
npm run build                   # Compile TS to dist/
npm start                       # Run compiled JS (production)
```

### Database
```bash
# Connect to local PostgreSQL
psql -U postgres -d invoice_snap

# Run migrations
psql -U postgres -d invoice_snap -f server/migrations/001_initial_schema.sql
```

### Docker (from project root)
```bash
docker-compose up --build       # Build and start all services
docker-compose up -d            # Start detached
docker-compose down             # Stop all
docker-compose down -v          # Stop and delete volumes (⚠ deletes DB data)
docker-compose logs -f server   # Tail server logs
```

---

## Coding Conventions

### General
- Use TypeScript strict mode everywhere — no `any` unless absolutely unavoidable, and add a `// TODO: type this properly` comment if forced
- Use named exports, not default exports (exception: page components for lazy loading)
- File names: `kebab-case.ts` for utilities, `PascalCase.tsx` for components, `camelCase.ts` for services
- Keep files under 200 lines — split if larger
- No `console.log` in committed code — use a logger utility on the backend and remove all console statements on the frontend before commits

### TypeScript Types (shared across client and server)
```typescript
// All IDs are UUID strings
type UUID = string;

// Invoice statuses — used in DB enum, API, and UI
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// All monetary values stored as integers (cents) in DB
// Converted to display format (dollars) only in the UI layer
// Example: $150.75 → stored as 15075 in DB

// All dates stored as ISO 8601 strings in API responses
// PostgreSQL TIMESTAMPTZ → JSON string → parsed in frontend
```

### Frontend Conventions

**Components:**
- Functional components only — no class components
- Props interface defined above the component in the same file, named `{ComponentName}Props`
- Use `cn()` utility (clsx + tailwind-merge) for conditional classnames
- Destructure props in function signature
- Every component that fetches data should show a loading state and an error state

**State Management:**
- React Context + useReducer for auth state
- Local useState for component-level state
- No Redux or Zustand — the app is simple enough without them
- Lift state up only when two siblings need to share it

**API Calls:**
- All API calls go through `services/api.ts` (axios instance with baseURL and auth interceptor)
- Each entity has its own service file: `invoice.service.ts`, `client.service.ts`, etc.
- Service functions return typed promises: `getInvoices(): Promise<Invoice[]>`
- Handle errors in the component using try/catch, show toast on failure

**Routing:**
```
/login                          # Public
/register                       # Public
/                               # Dashboard (protected)
/invoices                       # Invoice list (protected)
/invoices/new                   # Create invoice (protected)
/invoices/:id                   # View invoice (protected)
/invoices/:id/edit              # Edit invoice (protected)
/clients                        # Client list (protected)
/settings                       # User settings (protected)
```

**Styling:**
- Tailwind utility classes only — no custom CSS files (except index.css for directives)
- Design system colors defined in `tailwind.config.js` under `extend.colors`
- Use these semantic color names:
  - `primary` — main brand color (indigo-600)
  - `success` — green-500 (paid status)
  - `warning` — amber-500 (overdue status)
  - `danger` — red-500 (delete actions)
  - `muted` — gray-500 (secondary text)
- Consistent spacing: use Tailwind's scale (4, 6, 8 for gaps; 2, 3 for tight)
- Card pattern: `bg-white rounded-lg border border-gray-200 shadow-sm p-6`
- Max content width: `max-w-7xl mx-auto`

### Backend Conventions

**Architecture:** Routes → Controllers → Models (SQL) → Database

**Routes:**
- Define only route paths and middleware — no business logic
- Always apply `auth` middleware to protected routes
- Use `validate.ts` middleware with express-validator chains

**Controllers:**
- Handle req/res only — call model functions for data
- Always wrap in try/catch, pass errors to `next()`
- Return consistent response shapes:
```typescript
// Success
res.status(200).json({ data: result });
res.status(201).json({ data: newResource });

// Error
res.status(400).json({ error: 'Validation failed', details: [...] });
res.status(404).json({ error: 'Invoice not found' });
res.status(500).json({ error: 'Internal server error' });
```

**Models:**
- Pure SQL using `pg` pool — no ORM
- Parameterized queries only — never interpolate values into SQL strings
- Each model file exports functions like: `findAll(userId)`, `findById(id, userId)`, `create(data)`, `update(id, data)`, `remove(id)`
- Always scope queries to `user_id` for data isolation

**Error Handling:**
- `errorHandler.ts` middleware catches all unhandled errors
- Custom `AppError` class with `statusCode` and `message`
- In development: return stack trace. In production: generic message only

**Authentication:**
- JWT tokens with 7-day expiry
- Token payload: `{ userId: UUID, email: string }`
- Passwords hashed with bcrypt (salt rounds: 10)
- Auth middleware sets `req.user = { userId, email }` on protected routes

---

## Database Rules

- All primary keys are `UUID` generated with `gen_random_uuid()`
- All tables have `created_at` and `updated_at` columns (TIMESTAMPTZ, default NOW())
- `updated_at` is set via a trigger or manually in UPDATE queries
- Foreign keys use `ON DELETE CASCADE` where appropriate (invoice_items → invoices)
- Money stored as `INTEGER` (cents) — never use FLOAT or DECIMAL for calculations
- Invoice numbers are auto-generated per user: `INV-0001`, `INV-0002`, etc.
- Status stored as PostgreSQL ENUM type: `invoice_status`

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/invoice_snap
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads

# Client (prefixed with VITE_)
VITE_API_URL=http://localhost:5000/api
```

---

## Development Phases

| Phase | Focus                    | Status |
|-------|--------------------------|--------|
| 1     | Project scaffolding      | ⬜     |
| 2     | Authentication           | ⬜     |
| 3     | Client management        | ⬜     |
| 4     | Invoice CRUD + line items| ⬜     |
| 5     | PDF generation           | ⬜     |
| 6     | Dashboard + analytics    | ⬜     |
| 7     | Settings + profile       | ⬜     |
| 8     | Polish + UX              | ⬜     |
| 9     | Docker deployment        | ⬜     |

Update status to ✅ as phases are completed.

---

## Important Patterns

### Adding a New Feature (Checklist)
1. Define TypeScript types in `types/index.ts` (both client and server)
2. Write the migration SQL if new tables/columns needed
3. Create the model file with SQL queries
4. Create the controller with request handling
5. Add routes and wire up middleware
6. Test the API with curl or Postman
7. Create the service file on the frontend
8. Build the UI component/page
9. Add the route to `App.tsx`
10. Test the full flow end-to-end

### Invoice Number Generation Logic
```
Per user, query MAX invoice number → extract numeric part → increment → pad to 4 digits
First invoice: INV-0001
After INV-0099: INV-0100
After INV-9999: INV-10000 (no upper limit)
```

### PDF Layout Structure
```
┌────────────────────────────────┐
│  [Logo]  Business Name         │
│          Business Address      │
│          Business Email/Phone  │
├────────────────────────────────┤
│  INVOICE                       │
│  Invoice #: INV-0001           │
│  Date: 2025-01-15              │
│  Due: 2025-02-15               │
├────────────────────────────────┤
│  Bill To:                      │
│  Client Name                   │
│  Client Address                │
│  Client Email                  │
├────────────────────────────────┤
│  Description  | Qty | Rate | $ │
│  ─────────────────────────────│
│  Item 1       |  2  | 100  |200│
│  Item 2       |  1  | 50   | 50│
├────────────────────────────────┤
│            Subtotal:    $250.00│
│            Tax (10%):    $25.00│
│            Discount (5%):-12.50│
│            ────────────────────│
│            TOTAL:       $262.50│
├────────────────────────────────┤
│  Notes: Payment due within ... │
└────────────────────────────────┘
```

---

## Do NOT

- Do not use an ORM — write raw SQL with parameterized queries
- Do not install Redux, Zustand, or any state management library
- Do not use CSS modules or styled-components — Tailwind only
- Do not use `any` type without a justification comment
- Do not store passwords in plain text — always bcrypt
- Do not use FLOAT/DECIMAL for money — use INTEGER (cents)
- Do not skip error handling — every async call needs try/catch
- Do not hardcode URLs — use environment variables
- Do not commit `.env` files — only `.env.example`
- Do not use default exports (except page components for React.lazy)
- Do not put business logic in route files — it belongs in controllers
- Do not write SQL without parameterized values — no string concatenation
