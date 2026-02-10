# electisSpace - Windows Production Deployment Plan
## Domain: solum.co.il/app

**Generated:** 2026-02-10
**Server:** Windows Server with existing nginx
**Environment:** Production

---

## 🔍 Current Status Assessment

### ✅ What's Ready
- Application code and configuration files
- Dockerfiles for frontend and backend
- nginx configuration for Docker container
- docker-compose.prod.yml configured
- .env.production template exists
- CORS already configured for solum.co.il

### ⚠️ What Needs Action
1. **Docker Compose** - Not installed (only Docker engine detected)
2. **Environment Secrets** - .env.production still has placeholder values (CHANGE_ME)
3. **Host nginx** - Location unknown, needs configuration
4. **SSL Certificate** - Status unknown

---

## 📋 Pre-Deployment Checklist

### Step 1: Install Docker Compose

Windows doesn't have native `docker compose` plugin. You have two options:

**Option A: Install Docker Desktop (Recommended)**
1. Download Docker Desktop for Windows from https://www.docker.com/products/docker-desktop
2. This includes `docker compose` v2 built-in
3. Restart your computer after installation

**Option B: Install docker-compose standalone**
```powershell
# In PowerShell as Administrator
Invoke-WebRequest "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-windows-x86_64.exe" -UseBasicParsing -OutFile "C:\Program Files\Docker\docker-compose.exe"

# Add to PATH or create alias
Set-Alias -Name docker-compose -Value "C:\Program Files\Docker\docker-compose.exe"
```

**Verify installation:**
```bash
docker compose version
# or
docker-compose --version
```

---

### Step 2: Generate Production Secrets

You mentioned uploading .env.production, but it still contains placeholder values. Generate real secrets:

**Using Git Bash or WSL:**
```bash
# Generate all secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

**Or using PowerShell:**
```powershell
# Generate random passwords
function Get-RandomPassword {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    [Convert]::ToBase64String($bytes)
}

Write-Host "POSTGRES_PASSWORD=$(Get-RandomPassword)"
Write-Host "JWT_ACCESS_SECRET=$(Get-RandomPassword)"
Write-Host "JWT_REFRESH_SECRET=$(Get-RandomPassword)"
Write-Host "ENCRYPTION_KEY=$(Get-RandomPassword)"
```

**Update .env.production file with these values:**
- Replace all `CHANGE_ME_*` placeholders
- Set a strong `ADMIN_PASSWORD`
- Verify `CORS_ORIGINS=https://solum.co.il,http://solum.co.il`
- Keep the SoluM AIMS defaults unless you need different values

---

### Step 3: Locate and Configure Host nginx

**Find nginx installation:**
```powershell
# In PowerShell
Get-Process nginx -ErrorAction SilentlyContinue
Get-ChildItem -Path "C:\" -Filter "nginx.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

**Common Windows nginx locations:**
- `C:\nginx\`
- `C:\Program Files\nginx\`
- `C:\inetpub\nginx\`
- `C:\Server\nginx\`

**Find nginx.conf:**
```bash
# Once you find nginx.exe, the config is usually:
# C:\nginx\conf\nginx.conf
```

---

### Step 4: Configure Windows nginx for /app

**Add this location block to your existing nginx.conf** (inside the `server` block for solum.co.il):

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

    # SSE (Server-Sent Events) support — CRITICAL for real-time sync
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;

    # Increase max body size for file uploads
    client_max_body_size 10m;
}
```

**Test and reload nginx:**
```powershell
# Test configuration
cd C:\nginx  # or wherever nginx is installed
nginx.exe -t

# Reload nginx (zero-downtime)
nginx.exe -s reload

# Or restart nginx service
Restart-Service nginx
```

---

## 🚀 Deployment Steps

### 1. Build Docker Images

```bash
cd c:\electisSpace

# Build all images (use -f flag for specific compose file)
docker compose -f docker-compose.prod.yml build

# Or if using hyphenated version:
docker-compose -f docker-compose.prod.yml build
```

**Expected output:**
- ✅ Frontend (React) builds with VITE_BASE_PATH=/app/
- ✅ Backend (Node.js) builds with Prisma client
- ✅ PostgreSQL and Redis images pulled

---

### 2. Start All Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

**This will start:**
- PostgreSQL (internal port 5432)
- Redis (internal port 6379)
- Node.js API server (internal port 3000)
- nginx container (exposed on host port 8080)

---

### 3. Run Database Migrations

**First time deployment:**
```bash
# Wait 30 seconds for containers to be healthy
docker compose -f docker-compose.prod.yml ps

# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# Seed the database (creates admin user)
docker compose -f docker-compose.prod.yml exec server npx tsx prisma/seed.ts
```

---

### 4. Verify Deployment

```bash
# Check all containers are healthy
docker compose -f docker-compose.prod.yml ps

# Test API health endpoint
curl http://localhost:8080/app/api/v1/health

# Test frontend
curl -I http://localhost:8080/app/
```

