# Enhanced Permissions & Multi-Store System Design

> **Created:** January 25, 2026  
> **Purpose:** Design document for enhanced user permissions system with AIMS company and store linkage  
> **Status:** Design Draft

---

## Executive Summary

This document outlines the enhancement of the electisSpace permissions system to support:
- **Multi-company management**: Users can belong to multiple AIMS companies
- **Multi-store access**: Fine-grained permissions at the store level
- **Role-based operations**: Different user roles with specific capabilities
- **Store-level isolation**: Data segregation between stores

---

## 1. Enhanced Role Structure

### 1.1 New Role Hierarchy

```typescript
enum UserRole {
  // Global Roles (across all companies)
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',        // Full system access
  
  // Company Roles
  COMPANY_ADMIN = 'COMPANY_ADMIN',          // Manage company and all stores
  
  // Store Roles
  STORE_ADMIN = 'STORE_ADMIN',              // Full store management
  STORE_MANAGER = 'STORE_MANAGER',          // Manage spaces, people, conferences
  STORE_EMPLOYEE = 'STORE_EMPLOYEE',        // Assign labels to articles only
  STORE_VIEWER = 'STORE_VIEWER'             // Read-only access
}
```

### 1.2 Permission Matrix

| Role | Users | Settings | Spaces | People | Conference | Labels | Sync | Reports |
|------|-------|----------|--------|--------|------------|--------|------|---------|
| **PLATFORM_ADMIN** | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| **COMPANY_ADMIN** | ✅ Company | ✅ Company | ✅ All Stores | ✅ All Stores | ✅ All Stores | ✅ All Stores | ✅ All Stores | ✅ Company |
| **STORE_ADMIN** | ✅ Store | ✅ Store | ✅ Store | ✅ Store | ✅ Store | ✅ Store | ✅ Store | ✅ Store |
| **STORE_MANAGER** | 👁️ Read | 👁️ Read | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ Assign | ✅ Trigger | 👁️ Read |
| **STORE_EMPLOYEE** | ❌ | ❌ | 👁️ Read | 👁️ Read | 👁️ Read | ✅ Assign Only | 👁️ View | ❌ |
| **STORE_VIEWER** | ❌ | ❌ | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ View | 👁️ Read |

### 1.3 Permission Capabilities

```typescript
type Permission = 
  // User Management
  | 'users:create' | 'users:read' | 'users:update' | 'users:delete'
  
  // Settings
  | 'settings:read' | 'settings:update'
  
  // Spaces
  | 'spaces:create' | 'spaces:read' | 'spaces:update' | 'spaces:delete'
  
  // People
  | 'people:create' | 'people:read' | 'people:update' | 'people:delete'
  | 'people:import' | 'people:export' | 'people:assign'
  
  // Conference Rooms
  | 'conference:create' | 'conference:read' | 'conference:update' | 'conference:delete'
  | 'conference:toggle'
  
  // Labels (ESL Operations)
  | 'labels:assign' | 'labels:unassign' | 'labels:update' | 'labels:read'
  
  // Sync Operations
  | 'sync:trigger' | 'sync:view' | 'sync:configure'
  
  // Reports & Audit
  | 'reports:view' | 'audit:read';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PLATFORM_ADMIN: ['*'], // All permissions
  
  COMPANY_ADMIN: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'settings:read', 'settings:update',
    'spaces:create', 'spaces:read', 'spaces:update', 'spaces:delete',
    'people:create', 'people:read', 'people:update', 'people:delete',
    'people:import', 'people:export', 'people:assign',
    'conference:create', 'conference:read', 'conference:update', 'conference:delete', 'conference:toggle',
    'labels:assign', 'labels:unassign', 'labels:update', 'labels:read',
    'sync:trigger', 'sync:view', 'sync:configure',
    'reports:view', 'audit:read'
  ],
  
  STORE_ADMIN: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'settings:read', 'settings:update',
    'spaces:create', 'spaces:read', 'spaces:update', 'spaces:delete',
    'people:create', 'people:read', 'people:update', 'people:delete',
    'people:import', 'people:export', 'people:assign',
    'conference:create', 'conference:read', 'conference:update', 'conference:delete', 'conference:toggle',
    'labels:assign', 'labels:unassign', 'labels:update', 'labels:read',
    'sync:trigger', 'sync:view', 'sync:configure',
    'reports:view', 'audit:read'
  ],
  
  STORE_MANAGER: [
    'users:read',
    'settings:read',
    'spaces:create', 'spaces:read', 'spaces:update', 'spaces:delete',
    'people:create', 'people:read', 'people:update', 'people:delete',
    'people:import', 'people:export', 'people:assign',
    'conference:create', 'conference:read', 'conference:update', 'conference:delete', 'conference:toggle',
    'labels:assign', 'labels:unassign', 'labels:update', 'labels:read',
    'sync:trigger', 'sync:view',
    'reports:view'
  ],
  
  STORE_EMPLOYEE: [
    'spaces:read',
    'people:read',
    'conference:read',
    'labels:assign',  // Only assign existing labels to articles
    'labels:read',
    'sync:view'
  ],
  
  STORE_VIEWER: [
    'spaces:read',
    'people:read',
    'conference:read',
    'labels:read',
    'sync:view',
    'reports:view'
  ]
};
```

