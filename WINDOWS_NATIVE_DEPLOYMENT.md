# electisSpace - Native Windows Server Deployment
## Without Docker - Direct Installation on Windows Server 2019

**Generated:** 2026-02-10
**Server:** Windows Server 2019 (Build 17763)
**Domain:** solum.co.il/app
**Environment:** Production

---

## 📋 Current Status

✅ **Already Installed:**
- Node.js v22.14.0
- npm v11.7.0
- nginx (C:\nginx\)
- Git Bash
- .env.production configured with secrets

⚠️ **Need to Install:**
- PostgreSQL 16 for Windows
- Redis for Windows
- PM2 (Node.js process manager)

---

## 🚀 Deployment Steps

### Step 1: Install PostgreSQL 16 for Windows

**Download and Install:**
1. Download PostgreSQL 16 installer:
   ```
   https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   ```
   Select: **PostgreSQL 16.x - Windows x86-64**

2. **Run installer** (as Administrator):
   - Installation Directory: `C:\Program Files\PostgreSQL\16`
   - Port: **5432** (default)
   - Superuser password: **Choose a strong password** (save it!)
   - Components: Install **PostgreSQL Server** and **Command Line Tools**
   - Skip Stack Builder

3. **Verify installation:**
   ```powershell
   # Add to PATH (if not already):
   $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

   # Test
   psql --version
   ```

4. **Create database and user:**
   ```powershell
   # Connect as postgres superuser
   psql -U postgres
   ```

   ```sql
   -- In psql console:
   CREATE USER electis WITH PASSWORD 'YOUR_POSTGRES_PASSWORD_FROM_ENV';
   CREATE DATABASE electisspace_prod OWNER electis;
   GRANT ALL PRIVILEGES ON DATABASE electisspace_prod TO electis;
   \q
   ```

   **Important:** Use the same password from your `.env.production` file:
   ```
   POSTGRES_PASSWORD=CI8/JQgBuJrUV/B45bsUE9qpALOnWrxI
   ```

5. **Update .env.production DATABASE_URL:**
   ```env
   DATABASE_URL=postgresql://electis:CI8/JQgBuJrUV/B45bsUE9qpALOnWrxI@localhost:5432/electisspace_prod
   ```

---

### Step 2: Install Redis for Windows

**Option A: Using Memurai (Redis-compatible, officially supported on Windows)**

1. **Download Memurai:**
   ```
   https://www.memurai.com/get-memurai
   ```
   Select the free Developer Edition

2. **Install and start service:**
   - Default port: **6379**
   - Install as Windows Service: **Yes**
   - Start automatically: **Yes**

3. **Verify:**
   ```bash
   # Test connection
   curl http://localhost:6379
   ```

**Option B: Redis from Microsoft Archive (Legacy)**

1. **Download:**
   ```
   https://github.com/microsoftarchive/redis/releases
   ```
   Download: **Redis-x64-3.0.504.msi**

2. **Install:**
   - Port: **6379** (default)
   - Add to PATH: **Yes**
   - Install as service: **Yes**

3. **Start service:**
   ```powershell
   Start-Service Redis
   ```

4. **Update .env.production:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

---

### Step 3: Install PM2 (Process Manager)

PM2 will manage your Node.js application as a Windows service:

```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 Windows service support
npm install -g pm2-windows-service

# Setup PM2 as Windows service
pm2-service-install
```

**PM2 Configuration:**
- Service name: **PM2**
- PM2 environment: **production**
- Auto restart: **Yes**

---

### Step 4: Build the Frontend

```bash
cd c:\electisSpace

# Install dependencies
npm install

# Build frontend with /app/ base path
npm run build
```

**Verify:** Check that `dist/` folder contains built files:
```bash
ls dist/
```

---

### Step 5: Build the Backend

```bash
cd c:\electisSpace\server

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build TypeScript
npm run build
```

**Verify:** Check that `dist/` folder exists:
```bash
ls dist/
```

---

### Step 6: Run Database Migrations

```bash
cd c:\electisSpace\server

# Set environment (ensure .env.production is in parent directory)
$env:NODE_ENV="production"

# Run migrations
npx prisma migrate deploy

# Seed database (creates admin user)
npx tsx prisma/seed.ts
```

**Verify:**
```bash
# Check database
psql -U electis -d electisspace_prod -c "\dt"
```

---

### Step 7: Configure nginx for Static Files

We need to serve the frontend static files from nginx and proxy API requests to Node.js.

**Update `C:\nginx\conf\vhosts\solum_co_il.conf`:**

```nginx
server {
    listen       80;
    server_name  solum.co.il www.solum.co.il;
    return       301 https://$host$request_uri;
}

server {
    listen              443 ssl;
    server_name         solum.co.il www.solum.co.il;
    http2 on;

    ssl_certificate     C:/nginx/certs/solum/fullchain.pem;
    ssl_certificate_key C:/nginx/certs/solum/sol.pem;
    include             C:/nginx/conf/ssl-params.conf;

    # =============================================
    # electisSpace Frontend — /app/
    # =============================================
    location /app/ {
        alias C:/electisSpace/dist/;
        try_files $uri $uri/ /app/index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
            alias C:/electisSpace/dist/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Redirect /app to /app/
    location = /app {
        return 301 /app/;
    }

    # =============================================
    # electisSpace API — /app/api/*
    # =============================================
    location /app/api/ {
        proxy_pass         http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;

        # Standard proxy headers
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        # SSE (Server-Sent Events) support — CRITICAL
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;

        # File uploads
        client_max_body_size 10m;
    }

    # Existing application on /
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

**Note:** I'm using port **4000** for the electisSpace API to avoid conflict with your existing app on port 3000.

---

### Step 8: Update Backend Port Configuration

Edit `c:\electisSpace\server\src\server.ts` to check if there's a hardcoded port, or ensure your .env.production has:

```env
PORT=4000
```

---

### Step 9: Start the Application with PM2

```bash
cd c:\electisSpace\server

