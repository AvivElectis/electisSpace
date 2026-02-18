# electisSpace — Ubuntu Server Deployment Guide

## Architecture

```
NPM (Nginx Proxy Manager)
  │
  ▼ proxy to :3071
┌─────────────────────────────────────────────┐
│  electisspace-nginx (:3071 → :80 internal)  │
│   ├── /app/      → static frontend          │
│   └── /app/api/  → electisspace-server:3000 │
├─────────────────────────────────────────────┤
│  electisspace-server (:3000 internal)       │
│   ├── connects to global-postgres:5432      │
│   └── connects to electisspace-redis:6379   │
├─────────────────────────────────────────────┤
│  electisspace-redis (:6381 host → :6379)    │
└─────────────────────────────────────────────┘
         │
         ▼ external network (infra_default)
┌─────────────────────────────────────────────┐
│  global-postgres (:5432)  ← existing infra  │
│   └── database: electisspace_prod           │
└─────────────────────────────────────────────┘
```

## Prerequisites

- Docker & Docker Compose installed
- Existing `global-postgres` container running (infra Docker)
- Nginx Proxy Manager (NPM) container running
- Git access to this repo

## Step 1: Clone the repo

```bash
cd /opt
git clone https://github.com/AvivElectis/electisSpace.git
cd electisSpace
git checkout deploy/ubuntu   # or main after merge
```

## Step 2: Find the infra Docker network

The `global-postgres` container runs on an external Docker network.
Find which network it's on:

```bash
docker inspect global-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}'
```

If the output is NOT `infra_default`, edit `docker-compose.ubuntu.yml` and change:

```yaml
  infra_default:
    external: true
```

to match the actual network name.

## Step 3: Create the database

```bash
docker exec global-postgres psql -U postgres -c "CREATE DATABASE electisspace_prod;"
```

Verify:

```bash
docker exec global-postgres psql -U postgres -c "\l" | grep electisspace
```

## Step 4: Configure environment

```bash
cp deploy/server.env.example deploy/server.env
```

Edit `deploy/server.env` and set real values:

```bash
nano deploy/server.env
```

**Required changes:**
- `JWT_ACCESS_SECRET` — generate with `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 32`
- `ENCRYPTION_KEY` — generate with `openssl rand -hex 16`
- `CORS_ORIGINS` — set to your domain (e.g., `https://electis.example.com`)
- `ADMIN_PASSWORD` — strong password for initial admin account
- `EXCHANGE_PASSWORD` — Exchange server password (for email)

**Quick generate:**

```bash
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

> Note: `DATABASE_URL` and `REDIS_URL` are set in `docker-compose.ubuntu.yml`, not in the env file.

## Step 5: Build and start

```bash
docker compose -f docker-compose.ubuntu.yml build
docker compose -f docker-compose.ubuntu.yml up -d
```

## Step 6: Run database migrations

```bash
docker compose -f docker-compose.ubuntu.yml exec server npx prisma migrate deploy
```

## Step 7: Seed initial data (optional)

```bash
docker compose -f docker-compose.ubuntu.yml exec server npx prisma db seed
```

## Step 8: Configure NPM

In Nginx Proxy Manager, add a proxy host:

| Field              | Value                          |
|--------------------|--------------------------------|
| Domain             | your-domain.com                |
| Scheme             | http                           |
| Forward Hostname   | host-ip or `127.0.0.1`        |
| Forward Port       | `3071`                         |
| SSL                | Request new Let's Encrypt cert |
| Websockets Support | Enable                         |

The app will be available at `https://your-domain.com/app/`

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.ubuntu.yml logs -f server
docker compose -f docker-compose.ubuntu.yml logs -f nginx

# Restart
docker compose -f docker-compose.ubuntu.yml restart server

# Stop everything
docker compose -f docker-compose.ubuntu.yml down

# Rebuild after code changes
git pull
docker compose -f docker-compose.ubuntu.yml build
docker compose -f docker-compose.ubuntu.yml up -d

# Run Prisma migrations after schema changes
docker compose -f docker-compose.ubuntu.yml exec server npx prisma migrate deploy

# Access server shell
docker compose -f docker-compose.ubuntu.yml exec server sh

# Check database connection
docker exec global-postgres psql -U postgres -d electisspace_prod -c "SELECT 1;"

# Check Redis
docker exec electisspace-redis redis-cli ping
```

## Troubleshooting

### "infra_default network not found"
Find the correct network name:
```bash
docker network ls | grep -i infra
```
Update `docker-compose.ubuntu.yml` with the correct network name.

### Server can't connect to PostgreSQL
Verify the server is on the same network as `global-postgres`:
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
