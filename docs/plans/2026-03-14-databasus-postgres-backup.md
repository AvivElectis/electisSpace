# Databasus PostgreSQL Backup — Deployment Plan

**Date:** 2026-03-14
**Server:** `185.159.72.229` (Ubuntu 22.04, 16GB RAM, 296GB disk)
**Status:** Planned

---

## 1. Current Server State

### System Resources

| Resource | Value |
|----------|-------|
| OS | Ubuntu 22.04 (kernel 6.8.0-101) |
| CPU / RAM | Multi-core / 16 GB (9.5 GB available) |
| Disk | 296 GB total, **102 GB free** (65% used) |
| Docker | Engine 29.3.0, Compose v5.1.0 |

### PostgreSQL Instance

| Property | Value |
|----------|-------|
| Container | `global-postgres` |
| Image | `postgres:17` (17.8) |
| Network | `global-network` (bridge, shared by all apps) |
| Port | `127.0.0.1:5432` (localhost only) |
| User | `postgres` |
| Password | `6656` |
| Volume | `backend_pg_data_17` (external Docker volume) |
| Data path | `/var/lib/docker/volumes/backend_pg_data_17/_data` |

### Docker Compose Projects on Server

| Project | Location | Services |
|---------|----------|----------|
| `global-infra` | `/opt/global-infra/docker-compose.yml` | NPM, PostgreSQL, Prometheus, Grafana, Grafana Agent |
| `electisspace` | `/opt/electisSpace/docker-compose.{infra,app}.yml` | API server, client, Redis |
| `adapter-system` | `/opt/adapter-system/docker-compose.{infra,app}.yml` | Backend, 3 retail workers, 1 non-retail worker, client, Redis, SFTPGo |
| `docker` (solum) | `/opt/NewSolumServer/docker/docker-compose.prod.yml` | Server, ScaleMed sync, CSV watcher, conference sync |

### Databases to Back Up

| Database | Size | Largest Table | Rows | Notes |
|----------|------|---------------|------|-------|
| `adapters_prod_db` | **661 MB** | `retail_products` (600 MB) | 1,345,875 | Adapter product catalog — drives backup size |
| `electisspace_prod` | **13 MB** | `stores` (1.5 MB) | 5 | electisSpace main DB (18 tables) |
| `solum_prod_db` | **12 MB** | `scalemed_changes` (3.2 MB) | 1,504 | SoluM sync engine (10 tables) |
| `solum_likeprod_db` | **7.5 MB** | — | — | Staging/test environment |
| **Total** | **~694 MB** | | | ~200 MB compressed (zstd custom format) |

### electisspace_prod Table Breakdown

| Table | Size | Rows |
|-------|------|------|
| stores | 1,552 kB | 5 |
| companies | 824 kB | 3 |
| refresh_tokens | 688 kB | 1,482 |
| sync_queue | 272 kB | 419 |
| spaces | 232 kB | 171 |
| people_lists | 208 kB | 7 |
| people | 152 kB | 81 |
| verification_codes | 104 kB | 102 |
| user_stores | 96 kB | 6 |
| user_companies | 96 kB | 15 |
| device_tokens | 80 kB | 9 |
| roles | 80 kB | 4 |
| conference_rooms | 64 kB | 4 |
| audit_logs | 48 kB | 0 |
| users | 48 kB | 11 |
| people_list_memberships | 40 kB | 0 |
| _prisma_migrations | 32 kB | 18 |
| spaces_lists | 32 kB | 0 |

### adapters_prod_db Top Tables

| Table | Size | Rows |
|-------|------|------|
| retail_products | 600 MB | 1,345,875 |
| tasks_history | 50 MB | 41,495 |
| refresh_tokens | 1,552 kB | 1,006 |
| adapters | 408 kB | 37 |
| non_retail_products | 184 kB | 210 |
| admins | 160 kB | 1 |
| users | 144 kB | 14 |
| sftp_users | 112 kB | 12 |

---

## 2. Why Databasus