---

## 2. Enhanced Database Schema

### 2.1 New Tables

#### Company Table
```prisma
model Company {
  id              String   @id @default(uuid())
  name            String   @db.VarChar(100)
  aimsCompanyCode String   @unique @map("aims_company_code") @db.VarChar(50)
  
  // AIMS API Configuration (encrypted)
  aimsBaseUrl     String?  @map("aims_base_url") @db.VarChar(255)
  aimsCluster     String?  @map("aims_cluster") @db.VarChar(50)
  aimsUsername    String?  @map("aims_username") @db.VarChar(255)
  aimsPasswordEnc String?  @map("aims_password_enc") @db.Text
  
  // Company settings
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
```

#### Store Table
```prisma
model Store {
  id              String   @id @default(uuid())
  companyId       String   @map("company_id")
  name            String   @db.VarChar(100)
  storeNumber     String   @map("store_number") @db.VarChar(50)
  
  // Store-specific settings
  settings        Json     @default("{}")
  timezone        String   @default("UTC") @db.VarChar(50)
  isActive        Boolean  @default(true) @map("is_active")
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  userStores      UserStore[]
  spaces          Space[]
  people          Person[]
  conferenceRooms ConferenceRoom[]
  peopleLists     PeopleList[]
  auditLogs       AuditLog[]
  syncQueue       SyncQueueItem[]
  
  @@unique([companyId, storeNumber])
  @@index([companyId])
  @@map("stores")
}
```

#### UserCompany (Many-to-Many)
```prisma
model UserCompany {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  companyId String   @map("company_id")
  role      CompanyRole @default(VIEWER)
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([userId, companyId])
  @@map("user_companies")
}

enum CompanyRole {
  COMPANY_ADMIN
  VIEWER
}
```

#### UserStore (Many-to-Many with Role)
```prisma
model UserStore {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  storeId   String   @map("store_id")
  role      StoreRole @default(STORE_VIEWER)
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, storeId])
  @@index([userId])
  @@index([storeId])
  @@map("user_stores")
}

enum StoreRole {
  STORE_ADMIN
  STORE_MANAGER
  STORE_EMPLOYEE
  STORE_VIEWER
}
```

