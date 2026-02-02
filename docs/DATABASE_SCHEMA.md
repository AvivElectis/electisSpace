# electisSpace - Database Schema Reference

**Version:** 2.0.0  
**Last Updated:** February 2, 2026

---

## Overview

electisSpace uses **PostgreSQL** as its database with **Prisma ORM** for data access. The schema implements a **Multi-Tenant** architecture with Company → Store → User hierarchy.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MULTI-TENANCY LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐        1:N         ┌──────────────┐                               │
│  │   Company    │───────────────────▶│    Store     │                               │
│  │              │                    │              │                               │
│  │ - name       │                    │ - name       │                               │
│  │ - aimsConfig │                    │ - storeNumber│                               │
│  │ - settings   │                    │ - settings   │                               │
│  └──────────────┘                    └──────┬───────┘                               │
│         │                                   │                                        │
│         │ M:N                               │ 1:N                                    │
│         │                                   │                                        │
│         ▼                                   ▼                                        │
│  ┌──────────────┐        M:N        ┌──────────────┐                               │
│  │ UserCompany  │◀─────────────────▶│  UserStore   │                               │
│  │              │                    │              │                               │
│  │ - role       │                    │ - role       │                               │
│  └──────┬───────┘                    │ - features   │                               │
│         │                            └──────┬───────┘                               │
│         │                                   │                                        │
│         └─────────────┐    ┌────────────────┘                                        │
│                       ▼    ▼                                                         │
│                  ┌──────────────┐                                                    │
│                  │     User     │                                                    │
│                  │              │                                                    │
│                  │ - email      │                                                    │
│                  │ - password   │                                                    │
│                  │ - globalRole │                                                    │
│                  └──────────────┘                                                    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               BUSINESS ENTITIES                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│                            Store (1:N to all below)                                  │
│                                     │                                                │
│         ┌───────────────────────────┼───────────────────────────┐                   │
│         │                           │                           │                   │
│         ▼                           ▼                           ▼                   │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐              │
│  │    Space     │◀─────────│    Person    │          │ Conference   │              │
│  │              │  assigned │              │          │    Room      │              │
│  │ - externalId │          │ - externalId │          │ - roomName   │              │
│  │ - labelCode  │          │ - data       │          │ - hasMeeting │              │
│  │ - data       │          │ - syncStatus │          │ - labelCode  │              │
│  │ - syncStatus │          │              │          │              │              │
│  └──────────────┘          └──────────────┘          └──────────────┘              │
│         │                                                                           │
│         │ M:N                                                                       │
│         ▼                                                                           │
│  ┌──────────────┐          ┌──────────────┐                                        │
│  │ PeopleList   │◀─────────│ PeopleList   │                                        │
│  │              │          │ Membership   │                                        │
│  │ - storageName│          │              │                                        │
│  └──────────────┘          └──────────────┘                                        │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               SUPPORTING TABLES                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ RefreshToken │    │ Verification │    │ SyncQueue    │    │  AuditLog    │      │
│  │              │    │    Code      │    │    Item      │    │              │      │
│  │ - tokenHash  │    │ - code       │    │ - entityType │    │ - action     │      │
│  │ - expiresAt  │    │ - type       │    │ - action     │    │ - entityType │      │
│  │ - revoked    │    │ - expiresAt  │    │ - status     │    │ - oldData    │      │
│  └──────────────┘    └──────────────┘    │ - attempts   │    │ - newData    │      │
│                                          └──────────────┘    └──────────────┘      │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### Company

The top-level tenant entity representing an organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Company display name |
| `aimsCompanyCode` | VARCHAR(100) | NULLABLE | SoluM AIMS company code |
| `aimsBaseUrl` | VARCHAR(500) | NULLABLE | SoluM API base URL |
| `aimsCluster` | VARCHAR(50) | DEFAULT 'common' | API cluster (common/c1) |
| `aimsUsername` | VARCHAR(255) | NULLABLE | AIMS login username |
| `aimsPasswordEnc` | TEXT | NULLABLE | Encrypted AIMS password |
| `settings` | JSONB | DEFAULT '{}' | Company-level settings |
| `isActive` | BOOLEAN | DEFAULT true | Soft delete flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary Key: `id`
- Unique: `aimsCompanyCode` (when not null)

