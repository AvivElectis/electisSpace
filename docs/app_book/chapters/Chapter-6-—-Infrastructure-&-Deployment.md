# Chapter 6 — Infrastructure & Deployment

### 6.1 Container Architecture

```mermaid
graph TB
    subgraph "global-network (Docker external network)"
        subgraph "docker-compose.infra.yml"
            REDIS[electisspace-redis<br/>Redis 7 Alpine<br/>Port: 6381->6379<br/>AOF persistence]
            LOKI[Loki<br/>Log aggregation<br/>Port: 3100]
            PROMTAIL[Promtail<br/>Docker log scraper<br/>JSON pipeline]
            GRAFANA[Grafana<br/>Dashboards<br/>Port: 3200->3000]
        end

        subgraph "docker-compose.app.yml"
            CLIENT[electisspace-server<br/>Nginx Alpine<br/>Port: 3071->3000]
            SERVER[electisspace-api<br/>Node.js 20 Alpine<br/>Internal port 3000]
        end

        PG[global-postgres<br/>PostgreSQL<br/>External service]
    end

    CLIENT -->|/api/*| SERVER
    CLIENT -->|/health| SERVER
    CLIENT -->|SSE /stores/*/events| SERVER
    SERVER --> PG
    SERVER --> REDIS
    PROMTAIL -->|scrape container logs| SERVER
    PROMTAIL --> LOKI
    GRAFANA --> LOKI
    GRAFANA --> PG
```

### 6.2 Container Build Strategy

Both containers use multi-stage Docker builds for minimal production images:

**Client Container (Nginx)**:
```
Stage 1: node:20-alpine
  - npm ci (install dependencies)
  - npm run build (Vite build with VITE_BASE_PATH arg)

Stage 2: nginx:alpine
  - Copy custom nginx.conf
  - Copy built SPA from Stage 1
  - Serve on port 3000
```

**Server Container (Node.js)**:
```
Stage 1: node:20-alpine (builder)
  - npm ci (all dependencies)
  - npx prisma generate
  - npm run build (TypeScript compilation)

Stage 2: node:20-alpine (production)
  - npm ci --only=production
  - Copy Prisma client from Stage 1
  - Copy compiled JS from Stage 1
  - Run as non-root 'nodejs' user (UID 1001)
  - dumb-init for proper signal handling
```

### 6.3 Nginx Configuration (Internal)

The internal Nginx container (`client/nginx.conf`) serves dual roles:

```mermaid
graph LR
    REQ[Incoming Request] --> NGINX[Nginx Container<br/>Port 3000]

    NGINX -->|"GET /assets/*"| STATIC[Static Files<br/>1-year cache<br/>immutable]
    NGINX -->|"GET /api/v1/stores/*/events"| SSE[SSE Proxy<br/>buffering OFF<br/>86400s timeout]
    NGINX -->|"* /api/*"| API[API Proxy<br/>60s timeout]
    NGINX -->|"GET /health"| HEALTH[Health Proxy<br/>to Express]
    NGINX -->|"GET /*"| SPA[SPA Fallback<br/>index.html<br/>no-cache]
```

Critical SSE configuration:
- Regex location `~ ^/api/v1/stores/.+/events$` matches SSE endpoints **before** the generic `/api/` block.
- `proxy_buffering off` and `chunked_transfer_encoding off` prevent Nginx from buffering the event stream.
- `proxy_read_timeout 86400s` (24 hours) allows long-lived SSE connections.
- `Connection ''` header (empty) ensures HTTP/1.1 keep-alive without `Connection: upgrade`.

### 6.4 Nginx Configuration (External / SSL)

The external Nginx (host-level) provides SSL termination:

```mermaid
graph LR
    INTERNET[Internet] -->|Port 80| REDIRECT[301 -> HTTPS]
    INTERNET -->|Port 443 SSL| NGINX_EXT[External Nginx<br/>solum.co.il]

    NGINX_EXT -->|"/app/*"| SPA[Static SPA<br/>or Docker Container]
    NGINX_EXT -->|"/app/api/*"| API[API Proxy<br/>to port 3071/4000]
    NGINX_EXT -->|"/"| LEGACY[Legacy App<br/>Port 3000]
```

Key SSL/proxy settings:
- HTTP/2 enabled.
- `proxy_buffering off` for SSE endpoints.
- `proxy_read_timeout 86400s` for SSE.
- `client_max_body_size 10m` for file uploads.