### 2.2 Modified User Table
```prisma
model User {
  id               String   @id @default(uuid())
  email            String   @unique @db.VarChar(255)
  passwordHash     String   @map("password_hash") @db.VarChar(255)
  firstName        String?  @map("first_name") @db.VarChar(100)
  lastName         String?  @map("last_name") @db.VarChar(100)
  
  // Global role (for platform admins)
  globalRole       GlobalRole? @map("global_role")
  
  isActive         Boolean  @default(true) @map("is_active")
  lastLogin        DateTime? @map("last_login")
  
  // Timestamps
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  // Relations
  userCompanies    UserCompany[]
  userStores       UserStore[]
  refreshTokens    RefreshToken[]
  auditLogs        AuditLog[]
  createdSpaces    Space[]  @relation("SpaceCreatedBy")
  updatedSpaces    Space[]  @relation("SpaceUpdatedBy")
  createdLists     PeopleList[]
  
  @@map("users")
}

enum GlobalRole {
  PLATFORM_ADMIN
}
```

### 2.3 Modified Entity Tables

All entity tables (Space, Person, ConferenceRoom, etc.) change from `organizationId` to `storeId`:

```prisma
model Space {
  id             String   @id @default(uuid())
  storeId        String   @map("store_id")  // Changed from organizationId
  externalId     String   @map("external_id") @db.VarChar(50)
  labelCode      String?  @map("label_code") @db.VarChar(50)
  
  // ... rest of fields
  
  // Relations
  store          Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  // ... other relations
  
  @@unique([storeId, externalId])
  @@index([storeId])
  @@map("spaces")
}
```

---

## 3. Authorization Middleware

### 3.1 Permission Check Flow

```typescript
// Middleware to check permissions
async function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // From JWT middleware
    const storeId = req.params.storeId || req.body.storeId;
    
    // Check if user has permission for this store
    const hasPermission = await checkUserPermission(
      user.id,
      storeId,
      permission
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`
      });
    }
    
    next();
  };
}

async function checkUserPermission(
  userId: string,
  storeId: string,
  permission: Permission
): Promise<boolean> {
  // 1. Check if PLATFORM_ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (user.globalRole === 'PLATFORM_ADMIN') {
    return true;
  }
  
  // 2. Check company-level role
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      company: {
        include: {
          userCompanies: {
            where: { userId }
          }
        }
      }
    }
  });
  
  const userCompany = store.company.userCompanies[0];
  if (userCompany?.role === 'COMPANY_ADMIN') {
    return ROLE_PERMISSIONS['COMPANY_ADMIN'].includes(permission);
  }
  
  // 3. Check store-level role
  const userStore = await prisma.userStore.findUnique({
    where: {
      userId_storeId: { userId, storeId }
    }
  });
  
  if (!userStore) {
    return false;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userStore.role];
  return rolePermissions.includes(permission);
}
```

### 3.2 Example Route Protection

```typescript
// Create space endpoint
router.post('/api/v1/stores/:storeId/spaces',
  authenticate,
  requirePermission('spaces:create'),
  async (req, res) => {
    const { storeId } = req.params;
    const spaceData = req.body;
    
    // User has permission, proceed with creation
    const space = await prisma.space.create({
      data: {
        ...spaceData,
        storeId,
        createdById: req.user.id
      }
    });
    
    res.status(201).json(space);
  }
);

// Assign label endpoint (available to STORE_EMPLOYEE)
router.post('/api/v1/stores/:storeId/labels/assign',
  authenticate,
  requirePermission('labels:assign'),
  async (req, res) => {
    const { storeId } = req.params;
    const { labelCode, articleId } = req.body;
    
    // Queue label assignment to AIMS
    await syncQueue.add('label:assign', {
      storeId,
      labelCode,
      articleId,
      userId: req.user.id
    });
    
    res.json({ success: true });
  }
);
```

---

## 4. JWT Token Structure

### 4.1 Enhanced Token Payload

```typescript
interface AccessTokenPayload {
  sub: string;              // User ID
  email: string;
  globalRole?: 'PLATFORM_ADMIN';
  
  // Store access information
  stores: Array<{
    storeId: string;
    storeNumber: string;
    companyId: string;
    companyCode: string;
    role: StoreRole;
  }>;
  
