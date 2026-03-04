# electisCompass — Monorepo Structure

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Context:** The electisSpace repository holds three applications: electisSpace client (admin), electisCompass client (employee app), and the shared API server. This document designs the repository structure.

---

## 1. Repository Layout

```
electisSpace/                          ← Git root (existing repo)
│
├── src/                               ← electisSpace SPA (Admin) — UNCHANGED
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── space/
│   │   ├── people/
│   │   ├── conference/
│   │   ├── labels/
│   │   ├── settings/
│   │   ├── sync/
│   │   ├── import-export/
│   │   ├── notifications/
│   │   └── offline-mode/
│   ├── shared/
│   ├── locales/
│   │   ├── en/common.json
│   │   └── he/common.json
│   └── main.tsx
│
├── compass/                           ← electisCompass SPA (Employee App) — NEW
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── presentation/
│   │   │   ├── booking/
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── presentation/
│   │   │   ├── friends/
│   │   │   ├── profile/
│   │   │   └── requests/
│   │   ├── shared/
│   │   │   ├── components/        ← Compass-specific shared components
│   │   │   ├── hooks/
│   │   │   ├── theme/             ← Dark-first theme
│   │   │   ├── i18n/
│   │   │   └── api/               ← Axios instance for Compass API
│   │   ├── locales/
│   │   │   ├── en/common.json
│   │   │   └── he/common.json
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts             ← Separate Vite config
│   ├── tsconfig.json              ← Extends root tsconfig
│   ├── capacitor.config.ts        ← Capacitor config
│   ├── android/                   ← Capacitor Android project
│   └── package.json               ← Compass-specific dependencies (optional)
│
├── shared/                            ← Code shared between Admin & Compass — NEW
│   ├── types/
│   │   ├── booking.types.ts       ← BookingStatus, SpaceType, SpaceMode enums
│   │   ├── company.types.ts       ← Company, Branch type definitions
│   │   ├── user.types.ts          ← CompanyUser, AdminUser types
│   │   └── api.types.ts           ← Shared API response shapes
│   ├── utils/
│   │   ├── date.utils.ts          ← Date formatting, timezone helpers
│   │   ├── validation.utils.ts    ← Shared Zod schemas
│   │   └── i18n.utils.ts          ← Shared translation helpers
│   └── constants/
│       ├── booking.constants.ts   ← Platform defaults, status labels
│       └── features.constants.ts  ← Feature flag names
│
├── server/                            ← API Server — EXTENDED
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/              ← Existing admin auth
│   │   │   ├── spaces/            ← Existing + Compass enhancements
│   │   │   ├── people/            ← Existing, unchanged
│   │   │   ├── conference/        ← Existing, unchanged
│   │   │   ├── labels/            ← Existing, unchanged
│   │   │   ├── settings/          ← Existing, unchanged
│   │   │   ├── sync/              ← Existing AIMS sync
│   │   │   ├── compass-auth/      ← NEW: Compass email+code auth
│   │   │   ├── bookings/          ← NEW: Booking CRUD + rules
│   │   │   ├── buildings/         ← NEW: Building hierarchy
│   │   │   ├── friends/           ← NEW: Friendship management
│   │   │   ├── employees/         ← NEW: CompanyUser CRUD (admin)
│   │   │   ├── integrations/      ← NEW: Microsoft/Google sync
│   │   │   └── compass-profile/   ← NEW: Employee profile/prefs
│   │   ├── shared/
│   │   │   ├── infrastructure/
│   │   │   │   ├── services/
│   │   │   │   │   ├── bookingRuleEngine.ts
│   │   │   │   │   ├── proximityService.ts
│   │   │   │   │   └── aimsSyncQueue.ts
│   │   │   │   └── integrations/
│   │   │   │       ├── microsoft/
│   │   │   │       └── google/
│   │   │   └── middleware/
│   │   │       ├── adminAuth.ts       ← Existing admin JWT middleware
│   │   │       └── compassAuth.ts     ← NEW: Compass JWT middleware
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma          ← Extended with Compass models
│   │   └── migrations/
│   └── package.json
│
├── e2e/                               ← Playwright tests — EXTENDED
│   ├── fixtures/
│   ├── admin/                     ← Admin app E2E tests (existing)
│   └── compass/                   ← Compass app E2E tests (NEW)
│
├── docs/                              ← Documentation
│   ├── architecture/
│   │   └── compass/               ← This planning suite
│   ├── plans/
│   └── wiki/
│
├── package.json                       ← Root: admin SPA + workspace scripts
├── vite.config.ts                     ← Admin SPA Vite config (existing)
├── tsconfig.json                      ← Root TypeScript config
├── docker-compose.app.yml             ← Docker: admin + compass + server
├── docker-compose.infra.yml           ← Docker: PostgreSQL + Redis
├── Dockerfile.admin                   ← Build admin SPA (NEW name, was Dockerfile)
├── Dockerfile.compass                 ← Build compass SPA (NEW)
├── Dockerfile.server                  ← Build API server (existing, unchanged)
└── CLAUDE.md                          ← Project instructions
```

