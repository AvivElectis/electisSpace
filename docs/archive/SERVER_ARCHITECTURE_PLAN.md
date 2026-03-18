# Server Clean Architecture Plan

## Overview

This document outlines the plan to refactor the electisSpace server to a **Clean Architecture** with **Single Responsibility Principle (SRP)**.

---

## Current State Analysis

| Feature | Architecture | routes.ts Lines | Status |
|---------|--------------|-----------------|--------|
| **companies** | ✅ Layered | 51 | **DONE** |
| **users** | ❌ Monolithic | 1,203 | 🔴 Critical |
| **auth** | ❌ Monolithic | 794 | 🔴 Critical |
| **admin** | ❌ Monolithic | 676 | 🟠 High |
| **stores** | ❌ Monolithic | 414 | 🟠 High |
| **settings** | ❌ Monolithic | 482 | 🟠 High |
| **sync** | ❌ Monolithic | 443 | 🟡 Medium |
| **people** | ❌ Monolithic | 334 | 🟡 Medium |
| **spaces** | ❌ Monolithic | 269 | 🟡 Medium |
| **conference** | ❌ Monolithic | 245 | 🟡 Medium |
| **labels** | ❌ Monolithic | 235 | 🟡 Medium |
| **health** | ❌ Monolithic | 135 | 🟢 Low |

---

## Target Architecture

### Directory Structure Per Feature

```
server/src/features/{feature}/
├── index.ts          # Module exports (clean public API)
├── routes.ts         # Thin route definitions (~30-60 lines)
├── controller.ts     # HTTP request/response handling
├── service.ts        # Business logic & orchestration
├── repository.ts     # Data access layer (Prisma)
└── types.ts          # DTOs, schemas, interfaces
```

### Layer Responsibilities

| Layer | File | Responsibility | Can Call |
|-------|------|----------------|----------|
| **Routes** | `routes.ts` | URL → Controller mapping | Controller only |
| **Controller** | `controller.ts` | HTTP I/O, validation, error handling | Service only |
| **Service** | `service.ts` | Business rules, authorization, orchestration | Repository, other Services |
| **Repository** | `repository.ts` | Database operations (Prisma) | Prisma only |
| **Types** | `types.ts` | DTOs, Zod schemas, interfaces | None (definitions) |

### Data Flow

```
HTTP Request
    ↓
[routes.ts] → Maps endpoint to controller method
    ↓
[controller.ts] → Extracts params, validates input, calls service
    ↓
[service.ts] → Applies business rules, authorization, orchestrates repo calls
    ↓
[repository.ts] → Executes Prisma queries
    ↓
[service.ts] → Transforms data, applies business logic
    ↓
[controller.ts] → Formats HTTP response
    ↓
HTTP Response
```

---

## Shared Layer Structure

```
server/src/shared/
├── middleware/
│   ├── auth.ts           # Authentication & authorization
│   ├── errorHandler.ts   # Error handling & AppError
│   ├── requestId.ts      # Correlation IDs
│   └── index.ts          # Re-exports
├── infrastructure/
│   ├── services/
│   │   ├── aimsClient.ts    # External AIMS API
│   │   ├── solumClient.ts   # External Solum ESL API
│   │   └── syncQueue.ts     # Redis queue operations
│   └── jobs/
│       └── syncWorker.ts    # Background job processor
├── services/
│   └── email.ts          # Email service (transactional)
├── utils/
│   ├── encryption.ts     # AES-256 encryption
│   └── solumConfig.ts    # Solum helpers
└── types/
    └── express.d.ts      # Express type augmentations (NEW)
```

---

## Refactoring Priority

### Phase 1: Critical (Security & Core)
1. **auth** - Security-sensitive, handles tokens, 2FA
2. **users** - Largest file (1,203 lines), core entity
3. **stores** - Core business entity, many dependencies

### Phase 2: High Priority
4. **admin** - Administrative functions
5. **settings** - Configuration management

### Phase 3: Medium Priority
6. **sync** - Background job orchestration
7. **people** - People/employee management
8. **spaces** - Space management

### Phase 4: Low Priority
9. **conference** - Conference room features
10. **labels** - ESL label management
11. **health** - Health checks (simple, can stay as-is)

---

## Common Type Definitions

Create `server/src/shared/types/` for shared types:

