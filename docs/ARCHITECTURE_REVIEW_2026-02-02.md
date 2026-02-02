# electisSpace Architecture Review & Recommendations

**Date:** February 2, 2026  
**Reviewer:** Architecture Analysis  
**Version:** 1.3.0

---

## Executive Summary

The electisSpace architecture is well-structured with clear separation of concerns between client and server. However, this review identified **4 critical security issues**, **3 race conditions**, and several incomplete features that should be addressed before production deployment.

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Client** | React 18, TypeScript, Vite, Zustand, MUI | Modern SPA architecture |
| **Server** | Node.js, Express, TypeScript, Prisma | Feature-based structure |
| **Database** | PostgreSQL | Multi-tenant via Company/Store |
| **Cache** | Redis (optional) | Sync queue, sessions |
| **External** | SoluM AIMS API | ESL management |

### 1.2 Feature Modules (Well Organized ✅)

```
Client Features          Server Features
├── auth/               ├── auth/         (848 lines)
├── conference/         ├── conference/   (287 lines)
├── people/             ├── people/       (371 lines)
├── settings/           ├── settings/     (178 lines)
├── space/              ├── spaces/       (311 lines)
├── sync/               ├── sync/         (508 lines)
├── lists/              ├── users/        (1345 lines)
├── labels/             ├── companies/    (511 lines)
└── dashboard/          ├── stores/       (433 lines)
                        └── health/       (154 lines)
```

---

## 2. 🔴 Critical Security Issues

### 2.1 Sensitive Data in Console Logs

**Location:** `server/src/features/auth/routes.ts` lines 127, 136, 141, 147

```typescript
// CURRENT (DANGEROUS)
console.log('Login attempt:', req.body);  // ⚠️ Logs password!
console.log('Password valid:', isValid);
```

**Risk:** Passwords appear in server logs, potentially exposed via log aggregation.

**Recommendation:**
```typescript
// FIXED
logger.info('Login attempt', { email: req.body.email, ip: req.ip });
logger.debug('Password validation result', { valid: isValid });
```

---

### 2.2 Weak Encryption Implementation

**Location:** `server/src/shared/utils/encryption.ts`

```typescript
// CURRENT (WEAK)
const bytes = CryptoJS.AES.decrypt(cipherText, secret);
```

**Issues:**
- CryptoJS uses PBKDF2 with only 1 iteration by default
- No initialization vector (IV) management
- String-based key derivation (not cryptographically secure)

**Recommendation:**
```typescript
// IMPROVED - Use Node's crypto module
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

export function encrypt(plainText: string, secret: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.scryptSync(secret, salt, KEY_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

export function decrypt(cipherText: string, secret: string): string {
    const buffer = Buffer.from(cipherText, 'base64');
    
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = crypto.scryptSync(secret, salt, KEY_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    return decipher.update(encrypted) + decipher.final('utf8');
}
```

---

### 2.3 Missing Auth-Specific Rate Limiting

**Location:** `server/src/app.ts`

**Current State:** Global rate limit exists (100 req/15min), but auth endpoints need stricter limits.

**Recommendation:**
```typescript
// In server/src/features/auth/routes.ts
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts
    keyGenerator: (req) => req.body.email || req.ip,
    message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many login attempts' } },
});

const twoFALimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 2FA attempts
    keyGenerator: (req) => req.body.email || req.ip,
});

router.post('/login', authLimiter, async (req, res, next) => { ... });
router.post('/verify-2fa', twoFALimiter, async (req, res, next) => { ... });
```

---

### 2.4 Token Storage in localStorage

**Location:** Client auth store

**Current State:** JWT access tokens stored in localStorage (XSS vulnerable).

**Recommendation:** Move to httpOnly cookies for refresh tokens (already done) and memory-only for access tokens:

```typescript
// In authStore.ts
let accessToken: string | null = null; // Memory only, not persisted

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Remove accessToken from persisted state
            setAccessToken: (token) => { accessToken = token; },
            getAccessToken: () => accessToken,
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                // accessToken NOT included
            }),
        }
    )
);
```

---

## 3. 🟠 Race Conditions

### 3.1 Token Refresh Race

**Location:** Client API interceptor

**Issue:** Multiple concurrent 401 responses can trigger multiple refresh attempts.

**Current Mitigation:** Queue mechanism exists but `isRefreshing` flag can still race.

**Recommendation:** Use a promise-based lock:

```typescript
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) return refreshPromise;
    
    refreshPromise = (async () => {
        try {
            const response = await authService.refresh();
            return response.accessToken;
        } finally {
            refreshPromise = null;
        }
    })();
    
    return refreshPromise;
}
```

---

### 3.2 Sync Queue Collision

**Location:** `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts`

**Issue:** `findFirst` + `update` operations are not atomic. Two processor instances can grab the same item.

**Recommendation:** Use `updateMany` with atomic state transition:

```typescript
// IMPROVED
async function claimNextItem(): Promise<SyncQueueItem | null> {
    const result = await prisma.syncQueueItem.updateMany({
        where: {
            status: 'PENDING',
            scheduledAt: { lte: new Date() },
            attempts: { lt: MAX_ATTEMPTS },
        },
        data: {
            status: 'PROCESSING',
            processedAt: new Date(),
        },
        take: 1, // Prisma 5.x supports this
    });
    
    if (result.count === 0) return null;
    
    return prisma.syncQueueItem.findFirst({
        where: { status: 'PROCESSING' },
        orderBy: { processedAt: 'desc' },
    });
}
```

---

### 3.3 2FA Code Verification Race

**Location:** `server/src/features/auth/routes.ts`

**Issue:** Code verification and token creation are separate operations.

**Recommendation:** Wrap in transaction:

```typescript
const result = await prisma.$transaction(async (tx) => {
    const code = await tx.verificationCode.findFirst({
        where: { userId, code, used: false, expiresAt: { gt: new Date() } },
    });
    
    if (!code) throw unauthorized('Invalid or expired code');
    
    await tx.verificationCode.update({
        where: { id: code.id },
        data: { used: true },
    });
    
    const refreshTokenRecord = await tx.refreshToken.create({
        data: { userId, tokenHash, expiresAt },
    });
    
    return refreshTokenRecord;
});
```

---

## 4. 🟡 Incomplete Features (TODOs Found)

| Location | Line | TODO | Priority |
|----------|------|------|----------|
| `sync/routes.ts` | 116 | Map articles to entities and update DB | High |
| `people/routes.ts` | 286 | Queue sync job after space assignment | Medium |
| `people/routes.ts` | 318 | Queue sync job after unassignment | Medium |
| `people/routes.ts` | 361 | Implement CSV parsing and bulk import | Low |

### 4.1 Sync Queue Integration Missing

**Issue:** People assignment/unassignment doesn't trigger sync queue.

**Recommendation:**
```typescript
// In people/routes.ts after assignment
await syncQueueService.queueItem({
    storeId: person.storeId,
    entityType: 'PERSON',
    entityId: person.id,
    action: 'UPDATE',
    payload: { assignedSpaceId: spaceId },
});
```

---

## 5. 🔵 Missing Validations

### 5.1 Settings Update - No Store Access Check

**Location:** `server/src/features/settings/routes.ts`

**Issue:** Settings update accepts any `companyId`/`storeId` without verifying user has access.

**Recommendation:**
```typescript
router.patch('/', authenticate, async (req, res, next) => {
    const { storeId, companyId } = req.body;
    
    // Verify access
    if (storeId) {
        const hasAccess = req.user.stores.some(s => s.id === storeId);
        if (!hasAccess) throw forbidden('No access to this store');
    }
    
    if (companyId) {
        const hasAccess = req.user.companies.some(c => c.id === companyId);
        if (!hasAccess) throw forbidden('No access to this company');
    }
    
    // ... continue with update
});
```

---

### 5.2 Missing Pagination on List Endpoints

**Affected Endpoints:**
- `GET /sync/queue` - Hardcoded to 50 items
- `GET /spaces` - Returns all spaces
- `GET /people` - Returns all people

**Recommendation:** Implement consistent pagination:

```typescript
const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// Usage
const { page, limit } = paginationSchema.parse(req.query);
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
    prisma.space.findMany({ skip, take: limit, where: { storeId } }),
    prisma.space.count({ where: { storeId } }),
]);

res.json({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});
```

---

## 6. 🔵 Data Consistency Issues

### 6.1 Orphaned Sync Queue Items

**Issue:** When an entity is deleted, its pending sync items remain in queue.

**Recommendation:** Add cascade cleanup or mark items as skipped:

```typescript
// In space delete handler
await prisma.$transaction([
    prisma.syncQueueItem.updateMany({
        where: { entityType: 'SPACE', entityId: spaceId, status: 'PENDING' },
        data: { status: 'SKIPPED', error: 'Entity deleted' },
    }),
    prisma.space.delete({ where: { id: spaceId } }),
]);
```