---

## 2. Path Aliases

### Admin SPA (`vite.config.ts` — existing, unchanged)

```typescript
resolve: {
  alias: {
    '@features': path.resolve(__dirname, 'src/features'),
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@test': path.resolve(__dirname, 'src/test'),
    '@electis/shared': path.resolve(__dirname, 'shared'),  // NEW
  },
}
```

### Compass SPA (`compass/vite.config.ts`)

```typescript
resolve: {
  alias: {
    '@features': path.resolve(__dirname, 'src/features'),
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@electis/shared': path.resolve(__dirname, '../shared'),  // Cross-app shared
  },
}
```

### Server (`server/tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./src/shared/*"],
      "@features/*": ["./src/features/*"],
      "@electis/shared/*": ["../shared/*"]
    }
  }
}
```

---

## 3. Dependency Strategy

### Option: Single `package.json` at Root (Recommended)

Both admin and compass SPAs share the same React + MUI + Zustand dependencies. Using a single root `package.json` avoids duplicate `node_modules` and simplifies CI.

```json
// package.json (root)
{
  "name": "electis-workspace",
  "private": true,
  "scripts": {
    "dev": "vite",
    "dev:compass": "vite --config compass/vite.config.ts",
    "dev:server": "cd server && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:compass\" \"npm run dev:server\"",

    "build": "tsc && vite build",
    "build:compass": "tsc -p compass/tsconfig.json && vite build --config compass/vite.config.ts",
    "build:server": "cd server && npm run build",
    "build:all": "npm run build && npm run build:compass && npm run build:server",

    "test:unit": "vitest run",
    "test:unit:compass": "vitest run --config compass/vitest.config.ts",
    "test:e2e": "playwright test",

    "android:sync": "cd compass && npx cap sync android",
    "android:build": "cd compass && npx cap build android",
    "android:run": "cd compass && npx cap run android"
  },
  "dependencies": {
    "react": "^19.0.0",
    "@mui/material": "^7.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "...",
    "zod": "...",
    "i18next": "...",
    "axios": "...",
    "socket.io-client": "..."
  }
}
```

### Compass-Specific Dependencies

If Compass needs packages that admin doesn't (e.g., Capacitor plugins, biometric auth), they go in `compass/package.json`:

```json
// compass/package.json
{
  "name": "electis-compass",
  "private": true,
  "dependencies": {
    "@capacitor/core": "^7.0.0",
    "@capacitor/preferences": "^7.0.0",
    "@capacitor-community/biometric-auth": "^7.0.0",
    "@capacitor/push-notifications": "^7.0.0"
  }
}
```

Install both: `npm install && cd compass && npm install`

---

## 4. Vite Configuration

### Admin (`vite.config.ts` — existing, minor additions)

```typescript
// No changes needed for admin Vite config
// Just add the @electis/shared alias
export default defineConfig({
  // ... existing config unchanged
  resolve: {
    alias: {
      '@features': resolve(__dirname, 'src/features'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@electis/shared': resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: 'dist',     // admin builds to /dist
  },
});
```

### Compass (`compass/vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@features': resolve(__dirname, 'src/features'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@electis/shared': resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),    // compass builds to /compass/dist
  },
  server: {
    port: 3002,                            // Admin uses 3000, Compass uses 3002
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __APP_NAME__: JSON.stringify('electisCompass'),
  },
});
```

---

## 5. TypeScript Configuration

### Root (`tsconfig.json` — extend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@electis/shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared"],
  "exclude": ["node_modules", "dist", "compass", "server"]
}
```

### Compass (`compass/tsconfig.json`)

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@electis/shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "../shared"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 6. Docker Build Configuration