### express.d.ts
```typescript
import { GlobalRole, StoreRole, CompanyRole } from '@prisma/client';

declare global {
    namespace Express {
        interface StoreAccess {
            id: string;
            role: StoreRole;
            companyId: string;
        }

        interface CompanyAccess {
            id: string;
            role: CompanyRole;
        }

        interface AuthenticatedUser {
            id: string;
            email: string;
            globalRole: GlobalRole | null;
            stores: StoreAccess[];
            companies: CompanyAccess[];
        }

        interface Request {
            user?: AuthenticatedUser;
            requestId?: string;
        }
    }
}
```

### common.ts
```typescript
// Pagination
export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ID type helper
export type EntityId = string;
```

---

## Feature Breakdown Example: auth

### Current: routes.ts (794 lines)
- Login logic
- Token refresh logic
- 2FA setup/verify
- Password reset
- Password change
- Validation schemas
- Helper functions

### Target Structure:

```
auth/
├── index.ts
├── routes.ts         # ~40 lines
├── controller.ts     # ~200 lines
├── service.ts        # ~350 lines
├── repository.ts     # ~150 lines
└── types.ts          # ~100 lines
```

**types.ts**
- LoginDto, LoginResponse
- TokenRefreshDto
- TwoFactorSetupResponse
- PasswordResetDto
- Validation schemas

**repository.ts**
- findUserByEmail()
- updateLastLogin()
- updatePassword()
- saveTwoFactorSecret()
- saveRefreshToken()
- revokeRefreshToken()

**service.ts**
- validateCredentials()
- generateTokenPair()
- refreshAccessToken()
- setupTwoFactor()
- verifyTwoFactor()
- initiatePasswordReset()
- completePasswordReset()

**controller.ts**
- login()
- refresh()
- logout()
- setup2fa()
- verify2fa()
- forgotPassword()
- resetPassword()

---

## Feature Breakdown Example: users

### Current: routes.ts (1,203 lines)
- List users (complex filtering)
- Get user details
- Create user
- Update user
- Delete user
- Store assignments
- Company assignments
- Permission checks
- Validation schemas

### Target Structure:

```
users/
├── index.ts
├── routes.ts         # ~60 lines
├── controller.ts     # ~300 lines
├── service.ts        # ~450 lines
├── repository.ts     # ~250 lines
└── types.ts          # ~150 lines
```

---

## Migration Steps Per Feature

1. **Create types.ts**
   - Extract validation schemas (Zod)
   - Define DTOs (input/output)
   - Define response interfaces

2. **Create repository.ts**
   - Extract all Prisma calls
   - Add proper TypeScript types
   - No business logic

3. **Create service.ts**
   - Extract business logic
   - Add authorization checks
   - Orchestrate repository calls

4. **Create controller.ts**
   - Extract HTTP handling
   - Input validation
   - Error handling
   - Call services

5. **Refactor routes.ts**
   - Keep only route definitions
   - Point to controller methods

6. **Create index.ts**
   - Export public API
   - Export routes (default)
   - Export types (named)

7. **Test**
   - Verify all endpoints work
   - Check error handling
   - Verify authorization

---

## Testing Strategy

Each layer should be testable in isolation:

```
__tests__/
├── repository.test.ts    # Mock Prisma
├── service.test.ts       # Mock Repository
├── controller.test.ts    # Mock Service
└── routes.test.ts        # Integration tests
```

---

## Benefits

1. **Single Responsibility** - Each file has one job
2. **Testability** - Easy to unit test each layer
3. **Maintainability** - Changes isolated to relevant layer
4. **Reusability** - Services can be used by other features
5. **Readability** - Smaller, focused files
6. **Type Safety** - Clear interfaces between layers

---

## Estimated Effort

| Feature | Effort | Priority |
|---------|--------|----------|
| auth | 4h | 🔴 Phase 1 |
| users | 6h | 🔴 Phase 1 |
| stores | 3h | 🔴 Phase 1 |
| admin | 3h | 🟠 Phase 2 |
| settings | 2h | 🟠 Phase 2 |
| sync | 2h | 🟡 Phase 3 |
| people | 2h | 🟡 Phase 3 |
| spaces | 1.5h | 🟡 Phase 3 |
| conference | 1.5h | 🟢 Phase 4 |
| labels | 1.5h | 🟢 Phase 4 |
| health | 0.5h | 🟢 Phase 4 |
| **Total** | **~27h** | |

---

## Next Steps

1. ✅ Fix immediate syntax errors in companies feature
2. Create shared type definitions (`shared/types/`)
3. Start with `auth` feature (security-critical)
4. Continue with `users` feature (largest)
5. Proceed through priority list

Would you like me to start refactoring a specific feature?
