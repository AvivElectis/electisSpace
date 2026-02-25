---
paths:
  - "server/**"
---

# Server Code Rules

## Feature Module Pattern
Each feature follows a consistent structure:
```
server/src/features/<feature>/
  <feature>.routes.ts     ← Express router with middleware
  <feature>.controller.ts ← Request parsing, validation, response formatting
  <feature>.service.ts    ← Business logic (testable without Express)
  <feature>.types.ts      ← Zod schemas + TypeScript types
  __tests__/              ← Vitest unit tests
```

## Request Validation
- Use Zod schemas for ALL request body/params/query validation
- Schemas defined in `*.types.ts` files
- Validate in controller, not in service layer

## Auth & Middleware
- `authenticate` middleware verifies JWT access token
- `authorize` middleware checks role-based access
- `requireGlobalRole` / `requirePermission` for fine-grained control
- Auth flow: access token (Bearer header) + refresh token (httpOnly cookie)
- Refresh endpoint: `POST /api/v1/auth/refresh`

## Database
- Prisma 7 ORM with PostgreSQL
- Schema: `server/prisma/schema.prisma`
- Migrations: `server/prisma/migrations/`
- Always create migrations for schema changes (`npx prisma migrate dev`)
- Make migrations idempotent where possible (check before CREATE/ALTER)
- Never modify existing migration files

## Error Handling
- Use `AppError` class from shared error module
- Factory helpers: `notFound()`, `badRequest()`, `unauthorized()`, `forbidden()`
- Global error handler middleware catches and formats all errors
- Log errors via `appLogger` (structured JSON to stdout)

## Redis & BullMQ
- Redis for caching and BullMQ job queues
- Connection via ioredis
- Used for sync jobs, background label operations

## SSE (Server-Sent Events)
- Store-specific event streams: `GET /api/v1/stores/:storeId/events`
- Must set `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- Connection kept alive with periodic heartbeats
- Nginx requires `proxy_buffering off` and 24h read timeout

## Environment Variables
- `server/.env` for production, `server/.env.development` for Docker dev
- `server/.env.example` documents all required variables
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` create/update admin user on startup via `ensureAdminUser()`
- Never commit actual .env files — GitGuardian monitors all pushes

## Testing (Server Unit)
- Vitest with `server/vitest.config.ts`
- Test files in `__tests__/` directories
- Test constants with passwords: use named variables with `// pragma: allowlist secret`
- Run: `cd server && npx vitest run`

## Logging
- Use `appLogger` for all logging (not console.log)
- Structured JSON format for observability pipeline
- In-memory ring buffer exposed at `GET /api/v1/logs` (last 2000 entries)
