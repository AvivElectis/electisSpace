---
tags: [#deploy, #docker, #capacitor, #electron, #nginx, #pm2, #ci-cd]
---

**Related:** [[electisSpace]], [[architecture]], [[deploy-windows]]

# Deployment

## Deployment Modes

| Mode | Base Path | Compose File | Host |
|------|-----------|-------------|------|
| Dev (Vite) | `./` | `docker-compose.dev.yml` (backend) | localhost:3000 (client), :3001 (server) |
| Dev (Full Docker) | `./` | `docker-compose.dev.yml` | localhost:3001 |
| Prod (Ubuntu Docker) | `/` | `docker-compose.infra.yml` + `docker-compose.app.yml` | app.solumesl.co.il |
| Prod (Windows Native) | `/app/` | N/A (PM2 + host Nginx) | solum.co.il/app |

## Docker (Ubuntu Production)

**Server:** `185.159.72.229` (user: `electis`)
**URL:** `https://app.solumesl.co.il`

### Architecture

```
Internet -> DNS (app.solumesl.co.il)
  -> NPM (Nginx Proxy Manager) -- SSL termination (Let's Encrypt)
    -> :3071

  electisspace-server (:3071 -> :3000 internal)  -- Nginx SPA + reverse proxy
  electisspace-api (:3000 internal)               -- Express API
  electisspace-redis (:6381 -> :6379 internal)    -- Redis cache
  global-postgres (:5432)                         -- Shared PostgreSQL
    database: electisspace_prod
```

All services on `global-network` (external Docker network).

### Compose Files

| File | Purpose | Rebuild |
|---|---|---|
| `docker-compose.infra.yml` | Redis cache | Rarely |
| `docker-compose.app.yml` | Client (Nginx) + Server (Express) | Every deploy |

### Key Commands

```bash
# Build and start
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d

# Migrations
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml exec server npx prisma migrate deploy

# Logs
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml logs -f server
```

### Docker Dev Stack

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Includes: PostgreSQL 17 (:5433), Redis 7 (:6380), auto-migrate, Express API (:3001).

### NPM SSL Config

| Field | Value |
|-------|-------|
| Domain | `app.solumesl.co.il` |
| Forward to | `127.0.0.1:3071` |
| SSL | Let's Encrypt, Force SSL, HTTP/2 |
| Websockets | ON |

## CI/CD (GitHub Actions)

**Workflow:** `.github/workflows/deploy-ubuntu.yml`

Pushes to `main` auto-deploy: SSH -> git pull -> build containers -> prisma migrate -> health check. Doc-only changes (`*.md`, `docs/**`) are skipped.

**GitHub Secrets:** `DEPLOY_SSH_KEY`, `DEPLOY_HOST` (`185.159.72.229`), `DEPLOY_USER` (`electis`)

## Windows Native (PM2)

See [[deploy-windows]] for full step-by-step guide.

**Server:** Windows Server 2019 at `solum.co.il/app`
- PM2 manages Node.js process (`ecosystem.config.cjs`)
- Host Nginx at `C:\nginx` serves SPA + proxies API to :4000
- PostgreSQL 16, Redis/Memurai on localhost

## Electron Desktop

```bash
npm run electron:build   # Build installer (NSIS, x64)
# Output: dist-electron/electisSpace.Setup.<version>.exe
```

- Auto-update via GitHub Releases (`electron-updater`)
- Main process: `electron/main.cjs`
- Dev: `npm run electron:dev` (Vite + Electron concurrent)

## Capacitor Android

```bash
npm run android:build    # Build + sync + copy
npm run android:dev      # Dev build (API at 10.0.2.2:3001)
npm run android:prod     # Prod build (API at solum.co.il)
npm run android:install  # Install APK via ADB
```

- Capacitor 8, app ID: `com.electisspace.app`
- Features: biometric auth, filesystem, haptics, network detection, status bar

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Root: `POSTGRES_PASSWORD` for docker-compose |
| `server/.env` | Production server config |
| `server/.env.development` | Dev server config (Docker dev) |
| `server/.env.example` | Documents all required variables |
| `deploy/server.env` | Ubuntu Docker deployment env |
| `deploy/server.env.example` | Template for deploy env |

### Required Server Env Vars

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL`, `REDIS_URL`, `EXCHANGE_HOST`, `EXCHANGE_PORT`, `EXCHANGE_PASSWORD`
