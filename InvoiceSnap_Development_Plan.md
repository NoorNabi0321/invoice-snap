# InvoiceSnap — Complete Development Plan

**Stack:** Vite + React + TypeScript + Tailwind CSS + Node.js + Express + PostgreSQL
**Deployment:** Docker containers on Ubuntu (VirtualBox)

---

## Project Architecture Overview

```
invoice_snap/
├── client/                  # Vite + React + TypeScript frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/          # Static images, fonts
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Button, Input, Modal, Card, Badge, etc.
│   │   │   ├── layout/      # Sidebar, Header, MainLayout
│   │   │   └── invoice/     # InvoiceForm, LineItemRow, InvoicePDF
│   │   ├── pages/           # Route-level page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Invoices.tsx
│   │   │   ├── InvoiceCreate.tsx
│   │   │   ├── InvoiceView.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API call functions (axios instance)
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── types/           # TypeScript interfaces and types
│   │   ├── utils/           # Formatters, validators, helpers
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css        # Tailwind directives
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── config/          # db.ts, env.ts
│   │   ├── middleware/      # auth.ts, errorHandler.ts, validate.ts
│   │   ├── routes/          # auth, invoices, clients, dashboard
│   │   ├── controllers/     # Business logic per route
│   │   ├── models/          # SQL queries / DB interaction layer
│   │   ├── utils/           # pdfGenerator.ts, invoiceNumber.ts
│   │   ├── types/           # Shared TypeScript types
│   │   └── app.ts           # Express app setup
│   ├── migrations/          # SQL migration files
│   ├── tsconfig.json
│   └── package.json
│
├── docker/
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── nginx.conf           # Reverse proxy config
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Database Schema

```
┌──────────────────────┐      ┌──────────────────────┐
│       users           │      │       clients         │
├──────────────────────┤      ├──────────────────────┤
│ id (PK, UUID)        │      │ id (PK, UUID)        │
│ email (UNIQUE)       │      │ user_id (FK → users) │
│ password_hash        │      │ name                 │
│ business_name        │      │ email                │
│ business_email       │      │ phone                │
│ business_address     │      │ address              │
│ business_phone       │      │ city                 │
│ logo_url             │      │ country              │
│ currency (USD)       │      │ created_at           │
│ created_at           │      │ updated_at           │
│ updated_at           │      └──────────┬───────────┘
└──────────┬───────────┘                 │
           │                             │
           │      ┌──────────────────────┘
           │      │
     ┌─────┴──────┴────────────┐
     │       invoices           │
     ├─────────────────────────┤
     │ id (PK, UUID)           │
     │ user_id (FK → users)    │
     │ client_id (FK → clients)│
     │ invoice_number (UNIQUE) │
     │ status (ENUM)           │  ← draft | sent | paid | overdue
     │ issue_date              │
     │ due_date                │
     │ subtotal                │
     │ tax_rate                │
     │ tax_amount              │
     │ discount_percent        │
     │ discount_amount         │
     │ total                   │
     │ notes                   │
     │ created_at              │
     │ updated_at              │
     └──────────┬──────────────┘
                │
     ┌──────────┴──────────────┐
     │     invoice_items        │
     ├─────────────────────────┤
     │ id (PK, UUID)           │
     │ invoice_id (FK)         │
     │ description             │
     │ quantity                │
     │ rate                    │
     │ amount (auto)           │
     │ sort_order              │
     └─────────────────────────┘
```

---

## API Endpoints

```
AUTH
  POST   /api/auth/register        → Create account
  POST   /api/auth/login            → Login, returns JWT
  GET    /api/auth/me               → Get current user profile

USER / SETTINGS
  PUT    /api/users/profile         → Update business info
  POST   /api/users/logo            → Upload business logo

CLIENTS
  GET    /api/clients               → List all clients
  POST   /api/clients               → Create client
  GET    /api/clients/:id           → Get single client
  PUT    /api/clients/:id           → Update client
  DELETE /api/clients/:id           → Delete client

INVOICES
  GET    /api/invoices              → List all (with filters: status, date range)
  POST   /api/invoices              → Create invoice with line items
  GET    /api/invoices/:id          → Get full invoice with items + client
  PUT    /api/invoices/:id          → Update invoice
  DELETE /api/invoices/:id          → Delete invoice
  PATCH  /api/invoices/:id/status   → Update status only
  GET    /api/invoices/:id/pdf      → Download PDF

DASHBOARD
  GET    /api/dashboard/stats       → Summary: total earned, pending, overdue count
  GET    /api/dashboard/chart       → Monthly revenue data for chart
