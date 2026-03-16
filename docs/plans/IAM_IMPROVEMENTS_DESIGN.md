# IAM Improvements Design Document

## Overview

This document describes the identity, access management, and settings improvements implemented for ElectisSpace.

---

## 1. Permissions Matrix

### Global Roles

| Role | Scope | Description |
|------|-------|-------------|
| `PLATFORM_ADMIN` | System-wide | Full access to everything. Can manage all companies, stores, users. |

### Company Roles (`CompanyRole`)

| Role | Manage Company | Manage Users | Manage Stores | All Stores Access | View Data |
|------|---------------|-------------|--------------|-------------------|-----------|
| `SUPER_USER` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `COMPANY_ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `STORE_ADMIN` | ❌ | Per-store | ❌ | ❌ | Per-store |
| `STORE_VIEWER` | ❌ | ❌ | ❌ | ❌ | Per-store |
| `VIEWER` | ❌ | ❌ | ❌ | ❌ | Read-only |

### Store Roles (`StoreRole`) — Resource Permissions

| Resource | STORE_ADMIN | STORE_MANAGER | STORE_EMPLOYEE | STORE_VIEWER |
|----------|------------|---------------|----------------|-------------|
| spaces | CRUD | CRUD | RU | R |
| people | CRUD+import+assign | CRUD+import+assign | RU | R |
| conference | CRUD+toggle | CRUD+toggle | RU | R |
| settings | RU | R | ❌ | ❌ |
| users | CRUD | ❌ | ❌ | ❌ |
| audit | R | ❌ | ❌ | ❌ |
| sync | trigger+view | trigger+view | view | view |
| labels | view+manage | view+manage | view | view |
| **companies** | ❌ | ❌ | ❌ | ❌ |
| **stores** | manage | ❌ | ❌ | ❌ |

### Route Permission Audit

| Route | Method | Current Guard | Required Guard | Status |
|-------|--------|---------------|----------------|--------|
| `POST /companies` | POST | authenticate | requireGlobalRole(PLATFORM_ADMIN) | ✅ Fixed |
| `DELETE /companies/:id` | DELETE | authenticate | requireGlobalRole(PLATFORM_ADMIN) | ✅ Fixed |
| `PATCH /companies/:id` | PATCH | authenticate | Service-level check | ✅ OK |
| `PUT /settings/store/:storeId` | PUT | authenticate | requirePermission('settings','update') | ✅ Fixed |
| `PUT /settings/company/:companyId` | PUT | authenticate | Service-level check | ✅ OK |
| `POST /users` | POST | authenticate | Service-level check | ✅ OK |
| `DELETE /users/:id` | DELETE | authenticate | Service-level check | ✅ OK |
| `POST /users/:id/elevate` | POST | authenticate | requireGlobalRole(PLATFORM_ADMIN) | ✅ Fixed |
| `DELETE /stores/:id` | DELETE | authenticate | requirePermission('stores','delete') | ✅ Fixed |
| `POST /users/bulk/deactivate` | POST | authenticate | Service-level check | ✅ New |
| `POST /users/bulk/role` | POST | authenticate | Service-level check | ✅ New |

---

## 2. User Management Enhancements

### 2.1 User Suspension/Deactivation with Reason

**Schema changes:**
- Added `suspendedAt`, `suspendedReason`, `suspendedById` fields to User model
- Tracks who suspended, when, and why
- Reactivation clears suspension fields

**API:**
- `POST /users/:id/suspend` — Suspend user with reason
- `POST /users/:id/reactivate` — Reactivate suspended user

**Behavior:**
- Suspended users have `isActive = false` + suspension metadata
- Login blocked for suspended users with reason returned
- Self-suspension prevented
- Only admins who can manage the user can suspend/reactivate

### 2.2 Bulk User Operations

**API:**
- `POST /users/bulk/deactivate` — Bulk deactivate users by ID list
- `POST /users/bulk/activate` — Bulk activate users by ID list
- `POST /users/bulk/role` — Bulk change store role for users

**Validation:**
- Max 50 users per bulk operation
- Authorization checked per user (skips unauthorized)
- Returns success/failure counts
- Prevents self-deactivation in bulk

### 2.3 Activity Tracking

Already implemented in schema:
- `lastLogin` — Updated on successful auth
- `lastActivity` — Updated on API activity
- `loginCount` — Incremented on login
- `failedLoginAttempts` — Tracked for lockout
- `lockedUntil` — Account lock timestamp

---

## 3. Store Management Improvements

### 3.1 Store Status

**Schema changes:**
- Added `status` enum: `ACTIVE`, `MAINTENANCE`, `OFFLINE`, `ARCHIVED`
- Added `statusChangedAt`, `statusNote` fields

**API:**
- `PATCH /stores/:id/status` — Update store status with note
- Status returned in store listings

### 3.2 Store Archiving

- Archive sets `status = ARCHIVED` and `isActive = false`
- Archived stores excluded from default listings
- Can be restored by setting status back to `ACTIVE`
- Prevents deletion — use archive instead

### 3.3 Store Transfer

- `POST /stores/:id/transfer` — Transfer store to different company (Platform Admin only)
- Reassigns all user-store assignments
- Updates store's companyId

---

## 4. Missing Permission Guards Fixed

### Routes that had no permission middleware (only `authenticate`):

1. **Company routes**: `POST /companies` and `DELETE /companies/:id` now require `PLATFORM_ADMIN`
2. **User elevation**: `POST /users/:id/elevate` now requires `PLATFORM_ADMIN` at route level
3. **Settings write**: `PUT /settings/store/:storeId` now requires `requirePermission('settings', 'update')`
4. **Store delete**: `DELETE /stores/:id` now requires `requirePermission('stores', 'delete')`

### Service-level auth (already correct):
- User CRUD operations check company/store admin status
- Company updates check `canManageCompany`
- Store operations check `canManageStore` or `canManageCompany`

---

## 5. Implementation Summary

### Files Modified:
- `server/prisma/schema.prisma` — Added suspension fields, store status enum
- `server/src/shared/middleware/auth.ts` — Added `stores` and `companies` resources
- `server/src/features/users/types.ts` — New schemas for suspend, bulk ops
- `server/src/features/users/service.ts` — Suspend/reactivate/bulk operations
- `server/src/features/users/controller.ts` — New endpoints
- `server/src/features/users/routes.ts` — New routes + permission guards
- `server/src/features/users/repository.ts` — New repository methods
- `server/src/features/stores/routes.ts` — Permission guards
- `server/src/features/stores/service.ts` — Status update, transfer, archive
- `server/src/features/stores/controller.ts` — New endpoints
- `server/src/features/stores/types.ts` — New types
- `server/src/features/companies/routes.ts` — Permission guards
- `server/src/features/settings/routes.ts` — Permission guards
- `docs/IAM_IMPROVEMENTS_DESIGN.md` — This document
