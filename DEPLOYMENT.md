# electisSpace v2.0 — Production Deployment Guide

**Author:** Aviv Ben Waiss
**Domain:** solum.co.il/app
**Server OS:** Windows Server
**Stack:** React 19 + Node.js/Express + PostgreSQL + Redis
**Containerization:** Docker Compose

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Preparation](#2-server-preparation)
3. [Clone & Configure](#3-clone--configure)
4. [Build & Deploy](#4-build--deploy)
5. [Host Nginx Configuration](#5-host-nginx-configuration)
6. [SSL/TLS](#6-ssltls)
7. [Database Management](#7-database-management)
8. [XAMPP Coexistence](#8-xampp-coexistence)
9. [Monitoring & Logs](#9-monitoring--logs)
10. [Updating to a New Version](#10-updating-to-a-new-version)
11. [Backup & Restore](#11-backup--restore)
12. [Troubleshooting](#12-troubleshooting)
13. [Architecture Overview](#13-architecture-overview)

---

## 1. Prerequisites

### On the Windows Server:

| Requirement | Minimum Version | Check Command (PowerShell) |
|-------------|----------------|---------------------------|
| **Docker Desktop** | 4.25+ | `docker --version` |
| **Docker Compose** | v2.20+ (included) | `docker compose version` |
| **Git for Windows** | 2.30+ | `git --version` |
| **Nginx for Windows** | 1.24+ | `nginx -v` |

### Install Docker Desktop for Windows:

1. Download from https://www.docker.com/products/docker-desktop/
2. Run the installer — enable **WSL 2 backend** (recommended) or Hyper-V
3. Restart the server
4. Open Docker Desktop and ensure it's running (system tray icon)
5. Verify in PowerShell:

```powershell
docker --version
docker compose version
```

> **Note:** Docker Desktop must be running for `docker` commands to work.
> To start it automatically on boot: Docker Desktop → Settings → General → "Start Docker Desktop when you sign in".

### Install Git for Windows (if not installed):

Download from https://git-scm.com/download/win and install with default options.

### Install Nginx for Windows:

1. Download from https://nginx.org/en/download.html (Windows zip)
2. Extract to `C:\nginx`
3. Test: `C:\nginx\nginx.exe -v`

### DNS Configuration:

Ensure `solum.co.il` A record points to the server's public IP address.

---

## 2. Server Preparation

Open **PowerShell as Administrator**:

```powershell
# Create application directory
mkdir C:\electisspace
```

---

## 3. Clone & Configure

### 3.1 Clone the Repository

```powershell
cd C:\electisspace
git clone -b Dev <repository-url> .
```

### 3.2 Configure Environment Variables

```powershell
# Copy the template
copy .env.production.docker .env.production

# Edit with Notepad (or your preferred editor)
notepad .env.production
```

**You MUST change these values:**

| Variable | How to Generate |
|----------|----------------|
| `POSTGRES_PASSWORD` | Use a strong random password |
| `JWT_ACCESS_SECRET` | 64-character hex string |
| `JWT_REFRESH_SECRET` | 64-character hex string |
| `ENCRYPTION_KEY` | 32-character hex string |
| `ADMIN_PASSWORD` | Choose a strong password |

**Generate secrets in PowerShell:**

```powershell
# Generate random hex strings
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Maximum 256) })
# Run this 3 times for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and ENCRYPTION_KEY (use 16 iterations for ENCRYPTION_KEY)
```

Or use **Git Bash** (installed with Git for Windows):

```bash
openssl rand -hex 32   # for JWT secrets
openssl rand -hex 16   # for ENCRYPTION_KEY
openssl rand -base64 24  # for POSTGRES_PASSWORD
```

### 3.3 Set CORS Origins

In `.env.production`, ensure:

```env
CORS_ORIGINS=https://solum.co.il,http://solum.co.il
```

---

## 4. Build & Deploy

All `docker compose` commands run in **PowerShell** from `C:\electisspace`.

### 4.1 Build All Images

```powershell
docker compose -f docker-compose.prod.yml build
```

This will:
- Build the React frontend with `/app/` base path
- Build the Node.js API server
- Pull PostgreSQL 16 and Redis 7 images

### 4.2 Start All Services

```powershell
docker compose -f docker-compose.prod.yml up -d
```

### 4.3 Run Database Migrations

On first deployment (or after schema changes):

```powershell
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 4.4 Seed the Database (first time only)

```powershell
docker compose -f docker-compose.prod.yml exec server npx tsx prisma/seed.ts
```

### 4.5 Verify Deployment

```powershell
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Test the health endpoint
curl http://localhost:8080/app/api/v1/health

# Or open in browser:
Start-Process "http://localhost:8080/app/"
```

---

## 5. Host Nginx Configuration

Your server already runs nginx for other `solum.co.il` routes. Add the electisSpace proxy block.

### 5.1 Locate Nginx Config

Typical Windows nginx config location:

```
C:\nginx\conf\nginx.conf
```

### 5.2 Add Location Block

Open `C:\nginx\conf\nginx.conf` in your editor and add the following inside your existing `server { }` block for `solum.co.il`:

```nginx
    # =============================================
    # electisSpace Application — /app
    # =============================================
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Standard proxy headers
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for Socket.io)
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        # SSE (Server-Sent Events) support — critical for real-time sync
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;

        # Increase max body size for file uploads
        client_max_body_size 10m;
    }
```

### 5.3 Test & Reload

```powershell
# Test configuration syntax
C:\nginx\nginx.exe -t

# Reload nginx (zero-downtime)
C:\nginx\nginx.exe -s reload
```

### 5.4 Run Nginx as a Windows Service (recommended)

To ensure nginx starts automatically on boot, install it as a Windows service using [WinSW](https://github.com/winsw/winsw) or [NSSM](https://nssm.cc/):

```powershell
# Using NSSM (download from https://nssm.cc/download)
nssm install nginx "C:\nginx\nginx.exe"
nssm set nginx AppDirectory "C:\nginx"
nssm start nginx
```

### 5.5 Verify

Open your browser and navigate to: `https://solum.co.il/app`

---

## 6. SSL/TLS

### Option A: SSL already configured on host nginx

If SSL is already set up for `solum.co.il`, the `/app` location block will automatically use it. No extra work needed.

### Option B: Using win-acme (Let's Encrypt for Windows)

1. Download [win-acme](https://www.win-acme.com/) (WACS)
2. Run `wacs.exe` and follow the prompts:
   - Choose your nginx site
   - Domain: `solum.co.il`
   - It will auto-configure the certificate and renewal

### Option C: Manual certificate

Place your certificate files and update nginx config:

```nginx
server {
    listen 443 ssl;
    server_name solum.co.il;

    ssl_certificate     C:/nginx/ssl/solum.co.il.crt;
    ssl_certificate_key C:/nginx/ssl/solum.co.il.key;

    # ... location blocks ...
}
```

---

## 7. Database Management

### 7.1 Run Migrations

After deploying a new version with schema changes:

```powershell
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 7.2 Open Prisma Studio (for debugging)

```powershell
docker compose -f docker-compose.prod.yml exec server npx prisma studio
```

Then open `http://localhost:5555` in your browser.

### 7.3 Connect Directly to PostgreSQL

```powershell
docker compose -f docker-compose.prod.yml exec db psql -U electis -d electisspace_prod
```

---

## 8. XAMPP Coexistence

The deployment is designed to coexist with XAMPP:

| Service | Port | Network |
|---------|------|---------|
| XAMPP MySQL | 3306 (host) | Host network |
| XAMPP Apache | 80/443 (host) | Host network — **stop if host nginx uses 80/443** |
| PostgreSQL (Docker) | 5432 (internal only) | `electisspace-network` (Docker) |
| Redis (Docker) | 6379 (internal only) | `electisspace-network` (Docker) |
| Docker nginx | 8080 (host) → 80 (container) | Bridge to host |

**Key points:**
- PostgreSQL runs **entirely inside Docker** — no host port exposed, no conflict with MySQL (3306)
- Redis runs **entirely inside Docker** — no host port exposed
- Only port **8080** is exposed to the host (Docker nginx → host nginx proxy)
- If XAMPP Apache is running on port 80, stop it so host nginx can use port 80/443

**Stop XAMPP Apache if needed:**

```powershell
# Via XAMPP Control Panel — click "Stop" next to Apache
# Or via command line:
C:\xampp\xampp_stop.exe
# Or stop just Apache:
C:\xampp\apache\bin\httpd.exe -k stop
```

---

## 9. Monitoring & Logs

### 9.1 View Logs

```powershell
# All services (follow mode)
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f db
```

### 9.2 Check Service Health

```powershell
# Service status with health
docker compose -f docker-compose.prod.yml ps

# API health check
curl http://localhost:8080/app/api/v1/health
```

### 9.3 Resource Usage

```powershell
docker stats --no-stream
```

---

## 10. Updating to a New Version

```powershell
cd C:\electisspace

# 1. Pull latest code
git pull origin Dev

# 2. Rebuild images
docker compose -f docker-compose.prod.yml build

# 3. Restart services (db/redis keep running)
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations if schema changed
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# 5. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/app/api/v1/health
```

### Rolling Back

```powershell
# Check out previous version
git checkout <previous-tag-or-commit>

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 11. Backup & Restore

### 11.1 Database Backup

```powershell
# Create backup
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U electis electisspace_prod > backup.sql
```

### 11.2 Automated Daily Backup

Create a PowerShell script `C:\electisspace\backup.ps1`:

```powershell
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\electisspace\backups"
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir }

docker compose -f C:\electisspace\docker-compose.prod.yml exec -T db pg_dump -U electis electisspace_prod | Out-File "$backupDir\backup_$date.sql" -Encoding UTF8

# Keep only last 30 backups
Get-ChildItem "$backupDir\backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item
```

Schedule it with **Task Scheduler**:

1. Open Task Scheduler → Create Basic Task
2. Name: "electisSpace DB Backup"
3. Trigger: Daily at 03:00
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File C:\electisspace\backup.ps1`

### 11.3 Database Restore

```powershell
# Stop the server first
docker compose -f docker-compose.prod.yml stop server

# Restore
Get-Content backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U electis -d electisspace_prod

# Restart server
docker compose -f docker-compose.prod.yml start server
```

---

## 12. Troubleshooting

### Container won't start

```powershell
# Check logs for errors
docker compose -f docker-compose.prod.yml logs server --tail 50
docker compose -f docker-compose.prod.yml logs db --tail 50

# Check if port 8080 is in use
netstat -ano | findstr :8080
```

### Frontend returns 404

```powershell
# Verify frontend files were built and copied
docker compose -f docker-compose.prod.yml exec nginx ls /usr/share/nginx/html/

# If empty, rebuild
docker compose -f docker-compose.prod.yml build client
docker compose -f docker-compose.prod.yml up -d client nginx
```

### API not reachable

```powershell
# Test API directly inside Docker network
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://server:3000/health

# Check server logs
docker compose -f docker-compose.prod.yml logs server --tail 100
```

### SSE/Real-time not working

Ensure all nginx layers have buffering disabled. Check both:
1. Docker nginx (`nginx\nginx.conf`) — should have `proxy_buffering off;`
2. Host nginx (`C:\nginx\conf\nginx.conf`) — should have `proxy_buffering off;` in the `/app` location block

### Database connection issues

```powershell
# Check if db container is running and healthy
docker compose -f docker-compose.prod.yml ps db

# Test connectivity from server
docker compose -f docker-compose.prod.yml exec server sh -c "nc -z db 5432 && echo 'DB reachable' || echo 'DB unreachable'"
```

### Docker Desktop not running

If you get "error during connect" — Docker Desktop must be running:

```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Wait ~30 seconds for it to initialize, then retry
```

### Reset everything (nuclear option)

```powershell
# WARNING: This destroys all data!
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec server npx tsx prisma/seed.ts
```

---

## 13. Architecture Overview

```
                    Internet
                       |
                       v
              +----------------+
              |  solum.co.il   |
              | (Host Nginx)   |
              | C:\nginx       |
              | Port 80/443    |
              +-------+--------+
                      | /app -> proxy_pass :8080
                      v
        +-----------------------------+
        |     Docker Network          |
        |  (electisspace-network)     |
        |                             |
        |  +-----------------------+  |
        |  |   Nginx (container)   |  |
        |  |   Port 8080:80        |  |
        |  |                       |  |
        |  |  /app/ -> static SPA  |  |
        |  |  /app/api/ -> server  |  |
        |  +------+----------------+  |
        |         |                   |
        |         v                   |
        |  +-----------------------+  |
        |  |   Server (Node.js)    |  |
        |  |   Port 3000           |  |
        |  |   Express API         |  |
        |  |   Background Jobs     |  |
        |  +--+---------------+----+  |
        |     |               |       |
        |     v               v       |
        |  +----------+ +--------+   |
        |  |PostgreSQL | | Redis  |   |
        |  |Port 5432  | |Port6379|   |
        |  |(internal) | |(intern)|   |
        |  +----------+ +--------+   |
        +-----------------------------+
```

**Request flow:**
1. Browser → `https://solum.co.il/app/` → Host Nginx (port 443)
2. Host Nginx → `proxy_pass http://127.0.0.1:8080` → Docker Nginx (port 80)
3. Docker Nginx:
   - `/app/` → serves static React SPA files
   - `/app/api/*` → proxies to `server:3000/api/*`
4. API Server → PostgreSQL / Redis (internal Docker network)