```

---

## Development Phases

---

### PHASE 1 — Project Setup & Scaffolding
**Goal:** Get the skeleton running end-to-end (frontend ↔ backend ↔ database).

**Tasks:**

1.1 — Initialize the monorepo structure
  - Create `client/` and `server/` directories inside `invoice_snap/`
  - Initialize git, create `.gitignore`

1.2 — Setup Frontend (client/)
  - Scaffold with `npm create vite@latest . -- --template react-ts`
  - Install Tailwind CSS and configure `tailwind.config.js`
  - Install dependencies: `react-router-dom`, `axios`, `react-hot-toast`
  - Create folder structure: components/, pages/, hooks/, services/, context/, types/, utils/
  - Setup a basic MainLayout with Sidebar + Header
  - Add routing with placeholder pages (Dashboard, Invoices, Clients, Settings, Login, Register)

1.3 — Setup Backend (server/)
  - Initialize with `npm init`, install: `express`, `pg`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`, `multer`, `helmet`
  - Install dev deps: `typescript`, `tsx`, `@types/*`
  - Configure `tsconfig.json`
  - Create Express app with middleware (cors, helmet, json parser, error handler)
  - Create `db.ts` with PostgreSQL pool connection
  - Add a health-check route: `GET /api/health`

1.4 — Setup Database
  - Install PostgreSQL locally (or use Docker for dev)
  - Write migration file `001_initial_schema.sql` with all tables
  - Run migrations manually or with a simple runner script

1.5 — Verify End-to-End
  - Frontend calls `/api/health` and displays response
  - Confirm CORS, proxy, and DB connection all work

**Deliverable:** Skeleton app running on `localhost:5173` (client) and `localhost:5000` (server), connected to PostgreSQL.

---

### PHASE 2 — Authentication System
**Goal:** Users can register, login, and stay authenticated via JWT.

**Tasks:**

2.1 — Backend Auth
  - `POST /api/auth/register` — validate input, hash password with bcrypt, insert user, return JWT
  - `POST /api/auth/login` — verify credentials, return JWT
  - `GET /api/auth/me` — protected route, returns user from token
  - Create `auth.ts` middleware that verifies JWT and attaches `req.user`

2.2 — Frontend Auth
  - Build Login and Register pages with form validation
  - Create `AuthContext` with login/logout/user state
  - Store JWT in localStorage, attach to all API calls via axios interceptor
  - Add `ProtectedRoute` wrapper that redirects to `/login` if not authenticated
  - Add logout functionality in the sidebar/header

**Deliverable:** Full auth flow — register → login → protected dashboard → logout.

---

### PHASE 3 — Client Management (CRUD)
**Goal:** Users can create, view, edit, and delete clients.

**Tasks:**

3.1 — Backend Client Routes
  - Full CRUD: GET (list), POST, GET/:id, PUT/:id, DELETE/:id
  - All routes protected by auth middleware
  - Scoped to `user_id` (users only see their own clients)

3.2 — Frontend Client Pages
  - Clients list page with a table/cards showing name, email, invoice count
  - "Add Client" modal or page with form
  - Edit client functionality
  - Delete with confirmation modal
  - Search/filter clients by name

**Deliverable:** Complete client management — add, list, edit, delete clients.

---

### PHASE 4 — Invoice CRUD & Line Items
**Goal:** Users can create full invoices with dynamic line items and auto-calculations.

**Tasks:**

4.1 — Backend Invoice Routes
  - `POST /api/invoices` — create invoice + line items in a transaction
  - `GET /api/invoices` — list with filters (status, date range), include client name
  - `GET /api/invoices/:id` — full invoice with items and client details
  - `PUT /api/invoices/:id` — update invoice and its items (delete old items, insert new)
  - `DELETE /api/invoices/:id` — cascade delete items
  - `PATCH /api/invoices/:id/status` — update status only
  - Auto-generate invoice number: `INV-0001`, `INV-0002`, etc.

4.2 — Frontend Invoice Creation
  - Invoice form page with:
    - Client selector (dropdown from saved clients)
    - Issue date and due date pickers
    - Dynamic line items: add/remove rows, each with description, quantity, rate
    - Auto-calculated: row amount, subtotal, tax, discount, grand total
    - Notes/terms textarea
    - Status selector
  - Save as draft or mark as sent

4.3 — Frontend Invoice List
  - Table with columns: Invoice #, Client, Amount, Status, Date, Actions
  - Status badges with colors (Draft=gray, Sent=blue, Paid=green, Overdue=red)
  - Filter by status tabs
  - Click to view full invoice

4.4 — Frontend Invoice View
  - Clean, printable invoice preview layout
  - Shows: your business info, client info, line items table, totals, notes
  - Action buttons: Edit, Download PDF, Mark as Paid, Delete

**Deliverable:** Full invoice lifecycle — create with line items → list → view → edit → change status.

---

### PHASE 5 — PDF Generation
**Goal:** Generate downloadable PDF invoices.

**Tasks:**

5.1 — Backend PDF Generation
  - Install `pdfkit` or `@react-pdf/renderer` (server-side)
  - Create `pdfGenerator.ts` utility that takes invoice data and returns a PDF buffer
  - PDF layout: business logo/name, client details, invoice number/dates, line items table, totals, notes/terms
  - `GET /api/invoices/:id/pdf` — returns PDF as downloadable file

5.2 — Frontend PDF Download
  - "Download PDF" button on invoice view page
  - Calls the PDF endpoint and triggers browser download

