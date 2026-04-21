# Phase 9 — Dockerization & Deployment Guide

**Goal:** Package InvoiceSnap into Docker containers and deploy on an Ubuntu VM (VirtualBox) so the entire app — database, API, and frontend — starts with a single `docker-compose up` command.

---

## Table of Contents

1. [Pre-Flight Checklist — What to Do Before Anything Else](#1-pre-flight-checklist)
2. [Files to Create in the `docker/` Folder](#2-files-to-create-in-the-docker-folder)
3. [Files to Create in the Project Root](#3-files-to-create-in-the-project-root)
4. [Server-Side Changes — Auto-Run Migrations](#4-server-side-changes)
5. [Client-Side Changes — Production Build Fix](#5-client-side-changes)
6. [Complete File Contents](#6-complete-file-contents)
7. [Test Locally Before Pushing](#7-test-locally-before-pushing)
8. [Push to GitHub](#8-push-to-github)
9. [Ubuntu VM Setup (VirtualBox)](#9-ubuntu-vm-setup)
10. [Clone & Deploy on the VM](#10-clone-and-deploy-on-the-vm)
11. [Access the App from Host Machine](#11-access-the-app-from-host-machine)
12. [Managing the Running App](#12-managing-the-running-app)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Pre-Flight Checklist

Before touching Docker, make sure these are true:

- [ ] `cd client && npm run build` succeeds with zero errors (produces `client/dist/`)
- [ ] `cd server && npm run build` succeeds with zero errors (produces `server/dist/`)
- [ ] Your migration file exists at `server/migrations/001_initial_schema.sql`
- [ ] The server's entry point after compilation is `server/dist/app.js`
- [ ] All environment variables used by the app are documented
- [ ] No hardcoded `localhost` URLs remain in the codebase — everything uses `VITE_API_URL` or `DATABASE_URL`

If `npm run build` fails in either project, fix those errors first. Docker builds will fail at the same point.

---

## 2. Files to Create in the `docker/` Folder

Your `docker/` directory needs exactly three files:

```
docker/
├── Dockerfile.client      # Multi-stage: build React → serve with Nginx
├── Dockerfile.server      # Build TypeScript → run with Node
└── nginx.conf             # Reverse proxy: / → React, /api → Express
```

---

## 3. Files to Create in the Project Root

These go in the project root (same level as `client/` and `server/`):

```
invoice_snap/
├── docker-compose.yml     # Orchestrates all three containers
├── .env.example           # Documents every env var (committed to Git)
├── .env                   # Actual values (NEVER committed — in .gitignore)
├── .dockerignore          # Keeps Docker build context small and fast
└── .gitignore             # Updated to exclude .env, node_modules, dist
```

---

## 4. Server-Side Changes

### 4.1 — Auto-Run Migrations on Startup

Create a startup script that runs migrations before starting the Express server. This way the database schema is always up-to-date when containers start.

Create `server/scripts/start.sh`:

```bash
#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."

# Wait until PostgreSQL accepts connections
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" 2>/dev/null; do
  echo "   PostgreSQL not ready yet — retrying in 2s..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

echo "🔄 Running database migrations..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f /app/migrations/001_initial_schema.sql 2>&1 || true

echo "🚀 Starting server..."
node dist/app.js
```

Make it executable locally:

```bash
chmod +x server/scripts/start.sh
```

### 4.2 — Parse DATABASE_URL into Components

Your server's `config/db.ts` likely uses `DATABASE_URL` directly. The Docker setup passes individual variables (`DB_HOST`, `DB_PORT`, etc.) for the migration script above. Make sure your `config/db.ts` can handle both formats:

```typescript
// config/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

The `DATABASE_URL` in docker-compose.yml will be assembled from the individual variables, so this still works.

### 4.3 — Ensure Server Listens on 0.0.0.0

In your `app.ts`, the server must bind to `0.0.0.0` (not `localhost`) so Docker can route traffic to it:

```typescript
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

If your code uses `app.listen(PORT)` without the host argument, that already binds to all interfaces — you're fine. But if you have `app.listen(PORT, 'localhost')`, change `'localhost'` to `'0.0.0.0'`.

---

## 5. Client-Side Changes

### 5.1 — Make API URL Relative for Production

In production, Nginx will proxy `/api` requests to the server container. So the frontend should call `/api/...` with a relative URL, not `http://localhost:5000/api/...`.

Update your `client/src/services/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  //                                       ^^^^^^
  //  Falls back to relative /api in production (Nginx handles the proxy)
});

// ... rest of your interceptors
```

Then in the Docker `.env`, set:

```
VITE_API_URL=/api
```

This means the React app sends requests to `/api/invoices` → Nginx catches `/api/*` → proxies to the server container on port 5000.

---

## 6. Complete File Contents

### 6.1 — `docker/Dockerfile.client`

```dockerfile
# =============================================
# STAGE 1 — Build the React app
# =============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first (layer caching — deps only rebuild when package.json changes)
COPY client/package.json client/package-lock.json ./

RUN npm ci

# Copy the rest of the source code
COPY client/ ./

# Build arg so Vite can bake the API URL into the bundle
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# =============================================
# STAGE 2 — Serve with Nginx
# =============================================
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**What this does:**
- Stage 1 installs deps and runs `npm run build` to produce `dist/`
- Stage 2 copies those static files into a tiny Nginx image
- The final image is ~25MB instead of ~1GB (no Node.js runtime needed to serve static files)

---

### 6.2 — `docker/Dockerfile.server`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client (for psql in the startup script)
RUN apk add --no-cache postgresql-client bash

# Copy package files first (layer caching)
COPY server/package.json server/package-lock.json ./

# Install ALL deps (including devDeps for TypeScript compilation)
RUN npm ci

# Copy source code and migrations
COPY server/ ./

# Compile TypeScript to JavaScript
RUN npm run build

# Remove devDependencies after build (smaller image)
RUN npm prune --production

# Copy the startup script
COPY server/scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 5000

CMD ["/app/start.sh"]
```

**What this does:**
- Installs `psql` so the startup script can run migrations
- Compiles TypeScript → `dist/`
- Removes dev dependencies after build (no `typescript`, `tsx`, `@types/*` in the final image)
- Runs `start.sh` which waits for Postgres → runs migrations → starts Node

---

### 6.3 — `docker/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    # Serve React build
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to the Express server container
    location /api/ {
        proxy_pass         http://server:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket support (if you ever add real-time features)
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # Handle React Router — all non-file requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires    30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options       "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff"    always;
    add_header X-XSS-Protection      "1; mode=block" always;
}
```

**Key points:**
- `location /api/` proxies to the service named `server` in docker-compose (Docker's internal DNS resolves the container name)
- `try_files $uri $uri/ /index.html` is critical — without it, refreshing any React Router page (like `/invoices/123`) returns a 404
- Static assets get a 30-day cache header so browsers don't re-download them

---

### 6.4 — `docker-compose.yml` (Project Root)

```yaml
version: "3.8"

services:
  # ─── PostgreSQL Database ───────────────────────────
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       ${DB_NAME}
      POSTGRES_USER:     ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"       # Expose to host for debugging (remove in production if you want)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10

  # ─── Express API Server ────────────────────────────
  server:
    build:
      context: .
      dockerfile: docker/Dockerfile.server
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV:      production
      PORT:          5000
      DB_HOST:       db
      DB_PORT:       5432
      DB_USER:       ${DB_USER}
      DB_PASSWORD:   ${DB_PASSWORD}
      DB_NAME:       ${DB_NAME}
      DATABASE_URL:  postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_SECRET:    ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
    ports:
      - "5000:5000"       # Expose to host for debugging (optional)
    volumes:
      - uploads:/app/uploads

  # ─── Nginx + React Frontend ────────────────────────
  client:
    build:
      context: .
      dockerfile: docker/Dockerfile.client
      args:
        VITE_API_URL: /api
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "80:80"

volumes:
  pgdata:       # Persistent database storage — survives container restarts
  uploads:      # Persistent uploaded files (logos, etc.)
```

**How the service dependencies work:**
1. `db` starts first — docker-compose waits until the healthcheck passes
2. `server` starts only after `db` is healthy — then `start.sh` runs migrations and boots Express
3. `client` starts after `server` — Nginx immediately serves the pre-built React app

**Network:** Docker Compose creates a network automatically. Containers reach each other by service name (`db`, `server`, `client`). The Nginx config uses `http://server:5000` because `server` is the service name.

---

### 6.5 — `.env.example` (Project Root — Committed to Git)

```env
# =============================================
# InvoiceSnap — Environment Variables
# =============================================
# Copy this file to .env and fill in real values:
#   cp .env.example .env
#
# NEVER commit the .env file to Git.
# =============================================

# ─── Database ─────────────────────────────────
DB_NAME=invoice_snap
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_to_a_strong_password

# ─── Authentication ──────────────────────────
JWT_SECRET=CHANGE_ME_to_a_random_64_char_string
JWT_EXPIRES_IN=7d

# ─── Frontend (baked into the React build) ───
VITE_API_URL=/api
```

### 6.6 — `.env` (Project Root — NEVER Committed)

```env
DB_NAME=invoice_snap
DB_USER=postgres
DB_PASSWORD=s3cur3_p@ssw0rd_ch4nge_m3

JWT_SECRET=a8f2e1b9c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081929a3b4c5d6e
JWT_EXPIRES_IN=7d

VITE_API_URL=/api
```

### 6.7 — `.dockerignore` (Project Root)

```
# Dependencies
**/node_modules

# Build outputs (we rebuild inside Docker)
client/dist
server/dist

# Environment files
.env
.env.local

# Git
.git
.gitignore

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

This keeps the Docker build context small. Without it, Docker would send `node_modules` (hundreds of MBs) to the build daemon, making builds painfully slow.

### 6.8 — Updated `.gitignore` (Project Root)

Make sure these entries exist in your `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Build outputs
client/dist/
server/dist/

# Environment
.env
.env.local
.env.production

# Uploads
server/uploads/*
!server/uploads/.gitkeep

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
```

---

## 7. Test Locally Before Pushing

If you have Docker Desktop installed on your dev machine, test the full setup before pushing:

```bash
# From the project root (invoice_snap/)

# 1. Create your .env file
cp .env.example .env
# Edit .env with real values (especially DB_PASSWORD and JWT_SECRET)

# 2. Build and start all containers
docker-compose up --build

# Watch the logs — you should see:
#   db       | database system is ready to accept connections
#   server   | ✅ PostgreSQL is ready
#   server   | 🔄 Running database migrations...
#   server   | 🚀 Starting server...
#   client   | ... nginx ready ...

# 3. Open browser → http://localhost
# You should see the InvoiceSnap login page

# 4. Test the API directly
curl http://localhost/api/health
# Should return: {"status":"ok"} or similar

# 5. Register a user, create a client, create an invoice — full smoke test

# 6. Stop everything
docker-compose down

# 7. Verify data persists
docker-compose up -d
# Log in again — your data should still be there (pgdata volume)

# 8. Nuclear cleanup (if needed — removes ALL data)
docker-compose down -v
```

If everything works locally, push to GitHub.

---

## 8. Push to GitHub

### 8.1 — Final Project Structure Check

Before pushing, your project should look like this:

```
invoice_snap/
├── client/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── scripts/
│   │   └── start.sh
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── docker/
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── nginx.conf
│
├── docker-compose.yml
├── .dockerignore
├── .env.example          ← Committed (template only, no secrets)
├── .gitignore            ← Blocks .env, node_modules, dist
├── CLAUDE.md
└── README.md
```

Things that should **NOT** be in the repo: `.env` (actual secrets), `node_modules/`, `client/dist/`, `server/dist/`.

### 8.2 — Push Commands

```bash
cd invoice_snap

# Initialize Git (skip if already done)
git init
git branch -M main

# Add everything
git add .

# Verify .env is NOT staged
git status
# If you see .env in the staged files, your .gitignore is wrong — fix it

# Commit
git commit -m "Phase 9: Add Docker deployment setup"

# Create the repo on GitHub (via browser or CLI)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/invoice-snap.git
git push -u origin main
```

---

## 9. Ubuntu VM Setup (VirtualBox)

### 9.1 — Create the VM

1. Download **Ubuntu Server 22.04 LTS** ISO from https://ubuntu.com/download/server
2. Open VirtualBox → **New**
   - Name: `invoice-snap-vm`
   - Type: Linux
   - Version: Ubuntu (64-bit)
   - RAM: **2048 MB** minimum (4096 MB recommended)
   - Disk: **20 GB** dynamically allocated
3. Before starting, go to **Settings → Network**:
   - Adapter 1 → Attached to: **Bridged Adapter** (so the VM gets its own IP on your LAN)
   - If Bridged doesn't work on your network, use **NAT** with port forwarding (see 9.3)
4. Mount the ISO → Start → Install Ubuntu Server
   - Choose a username (e.g., `deploy`) and password
   - Select **Install OpenSSH server** when prompted
   - Skip all optional snaps

### 9.2 — Install Docker on the VM

After Ubuntu is installed, SSH into the VM or use the VirtualBox console:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release git

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Docker Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (so you don't need sudo for every command)
sudo usermod -aG docker $USER

# Apply the group change (or log out and back in)
newgrp docker

# Verify
docker --version
docker compose version
```

### 9.3 — Network Configuration

**Option A — Bridged Adapter (Recommended)**

The VM gets its own IP on your local network (e.g., `192.168.1.105`). Find it:

```bash
ip addr show
# Look for the IP on your main interface (usually enp0s3 or eth0)
```

You'll access the app at `http://192.168.1.105` from your host browser.

**Option B — NAT with Port Forwarding**

If Bridged doesn't work (corporate networks, etc.), use NAT:

1. VirtualBox → VM Settings → Network → Adapter 1 → NAT
2. Click **Advanced → Port Forwarding**
3. Add these rules:

| Name     | Protocol | Host Port | Guest Port |
|----------|----------|-----------|------------|
| SSH      | TCP      | 2222      | 22         |
| HTTP     | TCP      | 8080      | 80         |
| API      | TCP      | 5000      | 5000       |
| Postgres | TCP      | 5433      | 5432       |

With NAT, access the app at `http://localhost:8080` from your host browser.
SSH into the VM with: `ssh -p 2222 deploy@localhost`.

---

## 10. Clone & Deploy on the VM

### 10.1 — Clone the Repository

```bash
# SSH into the VM
ssh deploy@192.168.1.105       # Bridged
# or
ssh -p 2222 deploy@localhost   # NAT

# Clone your repo
cd ~
git clone https://github.com/YOUR_USERNAME/invoice-snap.git
cd invoice-snap
```

### 10.2 — Create the .env File

```bash
cp .env.example .env
nano .env
```

Fill in production-safe values:

```env
DB_NAME=invoice_snap
DB_USER=postgres
DB_PASSWORD=Pr0d_S3cur3_P@ss!2025

JWT_SECRET=generate_this_with_openssl_rand_hex_32
JWT_EXPIRES_IN=7d

VITE_API_URL=/api
```

To generate a strong JWT secret:

```bash
openssl rand -hex 32
# Copy the output into JWT_SECRET
```

Save and exit nano (`Ctrl+X`, then `Y`, then `Enter`).

### 10.3 — Build and Start

```bash
# Build all images and start in detached mode
docker compose up --build -d
```

First build takes 3-5 minutes (downloading base images, installing deps, compiling). Subsequent builds are faster thanks to Docker's layer cache.

### 10.4 — Verify Everything Started

```bash
# Check all containers are running
docker compose ps

# Expected output:
# NAME                    STATUS                   PORTS
# invoice-snap-db-1       Up (healthy)             0.0.0.0:5432->5432/tcp
# invoice-snap-server-1   Up                       0.0.0.0:5000->5000/tcp
# invoice-snap-client-1   Up                       0.0.0.0:80->80/tcp

# Check server logs for migration success
docker compose logs server

# You should see:
# ✅ PostgreSQL is ready
# 🔄 Running database migrations...
# 🚀 Starting server...

# Quick health check
curl http://localhost/api/health
```

---

## 11. Access the App from Host Machine

Open your browser on the **host machine** (not inside the VM):

| Network Mode | URL                          |
|-------------|------------------------------|
| Bridged     | `http://<VM_IP>`             |
| NAT         | `http://localhost:8080`       |

You should see the InvoiceSnap login page. Register a new account and start using the app.

---

## 12. Managing the Running App

### Common Commands (run from `~/invoice-snap` on the VM)

```bash
# View logs (all services, follow mode)
docker compose logs -f

# View logs for a specific service
docker compose logs -f server
docker compose logs -f client
docker compose logs -f db

# Stop all containers (data is preserved in volumes)
docker compose down

# Restart everything
docker compose up -d

# Rebuild after code changes (pull new code → rebuild)
git pull origin main
docker compose up --build -d

# Check container resource usage
docker stats

# Enter the database container for manual queries
docker compose exec db psql -U postgres -d invoice_snap

# Enter the server container for debugging
docker compose exec server sh
```

### Updating the App After Code Changes

```bash
# On the VM:
cd ~/invoice-snap

# Pull latest code
git pull origin main

# Rebuild and restart (only changed images get rebuilt)
docker compose up --build -d

# Verify
docker compose ps
docker compose logs -f server
```

### Backup the Database

```bash
# Create a SQL dump
docker compose exec db pg_dump -U postgres invoice_snap > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup (WARNING: overwrites current data)
cat backup_20250420_143000.sql | docker compose exec -T db psql -U postgres -d invoice_snap
```

### Full Reset (Delete Everything)

```bash
# Stop containers AND delete volumes (all data lost)
docker compose down -v

# Rebuild from scratch
docker compose up --build -d
```

---

## 13. Troubleshooting

### "Connection refused" when accessing the app

- Check if containers are running: `docker compose ps`
- If `db` shows "unhealthy" or "restarting", check its logs: `docker compose logs db`
- If using NAT, verify the port forwarding rules in VirtualBox settings
- If using Bridged, verify the VM has a LAN IP: `ip addr show`

### Server container keeps restarting

```bash
docker compose logs server
```

Common causes:
- **Database not ready yet** — The healthcheck should prevent this, but check the `start.sh` output
- **Migration SQL error** — If your migration has a syntax error, the script runs `psql` with `|| true` so it won't crash, but the tables won't exist. Fix the SQL and rebuild.
- **Missing environment variable** — Compare `docker compose config` output to what your code expects

### "ECONNREFUSED" in server logs (can't connect to database)

- The server must use `db` as the hostname (the Docker service name), not `localhost`
- Verify `DATABASE_URL` in docker-compose.yml uses `@db:5432`, not `@localhost:5432`

### Frontend shows blank page

```bash
# Check if the React build succeeded
docker compose exec client ls /usr/share/nginx/html
# Should contain: index.html, assets/

# Check Nginx logs
docker compose logs client
```

Common causes:
- `npm run build` failed during Docker build — check `docker compose build client` output
- `VITE_API_URL` wasn't set during build — verify the `args` section in docker-compose.yml

### API calls return 502 Bad Gateway

This means Nginx can reach the `server` container but the Express process isn't responding:
- Check `docker compose logs server` — is Node actually running?
- Verify the server listens on port 5000 and binds to `0.0.0.0`

### "Permission denied" on start.sh

```bash
# Fix locally, commit, and push
chmod +x server/scripts/start.sh
git add server/scripts/start.sh
git commit -m "fix: make start.sh executable"
git push
```

Or fix directly in the Dockerfile (the `RUN chmod +x /app/start.sh` line handles this).

### Docker build is extremely slow

- Make sure `.dockerignore` exists and excludes `node_modules` — without it Docker sends GBs of data to the build daemon
- On the VM, check disk space: `df -h`. If the disk is full, prune old images: `docker system prune -a`

### Can't SSH into the VM

- NAT mode: Make sure port forwarding rule for SSH exists (Host 2222 → Guest 22)
- Bridged mode: Make sure the VM has an IP on your LAN
- Verify SSH is running inside the VM: `sudo systemctl status ssh`

---

## Summary — Complete File Inventory

Here's everything you need for Phase 9, all in one place:

| File | Location | Committed to Git? |
|------|----------|-------------------|
| `Dockerfile.client` | `docker/Dockerfile.client` | Yes |
| `Dockerfile.server` | `docker/Dockerfile.server` | Yes |
| `nginx.conf` | `docker/nginx.conf` | Yes |
| `docker-compose.yml` | Project root | Yes |
| `.env.example` | Project root | Yes |
| `.env` | Project root | **NO** |
| `.dockerignore` | Project root | Yes |
| `start.sh` | `server/scripts/start.sh` | Yes |

After creating all these files and verifying locally, push to GitHub, clone on your Ubuntu VM, create the `.env` file, and run `docker compose up --build -d`. The entire app will be live.
