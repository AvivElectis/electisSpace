# Migration Plan: Enhanced Permissions System

> **Created:** January 26, 2026  
> **Migration Type:** Major Schema Change  
> **Estimated Duration:** 2-4 hours  
> **Risk Level:** High (Breaking Changes)

---

## Prerequisites

### 1. Docker Desktop
⚠️ **Docker Desktop must be running before proceeding**

```powershell
# Verify Docker is running
docker ps

# If not running, start Docker Desktop application
# Then verify again
```

### 2. Backup Current Database
```powershell
# If you have existing data, create a backup
cd server
npm run db:backup  # (if this script exists)

# Or manually via docker
docker exec electisspace_dev_db pg_dump -U postgres -d electisspace_dev > backup.sql
```

---

## Migration Steps

### Step 1: Start Infrastructure (5 minutes)

```powershell
cd server

# Start development containers
npm run dev:docker

# Verify containers are running
docker ps

# Expected output should show:
# - electisspace_dev_db (PostgreSQL)
# - electisspace_dev_redis (Redis)
```

### Step 2: Backup Current Schema (2 minutes)

```powershell
# Backup current schema
cp prisma/schema.prisma prisma/schema.backup.prisma

# Backup current migrations (if any exist)
cp -r prisma/migrations prisma/migrations.backup
```

### Step 3: Update Schema File (10 minutes)

Replace `server/prisma/schema.prisma` with enhanced schema:

**Key Changes:**
- ✅ Replace `Organization` → `Company` + `Store`
- ✅ Add `UserCompany` and `UserStore` junction tables
- ✅ Update `User` model with `globalRole`
- ✅ Change all entity `organizationId` → `storeId`
- ✅ Add new enums: `GlobalRole`, `CompanyRole`, `StoreRole`

### Step 4: Generate Migration (5 minutes)

```powershell
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate dev --name enhanced_permissions

# This will:
# 1. Detect schema changes
# 2. Generate SQL migration
# 3. Ask for migration name
# 4. Apply migration to dev database
```

### Step 5: Verify Migration (5 minutes)

```powershell
# Open Prisma Studio to verify
npm run db:studio

# Check that new tables exist:
# - companies
# - stores
# - user_companies
# - user_stores

# Check that old tables are removed:
# - organizations (should not exist)
```