**Deliverable:** Click "Download PDF" → get a clean, professional invoice PDF.

---

### PHASE 6 — Dashboard & Analytics
**Goal:** Show a summary dashboard with key metrics and a revenue chart.

**Tasks:**

6.1 — Backend Dashboard Routes
  - `GET /api/dashboard/stats` — returns:
    - Total revenue (sum of paid invoices)
    - Total pending (sum of sent/draft invoices)
    - Overdue count
    - Total clients
    - Total invoices this month
  - `GET /api/dashboard/chart` — returns monthly revenue data (last 6 or 12 months)

6.2 — Frontend Dashboard
  - Stat cards at top: Revenue, Pending, Overdue, Clients
  - Revenue chart (bar or line) using Recharts
  - Recent invoices list (last 5)
  - Quick action buttons: "New Invoice", "New Client"

**Deliverable:** Dashboard landing page with stats, chart, and quick actions.

---

### PHASE 7 — Settings & Profile
**Goal:** Users can update their business info and preferences.

**Tasks:**

7.1 — Backend
  - `PUT /api/users/profile` — update business name, email, address, phone, currency
  - `POST /api/users/logo` — upload logo image via multer, store path

7.2 — Frontend Settings Page
  - Business information form (pre-filled from current data)
  - Logo upload with preview
  - Currency selector
  - Save button with success toast

**Deliverable:** Settings page where business info and logo are saved and reflected in invoices.

---

### PHASE 8 — Polish & UX Improvements
**Goal:** Make it look and feel professional.

**Tasks:**

8.1 — UI Polish
  - Responsive design — mobile sidebar collapses to hamburger menu
  - Loading skeletons for data fetches
  - Empty states with illustrations ("No invoices yet — create one!")
  - Toast notifications for all actions (create, update, delete, errors)
  - Confirmation modals for destructive actions

8.2 — Form Validation
  - Client-side validation with clear error messages
  - Server-side validation with proper error responses

8.3 — UX Touches
  - Keyboard shortcuts (Ctrl+S to save invoice)
  - Autosave draft invoices
  - Duplicate invoice functionality
  - Search across invoices by number, client name, amount

**Deliverable:** Polished, responsive, production-ready application.

---

### PHASE 9 — Dockerization & Deployment
**Goal:** Containerize everything and deploy on Ubuntu via Docker in VirtualBox.

**Tasks:**

9.1 — Dockerfiles

  **Dockerfile.client** (Multi-stage build)
  - Stage 1: Node image → install deps → `npm run build`
  - Stage 2: Nginx image → copy built files → serve static assets

  **Dockerfile.server**
  - Node image → install deps → compile TypeScript → run with `node`

  **nginx.conf**
  - Serve frontend on `/`
  - Proxy `/api/*` requests to the Express server container

9.2 — Docker Compose
  ```yaml
  services:
    db:        # PostgreSQL with volume for data persistence
    server:    # Express API, depends on db
    client:    # Nginx serving React build, depends on server
  ```
  - Environment variables via `.env` file
  - Named volume for PostgreSQL data
  - Health checks on db before server starts

9.3 — Ubuntu VM Setup (VirtualBox)
  - Install Ubuntu Server 22.04+ in VirtualBox
  - Configure bridged/NAT networking
  - Install Docker and Docker Compose
  - Clone repo or copy project files
  - Run `docker-compose up -d`
  - Access app via VM's IP address

9.4 — Deployment Checklist
  - `.env.example` with all required variables documented
  - Database migrations run automatically on server startup
  - Production build optimizations (minified frontend, no dev deps)
  - Docker volumes for persistent data (DB + uploaded logos)

**Deliverable:** `docker-compose up` spins up the entire app — database, API, and frontend — accessible from the host machine's browser.

---

## Phase Summary

| Phase | What You Build | Key Outcome |
|-------|---------------|-------------|
| 1 | Project scaffolding | Skeleton running end-to-end |
| 2 | Authentication | Register, login, JWT protection |
| 3 | Client management | Full CRUD for clients |
| 4 | Invoice CRUD | Create invoices with line items |
| 5 | PDF generation | Download professional PDF invoices |
| 6 | Dashboard | Stats, charts, recent activity |
| 7 | Settings | Business profile and logo |
| 8 | Polish | Responsive, validated, delightful UX |
| 9 | Docker deployment | One-command deployment on Ubuntu VM |

---

## Key Dependencies

**Frontend:**
react, react-dom, react-router-dom, axios, recharts, react-hot-toast, lucide-react (icons), @types/* (TypeScript types)

**Backend:**
express, pg (node-postgres), cors, dotenv, bcryptjs, jsonwebtoken, multer, helmet, pdfkit, uuid, express-validator

**DevOps:**
Docker, Docker Compose, Nginx, PostgreSQL 15+

---

## Development Order Recommendation

Build and test each phase completely before moving to the next. Each phase produces a working, testable increment. You can demo the app at any point from Phase 4 onward.

Estimated effort: ~40-60 hours for a developer comfortable with the stack.