  // Company access information
  companies: Array<{
    companyId: string;
    companyCode: string;
    role: CompanyRole;
  }>;
  
  iat: number;
  exp: number;
}
```

### 4.2 Token Generation

```typescript
async function generateAccessToken(user: User): Promise<string> {
  // Fetch user's company and store access
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId: user.id },
    include: { company: true }
  });
  
  const userStores = await prisma.userStore.findMany({
    where: { userId: user.id },
    include: {
      store: {
        include: { company: true }
      }
    }
  });
  
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    globalRole: user.globalRole,
    companies: userCompanies.map(uc => ({
      companyId: uc.company.id,
      companyCode: uc.company.aimsCompanyCode,
      role: uc.role
    })),
    stores: userStores.map(us => ({
      storeId: us.store.id,
      storeNumber: us.store.storeNumber,
      companyId: us.store.company.id,
      companyCode: us.store.company.aimsCompanyCode,
      role: us.role
    })),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60  // 15 minutes
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET);
}
```

---

## 5. API Endpoint Structure

### 5.1 New Route Organization

```
/api/v1/
  /auth
    POST   /login
    POST   /refresh
    POST   /logout
    POST   /change-password
  
  /users
    GET    /              # List all users (PLATFORM_ADMIN)
    POST   /              # Create user (PLATFORM_ADMIN)
    GET    /:userId
    PATCH  /:userId
    DELETE /:userId
  
  /companies
    GET    /              # List companies
    POST   /              # Create company (PLATFORM_ADMIN)
    GET    /:companyId
    PATCH  /:companyId
    DELETE /:companyId
    
    # Company users
    GET    /:companyId/users
    POST   /:companyId/users      # Assign user to company
    DELETE /:companyId/users/:userId
  
  /companies/:companyId/stores
    GET    /              # List stores in company
    POST   /              # Create store (COMPANY_ADMIN)
    GET    /:storeId
    PATCH  /:storeId
    DELETE /:storeId
    
    # Store users
    GET    /:storeId/users
    POST   /:storeId/users        # Assign user to store with role
    PATCH  /:storeId/users/:userId # Update user role
    DELETE /:storeId/users/:userId
  
  /stores/:storeId/
    # Spaces
    GET    /spaces
    POST   /spaces        # STORE_MANAGER+
    GET    /spaces/:spaceId
    PATCH  /spaces/:spaceId
    DELETE /spaces/:spaceId
    
    # People
    GET    /people
    POST   /people        # STORE_MANAGER+
    POST   /people/import # STORE_MANAGER+
    GET    /people/:personId
    PATCH  /people/:personId
    DELETE /people/:personId
    POST   /people/:personId/assign # STORE_MANAGER+
    
    # Conference Rooms
    GET    /conference
    POST   /conference
    GET    /conference/:roomId
    PATCH  /conference/:roomId
    DELETE /conference/:roomId
    POST   /conference/:roomId/toggle # STORE_MANAGER+
    
    # Labels (ESL Operations)
    POST   /labels/assign # STORE_EMPLOYEE+
    POST   /labels/unassign # STORE_MANAGER+
    GET    /labels
    
    # Sync
    POST   /sync/trigger  # STORE_MANAGER+
    GET    /sync/status
    GET    /sync/history
    
    # Reports
    GET    /reports/summary
    GET    /reports/audit
```

---

## 6. Migration Strategy

### 6.1 Migration Steps

```sql
-- Step 1: Create new tables
CREATE TABLE companies ( ... );
CREATE TABLE stores ( ... );
CREATE TABLE user_companies ( ... );
CREATE TABLE user_stores ( ... );

-- Step 2: Migrate existing data
-- Assuming existing organizations map to companies
INSERT INTO companies (id, name, aims_company_code, settings, created_at, updated_at)
SELECT id, name, code AS aims_company_code, settings, created_at, updated_at
FROM organizations;

