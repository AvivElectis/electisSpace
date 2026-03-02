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
| `server/src/shared/infrastructure/services/aimsGateway.ts` | AIMS API client with token retry and caching |
| `server/src/features/aims-management/routes.ts` | AIMS management routes (40+ endpoints) |
| `server/src/features/aims-management/controller.ts` | AIMS request handling and Zod validation |
| `server/src/features/aims-management/service.ts` | AIMS business logic with structured logging |
| `server/src/features/aims-management/types.ts` | AIMS Zod schemas and TypeScript types |
| `server/src/shared/infrastructure/services/syncQueueService.ts` | Sync queue helper |
| `server/src/shared/infrastructure/services/articleBuilder.ts` | AIMS article construction |
| `server/src/shared/infrastructure/services/solumService.ts` | Low-level AIMS HTTP client (gateway, label, article, template, whitelist operations) |
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
| `src/features/aims-management/presentation/AimsManagementPage.tsx` | AIMS Manager: 7-tab layout (Overview, Gateways, Labels, Articles, Templates, History, Whitelist) |
| `src/features/aims-management/infrastructure/aimsManagementStore.ts` | AIMS Zustand store (all tab state, loading, errors) |
| `src/features/aims-management/infrastructure/aimsManagementService.ts` | AIMS API service (all client-side API calls) |
| `src/features/aims-management/application/useAimsOverview.ts` | Overview hook (allSettled for partial failure resilience) |
| `src/features/aims-management/application/useWhitelist.ts` | Whitelist hook (CRUD, box, sync operations) |
| `vite.config.ts` | Vite build configuration |
| `capacitor.config.ts` | Capacitor mobile configuration |
| `electron/main.cjs` | Electron main process |
| `client/Dockerfile` | SPA + Nginx container |
| `server/Dockerfile` | API container |
| `client/nginx.conf` | Internal Nginx configuration |
| `docker-compose.app.yml` | Application container orchestration |
| `docker-compose.infra.yml` | Infrastructure container orchestration (Redis) |
| `ecosystem.config.cjs` | PM2 process manager config (Windows) |
| `my-video/src/Root.tsx` | Remotion composition registration (intro video) |
| `my-video/src/Composition.tsx` | Video scene sequencing with TransitionSeries + audio |
| `my-video/src/scenes/*.tsx` | Individual video scenes (Hero, Problem, Features, Workflow, Mobile, Platforms, Outro) |
| `my-video/src/theme.ts` | Video brand theme constants (mirrors app theme) |

---

*End of Architecture Book*
