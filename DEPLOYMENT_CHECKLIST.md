# electisSpace Deployment Checklist
## Windows Server - solum.co.il/app

**Quick reference for production deployment**

---

## ☑️ Pre-Deployment Tasks

### 1. Install Docker Compose
- [ ] Install Docker Desktop for Windows **OR** standalone docker-compose
- [ ] Verify: `docker compose version` shows v2.20+

### 2. Configure Environment Variables
- [ ] Open `.env.production` in a text editor
- [ ] Generate `POSTGRES_PASSWORD`: `openssl rand -base64 24`
- [ ] Generate `JWT_ACCESS_SECRET`: `openssl rand -hex 32`
- [ ] Generate `JWT_REFRESH_SECRET`: `openssl rand -hex 32`
- [ ] Generate `ENCRYPTION_KEY`: `openssl rand -hex 16`
- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Verify `CORS_ORIGINS=https://solum.co.il,http://solum.co.il`
- [ ] Verify `ADMIN_EMAIL=admin@electis.co.il`
- [ ] Save file

### 3. Locate nginx Installation
- [ ] Find nginx.exe location (usually `C:\nginx\` or `C:\Program Files\nginx\`)
- [ ] Find nginx.conf file (usually `conf\nginx.conf` subdirectory)
- [ ] Note the path: ___________________________

### 4. Configure Host nginx
- [ ] Open nginx.conf in text editor **as Administrator**
- [ ] Find the `server { }` block for `solum.co.il`
- [ ] Add the `/app` location block (see WINDOWS_DEPLOYMENT_PLAN.md)
- [ ] Save file
- [ ] Test config: `nginx.exe -t`
- [ ] Reload: `nginx.exe -s reload`

---

## 🚀 Deployment Tasks

### 5. Build Docker Images
```bash
cd c:\electisSpace
docker compose -f docker-compose.prod.yml build
```
- [ ] Frontend build successful
- [ ] Backend build successful
- [ ] No build errors

### 6. Start Docker Services
```bash
docker compose -f docker-compose.prod.yml up -d
```
- [ ] All 5 containers started (nginx, server, db, redis, client)
- [ ] Wait 30 seconds for health checks

### 7. Initialize Database
```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# Seed database (creates admin user)
docker compose -f docker-compose.prod.yml exec server npx tsx prisma/seed.ts
```
- [ ] Migrations completed successfully
- [ ] Seed completed, admin user created

---

## ✅ Verification Tasks

### 8. Test Docker Internal
```bash
# Check all containers healthy
docker compose -f docker-compose.prod.yml ps

# Test API health
curl http://localhost:8080/app/api/v1/health

# Test frontend
curl -I http://localhost:8080/app/
```
- [ ] All containers show "healthy" status
- [ ] Health endpoint returns `{"status":"ok",...}`
- [ ] Frontend returns HTTP 200

### 9. Test Through nginx
```bash
# Test external URL
curl -I https://solum.co.il/app/
```
- [ ] Returns HTTP 200 (or 301/302 redirect to HTTPS)
- [ ] No 502 Bad Gateway errors
- [ ] No 404 Not Found errors

### 10. Browser Testing
Open: `https://solum.co.il/app/`
- [ ] Login page loads
- [ ] Login with `admin@electis.co.il` + password from .env.production
- [ ] Dashboard loads
- [ ] Can create/view stores
- [ ] Real-time updates work

---

## 🔒 Post-Deployment Security

### 11. Security Tasks
- [ ] Change admin password in the UI (first login)
- [ ] Verify port 8080 only accessible from localhost
- [ ] Verify HTTPS works (SSL certificate valid)
- [ ] Review Windows Firewall rules
- [ ] Remove any sensitive data from logs

---

## 📊 Monitoring Setup

### 12. Ongoing Monitoring
- [ ] Bookmark: `https://solum.co.il/app/`
- [ ] Test health endpoint: `https://solum.co.il/app/api/v1/health`
- [ ] Set up automated backups (see WINDOWS_DEPLOYMENT_PLAN.md)
- [ ] Monitor Docker resources: `docker stats`

---

## 🆘 Quick Troubleshooting

### If deployment fails:

**Check container logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Restart everything:**
```bash
docker compose -f docker-compose.prod.yml restart
```

**Nuclear option (destroys data!):**
```bash
docker compose -f docker-compose.prod.yml down -v
# Then start from step 5
```

**Check nginx:**
```bash
# Test config
nginx.exe -t

# View error logs
# Usually: C:\nginx\logs\error.log
```

---

## 📝 Notes

**Important Paths:**
- Application: `c:\electisSpace`
- nginx location: ___________________________
- nginx.conf: ___________________________
- Backup location: `c:\electisSpace\backups\`

**Important Ports:**
- **80/443**: Host nginx (public)
- **8080**: Docker nginx → localhost only
- **3000**: API server (internal Docker only)
- **5432**: PostgreSQL (internal Docker only)
- **6379**: Redis (internal Docker only)

**Admin Account:**
- Email: `admin@electis.co.il`
- Password: (from .env.production)
- **Change password after first login!**

---

**Status:**
- [ ] Pre-deployment complete
- [ ] Deployment complete
- [ ] Verification complete
- [ ] Security hardening complete
- [ ] Monitoring configured

**Deployed on:** _____________
**Deployed by:** _____________

---

**See also:**
- [WINDOWS_DEPLOYMENT_PLAN.md](WINDOWS_DEPLOYMENT_PLAN.md) - Detailed deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Original Linux deployment guide