- **Web UI** — schedule, monitor, download, and restore backups from a browser
- **Single Docker image** — bundles its own internal PostgreSQL (metadata) + Valkey (cache), no external dependencies
- **pg_dump custom format with zstd** — up to 20x compression, supports table-level restore
- **Read-only by default** — Databasus cannot modify production data
- **Flexible scheduling** — hourly, daily, weekly, monthly, or cron expressions
- **Multi-destination** — local + optional S3/Google Drive/Cloudflare R2
- **Notifications** — email, Telegram, Slack, Discord, webhooks on failure
- **Encrypted backups** — AES-256-GCM before storage
- **Lightweight** — 1 CPU core, 500 MB RAM minimum

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  global-network (Docker bridge)                          │
│                                                          │
│  global-postgres:5432  ◄──── databasus                   │
│  (pg17, 4 databases)        (reads via pg_dump)          │
│                              internal port 4005          │
│                              volume: databasus-data      │
│                                                          │
│  global-npm:443 ──────────► databasus:4005               │
│  (Nginx Proxy Manager)      HTTPS reverse proxy          │
│  backup.electis.co.il       with access list             │
└──────────────────────────────────────────────────────────┘
```

**Data flow:**
1. Databasus connects to `global-postgres` via Docker network (no port exposure needed)
2. Runs `pg_dump --format=custom --compress=zstd:5` on schedule
3. Stores encrypted backup files in `/databasus-data` volume
4. UI accessible via NPM reverse proxy with HTTPS + optional IP restriction

---

## 4. Storage Estimate

### Per-Backup Size (estimated)

| Database | Raw Size | Compressed (est.) |
|----------|----------|-------------------|
| `adapters_prod_db` | 661 MB | ~150 MB |
| `electisspace_prod` | 13 MB | ~3 MB |
| `solum_prod_db` | 12 MB | ~3 MB |
| `solum_likeprod_db` | 7.5 MB | ~2 MB |
| **Total per run** | **~694 MB** | **~158 MB** |

### Retention Policy Storage

| Retention | Snapshots | Est. Storage |
|-----------|-----------|-------------|
| 7 daily backups | 7 x ~158 MB | ~1.1 GB |
| 4 weekly backups | 4 x ~158 MB | ~0.6 GB |
| **Total** | **11 snapshots** | **~1.7 GB** |

**Conclusion:** ~1.7 GB vs 102 GB free = **1.7% of available space**. No concern.

---

## 5. Deployment Steps

### Step 1: Create directory and compose file

```bash
sudo mkdir -p /opt/databasus
```

Create `/opt/databasus/docker-compose.yml`:

```yaml
services:
  databasus:
    container_name: databasus
    image: databasus/databasus:latest
    restart: unless-stopped
    networks:
      - global-network
    ports:
      - "127.0.0.1:4005:4005"   # localhost only — proxied via NPM
    volumes:
      - databasus-data:/databasus-data

networks:
  global-network:
    external: true

volumes:
  databasus-data:
```

### Step 2: Start the container

```bash
cd /opt/databasus && sudo docker compose up -d
```

Wait ~2 minutes for internal services to initialize. Verify:

```bash
docker logs databasus --tail 20
curl -s http://localhost:4005 | head -5
```

### Step 3: Add Nginx Proxy Manager host (optional — for remote access)

In NPM UI (`http://localhost:81`):

1. **Add Proxy Host**
   - Domain: `backup.electis.co.il` (or preferred subdomain)
   - Forward Hostname: `databasus`
   - Forward Port: `4005`
   - Enable: Websockets Support
2. **SSL tab:** Request new Let's Encrypt certificate, force HTTPS
3. **Access Lists tab:** Create list restricted to admin IPs only

If remote access is not needed, skip this step — use SSH tunnel instead:
```bash
ssh -L 4005:localhost:4005 electis@185.159.72.229
# Then open http://localhost:4005 in local browser
```

### Step 4: Configure backups in Databasus UI

Open `http://localhost:4005` and add 4 backup jobs:

**Connection settings (same for all):**

| Field | Value |
|-------|-------|
| Host | `global-postgres` |
| Port | `5432` |
| User | `postgres` |
| Password | `6656` |
| SSL | Disabled (internal Docker network) |

**Backup jobs:**

| # | Database | Schedule | Time | Retention |
|---|----------|----------|------|-----------|
| 1 | `adapters_prod_db` | Daily | 03:00 | 7 daily + 4 weekly |
| 2 | `electisspace_prod` | Daily | 03:15 | 7 daily + 4 weekly |
| 3 | `solum_prod_db` | Daily | 03:30 | 7 daily + 4 weekly |
| 4 | `solum_likeprod_db` | Weekly (Sunday) | 04:00 | 4 weekly |