**Expected responses:**
- Health endpoint: `{"status":"ok","database":"connected","redis":"connected"}`
- Frontend: HTTP 200 with HTML content

---

### 5. Test Through Host nginx

```bash
# Test from external URL
curl -I https://solum.co.il/app/

# Or open in browser:
# https://solum.co.il/app/
```

**Login with admin account:**
- Email: `admin@electis.co.il`
- Password: Whatever you set in .env.production as `ADMIN_PASSWORD`

---

## 🔒 Security Considerations

### 1. Firewall Rules
Ensure only port 8080 is accessible from localhost (not from external IPs):

```powershell
# In PowerShell as Administrator
New-NetFirewallRule -DisplayName "electisSpace Docker" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -RemoteAddress LocalSubnet
```

### 2. SSL/TLS
If not already configured for solum.co.il:
- Windows doesn't use Let's Encrypt easily
- Consider using: **win-acme** (https://www.win-acme.com/) for automated SSL certificates
- Or manually install SSL certificate from your CA

### 3. Change Admin Password
After first login, immediately change the admin password in the UI.

---

## 📊 Architecture on Windows

```
                    Internet
                       │
                       ▼
              ┌────────────────────┐
              │  solum.co.il       │
              │  (Host nginx.exe)  │
              │  Port 80/443       │
              └───────┬────────────┘
                      │ /app → proxy_pass :8080
                      ▼
        ┌─────────────────────────────┐
        │     Docker Network          │
        │  (electisspace-network)     │
        │                             │
        │  ┌───────────────────────┐  │
        │  │   nginx (container)   │  │
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
        │  └──┬──────────────┬────┘  │
        │     │              │       │
        │     ▼              ▼       │
        │  ┌──────────┐ ┌────────┐  │
        │  │PostgreSQL│ │ Redis  │  │
        │  │Port 5432 │ │Port6379│  │
        │  └──────────┘ └────────┘  │
        └─────────────────────────────┘
```

**Port Usage:**
- **80/443**: Host nginx (Windows)
- **8080**: Docker nginx container → Host
- **3000, 5432, 6379**: Internal Docker network only

---

## 🔧 Ongoing Maintenance

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f server
```

### Restart Services
```bash
# Restart specific service
docker compose -f docker-compose.prod.yml restart server

# Restart everything
docker compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild
docker compose -f docker-compose.prod.yml build

# 3. Restart
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations if schema changed
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### Backup Database
```powershell
# Create backup directory
mkdir C:\electisSpace\backups

# Backup PostgreSQL
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U electis electisspace_prod > C:\electisSpace\backups\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

### Stop Everything
```bash
# Stop but keep data
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (DESTROYS DATA!)
docker compose -f docker-compose.prod.yml down -v
```

---

## ⚠️ Troubleshooting

### Container won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs server --tail 50

# Check if ports are in use
netstat -ano | findstr ":8080"
```

### "docker compose" not recognized
Use `docker-compose` (with hyphen) or install Docker Desktop.

### nginx can't reach localhost:8080
Check Windows Firewall allows localhost connections to port 8080.

### SSE/Real-time updates not working
1. Check Docker nginx config has `proxy_buffering off;` ✅ (already configured)
2. Check host nginx config has `proxy_buffering off;` ✅ (in the config above)
3. Test SSE directly: `curl -N http://localhost:8080/app/api/v1/health`

### Database connection failed
```bash
# Check database is healthy
docker compose -f docker-compose.prod.yml ps db

# Check DATABASE_URL in .env.production
# Should be: postgresql://electis:${POSTGRES_PASSWORD}@db:5432/electisspace_prod
```

---

## 📝 Next Steps After Deployment

1. **Test all functionality:**
   - Login with admin account
   - Create a store with SoluM credentials
   - Test article management
   - Verify real-time updates work
   - Test person management

2. **Security hardening:**
   - Change admin password in UI
   - Review firewall rules
   - Enable HTTPS if not already
   - Set up automated backups

3. **Monitoring:**
   - Set up health check monitoring
   - Configure log rotation
   - Monitor Docker resource usage: `docker stats`

4. **Documentation:**
   - Document your nginx.conf location
   - Save backup/restore procedures
   - Note any Windows-specific configurations

---

## 🆘 Support

For issues specific to:
- **Application bugs**: Check server logs
- **Docker issues**: `docker compose logs -f`
- **nginx issues**: Check `C:\nginx\logs\error.log`
- **Database issues**: `docker compose exec db psql -U electis -d electisspace_prod`

**Configuration Files to Review:**
- [docker-compose.prod.yml](docker-compose.prod.yml) - Service orchestration
- [nginx/nginx.conf](nginx/nginx.conf) - Docker nginx routing
- [.env.production](.env.production) - Environment variables
- [DEPLOYMENT.md](DEPLOYMENT.md) - Original Linux deployment guide

---

**Deployment Plan Created:** 2026-02-10
**Ready for Production:** After completing all pre-deployment steps above
