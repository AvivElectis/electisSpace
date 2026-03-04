# electisCompass — Infrastructure & Server Requirements

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Environment:** Ubuntu Linux, Docker, Nginx Proxy Manager (NPM)

---

## 1. Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Ubuntu Server (Production)                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Docker Engine (docker-compose)            │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │            docker-compose.infra.yml              │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌────────────┐  ┌────────┐  ┌──────────────┐ │ │ │
│  │  │  │ PostgreSQL │  │ Redis  │  │ NPM (Nginx   │ │ │ │
│  │  │  │   15.x     │  │  7.x   │  │ Proxy Mgr)   │ │ │ │
│  │  │  │   :5432    │  │  :6379 │  │ :80 :443 :81 │ │ │ │
│  │  │  └────────────┘  └────────┘  └──────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │            docker-compose.app.yml                │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌────────────┐  ┌──────────────┐  ┌─────────┐│ │ │
│  │  │  │ electis    │  │ electis      │  │   API   ││ │ │
│  │  │  │ Space      │  │ Compass      │  │  Server ││ │ │
│  │  │  │ (Nginx SPA)│  │ (Nginx SPA)  │  │ (Node)  ││ │ │
│  │  │  │ :3071      │  │ :3072        │  │ :3073   ││ │ │
│  │  │  └────────────┘  └──────────────┘  └─────────┘│ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Hardware Requirements

### 2.1 Minimum Requirements (Small Deployment)

For deployments up to **5 companies, 500 spaces, 200 employees, 100 concurrent Compass users**:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 40 GB SSD | 80 GB SSD |
| **Network** | 100 Mbps | 1 Gbps |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### 2.2 Medium Deployment

For **10-20 companies, 5,000 spaces, 2,000 employees, 500 concurrent Compass users**:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 vCPUs | 8 vCPUs |
| **RAM** | 8 GB | 16 GB |
| **Disk** | 100 GB SSD | 200 GB SSD (NVMe preferred) |
| **Network** | 1 Gbps | 1 Gbps |
| **OS** | Ubuntu 22.04/24.04 LTS | Ubuntu 24.04 LTS |

### 2.3 Large Deployment

For **50+ companies, 50,000 spaces, 10,000 employees, 2,000+ concurrent Compass users**:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 8 vCPUs | 16 vCPUs |
| **RAM** | 16 GB | 32 GB |
| **Disk** | 200 GB NVMe SSD | 500 GB NVMe SSD |
| **Network** | 1 Gbps | 10 Gbps |
| **OS** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| **Note** | Consider multi-server deployment | Separate DB server recommended |

---

## 3. Memory Allocation Breakdown

### 3.1 RAM Distribution (8 GB Recommended - Medium)

| Component | Allocation | Notes |
|-----------|-----------|-------|
| **PostgreSQL** | 2.5 GB | `shared_buffers=1GB`, `work_mem=64MB`, `effective_cache_size=2GB` |
| **Redis** | 512 MB | Cache + Socket.IO adapter + BullMQ. `maxmemory 512mb` with `allkeys-lru` |
| **API Server (Node.js)** | 1.5 GB | `--max-old-space-size=1536`. Handles both apps + Socket.IO + BullMQ workers |
| **electisSpace SPA (Nginx)** | 128 MB | Static file serving, minimal memory |
| **electisCompass SPA (Nginx)** | 128 MB | Static file serving, minimal memory |
| **NPM (Nginx Proxy Manager)** | 256 MB | Reverse proxy, SSL termination |
| **OS + Docker overhead** | 1.5 GB | Ubuntu kernel, Docker engine, system services |
| **Buffer** | 1.5 GB | For spikes, BullMQ job processing, connection bursts |
| **Total** | **8 GB** | |

### 3.2 RAM Distribution (16 GB - Large)

| Component | Allocation | Notes |
|-----------|-----------|-------|
| **PostgreSQL** | 5 GB | `shared_buffers=2GB`, `work_mem=128MB`, `effective_cache_size=4GB` |
| **Redis** | 1 GB | Higher cache capacity, more Socket.IO connections |
| **API Server (Node.js)** | 3 GB | `--max-old-space-size=3072`. More concurrent connections |
| **electisSpace SPA** | 128 MB | |
| **electisCompass SPA** | 128 MB | |
| **NPM** | 256 MB | |
| **OS + Docker** | 2 GB | |
| **Buffer** | 4.5 GB | For spikes, future growth |
| **Total** | **16 GB** | |

---

## 4. CPU Allocation

### 4.1 CPU Distribution (8 vCPU Medium)

