# Appendix C — Key File Reference

| File | Purpose |
|------|---------|
| `server/src/server.ts` | Server entry point, lifecycle, background job startup |
| `server/src/app.ts` | Express app setup, middleware pipeline, route mounting |
| `server/src/config/env.ts` | Environment validation (Zod), derived config |
| `server/src/config/redis.ts` | Redis client singleton |
| `server/src/config/database.ts` | Prisma client configuration |
| `server/prisma/schema.prisma` | Database schema definition |
| `server/src/shared/middleware/auth.ts` | JWT auth + RBAC middleware (authenticate, requirePermission, requireGlobalRole) |
| `server/src/shared/infrastructure/services/aimsGateway.ts` | AIMS API client with caching |
| `server/src/shared/infrastructure/services/syncQueueService.ts` | Sync queue helper |
| `server/src/shared/infrastructure/services/articleBuilder.ts` | AIMS article construction |
| `server/src/shared/infrastructure/services/solumService.ts` | Low-level AIMS HTTP client |
| `server/src/shared/infrastructure/services/redisCache.ts` | Redis cache wrapper |
| `server/src/shared/infrastructure/services/appLogger.ts` | Structured JSON logger (singleton) |
| `server/src/features/logs/routes.ts` | Log buffer API (admin-only) |
| `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts` | Background sync processor |
| `server/src/shared/infrastructure/jobs/AimsPullSyncJob.ts` | Periodic reconciliation job |
| `server/src/shared/infrastructure/sse/SseManager.ts` | SSE connection manager |
| `src/App.tsx` | Root React component |
| `src/AppRoutes.tsx` | Client route definitions |
| `src/main.tsx` | Client entry point |
| `src/theme.ts` | MUI theme (RTL-aware) |
| `src/i18n/config.ts` | i18n lazy-loading config |
| `src/shared/infrastructure/services/apiClient.ts` | Axios client with token management |
| `src/shared/infrastructure/services/storeEventsService.ts` | SSE client |
| `src/shared/infrastructure/store/rootStore.ts` | Store aggregation |
| `src/features/auth/infrastructure/authStore.ts` | Auth state management |
| `vite.config.ts` | Vite build configuration |
| `capacitor.config.ts` | Capacitor mobile configuration |
| `electron/main.cjs` | Electron main process |
| `client/Dockerfile` | SPA + Nginx container |
| `server/Dockerfile` | API container |
| `client/nginx.conf` | Internal Nginx configuration |
| `docker-compose.app.yml` | Application container orchestration |
| `docker-compose.infra.yml` | Infrastructure container orchestration (Redis) |
| `ecosystem.config.cjs` | PM2 process manager config (Windows) |

---

*End of Architecture Book*