**Storage destination:** Local (`/databasus-data` inside the container)

### Step 5: Run first backup manually

Trigger a manual backup for each database from the UI to verify:
- Connection works
- Backup completes successfully
- File size matches expectations
- Download works

### Step 6: (Optional) Configure notifications

In Databasus settings, add a notification channel:
- **Telegram bot** or **email** for backup failure alerts
- Set to notify on: failure, health check failure

---

## 6. Restoring Specific Tables

Databasus creates `pg_dump` custom format backups. To restore individual tables:

### From Databasus UI

1. Go to the backup history for the target database
2. Download the backup file from the desired date
3. The file is in pg_dump custom format (`.dump`)

### Restore commands

**Restore a single table (replace existing data):**
```bash
pg_restore -h localhost -p 5432 -U postgres \
  -d electisspace_prod \
  -t spaces \
  --clean --if-exists \
  --single-transaction \
  backup_file.dump
```

**Restore multiple tables:**
```bash
pg_restore -h localhost -p 5432 -U postgres \
  -d electisspace_prod \
  -t spaces -t people -t conference_rooms \
  --clean --if-exists \
  --single-transaction \
  backup_file.dump
```

**Restore to a temporary database (safer — inspect before applying):**
```bash
# Create temp DB
docker exec global-postgres psql -U postgres -c "CREATE DATABASE temp_restore;"

# Restore full backup into temp DB
pg_restore -h localhost -p 5432 -U postgres \
  -d temp_restore \
  backup_file.dump

# Inspect the data
docker exec global-postgres psql -U postgres -d temp_restore \
  -c "SELECT * FROM spaces LIMIT 10;"

# Copy specific table back to production
docker exec global-postgres pg_dump -U postgres -d temp_restore -t spaces \
  | docker exec -i global-postgres psql -U postgres -d electisspace_prod

# Cleanup
docker exec global-postgres psql -U postgres -c "DROP DATABASE temp_restore;"
```

**List tables inside a backup file (without restoring):**
```bash
pg_restore -l backup_file.dump | grep "TABLE DATA"
```

---

## 7. Disaster Recovery

### If Databasus container is lost

Backups are stored in the `databasus-data` Docker volume. As long as this volume exists, all backup files remain accessible. Redeploy with the same compose file and the volume reattaches automatically.

### If volume is lost but backups were downloaded

Use `pg_restore` directly — backup files are standard pg_dump custom format, no Databasus needed.

### Critical file: `secret.key`

Located inside `/databasus-data`. This key is needed to decrypt encrypted backups. Back it up separately:

```bash
docker cp databasus:/databasus-data/secret.key /home/electis/databasus-secret.key.backup
```

---

## 8. Monitoring

### Disk usage check (add to Grafana)

```bash
# Check backup volume size
docker exec databasus du -sh /databasus-data/
```

### Health indicators in Databasus UI

- Backup success/failure history per database
- Last backup timestamp
- Storage usage

### Alerting

Configure Telegram/email notifications in Databasus for:
- Backup failure
- Health check failure (missed scheduled backup)

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Backup during peak hours | Slight DB load from pg_dump read | Scheduled at 03:00–04:00 (off-peak) |
| Disk fills up | Server instability | ~1.7 GB vs 102 GB free; monitor via Grafana |
| Databasus container crashes | No new backups until restarted | `restart: unless-stopped`; notifications on failure |
| Need restore but Databasus is down | Cannot download from UI | Backups are files in Docker volume; accessible directly |
| `secret.key` lost | Cannot decrypt encrypted backups | Back up key separately on first setup |
| `adapters_prod_db` grows significantly | Backup size increases | Monitor; consider excluding `retail_products` history or increasing retention intervals |

---

## 10. Future Enhancements

- **S3 second destination** — replicate backups to cloud storage for off-site safety
- **Read-only PostgreSQL user** — create a dedicated `databasus_reader` user with `pg_read_all_data` role instead of using the `postgres` superuser
- **Grafana integration** — dashboard panel showing backup status and storage usage
- **Pre-migration backups** — trigger manual backup from CI/CD before running Prisma migrations