| Component | Cores | Notes |
|-----------|-------|-------|
| **API Server** | 2-4 | Node.js single-threaded, but needs CPU for crypto (bcrypt, JWT), Prisma queries |
| **PostgreSQL** | 2-3 | Query processing, index maintenance, WAL writing |
| **Redis** | 0.5-1 | Mostly memory-bound, low CPU |
| **BullMQ Workers** | 1-2 | Background jobs (auto-release, sync, notifications) |
| **Nginx (all)** | 0.5 | Static file serving, minimal CPU |

### 4.2 CPU-Intensive Operations

| Operation | CPU Impact | Frequency |
|-----------|-----------|-----------|
| bcrypt hashing (verification codes) | High (per login) | Per login attempt |
| JWT signing/verification | Medium | Per API request |
| Booking rule resolution | Low (cached) | Per booking, cache hit = negligible |
| Proximity calculation | Medium | Per "Find near friends" query |
| AIMS sync payload building | Low | Per booking status change |
| Auto-release job scan | Low | Every 1 minute |

---

## 5. Disk Space Requirements

### 5.1 Breakdown (Medium Deployment)

| Component | Size | Growth Rate |
|-----------|------|------------|
| **OS + Docker images** | 10 GB | Stable |
| **PostgreSQL data** | 5-20 GB | ~1 GB/month (depends on booking volume) |
| **PostgreSQL WAL logs** | 2-5 GB | Recycled (configurable retention) |
| **Redis AOF/RDB** | 100-500 MB | Proportional to cache size |
| **Docker image cache** | 5-10 GB | Grows with updates, prune regularly |
| **Application logs** | 2-5 GB | Depends on log level, rotate weekly |
| **Nginx logs** | 1-2 GB | Access + error logs, rotate daily |
| **SSL certificates** | < 10 MB | Minimal |
| **Backups (local)** | 10-20 GB | Daily PG dumps, keep 7 days |
| **Buffer** | 20-30 GB | For growth, temp files, updates |
| **Total** | **~80-100 GB** | |

### 5.2 Database Size Estimation

| Table | Row Size (avg) | Rows/month | Monthly Growth |
|-------|---------------|------------|---------------|
| bookings | 200 bytes | 10,000-50,000 | 2-10 MB |
| spaces | 500 bytes | Stable (one-time) | Negligible |
| company_users | 400 bytes | Stable (slow growth) | Negligible |
| booking_rules | 300 bytes | Stable | Negligible |
| friendships | 100 bytes | Slow growth | Negligible |
| device_tokens | 200 bytes | Per user | Negligible |
| verification_codes | 100 bytes | Ephemeral (TTL) | Negligible |

**Booking volume is the primary growth driver.** At 50,000 bookings/month × 200 bytes = ~10 MB/month of booking data. With indexes: ~30 MB/month.

**1 year of booking data at high volume: ~360 MB.** This is manageable without archival.

---

## 6. Network Requirements

### 6.1 Bandwidth Estimation

| Traffic Type | Per Request | Requests/sec (peak) | Bandwidth |
|-------------|-------------|---------------------|-----------|
| Compass API (REST) | 2-10 KB | 50 | 500 KB/s |
| Socket.IO messages | 200-500 bytes | 100 | 50 KB/s |
| SSE (admin, existing) | 100-500 bytes | 10 | 5 KB/s |
| AIMS sync outbound | 1-5 KB | 5 | 25 KB/s |
| Static assets (SPA) | 500 KB-2 MB | 10 (page loads) | 10 MB/s (burst) |

**Total sustained bandwidth: < 1 MB/s.** Well within 100 Mbps minimum.

### 6.2 Port Requirements

| Port | Service | Direction | Notes |
|------|---------|-----------|-------|
| 80 | NPM (HTTP → HTTPS redirect) | Inbound | Auto-redirect to 443 |
| 443 | NPM (HTTPS) | Inbound | All web traffic |
| 81 | NPM Admin UI | Inbound (restrict to admin IPs) | NPM management |
| 3071 | electisSpace SPA | Internal only | Behind NPM |
| 3072 | electisCompass SPA | Internal only | Behind NPM |
| 3073 | API Server | Internal only | Behind NPM |
| 5432 | PostgreSQL | Internal only | Docker network |
| 6379 | Redis | Internal only | Docker network |

### 6.3 NPM Configuration for Compass