### 6.5 Deployment Topology

```mermaid
graph TB
    subgraph "Ubuntu Production Server"
        subgraph "Docker Engine"
            REDIS_C[Redis Container]
            CLIENT_C[Nginx+SPA Container]
            API_C[Express API Container]
        end

        NGINX_H[Nginx Host Service<br/>SSL Termination]
        PG_H[PostgreSQL<br/>Global Service]

        NGINX_H -->|:3071| CLIENT_C
        CLIENT_C --> API_C
        API_C --> PG_H
        API_C --> REDIS_C
    end

    subgraph "Windows Deployment (Alternative)"
        PM2[PM2 Process Manager]
        NGINX_W[Nginx (Windows)]
        PG_W[PostgreSQL (Local)]

        NGINX_W -->|:4000| PM2
        PM2 --> PG_W
    end
```

Two deployment modes are supported:

1. **Docker (Ubuntu)** -- Production deployment using `docker-compose.infra.yml` + `docker-compose.app.yml` on an external `global-network`.
2. **PM2 (Windows)** -- Alternative deployment using PM2 (`ecosystem.config.cjs`) for the Node.js server with a host-level Nginx for the SPA.

### 6.6 Build & Deployment Commands

```bash
# Infrastructure (one-time setup)
docker compose -f docker-compose.infra.yml up -d

# Application build and deploy
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml build
docker compose -f docker-compose.infra.yml -f docker-compose.app.yml up -d

# Database migrations
docker exec electisspace-api npx prisma migrate deploy

# View logs
docker logs electisspace-api --tail=100 -f
docker logs electisspace-server --tail=100 -f
```

### 6.7 Health Checks

| Service | Endpoint | Interval | Start Period |
|---------|---------|----------|-------------|
| Redis | `redis-cli ping` | 10s | -- |
| Express API | `GET /health` | 30s | 40s |
| Nginx Client | `GET /` | 30s | 10s |
| Loki | `GET /ready` | 30s | 30s |
| Grafana | `GET /api/health` | 30s | 30s |

### 6.8 Observability Stack (Loki + Promtail + Grafana)

```mermaid
graph LR
    SERVER[Express API<br/>JSON logs to stdout] -->|Docker log driver| PROMTAIL[Promtail<br/>Scrape container logs]
    PROMTAIL -->|Push| LOKI[Loki<br/>Log aggregation<br/>30-day retention]
    LOKI -->|Query via LogQL| GRAFANA[Grafana<br/>Dashboards + Explore]
```

The server emits **structured JSON** log lines (via `appLogger`) to stdout/stderr. Docker captures these as container logs, and Promtail scrapes them:

1. **Promtail** (`infra/promtail-config.yml`) -- Scrapes Docker container logs via `/var/lib/docker/containers`. Uses a JSON parsing pipeline stage to extract structured fields (`level`, `component`, `service`, `message`).
2. **Loki** (`infra/loki-config.yml`) -- Single-process mode with 30-day retention. Stores index and chunks in `/loki/data`.
3. **Grafana** (`infra/grafana-datasources.yml`) -- Auto-provisioned with Loki as the default datasource. Accessible on port 3200.

In addition to the Loki pipeline, the server exposes an in-memory log API (`GET /api/v1/logs`) that serves the last 2,000 log entries directly from the `appLogger` ring buffer — useful for quick diagnostics without Grafana.

### 6.9 Multi-Platform Support

```mermaid
graph TB
    SRC[Single React Codebase<br/>src/]

    SRC -->|"vite build"| WEB[Web SPA<br/>Nginx / Static]
    SRC -->|"npm run electron:build"| ELECTRON[Electron Desktop<br/>Windows NSIS Installer]
    SRC -->|"npm run android:build"| CAPACITOR[Capacitor Android<br/>APK / AAB]

    ELECTRON --> AUTOUPDATE[Auto-Update<br/>GitHub Releases]
    CAPACITOR --> PLAYSTORE[Play Store]
```

- **Web**: Standard SPA served by Nginx.
- **Electron**: Wraps the SPA in a Chromium window with native features (file system, auto-update via GitHub releases, custom title bar).
- **Capacitor**: Wraps the SPA in a WebView for Android with native plugins (file system, network, preferences).
