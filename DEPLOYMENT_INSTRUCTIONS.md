# electisSpace v2.1.0 — Windows Server Deployment Instructions

**Date:** 2026-02-13
**Branch:** `main_windows`
**Server:** Windows Server (PM2 + native Redis + local PostgreSQL)

---

## Pre-deployment Checklist

- [ ] Backup the PostgreSQL database: `pg_dump -U postgres electisspace > backup_pre_v2.1.0.sql`
- [ ] Note the current running version: `pm2 list`
- [ ] Ensure Redis is running: `redis-cli ping` → `PONG`
- [ ] Confirm no active users (or schedule maintenance window)

---

## Step-by-step Deployment

### 1. Stop the application

```powershell
pm2 stop electisspace
```

### 2. Pull latest code

```powershell
cd C:\electisSpace
git fetch origin
git checkout main_windows
git pull origin main_windows
```

### 3. Install dependencies

```powershell
npm install
cd server
npm install
cd ..
```

### 4. Run database migration

Connect to PostgreSQL and run the migration:

```powershell
psql -U postgres -d electisspace -f migration_20260212_main_windows.sql
```

Then sync the Prisma client:

```powershell
cd server
npx prisma generate
npx prisma db push
cd ..
```

### 5. Build frontend

```powershell
$env:VITE_BASE_PATH = "/app/"
npm run build
```

Verify the build output:
- Check that `dist/index.html` references `/app/assets/...`

### 6. Build server

```powershell
cd server
npm run build
cd ..
```

### 7. Update nginx config (if changed)

```powershell
Copy-Item nginx\solum_co_il.conf C:\nginx\conf\vhosts\solum_co_il.conf
nginx.exe -t
nginx.exe -s reload
```

### 8. Start the application

```powershell
pm2 start ecosystem.config.js
pm2 save
```

---

## Post-deployment Verification

- [ ] `pm2 status` — app is running, no restarts
- [ ] `pm2 logs electisspace --lines 20` — no errors on startup
- [ ] Open `https://solum.co.il/app/` — frontend loads
- [ ] Login works (auth flow)
- [ ] SSE connection established (check Network tab for `/app/api/v1/events/stream`)
- [ ] People list loads correctly
- [ ] Check Redis connectivity: `redis-cli ping`
- [ ] Check database: `psql -U postgres -d electisspace -c "SELECT count(*) FROM people;"`

---

## Rollback Plan

If issues arise, roll back to the previous version:

```powershell
pm2 stop electisspace
cd C:\electisSpace
git checkout main_windows~1
npm install
cd server && npm install && cd ..

# Rebuild
$env:VITE_BASE_PATH = "/app/"
npm run build
cd server && npm run build && cd ..

pm2 start ecosystem.config.js
pm2 save
```

If the database migration needs reversal (unlikely — indexes are safe):

```sql
DROP INDEX IF EXISTS "people_externalId_idx";
DROP INDEX IF EXISTS "people_virtualSpaceId_idx";
```

---

## What's New in v2.1.0

- Bug fixes for all tests
- Mobile UI improvements
- Auth caching and Redis caching
- People service refactoring (composable hooks, split CSV service)
- Performance optimizations (database connection pool, indexes)
- Localization updates
