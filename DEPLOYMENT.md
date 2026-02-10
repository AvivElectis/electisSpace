# electisSpace v2.0 — Production Deployment Guide

**Author:** Aviv Ben Waiss
**Domain:** solum.co.il/app
**Stack:** React 19 + Node.js/Express + PostgreSQL + Redis
**Containerization:** Docker Compose

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Preparation](#2-server-preparation)
3. [Clone & Configure](#3-clone--configure)
4. [Build & Deploy](#4-build--deploy)
5. [Host Nginx Configuration](#5-host-nginx-configuration)
6. [SSL/TLS with Let's Encrypt](#6-ssltls-with-lets-encrypt)
7. [Database Management](#7-database-management)
8. [XAMPP Coexistence](#8-xampp-coexistence)
9. [Monitoring & Logs](#9-monitoring--logs)
10. [Updating to a New Version](#10-updating-to-a-new-version)
11. [Backup & Restore](#11-backup--restore)
12. [Troubleshooting](#12-troubleshooting)
13. [Architecture Overview](#13-architecture-overview)

---

## 1. Prerequisites

### On the deployment server:

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| **Docker** | 24.0+ | `docker --version` |
| **Docker Compose** | v2.20+ (plugin) | `docker compose version` |
| **Git** | 2.30+ | `git --version` |
| **Nginx** (host) | 1.18+ | `nginx -v` |
| **Certbot** (optional) | Latest | `certbot --version` |

### Install Docker (if not installed):

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

### DNS Configuration:

Ensure `solum.co.il` points to the server's public IP address (A record).

---

## 2. Server Preparation

```bash
# Create application directory
sudo mkdir -p /opt/electisspace
sudo chown $USER:$USER /opt/electisspace
```

---

## 3. Clone & Configure

### 3.1 Clone the Repository

```bash
cd /opt/electisspace
git clone <repository-url> .
```

### 3.2 Configure Environment Variables

```bash
# Copy the template
cp .env.production.docker .env.production

# Edit with your secrets
nano .env.production
```

**You MUST change these values:**

| Variable | How to Generate |
|----------|----------------|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 16` |
| `ADMIN_PASSWORD` | Choose a strong password |

**Example:**

```bash
# Generate all secrets at once
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

### 3.3 Set CORS Origins

In `.env.production`, update the `CORS_ORIGINS` value:

```env
CORS_ORIGINS=https://solum.co.il,http://solum.co.il
```

---

## 4. Build & Deploy

### 4.1 Build All Images

```bash
docker compose -f docker-compose.prod.yml build
```

This will:
- Build the React frontend with `/app/` base path
- Build the Node.js API server
- Pull PostgreSQL 16 and Redis 7 images

### 4.2 Start All Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4.3 Run Database Migrations

On first deployment (or after schema changes):

```bash
# Run Prisma migrations inside the server container
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 4.4 Seed the Database (first time only)

```bash
docker compose -f docker-compose.prod.yml exec server npx tsx prisma/seed.ts
```

### 4.5 Verify Deployment

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Test the health endpoint
curl http://localhost:8080/app/api/v1/health

# Test the frontend
curl -s http://localhost:8080/app/ | head -5
```

---

## 5. Host Nginx Configuration

Your server already runs nginx for other `solum.co.il` routes. Add the following block to your existing nginx configuration.

### 5.1 Add Site Configuration

Edit your nginx config (typically `/etc/nginx/sites-available/solum.co.il` or `/etc/nginx/conf.d/solum.conf`):

```nginx
# Inside your existing server { } block for solum.co.il:

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

### 5.2 Test & Reload

```bash
# Test configuration syntax
sudo nginx -t

# Reload nginx (zero-downtime)
sudo systemctl reload nginx
```

### 5.3 Verify

Open your browser and navigate to: `https://solum.co.il/app`

---

## 6. SSL/TLS with Let's Encrypt

If you don't already have SSL configured for `solum.co.il`:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (auto-configures nginx)
sudo certbot --nginx -d solum.co.il

# Auto-renewal is set up automatically, verify with:
sudo certbot renew --dry-run
```

If SSL is already configured, the `/app` location block will automatically use it.

---

## 7. Database Management

### 7.1 Run Migrations

After deploying a new version with schema changes:

```bash
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 7.2 Open Prisma Studio (for debugging)

```bash
# Temporarily expose on port 5555
docker compose -f docker-compose.prod.yml exec -p 5555:5555 server npx prisma studio
```

### 7.3 Connect Directly to PostgreSQL

```bash
docker compose -f docker-compose.prod.yml exec db psql -U electis -d electisspace_prod
```

---

## 8. XAMPP Coexistence

The deployment is designed to coexist with XAMPP:

| Service | Port | Network |
|---------|------|---------|
| XAMPP MySQL | 3306 (host) | Host network |
| XAMPP Apache | 80/443 (host) | Host network — **should be stopped if host nginx uses 80/443** |
| PostgreSQL (Docker) | 5432 (internal only) | `electisspace-network` (Docker) |
| Redis (Docker) | 6379 (internal only) | `electisspace-network` (Docker) |
| Docker nginx | 8080 (host) → 80 (container) | Bridge to host |

**Key points:**
- PostgreSQL runs **entirely inside Docker** — no host port exposed, no conflict with MySQL
- Redis runs **entirely inside Docker** — no host port exposed
- Only port **8080** is exposed to the host (Docker nginx → host nginx proxy)
- If XAMPP Apache is running on port 80, ensure host nginx uses a different port or stop Apache

**Stop XAMPP Apache if needed:**

```bash
sudo /opt/lampp/lampp stopapache
# or
sudo systemctl stop apache2
```

---

## 9. Monitoring & Logs

### 9.1 View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f db
```

### 9.2 Check Service Health

```bash
# Service status with health
docker compose -f docker-compose.prod.yml ps

# API health check
curl -s http://localhost:8080/app/api/v1/health | python3 -m json.tool
```

### 9.3 Resource Usage

```bash
docker stats --no-stream
```

---

## 10. Updating to a New Version

```bash
cd /opt/electisspace

# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker compose -f docker-compose.prod.yml build

# 3. Restart services (zero-downtime for db/redis)
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations if schema changed
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# 5. Verify
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost:8080/app/api/v1/health
```

### Rolling Back

```bash
# Check out previous version
git checkout <previous-tag-or-commit>

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 11. Backup & Restore

### 11.1 Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U electis electisspace_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup (add to crontab)
# crontab -e
0 3 * * * cd /opt/electisspace && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U electis electisspace_prod | gzip > /opt/backups/electisspace_$(date +\%Y\%m\%d).sql.gz
```

### 11.2 Database Restore

```bash
# Stop the server first
docker compose -f docker-compose.prod.yml stop server

# Restore
gunzip -c backup_20260210.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U electis -d electisspace_prod

# Restart server
docker compose -f docker-compose.prod.yml start server
```

### 11.3 Full Data Backup (volumes)

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Backup volumes
docker run --rm -v electisspace-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_volume_backup.tar.gz -C /data .
docker run --rm -v electisspace-redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis_volume_backup.tar.gz -C /data .

# Start services
docker compose -f docker-compose.prod.yml up -d
```

---

## 12. Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs server --tail 50
docker compose -f docker-compose.prod.yml logs db --tail 50

# Check if ports are in use
sudo lsof -i :8080
sudo lsof -i :5432
```

### Frontend returns 404

```bash
# Verify frontend files were built and copied
docker compose -f docker-compose.prod.yml exec nginx ls -la /usr/share/nginx/html/

# If empty, rebuild
docker compose -f docker-compose.prod.yml build client
docker compose -f docker-compose.prod.yml up -d client nginx
```

### API not reachable

```bash
# Test API directly inside Docker network
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://server:3000/health

# Check server logs
docker compose -f docker-compose.prod.yml logs server --tail 100
```

### SSE/Real-time not working

Ensure all nginx layers have buffering disabled. Check both:
1. Docker nginx (`nginx/nginx.conf`) — should have `proxy_buffering off;`
2. Host nginx — should have `proxy_buffering off;` in the `/app` location block

```bash
# Test SSE directly
curl -N http://localhost:8080/app/api/v1/stores/<store-id>/events \
  -H "Authorization: Bearer <token>"
```

### Database connection issues

```bash
# Check if db container is running and healthy
docker compose -f docker-compose.prod.yml ps db

# Test connectivity from server
docker compose -f docker-compose.prod.yml exec server sh -c "nc -z db 5432 && echo 'DB reachable' || echo 'DB unreachable'"
```

### Reset everything (nuclear option)

```bash
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
                       │
                       ▼
              ┌────────────────┐
              │  solum.co.il   │
              │  (Host Nginx)  │
              │  Port 80/443   │
              └───────┬────────┘
                      │ /app → proxy_pass :8080
                      ▼
        ┌─────────────────────────────┐
        │     Docker Network          │
        │  (electisspace-network)     │
        │                             │
        │  ┌───────────────────────┐  │
        │  │   Nginx (container)   │  │
        │  │   Port 8080:80        │  │
        │  │                       │  │
        │  │  /app/ → static files │  │
        │  │  /app/api/ → server   │  │
        │  └──────┬────────────────┘  │
        │         │                   │
        │         ▼                   │
        │  ┌───────────────────────┐  │
        │  │   Server (Node.js)   │  │
        │  │   Port 3000          │  │
        │  │   Express API        │  │
        │  │   Background Jobs    │  │
        │  └──┬──────────────┬────┘  │
        │     │              │       │
        │     ▼              ▼       │
        │  ┌──────────┐ ┌────────┐  │
        │  │PostgreSQL│ │ Redis  │  │
        │  │Port 5432 │ │Port6379│  │
        │  │(internal)│ │(intern)│  │
        │  └──────────┘ └────────┘  │
        └─────────────────────────────┘
```

**Request flow:**
1. Browser → `https://solum.co.il/app/` → Host Nginx (port 443)
2. Host Nginx → `proxy_pass http://127.0.0.1:8080` → Docker Nginx (port 80)
3. Docker Nginx:
   - `/app/` → serves static React SPA files
   - `/app/api/*` → proxies to `server:3000/api/*`
4. API Server → PostgreSQL / Redis (internal Docker network)