---

### Store

A physical location or branch belonging to a company.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `companyId` | UUID | FK → Company.id | Parent company |
| `name` | VARCHAR(255) | NOT NULL | Store display name |
| `storeNumber` | VARCHAR(100) | NOT NULL | AIMS store number |
| `timezone` | VARCHAR(100) | DEFAULT 'UTC' | Store timezone |
| `settings` | JSONB | DEFAULT '{}' | Store-level settings |
| `isActive` | BOOLEAN | DEFAULT true | Soft delete flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary Key: `id`
- Unique: `(companyId, storeNumber)`
- Foreign Key: `companyId` → `Company.id`

---

### User

Application user account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `passwordHash` | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| `firstName` | VARCHAR(100) | NULLABLE | First name |
| `lastName` | VARCHAR(100) | NULLABLE | Last name |
| `globalRole` | VARCHAR(50) | NULLABLE | Platform-wide role |
| `isActive` | BOOLEAN | DEFAULT true | Account active flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Global Roles:**
- `PLATFORM_ADMIN`: Full system access (super admin)
- `NULL`: Regular user (access via UserCompany/UserStore)

**Indexes:**
- Primary Key: `id`
- Unique: `email`

---

### UserCompany

Junction table for User ↔ Company many-to-many relationship.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `userId` | UUID | FK → User.id | User reference |
| `companyId` | UUID | FK → Company.id | Company reference |
| `role` | VARCHAR(50) | NOT NULL | Company-level role |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Company Roles:**
- `COMPANY_ADMIN`: Manage all stores and users in company
- `VIEWER`: Read-only access to company data

**Indexes:**
- Primary Key: `id`
- Unique: `(userId, companyId)`

---

### UserStore

Junction table for User ↔ Store many-to-many relationship with granular permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `userId` | UUID | FK → User.id | User reference |
| `storeId` | UUID | FK → Store.id | Store reference |
| `role` | VARCHAR(50) | NOT NULL | Store-level role |
| `features` | JSONB | DEFAULT '["dashboard"]' | Allowed feature list |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Store Roles:**

| Role | Description |
|------|-------------|
| `STORE_ADMIN` | Full store access including user management |
| `STORE_MANAGER` | CRUD operations, sync triggers |
| `STORE_EMPLOYEE` | Limited to assigned items |
| `STORE_VIEWER` | Read-only access |

**Features Array Example:**
```json
["dashboard", "spaces", "people", "conference", "labels", "settings"]
```

---

### Space

A room, desk, or location entity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `storeId` | UUID | FK → Store.id | Parent store |
| `externalId` | VARCHAR(255) | NULLABLE | External system ID |
| `labelCode` | VARCHAR(100) | NULLABLE | Assigned ESL label |
| `data` | JSONB | NOT NULL, DEFAULT '{}' | Dynamic fields |
| `syncStatus` | VARCHAR(50) | DEFAULT 'PENDING' | Sync state |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Sync Status Values:**
- `PENDING`: Awaiting sync
- `SYNCED`: Successfully synced
- `ERROR`: Sync failed

**Data JSONB Example:**
```json
{
    "name": "Conference Room A",
    "floor": "3",
    "capacity": "10",
    "department": "Engineering"
}
```

---

### Person

An employee or personnel entry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `storeId` | UUID | FK → Store.id | Parent store |
| `externalId` | VARCHAR(255) | NULLABLE | Employee ID |
| `data` | JSONB | NOT NULL, DEFAULT '{}' | Dynamic fields |
| `assignedSpaceId` | UUID | FK → Space.id | Assigned location |
| `syncStatus` | VARCHAR(50) | DEFAULT 'PENDING' | Sync state |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

---

### ConferenceRoom