### `Dockerfile.admin` (renamed from `Dockerfile`)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ src/
COPY shared/ shared/
COPY vite.config.ts tsconfig.json index.html ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### `Dockerfile.compass` (NEW)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY compass/package*.json compass/
RUN npm ci && cd compass && npm ci
COPY compass/ compass/
COPY shared/ shared/
RUN npm run build:compass

FROM nginx:alpine
COPY --from=builder /app/compass/dist /usr/share/nginx/html
COPY compass/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### `docker-compose.app.yml` (updated)

```yaml
services:
  client:
    build:
      context: .
      dockerfile: Dockerfile.admin
    container_name: electisspace-server
    ports:
      - "3071:3000"
    networks:
      - global-network

  compass:
    build:
      context: .
      dockerfile: Dockerfile.compass
    container_name: electiscompass-server
    ports:
      - "3072:3000"
    networks:
      - global-network

  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    container_name: electisspace-api
    ports:
      - "3073:3000"
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
    depends_on:
      - postgres
      - redis
    networks:
      - global-network

networks:
  global-network:
    external: true
```

---

## 7. Shared Code Guidelines

### What Goes in `shared/`

| Include | Exclude |
|---------|---------|
| TypeScript types/interfaces used by both apps | React components (app-specific) |
| Zod validation schemas for shared data | Zustand stores (app-specific state) |
| Constants (feature flags, booking defaults) | API client instances (different base URLs) |
| Pure utility functions (date formatting, etc.) | Theme configuration (different themes) |
| Enum definitions (BookingStatus, SpaceMode) | i18n translations (different user-facing text) |

### Import Rule

```typescript
// GOOD — Admin imports from shared
import { BookingStatus, SpaceMode } from '@electis/shared/types/booking.types';
import { PLATFORM_DEFAULTS } from '@electis/shared/constants/booking.constants';

// GOOD — Compass imports from shared
import { BookingStatus } from '@electis/shared/types/booking.types';

// BAD — Compass imports from Admin
import { useSpaceStore } from '@features/space/application/useSpaceStore'; // WRONG!

// BAD — Admin imports from Compass
import { useBookingStore } from '../../compass/src/features/booking/...'; // WRONG!
```

The `shared/` directory is the ONLY cross-app import path. Admin and Compass never import from each other directly.

---

## 8. CI/CD Pipeline Updates

```yaml
# .github/workflows/ci.yml

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci && cd compass && npm ci && cd ../server && npm ci

      - name: Type check (Admin)
        run: npx tsc --noEmit

      - name: Type check (Compass)
        run: npx tsc --noEmit -p compass/tsconfig.json

      - name: Type check (Server)
        run: cd server && npx tsc --noEmit

      - name: Unit tests (Admin)
        run: npm run test:unit

      - name: Unit tests (Compass)
        run: npm run test:unit:compass

      - name: Unit tests (Server)
        run: cd server && npx vitest run

      - name: Build Admin
        run: npm run build

      - name: Build Compass
        run: npm run build:compass

      - name: Build Server
        run: cd server && npm run build
```

---

## 9. Development Workflow

```
Terminal 1: npm run dev           # Admin SPA on :3000
Terminal 2: npm run dev:compass   # Compass SPA on :3002
Terminal 3: npm run dev:server    # API server on :3001

# Or all at once:
npm run dev:all                   # Runs all three via concurrently
```

### Port Mapping

| App | Dev Port | Docker Port | NPM Proxy Domain |
|-----|----------|-------------|-------------------|
| Admin SPA | 3000 | 3071 | `app.solumesl.co.il` |
| Compass SPA | 3002 | 3072 | `compass.solumesl.co.il` |
| API Server | 3001 | 3073 | (proxied via `/api/*` from both apps) |

---

## 10. Migration Path

Moving from current structure to the monorepo:

1. **Phase 0 (no-op):** Create `compass/` and `shared/` directories. No existing code changes.
2. **Phase 1:** Create `compass/vite.config.ts`, `compass/tsconfig.json`, `compass/src/main.tsx` (empty shell).
3. **Phase 2:** Extract shared types from `src/` to `shared/`. Update admin imports.
4. **Phase 3:** Add `@electis/shared` alias to admin and compass configs.
5. **Phase 4:** Build Compass features in `compass/src/features/`.
6. **Phase 5:** Add `Dockerfile.compass` and update `docker-compose.app.yml`.
7. **Phase 6:** Add Compass E2E tests in `e2e/compass/`.

No existing code needs to move. The migration is purely additive.