-- Create default store for each company
INSERT INTO stores (id, company_id, name, store_number, settings, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id AS company_id,
  name || ' - Main Store' AS name,
  '001' AS store_number,
  '{}'::json AS settings,
  created_at,
  updated_at
FROM companies;

-- Step 3: Migrate user access
-- Convert organization users to store users
INSERT INTO user_stores (user_id, store_id, role)
SELECT 
  u.id AS user_id,
  s.id AS store_id,
  CASE u.role
    WHEN 'ADMIN' THEN 'STORE_ADMIN'
    WHEN 'MANAGER' THEN 'STORE_MANAGER'
    WHEN 'VIEWER' THEN 'STORE_VIEWER'
  END AS role
FROM users u
JOIN stores s ON s.company_id = (
  SELECT o.id FROM organizations o WHERE o.id = u.organization_id
);

-- Step 4: Update entity foreign keys
ALTER TABLE spaces RENAME COLUMN organization_id TO store_id;
ALTER TABLE people RENAME COLUMN organization_id TO store_id;
ALTER TABLE conference_rooms RENAME COLUMN organization_id TO store_id;
-- ... repeat for all entity tables

-- Step 5: Drop old tables
DROP TABLE organizations CASCADE;
```

---

## 7. Use Cases

### 7.1 UC-PERM-001: Assign User to Store

**Actor:** COMPANY_ADMIN or STORE_ADMIN  
**Precondition:** User exists, Store exists

**Flow:**
1. Admin navigates to Store Users management
2. Admin clicks "Add User to Store"
3. Admin selects user from company users list
4. Admin selects role: STORE_ADMIN, STORE_MANAGER, STORE_EMPLOYEE, or STORE_VIEWER
5. System creates UserStore record
6. System logs action in audit log
7. User can now access the store with assigned role

### 7.2 UC-PERM-002: Store Employee Assigns Label

**Actor:** STORE_EMPLOYEE  
**Precondition:** Employee has access to store

**Flow:**
1. Employee views list of spaces in store
2. Employee selects a space
3. Employee clicks "Assign Label"
4. Employee enters label code
5. System validates employee has `labels:assign` permission
6. System queues label assignment to AIMS
7. System updates space with label code
8. System syncs with AIMS
9. System shows success message

---

## 8. Security Considerations

### 8.1 Data Isolation
- All queries must filter by storeId
- Middleware validates user access to requested store
- JWT token contains only accessible stores

### 8.2 Audit Logging
- All permission checks logged
- Failed authorization attempts logged with details
- Store access changes logged

### 8.3 API Rate Limiting
- Per-user rate limits
- Per-store rate limits for sync operations
- Stricter limits for STORE_EMPLOYEE role

---

## 9. Implementation Checklist

- [ ] Create new Prisma schema with Company, Store, UserCompany, UserStore
- [ ] Update all entity models to use storeId instead of organizationId
- [ ] Implement permission checking middleware
- [ ] Update JWT token generation to include store/company access
- [ ] Create migration scripts for existing data
- [ ] Update API routes to new structure (/stores/:storeId/...)
- [ ] Add role-based UI rendering in client
- [ ] Update all service functions to enforce store-level isolation
- [ ] Implement audit logging for all permission checks
- [ ] Create admin UI for managing company/store/user assignments
- [ ] Update API documentation
- [ ] Write integration tests for permission system
- [ ] Update deployment scripts

---

## 10. Next Steps

1. **Review & Approve**: Stakeholder review of design
2. **Schema Finalization**: Finalize Prisma schema with team
3. **Create Migration**: Write data migration scripts
4. **Backend Implementation**: Implement new permission system
5. **Frontend Updates**: Update UI for multi-store selection
6. **Testing**: Comprehensive permission testing
7. **Documentation**: API documentation updates
8. **Deployment**: Staged rollout with data migration

---

**Document Status:** Draft  
**Next Review:** Pending team discussion
