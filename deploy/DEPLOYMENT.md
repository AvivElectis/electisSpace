# electisSpace — Ubuntu Server Deployment Guide

**Server:** `185.159.72.229` (user: `electis`)
**URL:** `https://app.solumesl.co.il`

## Architecture

```
Internet → DNS (app.solumesl.co.il)
  │
  ▼
NPM (Nginx Proxy Manager) — SSL termination (Let's Encrypt)
  │
  ▼ proxy to :3071
┌──────────────────────────────────────────────────────────────┐
│  All services on global-network                              │
│                                                              │
│  electisspace-server (:3071 → :3000 internal)                │
│   ├── /           → static frontend (SPA)                    │
│   ├── /api/v1/    → REST API                                 │
│   └── /health     → health check                             │
│                                                              │
│  electisspace-redis (:6381 → :6379 internal)                 │
│                                                              │
│  global-postgres (:5432) ← existing infra                    │
│   └── database: electisspace_prod                            │
└──────────────────────────────────────────────────────────────┘
```

## Compose File Structure

Follows the adapter-system pattern: split infra + app compose files, all on `global-network`.

| File | Purpose | Rebuild frequency |
|---|---|---|
| `docker-compose.infra.yml` | Redis cache | Rarely (started once) |
| `docker-compose.app.yml` | Client build + Server | Every deploy |

The server serves both the API and the static frontend (no separate nginx container).
NPM handles SSL termination and proxies `app.solumesl.co.il` → `127.0.0.1:3071`.

## Prerequisites

- Docker & Docker Compose installed
- Existing `global-postgres` container on `global-network`
- Nginx Proxy Manager (NPM) container running
- Git access to this repo

## Step 1: Clone the repo

```bash
cd /opt
sudo git clone https://github.com/AvivElectis/electisSpace.git
sudo chown -R electis:electis electisSpace
cd electisSpace
```

## Step 2: Create the database

```bash
docker exec global-postgres psql -U postgres -c "CREATE DATABASE electisspace_prod;"
```

Verify:

```bash
docker exec global-postgres psql -U postgres -c "\l" | grep electisspace
```

## Step 3: Configure environment

**Root `.env`** (PostgreSQL password for docker-compose):

```bash
echo "POSTGRES_PASSWORD=<global_postgres_password>" > .env
```

**Server env** (`deploy/server.env`):

```bash
cp deploy/server.env.example deploy/server.env
nano deploy/server.env
```

**Required changes:**
- `JWT_ACCESS_SECRET` — generate with `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 32`
- `ENCRYPTION_KEY` — generate with `openssl rand -hex 16`
- `CORS_ORIGINS=https://app.solumesl.co.il`
- `ADMIN_PASSWORD` — strong password for initial admin account
- `EXCHANGE_PASSWORD` — real Exchange server password

**Quick generate:**

```bash
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

> Note: `DATABASE_URL` and `REDIS_URL` are set in `docker-compose.app.yml`, not in the server env file.

## Step 4: Start infrastructure

```bash
docker compose -f docker-compose.infra.yml up -d
```

## Step 5: Build and start app

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d
```

## Step 6: Run database migrations

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server npx prisma migrate deploy
```

## Step 7: Seed initial data (optional)

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server npx prisma db seed
```

## Step 8: Configure NPM (Nginx Proxy Manager)

Access NPM admin UI via SSH tunnel:

```bash
ssh -L 8181:127.0.0.1:81 electis@185.159.72.229
```

Then open `http://localhost:8181` in browser.

**Details tab:**

| Field                  | Value                  |
|------------------------|------------------------|
| Domain Names           | `app.solumesl.co.il`  |
| Scheme                 | `http`                 |
| Forward Hostname / IP  | `127.0.0.1`           |
| Forward Port           | `3071`                 |
| Cache Assets           | ON                     |
| Block Common Exploits  | ON                     |
| Websockets Support     | ON                     |

**SSL tab:**

| Field                  | Value                            |
|------------------------|----------------------------------|
| SSL Certificate        | Request a new SSL Certificate    |
| Force SSL              | ON                               |
| HTTP/2 Support         | ON                               |
| Email for Let's Encrypt| `admin@electis.co.il`            |

**DNS prerequisite:** Ensure an A record for `app.solumesl.co.il` points to `185.159.72.229` before requesting the SSL cert.

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml logs -f server

# Restart server
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml restart server

# Stop app layer only (keeps Redis running)
docker compose -f docker-compose.app.yml down

# Stop everything
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml down

# Rebuild after code changes
git pull
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d

# Run Prisma migrations after schema changes
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server npx prisma migrate deploy

# Access server shell
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server sh

# Check database connection
docker exec global-postgres psql -U postgres -d electisspace_prod -c "SELECT 1;"

# Check Redis
docker exec electisspace-redis redis-cli ping
```

## Troubleshooting

### Server can't connect to PostgreSQL
Verify the server is on `global-network`:
```bash
docker inspect electisspace-server --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

### Prisma migration fails
Make sure the database exists:
```bash
docker exec global-postgres psql -U postgres -c "\l" | grep electisspace
```

### CORS errors in browser
Check `CORS_ORIGINS` in `deploy/server.env` matches your domain exactly (including `https://`).

---

## CI/CD — Automated Deployment

Pushes to `main` automatically deploy to the Ubuntu server via GitHub Actions.

**Workflow file:** `.github/workflows/deploy-ubuntu.yml`

### GitHub Repository Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions, and add:

| Secret           | Value                                                    |
|------------------|----------------------------------------------------------|
| `DEPLOY_SSH_KEY` | Private key contents (from `~/.ssh/ubuntu_key`)          |
| `DEPLOY_HOST`    | `185.159.72.229`                                         |
| `DEPLOY_USER`    | `electis`                                                |

### What the workflow does

1. SSHs into the server
2. `git pull origin main`
3. Builds and restarts containers
4. Runs Prisma migrations
5. Health check (`curl http://localhost:3071/health`)

Doc-only changes (`*.md`, `docs/**`) are skipped.

### Manual deployment (fallback)

```bash
ssh electis@185.159.72.229
cd /opt/electisSpace
git pull origin main
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server npx prisma migrate deploy
```

---

## Verification Checklist

### After server deployment
- [ ] `docker compose -f docker-compose.infra.yml -f docker-compose.app.yml ps` — all containers healthy
- [ ] `curl http://localhost:3071/health` — returns OK
- [ ] `docker compose -f docker-compose.infra.yml -f docker-compose.app.yml logs server` — no errors

### After NPM setup
- [ ] DNS A record: `app.solumesl.co.il` → `185.159.72.229`
- [ ] `curl -I https://app.solumesl.co.il/` — returns 200
- [ ] SSL certificate is valid (Let's Encrypt)
- [ ] Login page loads in browser

### After CI/CD setup
- [ ] GitHub Secrets configured: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`
- [ ] Push a test change to `main` → workflow triggers and completes
- [ ] App is accessible at `https://app.solumesl.co.il`