### Step 6: Seed Test Data (10 minutes)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, GlobalRole, StoreRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create test company
  const company = await prisma.company.create({
    data: {
      name: 'Test Company',
      aimsCompanyCode: 'TEST001',
      aimsBaseUrl: 'https://eu.common.solumesl.com',
      aimsCluster: 'common',
      aimsUsername: 'test_user',
      settings: {}
    }
  });

  // Create test store
  const store = await prisma.store.create({
    data: {
      companyId: company.id,
      name: 'Main Store',
      storeNumber: '001',
      timezone: 'UTC',
      settings: {}
    }
  });

  // Create platform admin
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@electis.co.il',
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      globalRole: GlobalRole.PLATFORM_ADMIN,
      isActive: true
    }
  });

  // Create store admin
  const storeAdminPassword = await bcrypt.hash('StoreAdmin123!', 12);
  const storeAdmin = await prisma.user.create({
    data: {
      email: 'store.admin@electis.co.il',
      passwordHash: storeAdminPassword,
      firstName: 'Store',
      lastName: 'Admin',
      isActive: true
    }
  });

  // Assign store admin to store
  await prisma.userStore.create({
    data: {
      userId: storeAdmin.id,
      storeId: store.id,
      role: StoreRole.STORE_ADMIN
    }
  });

  // Create store employee
  const employeePassword = await bcrypt.hash('Employee123!', 12);
  const employee = await prisma.user.create({
    data: {
      email: 'employee@electis.co.il',
      passwordHash: employeePassword,
      firstName: 'Store',
      lastName: 'Employee',
      isActive: true
    }
  });

  // Assign employee to store
  await prisma.userStore.create({
    data: {
      userId: employee.id,
      storeId: store.id,
      role: StoreRole.STORE_EMPLOYEE
    }
  });

  console.log('✅ Seed data created successfully');
  console.log('Test users:');
  console.log('- admin@electis.co.il / Admin123! (Platform Admin)');
  console.log('- store.admin@electis.co.il / StoreAdmin123! (Store Admin)');
  console.log('- employee@electis.co.il / Employee123! (Store Employee)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```powershell
npm run db:seed
```

### Step 7: Update Backend Code (30-60 minutes)

#### 7.1 Update Authentication Service

File: `src/features/auth/services/authService.ts`

**Changes needed:**
- Update JWT token generation to include stores and companies
- Add permission checking logic
- Update token payload interface

#### 7.2 Create Permission Middleware

File: `src/shared/middleware/permissions.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type Permission = 
  | 'users:create' | 'users:read' | 'users:update' | 'users:delete'
  | 'spaces:create' | 'spaces:read' | 'spaces:update' | 'spaces:delete'
  | 'labels:assign' | 'labels:read'
  // ... add all permissions
  ;

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const storeId = req.params.storeId || req.body.storeId;
    
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
  // Implementation as per design document
  // ...
}
```

#### 7.3 Update API Routes

Update all routes to use new structure:

**Old:**
```typescript
router.get('/api/v1/spaces', authenticate, getSpaces);
```

**New:**
```typescript
router.get('/api/v1/stores/:storeId/spaces', 
  authenticate,
  requirePermission('spaces:read'),
  getSpaces
);
```

#### 7.4 Update Services

Update all services to:
- Filter by `storeId` instead of `organizationId`
- Add store validation
- Add permission checks

### Step 8: Update Frontend (60-90 minutes)

#### 8.1 Add Store Selection

Create store selector component:
```typescript
// src/shared/presentation/components/StoreSelector.tsx
export function StoreSelector() {
  const { user } = useAuthStore();
  const { currentStore, setCurrentStore } = useStoreContext();
  
  const stores = user?.stores || [];
  
  return (
    <Select
      value={currentStore?.id}
      onChange={(e) => setCurrentStore(stores.find(s => s.id === e.target.value))}
    >
      {stores.map(store => (
        <MenuItem key={store.id} value={store.id}>
          {store.name} ({store.storeNumber})
        </MenuItem>
      ))}
    </Select>
  );
}
```

#### 8.2 Update Auth Store

Add store context to auth:
```typescript
interface AuthState {
  user: User | null;
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  // ...
}
```

#### 8.3 Update API Calls

Change all API calls to include storeId:

**Old:**
```typescript
await apiClient.get('/api/v1/spaces');
```

**New:**
```typescript
const { currentStore } = useStoreContext();
await apiClient.get(`/api/v1/stores/${currentStore.id}/spaces`);
```

#### 8.4 Add Permission-Based UI

```typescript
function SpacesList() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('spaces:create') && (
        <Button onClick={handleCreate}>Add Space</Button>
      )}
      {/* ... */}
    </div>
  );
}
```

### Step 9: Testing (30 minutes)

#### 9.1 Unit Tests
```powershell
npm run test
```

#### 9.2 Integration Tests
- Test login with different roles
- Test permission checks
- Test store isolation

#### 9.3 Manual Testing Checklist
- [ ] Platform admin can access all stores
- [ ] Store admin can only access assigned store
- [ ] Store employee can only assign labels
- [ ] Store viewer has read-only access
- [ ] Data isolation between stores works

### Step 10: Deploy to Production

**⚠️ IMPORTANT:** Test thoroughly in development before production!

```powershell
# Production migration
npm run db:migrate:deploy

# Start production
npm run prod:docker
npm start
```

---

## Rollback Plan

If migration fails:

### Option 1: Restore from Backup
```powershell
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Restore schema
cp prisma/schema.backup.prisma prisma/schema.prisma

# Restore migrations
rm -rf prisma/migrations
cp -r prisma/migrations.backup prisma/migrations

# Start containers
npm run dev:docker

# Reset database
npm run db:reset
```

### Option 2: Manual Rollback
```sql
-- Drop new tables
DROP TABLE IF EXISTS user_stores CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Recreate organizations table
-- ... (previous schema)
```

---

## Post-Migration Tasks

- [ ] Update API documentation
- [ ] Update user guides
- [ ] Train users on new permission system
- [ ] Monitor error logs for permission issues
- [ ] Create company/store management UI
- [ ] Set up automated backups

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Docker Setup | 5 min | ⏸️ Pending |
| Schema Backup | 2 min | ⏸️ Pending |
| Schema Update | 10 min | ⏸️ Pending |
| Migration | 5 min | ⏸️ Pending |
| Verification | 5 min | ⏸️ Pending |
| Seed Data | 10 min | ⏸️ Pending |
| Backend Updates | 60 min | ⏸️ Pending |
| Frontend Updates | 90 min | ⏸️ Pending |
| Testing | 30 min | ⏸️ Pending |
| **Total** | **~4 hours** | ⏸️ Pending |

---

## Contact & Support

If issues arise during migration:
1. Check logs: `docker logs electisspace_dev_db`
2. Review migration files in `prisma/migrations/`
3. Consult ENHANCED_PERMISSIONS_DESIGN.md
4. Restore from backup if critical failure

---

**Ready to proceed?**

1. ✅ Ensure Docker Desktop is running
2. ✅ Read this plan completely
3. ✅ Have backup strategy in place
4. ✅ Execute steps in order