A meeting room entity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `storeId` | UUID | FK → Store.id | Parent store |
| `roomName` | VARCHAR(255) | NOT NULL | Display name |
| `labelCode` | VARCHAR(100) | NULLABLE | Assigned ESL label |
| `hasMeeting` | BOOLEAN | DEFAULT false | Current meeting status |
| `meetingName` | VARCHAR(255) | NULLABLE | Active meeting name |
| `startTime` | VARCHAR(10) | NULLABLE | Meeting start (HH:mm) |
| `endTime` | VARCHAR(10) | NULLABLE | Meeting end (HH:mm) |
| `participants` | JSONB | DEFAULT '[]' | Attendee list |
| `data` | JSONB | DEFAULT '{}' | Additional fields |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updatedAt` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

---

### RefreshToken

JWT refresh token storage for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `userId` | UUID | FK → User.id | Token owner |
| `tokenHash` | VARCHAR(255) | NOT NULL | bcrypt hash of token |
| `expiresAt` | TIMESTAMP | NOT NULL | Expiration time |
| `revoked` | BOOLEAN | DEFAULT false | Revocation flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

---

### VerificationCode

Temporary codes for 2FA and password reset.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `userId` | UUID | FK → User.id | Code owner |
| `code` | VARCHAR(10) | NOT NULL | 6-digit code |
| `type` | VARCHAR(50) | NOT NULL | Code purpose |
| `expiresAt` | TIMESTAMP | NOT NULL | Expiration time |
| `used` | BOOLEAN | DEFAULT false | Usage flag |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Code Types:**
- `LOGIN_2FA`: Two-factor authentication
- `PASSWORD_RESET`: Password reset flow

---

### SyncQueueItem

Queue for asynchronous synchronization with SoluM AIMS.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `storeId` | UUID | FK → Store.id | Target store |
| `entityType` | VARCHAR(50) | NOT NULL | Entity category |
| `entityId` | VARCHAR(255) | NULLABLE | Specific entity ID |
| `action` | VARCHAR(50) | NOT NULL | Operation type |
| `payload` | JSONB | NOT NULL | Data to sync |
| `status` | VARCHAR(50) | DEFAULT 'PENDING' | Queue status |
| `attempts` | INT | DEFAULT 0 | Retry count |
| `maxAttempts` | INT | DEFAULT 5 | Max retries |
| `errorMessage` | TEXT | NULLABLE | Last error |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `processedAt` | TIMESTAMP | NULLABLE | Completion time |

**Entity Types:** `spaces`, `people`, `conference`, `ALL`

**Actions:** `CREATE`, `UPDATE`, `DELETE`, `SYNC_FULL`

**Status Values:**
- `PENDING`: Awaiting processing
- `PROCESSING`: Currently syncing
- `COMPLETED`: Successfully synced
- `FAILED`: All retries exhausted

---

### AuditLog

Action logging for compliance and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid | Unique identifier |
| `userId` | UUID | FK → User.id | Acting user |
| `storeId` | UUID | FK → Store.id | Target store |
| `action` | VARCHAR(100) | NOT NULL | Action name |
| `entityType` | VARCHAR(100) | NULLABLE | Affected entity type |
| `entityId` | VARCHAR(255) | NULLABLE | Affected entity ID |
| `oldData` | JSONB | NULLABLE | Previous state |
| `newData` | JSONB | NULLABLE | New state |
| `ipAddress` | VARCHAR(50) | NULLABLE | Client IP |
| `createdAt` | TIMESTAMP | DEFAULT NOW() | Action timestamp |

---

## Data Isolation Query Pattern

All data queries MUST include store-level filtering:

```sql
-- Example: Get spaces for authenticated user
SELECT * FROM "Space"
WHERE "storeId" IN (
    SELECT "storeId" FROM "UserStore"
    WHERE "userId" = $currentUserId
)
ORDER BY "createdAt" DESC;
```

This ensures users can only access data from stores they have permission to view.

---

## Migration Commands

```bash
# Generate migration from schema changes
npx prisma migrate dev --name <migration_name>

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```