```nginx
# compass.solumesl.co.il → Compass SPA
server {
    listen 443 ssl;
    server_name compass.solumesl.co.il;

    location / {
        proxy_pass http://electiscompass-server:3000;
    }

    # WebSocket upgrade for Socket.IO
    location /socket.io/ {
        proxy_pass http://electisspace-api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    # API proxy
    location /api/ {
        proxy_pass http://electisspace-api:3000;
        proxy_buffering off;              # Required for SSE
        proxy_read_timeout 86400s;        # 24h for SSE
    }
}
```

---

## 7. Docker Resource Limits

### docker-compose.app.yml (recommended limits)

```yaml
services:
  client:
    image: electisspace-client:latest
    container_name: electisspace-server
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
        reservations:
          memory: 64M

  compass:
    image: electiscompass-client:latest
    container_name: electiscompass-server
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 128M
        reservations:
          memory: 64M

  server:
    image: electisspace-api:latest
    container_name: electisspace-api
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### docker-compose.infra.yml (recommended limits)

```yaml
services:
  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '3'
          memory: 3G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      - POSTGRES_SHARED_BUFFERS=1GB
      - POSTGRES_WORK_MEM=64MB
      - POSTGRES_EFFECTIVE_CACHE_SIZE=2GB
      - POSTGRES_MAX_CONNECTIONS=100

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          memory: 256M
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 8. Monitoring & Alerting

### 8.1 System Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| CPU usage | > 70% sustained 5min | > 90% sustained 2min |
| RAM usage | > 80% | > 90% |
| Disk usage | > 70% | > 85% |
| Disk I/O wait | > 20% | > 40% |
| PostgreSQL connections | > 60% of max | > 80% of max |
| Redis memory usage | > 400 MB (of 512 MB) | > 480 MB |
| BullMQ queue depth | > 50 pending jobs | > 200 pending jobs |
| Socket.IO connections | > 800 (of 1000) | > 950 |
| API response time (p95) | > 500ms | > 2000ms |
| API error rate (5xx) | > 1% | > 5% |

### 8.2 Application Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| Bookings created/hour | API logs | Usage tracking |
| Check-in rate | Booking status changes | Feature health |
| Auto-release count/hour | BullMQ job logs | System health |
| AIMS sync queue depth | BullMQ | ESL update latency |
| Socket.IO reconnections | Socket.IO logs | Connection stability |

---

## 9. Backup Strategy

### 9.1 PostgreSQL Backups

```bash
# Daily full backup (3 AM IST)
0 3 * * * docker exec postgres pg_dump -U electis -F c -f /backups/daily/electis_$(date +\%Y\%m\%d).dump electis

# Keep 7 daily backups
find /backups/daily -mtime +7 -delete

# Weekly full backup (Sunday 4 AM IST)
0 4 * * 0 docker exec postgres pg_dump -U electis -F c -f /backups/weekly/electis_$(date +\%Y\%m\%d).dump electis

# Keep 4 weekly backups
find /backups/weekly -mtime +28 -delete
```

### 9.2 Redis Persistence

```
# Redis RDB snapshots (default)
save 900 1      # Save if 1 key changed in 900 seconds
save 300 10     # Save if 10 keys changed in 300 seconds
save 60 10000   # Save if 10000 keys changed in 60 seconds

# Redis is cache-only for Compass — data loss acceptable
# BullMQ job state is the only critical Redis data
```

---

## 10. Scaling Path

### Phase 1: Vertical Scaling (Current Architecture)

For most deployments (< 2,000 concurrent Compass users), vertical scaling is sufficient:
- Increase VM vCPUs: 4 → 8 → 16
- Increase RAM: 8 GB → 16 GB → 32 GB
- Upgrade disk: SSD → NVMe SSD

### Phase 2: Service Separation (If Needed)

When vertical scaling is insufficient:

```
Server 1 (Application):     Server 2 (Database):
  ├── API Server (Node.js)    ├── PostgreSQL
  ├── electisSpace SPA         └── Redis
  ├── electisCompass SPA
  ├── NPM
  └── BullMQ Workers
```

**Trigger:** When PostgreSQL and Node.js compete for CPU/RAM on the same machine.

### Phase 3: Horizontal Scaling (Future)

For enterprise deployments (10,000+ concurrent users):

```
Load Balancer (NPM or HAProxy)
  ├── API Server Instance 1
  ├── API Server Instance 2
  └── API Server Instance 3
       All connected to:
       ├── PostgreSQL (primary + read replica)
       ├── Redis (Socket.IO adapter + cache)
       └── BullMQ (shared queue)
```

**Requirements for horizontal scaling:**
- Socket.IO Redis adapter (already planned)
- Stateless API design (JWT, no server-side sessions)
- Sticky sessions for WebSocket (NPM upstream configuration)
- PostgreSQL read replica for query scaling
