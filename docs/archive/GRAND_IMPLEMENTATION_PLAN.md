# 🏗️ Grand Unified Implementation Plan
## ElectisSpace - Backend-First Architecture with Complete Permission Management

**Created:** February 2, 2026  
**Status:** ✅ Complete  
**Current Phase:** All Phases Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Vision](#architecture-vision)
3. [Permission Hierarchy](#permission-hierarchy)
4. [Data Model](#data-model)
5. [Implementation Phases](#implementation-phases)
   - [Phase 0: Database Schema Updates](#phase-0-database-schema-updates)
   - [Phase 1: Backend API Foundation](#phase-1-backend-api-foundation)
   - [Phase 2: Backend Sync Infrastructure](#phase-2-backend-sync-infrastructure)
   - [Phase 3: Frontend Permission Context](#phase-3-frontend-permission-context)
   - [Phase 4: Frontend Admin UI](#phase-4-frontend-admin-ui)
   - [Phase 5: Frontend Backend Sync Migration](#phase-5-frontend-backend-sync-migration)
   - [Phase 6: Testing & Refinement](#phase-6-testing--refinement)
6. [API Routes Reference](#api-routes-reference)
7. [File Structure](#file-structure)
8. [Timeline Summary](#timeline-summary)
9. [Progress Log](#progress-log)

---

## Executive Summary

This plan unifies three major system improvements:

1. **Backend-Mediated Sync** - All AIMS operations flow through backend DB (source of truth)
2. **Complete Permission Management** - Company, Store, and User management with proper hierarchy
3. **Scoped AIMS Access** - Users only see companies/stores they have access to

### Key Changes from Current State

| Aspect | Current | Target |
|--------|---------|--------|
| **AIMS Sync** | Frontend → AIMS direct | Frontend → Backend → AIMS |
| **Data Source** | AIMS is source of truth | Backend DB is source of truth |
| **User Management** | Basic store assignment | Full company/store hierarchy |
| **Company Management** | No UI | Full CRUD with AIMS config |
| **Store Management** | Limited | Full CRUD per company |

---

## Architecture Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND APP                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         User Context                                 │    │
│  │   • Sees only assigned Companies                                     │    │
│  │   • Sees only assigned Stores (all or specific)                     │    │
│  │   • Permissions scoped by CompanyRole + StoreRole                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Company/Store Selector                            │    │
│  │   • Switch between companies (if multi-company user)                │    │
│  │   • Switch between stores within company                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ All API calls include:
                                     │ - Auth Token
                                     │ - Selected CompanyId
                                     │ - Selected StoreId
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Permission Middleware                             │    │
│  │   • Validates user has access to requested Company                  │    │
│  │   • Validates user has access to requested Store                    │    │
│  │   • Checks role-based permissions for action                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     PostgreSQL (Source of Truth)                     │    │
│  │   Companies ─┬─ Stores ─┬─ Spaces                                   │    │
│  │              │          ├─ People                                    │    │
│  │              │          ├─ Conference Rooms                          │    │
│  │              │          ├─ People Lists                              │    │
│  │              │          └─ SyncQueue                                 │    │
│  │              │                                                       │    │
│  │   Users ─────┼─ UserCompany (role per company)                      │    │
│  │              └─ UserStore (role + features per store)               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Sync Service (Background)                       │    │
│  │   • Processes SyncQueue items                                        │    │
│  │   • Pushes changes to AIMS                                          │    │
│  │   • Pulls updates from AIMS periodically                            │    │
│  │   • Handles retries with exponential backoff                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Server-to-Server
                                     │ (Credentials stored per Company)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SoluM AIMS Cloud                                  │
│   • Receives article updates from Backend                                   │
│   • Serves article data on sync pull                                        │
│   • Manages physical ESL labels                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Permission Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERMISSION HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM_ADMIN (Global Role)                                               │
│  ├── Can create/manage Companies                                            │
│  ├── Can configure AIMS credentials for any Company                         │
│  ├── Can create/promote COMPANY_ADMINs                                      │
│  ├── Can create/promote PLATFORM_ADMINs (elevated action)                  │
│  └── Full access to all Stores in all Companies                            │
│                                                                              │
│  COMPANY_ADMIN (Company Role)                                               │
│  ├── Can manage Stores within their Company                                 │
│  ├── Can configure AIMS credentials for their Company                       │
│  ├── Can create/assign users to Stores in their Company                    │
│  ├── Can promote users to STORE_ADMIN within their Company                 │
│  └── Access to ALL Stores in their Company (automatic)                     │
│                                                                              │
│  STORE_ADMIN (Store Role)                                                   │
│  ├── Can manage data in their Store(s)                                      │
│  ├── Can create/assign users to their Store(s)                             │
│  ├── Can assign roles up to STORE_MANAGER in their Store                   │
│  └── Cannot access other Stores unless explicitly assigned                  │
│                                                                              │
│  STORE_MANAGER (Store Role)                                                 │
│  ├── Can manage Spaces, People, Conference Rooms                           │
│  ├── Can trigger sync operations                                            │
│  └── Cannot manage users or settings                                        │
│                                                                              │
│  STORE_EMPLOYEE (Store Role)                                                │
│  ├── Can view and edit assigned data                                        │
│  └── Limited feature access based on assignment                             │
│                                                                              │
│  STORE_VIEWER (Store Role)                                                  │
│  └── Read-only access to assigned features                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Company & Store Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPANY                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  • name          : "Electis Medical Center"                                 │
│  • code          : "EMC" (3+ capital letters, AIMS unique identifier)       │
│  • location      : "Tel Aviv, Israel"                                       │
│  • description   : "Main medical facility for dental services"              │
│  • aimsBaseUrl   : "https://api.solumesl.com"                              │
│  • aimsUsername  : "admin@electis.com"                                      │
│  • aimsPassword  : [encrypted]                                              │
│                                                                              │
│  └── STORES                                                                  │
│      ├── Store { name: "Main Building", code: "01" }                        │
│      ├── Store { name: "North Wing", code: "02" }                           │
│      └── Store { name: "Emergency Center", code: "200" }                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation Rules

| Entity | Field | Validation | Example |
|--------|-------|------------|---------|
| Company | `code` | 3+ uppercase letters, unique globally | "EMC", "ABCD" |
| Company | `name` | Required, 1-100 chars | "Electis Medical Center" |
| Company | `location` | Optional, max 255 chars | "Tel Aviv, Israel" |
| Store | `code` | Numeric string, 1-10 chars, unique within company | "01", "002", "200" |
| Store | `name` | Required, 1-100 chars | "Main Building" |
| User | `email` | Valid email, unique globally | "user@company.com" |

---

## Implementation Phases

### Phase 0: Database Schema Updates

**Status:** ✅ Completed  
**Duration:** 3 days  
**Completed:** February 2, 2026  
**Goal:** Prepare database for new features

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 0.1 | Update Company model with location, description fields | ✅ Complete |
| 0.2 | Add `allStoresAccess` boolean to `UserCompany` | ✅ Complete |
| 0.3 | Add `activeCompanyId` and `activeStoreId` to `User` | ✅ Complete |
| 0.4 | Add `syncEnabled` boolean to `Store` | ✅ Complete |
| 0.5 | Add `lastAimsSyncAt` timestamp to `Store` | ✅ Complete |
| 0.6 | Rename `storeNumber` to `code` in Store, `aimsCompanyCode` to `code` in Company | ✅ Complete |
| 0.7 | Create and run migration | ✅ Complete |

#### Schema Changes

```prisma
model Company {
  id              String   @id @default(uuid())
  
  // Company Identity
  name            String   @db.VarChar(100)
  code            String   @unique @db.VarChar(20)  // 3+ capital letters, AIMS unique
  location        String?  @db.VarChar(255)
  description     String?  @db.Text
  
  // AIMS API Configuration (encrypted in application layer)
  aimsBaseUrl     String?  @map("aims_base_url") @db.VarChar(255)
  aimsCluster     String?  @map("aims_cluster") @db.VarChar(50)
  aimsUsername    String?  @map("aims_username") @db.VarChar(255)
  aimsPasswordEnc String?  @map("aims_password_enc") @db.Text
  
  // Status & Settings
  settings        Json     @default("{}")
  isActive        Boolean  @default(true) @map("is_active")
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  stores          Store[]
  userCompanies   UserCompany[]
  
  @@map("companies")
}

model Store {
  id          String   @id @default(uuid())
  companyId   String   @map("company_id")
  
  // Store Identity
  name        String   @db.VarChar(100)
  code        String   @db.VarChar(10)  // "01", "002", "200"
  
  // Store-specific settings
  settings    Json     @default("{}")
  timezone    String   @default("UTC") @db.VarChar(50)
  syncEnabled Boolean  @default(true) @map("sync_enabled")
  lastAimsSyncAt DateTime? @map("last_aims_sync_at")
  isActive    Boolean  @default(true) @map("is_active")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  company         Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  // ... other relations
  
  @@unique([companyId, code])
  @@index([companyId])
  @@map("stores")
}

model UserCompany {
  id              String      @id @default(uuid())
  userId          String      @map("user_id")
  companyId       String      @map("company_id")
  role            CompanyRole @default(VIEWER)
  allStoresAccess Boolean     @default(false) @map("all_stores_access")
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([userId, companyId])
  @@map("user_companies")
}

model User {
  // ... existing fields
  activeCompanyId String? @map("active_company_id")
  activeStoreId   String? @map("active_store_id")
}
```

---

### Phase 1: Backend API Foundation

**Status:** ✅ Completed  
**Duration:** 1 day  
**Completed:** February 2, 2026  
**Goal:** Complete backend APIs for company/store/user management

#### 1.1 Company Management Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/companies` | Create company | PLATFORM_ADMIN |
| GET | `/api/companies` | List accessible companies | Authenticated |
| GET | `/api/companies/:id` | Get company details | Company access |
| PATCH | `/api/companies/:id` | Update company | COMPANY_ADMIN+ |
| PATCH | `/api/companies/:id/aims` | Update AIMS config | COMPANY_ADMIN+ |
| DELETE | `/api/companies/:id` | Delete company | PLATFORM_ADMIN |
| GET | `/api/companies/validate-code/:code` | Validate code uniqueness | Authenticated |

#### 1.2 Store Management Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/companies/:companyId/stores` | Create store | COMPANY_ADMIN+ |
| GET | `/api/companies/:companyId/stores` | List stores | Company access |
| GET | `/api/stores/:id` | Get store details | Store access |
| PATCH | `/api/stores/:id` | Update store | STORE_ADMIN+ |
| DELETE | `/api/stores/:id` | Delete store | COMPANY_ADMIN+ |
| GET | `/api/companies/:cid/stores/validate-code/:code` | Validate code | Authenticated |

#### 1.3 User Management Routes (Enhanced)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users` | Create user with company/store (inline creation) | Admin |
| GET | `/api/users/:id` | Get user with assignments | Admin |
| GET | `/api/users/:id/companies` | Get user's company assignments | Admin |
| POST | `/api/users/:id/companies` | Add to company (inline creation) | COMPANY_ADMIN+ |
| PATCH | `/api/users/:id/companies/:companyId` | Update company assignment | COMPANY_ADMIN+ |
| DELETE | `/api/users/:id/companies/:companyId` | Remove from company | COMPANY_ADMIN+ |
| PATCH | `/api/users/:id/stores/:storeId` | Update store role | STORE_ADMIN+ |
| POST | `/api/users/:id/stores` | Add to store | STORE_ADMIN+ |
| DELETE | `/api/users/:id/stores/:storeId` | Remove from store | STORE_ADMIN+ |
| POST | `/api/users/:id/elevate` | Elevate user role | PLATFORM_ADMIN |

#### 1.4 Context Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/me/context` | Get current user's full context | Authenticated |
| PATCH | `/api/users/me/context` | Set active company/store | Authenticated |

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Create companies feature folder structure | ✅ Complete |
| 1.2 | Implement company CRUD routes | ✅ Complete |
| 1.3 | Create stores feature folder structure | ✅ Complete |
| 1.4 | Implement store CRUD routes | ✅ Complete |
| 1.5 | Enhance user routes for company/store assignment | ✅ Complete |
| 1.6 | Implement user elevation endpoint | ✅ Complete |
| 1.7 | Implement context routes | ✅ Complete |
| 1.8 | Add permission middleware for new routes | ✅ Complete |
| 1.9 | Register routes in app.ts | ✅ Complete |
| 1.10 | Update field references (storeNumber → code, aimsCompanyCode → code) | ✅ Complete |

---

### Phase 2: Backend Sync Infrastructure

**Status:** ✅ Completed  
**Duration:** 1 day  
**Completed:** February 2, 2026  
**Goal:** All AIMS operations flow through backend

#### 2.1 Data Sync Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/stores/:storeId/pull` | Pull from AIMS → Save to DB |
| POST | `/api/sync/stores/:storeId/push` | Push DB changes → AIMS |
| GET | `/api/sync/stores/:storeId/status` | Get sync queue status |
| POST | `/api/sync/stores/:storeId/retry/:itemId` | Retry failed item |

#### 2.2 Entity CRUD Routes

| Entity | Endpoints | Flow |
|--------|-----------|------|
| Spaces | CRUD `/api/spaces` | DB → Queue → AIMS |
| People | CRUD `/api/people` | DB → Queue → AIMS |
| Conference | CRUD `/api/conference` | DB → Queue → AIMS |
| Lists | CRUD `/api/people-lists` | DB only |

#### 2.3 Sync Queue Processor

Background job that:
1. Gets pending items older than 5 seconds
2. Authenticates with AIMS using company credentials (via AIMS Gateway)
3. Executes action (create/update/delete article)
4. Marks as COMPLETED or FAILED (with exponential backoff retry)
5. Updates `store.lastAimsSyncAt`

**Implementation Files:**
- `server/src/shared/infrastructure/services/aimsGateway.ts` - AIMS credential management & API wrapper
- `server/src/shared/infrastructure/services/syncQueueService.ts` - Queue helper for entity CRUD
- `server/src/shared/infrastructure/jobs/SyncQueueProcessor.ts` - Background processor

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Implement sync routes | ✅ Complete |
| 2.2 | Update entity CRUD routes (spaces) with sync queue | ✅ Complete |
| 2.3 | Update entity CRUD routes (people) with sync queue | ✅ Complete |
| 2.4 | Update entity CRUD routes (conference) with sync queue | ✅ Complete |
| 2.5 | Entity CRUD routes (lists) - already exists | ✅ Complete |
| 2.6 | Implement SyncQueueProcessor | ✅ Complete |
| 2.7 | Add AIMS gateway service | ✅ Complete |
| 2.8 | Implement pull from AIMS logic | ✅ Complete |

---

### Phase 3: Frontend Permission Context

**Status:** ✅ Completed  
**Duration:** 1 day  
**Completed:** February 2, 2026  
**Goal:** Frontend understands and respects user permissions

#### Implementation Details

**Files Created:**
- `src/features/auth/application/permissionHelpers.ts` - Role hierarchy & permission check functions
- `src/features/auth/application/useAuthContext.ts` - Enhanced auth context hook
- `src/features/auth/presentation/CompanyStoreSelector.tsx` - Company/Store switcher component
- `src/features/auth/presentation/ProtectedFeature.tsx` - Permission-based conditional rendering

**Files Modified:**
- `src/shared/infrastructure/services/authService.ts` - Updated types, added `updateContext()` method
- `src/features/auth/infrastructure/authStore.ts` - Added context state & switching actions
- `src/features/auth/index.ts` - Re-exported new components and hooks

**Key Features:**
- Complete permission hierarchy (PLATFORM_ADMIN → COMPANY_ADMIN → STORE_ADMIN → STORE_MANAGER → STORE_EMPLOYEE → STORE_VIEWER)
- Feature-based permission checking (dashboard, spaces, conference, people, sync, settings, labels)
- Active company/store context persistence in Zustand with persist middleware
- `useAuthContext` hook provides memoized permission checks and context switching
- `ProtectedFeature` component for declarative permission-based rendering
- `CompanyStoreSelector` dropdown for switching context with role badges

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Create enhanced useAuthContext hook | ✅ Complete |
| 3.2 | Create Company/Store selector component | ✅ Complete |
| 3.3 | Create ProtectedFeature component | ✅ Complete |
| 3.4 | Update authStore with company/store context | ✅ Complete |
| 3.5 | Add permission helpers | ✅ Complete |

---

### Phase 4: Frontend Admin UI

**Status:** ✅ Completed  
**Duration:** 1 day  
**Completed:** February 2, 2026  
**Goal:** Complete UI for all management tasks

#### Implementation Details

**Files Created:**
- `src/shared/infrastructure/services/companyService.ts` - API client for company/store CRUD
- `src/features/settings/presentation/CompaniesTab.tsx` - Companies management tab (PLATFORM_ADMIN)
- `src/features/settings/presentation/CompanyDialog.tsx` - Create/edit company dialog
- `src/features/settings/presentation/StoresDialog.tsx` - Stores management dialog per company
- `src/features/settings/presentation/StoreDialog.tsx` - Create/edit store dialog
- `src/features/settings/presentation/CompanySelector.tsx` - Company selection with inline creation
- `src/features/settings/presentation/StoreAssignment.tsx` - Store assignment with roles/features
- `src/features/settings/presentation/ElevateUserDialog.tsx` - Elevate user to PLATFORM_ADMIN
- `src/features/settings/presentation/EnhancedUserDialog.tsx` - New multi-step user creation

**Files Modified:**
- `src/features/settings/presentation/SettingsDialog.tsx` - Added CompaniesTab for PLATFORM_ADMIN
- `src/features/settings/presentation/UsersSettingsTab.tsx` - Search, company filter, elevate button

**Key Features:**
- Full company CRUD with AIMS configuration
- Store management per company with sync settings
- Multi-step user creation with company/store assignments
- User elevation to PLATFORM_ADMIN with confirmation
- Search and company filtering in users list

#### 4.1 User Dialog Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN: CREATE USER FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: Basic User Info                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Email: ________________  First Name: ____________                   │    │
│  │  Password: ______________  Last Name: _____________                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  Step 2: Company Assignment                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ○ Select Existing Company                                           │    │
│  │    [Dropdown: Company List]                                          │    │
│  │                                                                      │    │
│  │  ○ Create New Company                                                │    │
│  │    Code*: [ABC] (3+ capital letters)                                 │    │
│  │    Name*: [____________________________]                             │    │
│  │    Location: [____________________________]                          │    │
│  │    Description: [____________________________]                       │    │
│  │                                                                      │    │
│  │  Company Role: [COMPANY_ADMIN ▼] / [VIEWER ▼]                       │    │
│  │  ☑ Access to all stores in company                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  Step 3: Store Assignment (if not "all stores")                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Select Stores & Roles:                                              │    │
│  │  ☑ [01] Main Building      Role: [STORE_ADMIN ▼]                    │    │
│  │      Features: ☑Dashboard ☑Spaces ☑Conference ☑People               │    │
│  │  ☐ [02] North Wing         Role: [STORE_VIEWER ▼]                   │    │
│  │                                                                      │    │
│  │  [+ Add Store to Company]                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                              [Create User]                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Create CompaniesTab (PLATFORM_ADMIN) | ✅ Complete |
| 4.2 | Create CompanyDialog (create/edit company) | ✅ Complete |
| 4.3 | Create StoresTab (per company) | ✅ Complete |
| 4.4 | Create StoreDialog (create/edit store) | ✅ Complete |
| 4.5 | Enhance UserDialog with company selector | ✅ Complete |
| 4.6 | Create CompanySelector component | ✅ Complete |
| 4.7 | Create StoreAssignment component | ✅ Complete |
| 4.8 | Create ElevateUserDialog | ✅ Complete |
| 4.9 | Update UsersSettingsTab | ✅ Complete |

---

### Phase 5: Frontend Backend Sync Migration

**Status:** ✅ Complete  
**Duration:** 1 week  
**Goal:** Frontend uses backend as data source instead of direct AIMS

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Create API service layer (spacesApi, peopleApi, etc.) | ✅ Complete |
| 5.2 | Update useSyncController to use backend | ✅ Complete |
| 5.3 | Remove/deprecate direct AIMS calls | ✅ Complete |
| 5.4 | Add sync status indicators | ✅ Complete |
| 5.5 | Implement offline queue (local) | ✅ Complete |

---

### Phase 6: Testing & Refinement

**Status:** ✅ Completed  
**Duration:** 1 week  
**Goal:** Ensure quality and reliability

#### Tasks

| Task | Description | Status |
|------|-------------|--------|
| 6.1 | End-to-end permission testing | ✅ Completed |
| 6.2 | Sync reliability testing | ✅ Completed |
| 6.3 | Multi-company/store scenarios | ✅ Completed |
| 6.4 | Performance testing | ✅ Completed |
| 6.5 | UI/UX refinement | ✅ Completed |

---

## API Routes Reference

### Companies

```
POST   /api/companies                    Create company
GET    /api/companies                    List accessible companies
GET    /api/companies/:id                Get company details
PATCH  /api/companies/:id                Update company
PATCH  /api/companies/:id/aims           Update AIMS configuration
DELETE /api/companies/:id                Delete company
GET    /api/companies/validate-code/:code Validate code uniqueness
```

### Stores

```
POST   /api/companies/:companyId/stores           Create store
GET    /api/companies/:companyId/stores           List stores
GET    /api/stores/:id                            Get store details
PATCH  /api/stores/:id                            Update store
DELETE /api/stores/:id                            Delete store
GET    /api/companies/:cid/stores/validate-code/:code Validate code
```

### Users

```
POST   /api/users                           Create user with assignments
GET    /api/users/:id                       Get user with all assignments
PATCH  /api/users/:id/companies/:companyId  Update company role
POST   /api/users/:id/companies             Add user to company
DELETE /api/users/:id/companies/:companyId  Remove from company
PATCH  /api/users/:id/stores/:storeId       Update store role/features
POST   /api/users/:id/stores                Add user to store
DELETE /api/users/:id/stores/:storeId       Remove from store
POST   /api/users/:id/elevate               Elevate user role
```

### Context

```
GET    /api/me/context                      Get current user's full context
PATCH  /api/me/context                      Set active company/store
```

### Sync

```
POST   /api/stores/:storeId/sync/pull           Pull from AIMS
POST   /api/stores/:storeId/sync/push           Push to AIMS
GET    /api/stores/:storeId/sync/status         Get sync status
POST   /api/stores/:storeId/sync/retry/:itemId  Retry failed sync
```

### Entities

```
# Spaces
GET    /api/stores/:storeId/spaces              List spaces
POST   /api/stores/:storeId/spaces              Create space
PATCH  /api/stores/:storeId/spaces/:id          Update space
DELETE /api/stores/:storeId/spaces/:id          Delete space

# People
GET    /api/stores/:storeId/people              List people
POST   /api/stores/:storeId/people              Create person
PATCH  /api/stores/:storeId/people/:id          Update person
DELETE /api/stores/:storeId/people/:id          Delete person

# Conference Rooms
GET    /api/stores/:storeId/conference-rooms    List rooms
POST   /api/stores/:storeId/conference-rooms    Create room
PATCH  /api/stores/:storeId/conference-rooms/:id Update room
DELETE /api/stores/:storeId/conference-rooms/:id Delete room

# People Lists
GET    /api/stores/:storeId/people-lists        List
POST   /api/stores/:storeId/people-lists        Create
PATCH  /api/stores/:storeId/people-lists/:id    Update
DELETE /api/stores/:storeId/people-lists/:id    Delete
```

---

## File Structure

### New/Modified Files

```
server/src/
├── features/
│   ├── companies/                    # NEW
│   │   ├── routes.ts
│   │   ├── companiesController.ts
│   │   └── companiesService.ts
│   ├── stores/                       # NEW
│   │   ├── routes.ts
│   │   ├── storesController.ts
│   │   └── storesService.ts
│   ├── users/
│   │   ├── routes.ts                 # ENHANCED
│   │   └── userAssignmentService.ts  # NEW
│   ├── sync/
│   │   ├── routes.ts                 # ENHANCED
│   │   ├── syncController.ts         # ENHANCED
│   │   ├── syncQueueProcessor.ts     # NEW
│   │   └── aimsGateway.ts            # NEW
│   └── entities/                     # NEW
│       ├── spacesRoutes.ts
│       ├── peopleRoutes.ts
│       └── conferenceRoutes.ts
├── shared/
│   └── middleware/
│       └── permissionMiddleware.ts   # ENHANCED

src/
├── features/
│   ├── auth/
│   │   ├── application/
│   │   │   └── useAuthContext.ts     # NEW
│   │   └── presentation/
│   │       └── ContextSelector.tsx   # NEW
│   └── settings/
│       └── presentation/
│           ├── CompaniesTab.tsx      # NEW
│           ├── StoresTab.tsx         # NEW
│           ├── UsersSettingsTab.tsx  # ENHANCED
│           ├── UserDialog.tsx        # ENHANCED
│           ├── CompanySelector.tsx   # NEW
│           ├── StoreAssignment.tsx   # NEW
│           └── ElevateUserDialog.tsx # NEW
├── shared/
│   ├── infrastructure/
│   │   └── services/
│   │       └── api/                  # NEW
│   │           ├── baseApi.ts
│   │           ├── spacesApi.ts
│   │           ├── peopleApi.ts
│   │           ├── conferenceApi.ts
│   │           └── syncApi.ts
│   └── presentation/
│       └── components/
│           └── ProtectedFeature.tsx  # NEW
```

---

## Timeline Summary

| Phase | Duration | Status | Milestone |
|-------|----------|--------|-----------|
| **Phase 0** | 3 days | ✅ Completed | Database ready |
| **Phase 1** | 1 day | ✅ Completed | Backend APIs complete |
| **Phase 2** | 1 week | ✅ Completed | Sync infrastructure complete |
| **Phase 3** | 1 week | ✅ Completed | Frontend permission context |
| **Phase 4** | 1.5 weeks | ✅ Completed | Admin UI complete |
| **Phase 5** | 1 week | ✅ Completed | Frontend migrated to backend sync |
| **Phase 6** | 1 week | ✅ Completed | Testing & polish |
| **Total** | **~6 weeks** | ✅ Complete | Full implementation |

---

## Progress Log

### February 2, 2026 (Session 3) - Phase 6 Complete 🎉

- ✅ **Phase 6 Completed - Testing & Refinement:**
  - **6.1 Permission Testing:**
    - Created `src/test/utils/permissionTestUtils.ts` - Mock factories and test scenarios
    - Created `src/test/permissions.test.ts` - Comprehensive permission system tests
    - 7 predefined test scenarios covering all permission levels
  
  - **6.2 Sync Reliability Testing:**
    - Created `src/test/utils/syncTestUtils.ts` - Sync test utilities
    - Created `src/test/sync.test.ts` - MSW-mocked sync integration tests
    - Stress tests for concurrent requests and repeated sync operations
  
  - **6.3 Multi-Company/Store Testing:**
    - Created `src/test/multiCompany.test.ts`
    - Data isolation tests between companies
    - Cross-company permission tests
    - Platform admin override scenarios
  
  - **6.4 Performance Testing:**
    - Created `src/test/utils/performanceTestUtils.ts` - Benchmarking utilities
    - Created `src/test/performance.test.ts` - Performance benchmark tests
    - Timing, memory, and threshold utilities
  
  - **6.5 UI/UX Refinement:**
    - Created `src/shared/presentation/styles/designTokens.ts` - Design system tokens
    - Created `src/shared/presentation/components/transitions/TransitionComponents.tsx`
    - Created `src/shared/presentation/components/EnhancedTooltip.tsx`
    - Created `src/shared/presentation/components/StatusBadge.tsx`
    - Created `src/shared/presentation/components/patterns/UIPatterns.tsx`
    - Created `src/shared/presentation/hooks/useAccessibility.ts` - A11y hooks
    - Created `src/test/uiRefinement.test.ts` - UI refinement tests

- 🎉 **ALL PHASES COMPLETE - Grand Implementation Plan Finished!**

### February 2, 2026

- ✅ Created Grand Implementation Plan document
- ✅ **Phase 0 Completed:**
  - Updated `Company` model: renamed `aimsCompanyCode` → `code`, added `location`, `description`
  - Updated `Store` model: renamed `storeNumber` → `code`, added `syncEnabled`, `lastAimsSyncAt`
  - Updated `User` model: added `activeCompanyId`, `activeStoreId`
  - Updated `UserCompany` model: added `allStoresAccess`
  - Created and applied migration `20260202_grand_plan_phase0`
  - Regenerated Prisma client

- ✅ **Phase 1 Completed:**
  - Created `server/src/features/companies/routes.ts` - Full company CRUD with AIMS config
  - Created `server/src/features/stores/routes.ts` - Full store CRUD per company
  - Enhanced `server/src/features/users/routes.ts`:
    - Added inline company/store creation during user creation
    - Added company assignment endpoints (GET/POST/PATCH/DELETE `/users/:id/companies`)
    - Added user elevation endpoint (POST `/users/:id/elevate`)
    - Added context routes (GET/PATCH `/users/me/context`)
  - Registered new routes in `app.ts`
  - Updated all field references:
    - `storeNumber` → `code` in Store model and all routes
    - `aimsCompanyCode` → `code` in Company model and all routes
  - Updated `solumService.ts`: `storeNumber` → `storeCode`
  - Updated seed file with new field names

- 🔄 Ready for Phase 2: Backend Sync Infrastructure

---

*Last Updated: February 2, 2026*