---

### 6.2 Stale AIMS Token Cache

**Location:** `server/src/shared/infrastructure/services/aimsGateway.ts`

**Issue:** In-memory token cache not shared across server instances.

**Recommendation for multi-instance deployments:**

```typescript
// Use Redis for token cache
async function getCachedToken(companyId: string): Promise<string | null> {
    return redis.get(`aims:token:${companyId}`);
}

async function cacheToken(companyId: string, token: string, expiresIn: number): void {
    await redis.setex(`aims:token:${companyId}`, expiresIn - 300, token); // 5min buffer
}
```

---

## 7. Architectural Recommendations

### 7.1 Add Request ID Tracking

**Purpose:** Distributed tracing across client-server-AIMS.

```typescript
// Middleware
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] as string || uuidv4();
    res.setHeader('x-request-id', req.id);
    next();
});

// In logger
logger.info('Processing request', { requestId: req.id, path: req.path });
```

---

### 7.2 Add AIMS Health to Main Health Check

**Location:** `server/src/features/health/routes.ts`

```typescript
router.get('/ready', async (req, res) => {
    const checks = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis?.ping(),
        aimsGateway.checkHealth('default'), // Add AIMS check
    ]);
    
    const [db, cache, aims] = checks;
    
    res.status(
        db.status === 'fulfilled' ? 200 : 503
    ).json({
        db: db.status === 'fulfilled' ? 'ok' : 'error',
        cache: cache?.status === 'fulfilled' ? 'ok' : 'unavailable',
        aims: aims?.status === 'fulfilled' ? 'ok' : 'unavailable',
    });
});
```

---

### 7.3 Consider Event-Driven Sync

**Current:** Polling-based sync processor (10s interval).

**Recommendation:** Add event-driven triggers for immediate sync:

```typescript
// Event emitter for sync triggers
import { EventEmitter } from 'events';

const syncEvents = new EventEmitter();

// In entity handlers
syncEvents.emit('entity:changed', { type: 'SPACE', id: space.id, action: 'UPDATE' });

// In sync processor
syncEvents.on('entity:changed', async (event) => {
    await syncQueueProcessor.processImmediately(event);
});
```

---

## 8. Testing Gaps

### 8.1 Missing Integration Tests

| Area | Status |
|------|--------|
| Auth flow (login → 2FA → token refresh) | ❌ No E2E tests |
| AIMS sync (pull → update → push) | ❌ No integration tests |
| Multi-tenant isolation | ❌ No isolation tests |
| Rate limiting | ❌ No load tests |

### 8.2 Test Files Needing Updates

Based on the current test run (20 failures):

| File | Issue |
|------|-------|
| `import-export/businessRules.test.ts` | SFTP credential handling expectations outdated |
| `settings/domain/businessRules.test.ts` | Working mode test expectations |
| `space/useSpaceController.test.ts` | Controller mock setup |
| `layouts/AppHeader.test.tsx` | UI component selectors |

---

## 9. Priority Action Plan

### Immediate (Before Next Release)

1. **🔴 Remove console.log with passwords** - 10 min fix
2. **🔴 Add auth-specific rate limiting** - 30 min
3. **🟠 Fix 2FA verification transaction** - 20 min

### Short-Term (1-2 Weeks)

4. **🔴 Upgrade encryption to Node crypto** - 2 hours (+ migration script)
5. **🟠 Fix token refresh race condition** - 1 hour
6. **🟡 Complete TODO: sync queue in people routes** - 2 hours
7. **🟡 Add store access validation to settings** - 1 hour

### Medium-Term (1 Month)

8. **🔵 Implement pagination across all endpoints** - 4 hours
9. **🔵 Add request ID tracking** - 2 hours
10. **🔵 Add integration test suite** - 1 week
11. **🔵 Consider Redis for token cache** - 4 hours

---

## 10. Summary

| Category | Count | Severity |
|----------|-------|----------|
| Security Issues | 4 | 🔴 Critical |
| Race Conditions | 3 | 🟠 High |
| Missing Validations | 3 | 🟡 Medium |
| Incomplete Features | 4 | 🟡 Medium |
| Data Consistency | 2 | 🔵 Low |
| Testing Gaps | 2 | 🔵 Low |

**Overall Assessment:** The architecture is solid and well-organized. Address the security issues before production deployment, and implement the sync queue integrations for full AIMS synchronization support.

---

*Document generated: February 2, 2026*
