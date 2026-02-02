# Deep Build & Integration Plan

## 1. Overview
This document outlines the strategy for building, integrating, and deploying the ElectisSpace application, comprising a React Frontend and a Node.js/Express Backend.

## 2. Build Strategy

### 2.1. Frontend (React/Vite)
- **Tool**: Vite
- **Input**: `src/` (TypeScript, React, Tailwind)
- **Output**: `dist/` (Static assets: HTML, JS, CSS)
- **Configuration**: `vite.config.ts`
- **Commands**:
  - Dev: `npm run dev` (HMR supported)
  - Build: `npm run build` (Production optimized, minified)
  - Preview: `npm run preview`

### 2.2. Backend (Node.js/Express)
- **Tool**: `tsc` (TypeScript Compiler) or `tsx` (Runtime for dev)
- **Input**: `server/src/`
- **Output**: `server/dist/` (Transpiled JS)
- **Configuration**: `server/tsconfig.json`
- **Commands**:
  - Dev: `npm run dev` (Uses `tsx` + `watch`)
  - Build: `npm run build` (cleaning `dist/` and running `tsc`)
  - Start: `npm run start` (Runs `node dist/server.js`)

## 3. Integration Strategy

### 3.1. Development Environment
In development, the Frontend and Backend run as separate processes (ports 5173 and 3000).
- **CORS**: The server is configured to accept requests from `http://localhost:5173` (via `.env`).
- **Proxy**: Vite can be configured to proxy `/api` requests to `http://localhost:3000` to avoid CORS in local dev, though currently we use direct absolute URL configuration via VITE_API_URL.

### 3.2. Production Integration options
There are two main strategies for production integration:

#### Option A: Unified Server (Recommended for simple deployment)
The Node.js server serves the Frontend static files.
1. Build Frontend (`npm run build` -> `dist`).
2. Copy `dist` to `server/public`.
3. Configure Express to serve static files from `public/`.
4. Configure wildcard route `*` to serve `index.html` (SPA fallback).

**Benefits**: Single container/process to deploy. No CORS issues (same origin).

#### Option B: Decoupled (Nginx / Cloud)
Frontend and Backend are deployed separately.
- Frontend: Served by Nginx, S3+CloudFront, or Vercel/Netlify.
- Backend: Run as a service (Docker/Heroku).
- **Requirements**: Strict CORS configuration on Backend.

### 3.3. Database Integration
- **PostgreSQL**: Managed via Prisma ORM.
- **Migrations**: `prisma migrate deploy` runs before server start in production.
- **Seeding**: `prisma db seed` for initial data.

### 3.4. SoluM Integration
- **Service**: `SolumService` on Backend.
- **Flow**: UI -> Backend API -> SoluM API.
- **Security**: Credentials stored encrypted in DB per Organization.

## 4. CI/CD Pipeline Proposal

### 4.1. Quality Checks (CI)
Run on Pull Request:
1. **Lint**: Eslint check for both Client and Server.
2. **Type Check**: `tsc --noEmit` validation.
3. **Test**: `vitest` unit tests and integration tests.

### 4.2. Delivery (CD)
1. **Build Docker Image**:
   - Multi-stage build.
   - Stage 1: Build Frontend.
   - Stage 2: Build Backend.
   - Stage 3: Copy artifacts to final lightweight Node image.
2. **Push Registry**: Push to private registry (AWS ECR / GitHub Packages).
3. **Deploy**: Update `docker-compose.yml` or K8s manifest on target server.

## 5. Deployment Guide (Docker)

### Dockerfile (Unified)
```dockerfile
# Build Frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Build Backend
FROM node:20 AS backend-builder
WORKDIR /server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# Final Image
FROM node:20-alpine
WORKDIR /app
COPY --from=backend-builder /server/dist ./dist
COPY --from=backend-builder /server/package*.json ./
COPY --from=backend-builder /server/node_modules ./node_modules
COPY --from=backend-builder /server/prisma ./prisma
# Copy Frontend static files
COPY --from=frontend-builder /app/dist ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 6. Observability & Maintenance
- **Health Checks**: `/health/alive`, `/health/ready`, `/health/aims`.
- **Logs**: JSON formatted logs (via Morgan/Winston) to stdout -> Log Aggregator (ELK/Datadog).
- **Backup**: Daily pg_dump of PostgreSQL.
