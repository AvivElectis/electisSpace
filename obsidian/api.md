---
tags: [#server, #api, #express, #prisma, #rest]
---

**Related:** [[electisSpace]], [[architecture]], [[domain]], [[conventions]]

# API Routes & Data Models

## Base URL

All API routes are under `/api/v1/`.

## Server Features (Route Modules)

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/auth` | POST login, POST refresh, POST 2fa/verify, POST 2fa/setup, POST reset-password |
| Users | `/users` | CRUD, role assignment |
| Companies | `/companies` | CRUD, settings |
| Stores | `/stores` | CRUD, features config |
| Spaces | `/spaces` | CRUD, bulk operations, pagination, search |
| People | `/people` | CRUD, assign/unassign, provision-slots, search |
| People Lists | `/people-lists` | CRUD, load/free list |
| Spaces Lists | `/spaces-lists` | CRUD |
| Conference | `/conference` | CRUD rooms |
| Labels | `/labels` | List, link/unlink, blink, refresh |
| Sync | `/sync` | Trigger push/pull, get job status |
| Settings | `/settings` | Company/store settings CRUD |
| AIMS Management | `/aims-management` | Direct AIMS API operations |
| Roles | `/roles` | Role definitions CRUD |
| Admin | `/admin` | Audit logs, system admin |
| Logs | `/logs` | In-memory log ring buffer (last 2000 entries) |
| Health | `/health` | Health check endpoint |

## SSE (Server-Sent Events)

- `GET /stores/:storeId/events?token=<jwt>` -- real-time store updates
- Events: person CRUD, list load/free, sync status changes
- JWT via query param (EventSource API limitation)

## Auth Endpoints (Rate Limited)

| Endpoint | Limiter |
|----------|---------|
| Login | `authLimiter` (5 req/15min) |
| 2FA verify | `twoFALimiter` (3 req/5min) |
| Password reset | `passwordResetLimiter` (3 req/hr) |

## Database Schema

**ORM:** Prisma 7 with PostgreSQL

**Key models:** User, Company, Store, Space, Person, ConferenceRoom, Label, SyncQueueItem, AuditLog, UserStore, UserCompany, Role, Permission

**Schema file:** `server/prisma/schema.prisma`
**Migrations:** `server/prisma/migrations/`

### Important Indexes

- `Person.externalId` -- used in verification, sync, search
- `Person.virtualSpaceId` -- used in search, assignment operations

## Request Validation

All request body/params/query validated via Zod schemas in `*.types.ts` files. Validation happens in the controller layer, not service layer.

## Error Response Format

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

Uses `AppError` class with factories: `notFound()`, `badRequest()`, `unauthorized()`, `forbidden()`.