# Start the application
pm2 start dist/server.js --name electisspace --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on Windows boot
pm2 startup
```

**Verify:**
```bash
# Check status
pm2 status

# Check logs
pm2 logs electisspace

# Test API directly
curl http://localhost:4000/health
```

---

### Step 10: Test and Reload nginx

```bash
cd C:\nginx

# Test configuration
nginx.exe -t

# Reload nginx
nginx.exe -s reload
```

---

### Step 11: Verify Deployment

1. **Test API health:**
   ```bash
   curl https://solum.co.il/app/api/v1/health
   ```

2. **Test frontend:**
   ```bash
   curl -I https://solum.co.il/app/
   ```

3. **Open in browser:**
   ```
   https://solum.co.il/app/
   ```

4. **Login:**
   - Email: `admin@electis.co.il`
   - Password: *(set in server .env — ADMIN_PASSWORD)*

---

## 🔧 Management Commands

### View Application Logs
```bash
pm2 logs electisspace
pm2 logs electisspace --lines 100
```

### Restart Application
```bash
pm2 restart electisspace
```

### Stop Application
```bash
pm2 stop electisspace
```

### Monitor Resources
```bash
pm2 monit
```

### Update Application
```bash
cd c:\electisSpace

# 1. Pull latest code
git pull origin main

# 2. Rebuild frontend
npm install
npm run build

# 3. Rebuild backend
cd server
npm install
npx prisma generate
npm run build

# 4. Run migrations
npx prisma migrate deploy

# 5. Restart app
pm2 restart electisspace
```

---

## 🗄️ Database Management

### Backup Database
```powershell
# Create backup directory
mkdir C:\electisSpace\backups

# Backup
pg_dump -U electis -d electisspace_prod > C:\electisSpace\backups\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

### Restore Database
```powershell
psql -U electis -d electisspace_prod < C:\electisSpace\backups\backup_20260210.sql
```

### Connect to Database
```bash
psql -U electis -d electisspace_prod
```

---

## 🔍 Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs electisspace --lines 50

# Check if port 4000 is in use
netstat -ano | findstr ":4000"

# Restart
pm2 restart electisspace
```

### Database connection failed
```bash
# Check PostgreSQL service
Get-Service postgresql-x64-16

# Restart PostgreSQL
Restart-Service postgresql-x64-16

# Test connection
psql -U electis -d electisspace_prod
```

### Redis connection failed
```bash
# Check Redis/Memurai service
Get-Service Redis
# or
Get-Service Memurai

# Restart
Restart-Service Redis
```

### Frontend 404 errors
```bash
# Verify files exist
ls C:\electisSpace\dist\

# Check nginx config
cd C:\nginx
nginx.exe -t

# Check nginx error log
type C:\nginx\logs\error.log
```

### API errors
```bash
# Check server logs
pm2 logs electisspace

# Check environment
cd c:\electisSpace\server
node -e "console.log(process.env.DATABASE_URL)"
```

---

## 📊 Architecture

```
                    Internet
                       │
                       ▼
              ┌────────────────────┐
              │  solum.co.il       │
              │  nginx (C:\nginx)  │
              │  Port 80/443       │
              └───────┬────────────┘
                      │
          ┌───────────┼───────────┐
          │                       │
          ▼                       ▼
    /app/ (static)          /app/api/*
    C:\electisSpace\dist\   proxy → :4000
                                    │
                                    ▼
                        ┌───────────────────┐
                        │  Node.js (PM2)    │
                        │  Port 4000        │
                        └──┬─────────────┬──┘
                           │             │
                           ▼             ▼
                    ┌──────────┐  ┌─────────┐
                    │PostgreSQL│  │  Redis  │
                    │Port 5432 │  │Port 6379│
                    └──────────┘  └─────────┘
```

---

## 🎯 Port Allocation

| Port | Service | Status |
|------|---------|--------|
| 80 | nginx (HTTP) | ✅ In use |
| 443 | nginx (HTTPS) | ✅ In use |
| 3000 | Existing app | ✅ In use |
| **4000** | **electisSpace API** | ✅ Will use |
| 5432 | PostgreSQL | ✅ Will use |
| 6379 | Redis/Memurai | ✅ Will use |

---

## ✅ Post-Deployment Checklist

- [ ] PostgreSQL installed and running
- [ ] Redis/Memurai installed and running
- [ ] Database created and migrated
- [ ] Admin user seeded
- [ ] Frontend built in dist/
- [ ] Backend built in server/dist/
- [ ] PM2 installed and running app
- [ ] nginx configured and reloaded
- [ ] Application accessible at https://solum.co.il/app/
- [ ] Can login with admin credentials
- [ ] Real-time updates working
- [ ] Database backups configured

---

**Deployment Method:** Native Windows (no Docker)
**Estimated Setup Time:** 30-45 minutes
**Dependencies:** PostgreSQL, Redis, PM2, nginx (already installed)
