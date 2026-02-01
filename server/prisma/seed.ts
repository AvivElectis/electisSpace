import { PrismaClient, GlobalRole, CompanyRole, StoreRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.userStore.deleteMany();
  await prisma.userCompany.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.company.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create test company
  const company = await prisma.company.create({
    data: {
      name: 'AIMS Test Company',
      aimsCompanyCode: 'TEST001',
      aimsBaseUrl: 'https://api.aims.test',
      aimsCluster: 'test-cluster',
      aimsUsername: 'test_api_user',
      aimsPasswordEnc: 'encrypted_password_here',
      settings: {
        defaultLanguage: 'he',
        timezone: 'Asia/Jerusalem',
      },
      isActive: true,
    },
  });

  console.log(`✅ Created company: ${company.name} (${company.aimsCompanyCode})`);

  // Create multiple stores
  const mainStore = await prisma.store.create({
    data: {
      companyId: company.id,
      name: 'Main Store',
      storeNumber: '001',
      timezone: 'Asia/Jerusalem',
      settings: {
        language: 'he',
        enableAutoSync: true,
      },
      isActive: true,
    },
  });

  const secondStore = await prisma.store.create({
    data: {
      companyId: company.id,
      name: 'Second Store',
      storeNumber: '002',
      timezone: 'Asia/Jerusalem',
      settings: {
        language: 'he',
        enableAutoSync: true,
      },
      isActive: true,
    },
  });

  console.log(`✅ Created stores: ${mainStore.name}, ${secondStore.name}`);

  // Hash password for all users
  const defaultPassword = await bcrypt.hash('Test123!', 10);

  // 1. Platform Admin (access to all companies and stores)
  const platformAdmin = await prisma.user.create({
    data: {
      email: 'aviv@electis.co.il',
      passwordHash: defaultPassword,
      firstName: 'Aviv',
      lastName: 'Admin',
      globalRole: GlobalRole.PLATFORM_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Created Platform Admin: ${platformAdmin.email}`);

  // 2. Company Admin (access to all stores in the company)
  const companyAdmin = await prisma.user.create({
    data: {
      email: 'company.admin@test.com',
      passwordHash: defaultPassword,
      firstName: 'Company',
      lastName: 'Admin',
      isActive: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: companyAdmin.id,
      companyId: company.id,
      role: CompanyRole.COMPANY_ADMIN,
    },
  });

  // Company admin gets access to all stores
  await prisma.userStore.createMany({
    data: [
      {
        userId: companyAdmin.id,
        storeId: mainStore.id,
        role: StoreRole.STORE_ADMIN,
      },
      {
        userId: companyAdmin.id,
        storeId: secondStore.id,
        role: StoreRole.STORE_ADMIN,
      },
    ],
  });

  console.log(`✅ Created Company Admin: ${companyAdmin.email}`);

  // 3. Store Admin (admin of main store only)
  const storeAdmin = await prisma.user.create({
    data: {
      email: 'store.admin@test.com',
      passwordHash: defaultPassword,
      firstName: 'Store',
      lastName: 'Admin',
      isActive: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: storeAdmin.id,
      companyId: company.id,
      role: CompanyRole.VIEWER,
    },
  });

  await prisma.userStore.create({
    data: {
      userId: storeAdmin.id,
      storeId: mainStore.id,
      role: StoreRole.STORE_ADMIN,
    },
  });

  console.log(`✅ Created Store Admin: ${storeAdmin.email}`);

  // 4. Store Manager (manager of main store)
  const storeManager = await prisma.user.create({
    data: {
      email: 'manager@test.com',
      passwordHash: defaultPassword,
      firstName: 'Store',
      lastName: 'Manager',
      isActive: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: storeManager.id,
      companyId: company.id,
      role: CompanyRole.VIEWER,
    },
  });

  await prisma.userStore.create({
    data: {
      userId: storeManager.id,
      storeId: mainStore.id,
      role: StoreRole.STORE_MANAGER,
    },
  });

  console.log(`✅ Created Store Manager: ${storeManager.email}`);

  // 5. Store Employee (employee who can only assign labels)
  const employee = await prisma.user.create({
    data: {
      email: 'employee@test.com',
      passwordHash: defaultPassword,
      firstName: 'Store',
      lastName: 'Employee',
      isActive: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: employee.id,
      companyId: company.id,
      role: CompanyRole.VIEWER,
    },
  });

  await prisma.userStore.create({
    data: {
      userId: employee.id,
      storeId: mainStore.id,
      role: StoreRole.STORE_EMPLOYEE,
    },
  });

  console.log(`✅ Created Store Employee: ${employee.email}`);

  // 6. Store Viewer (read-only access to main store)
  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@test.com',
      passwordHash: defaultPassword,
      firstName: 'Store',
      lastName: 'Viewer',
      isActive: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: viewer.id,
      companyId: company.id,
      role: CompanyRole.VIEWER,
    },
  });

  await prisma.userStore.create({
    data: {
      userId: viewer.id,
      storeId: mainStore.id,
      role: StoreRole.STORE_VIEWER,
    },
  });

  console.log(`✅ Created Store Viewer: ${viewer.email}`);

  // Create some sample data for main store
  const space = await prisma.space.create({
    data: {
      storeId: mainStore.id,
      externalId: 'ROOM-101',
      data: { roomName: 'Electronics Section', floor: '1', capacity: '50' },
      syncStatus: 'SYNCED',
    },
  });

  console.log(`✅ Created sample space: ${space.externalId}`);

  console.log('\n📊 Seeding Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Company: AIMS Test Company (TEST001)');
  console.log('Stores: Main Store (001), Second Store (002)');
  console.log('\nTest Users (all passwords: Test123!):');
  console.log('1. aviv@electis.co.il         - Platform Admin');
  console.log('2. company.admin@test.com     - Company Admin (all stores)');
  console.log('3. store.admin@test.com       - Store Admin (main store)');
  console.log('4. manager@test.com           - Store Manager (main store)');
  console.log('5. employee@test.com          - Store Employee (main store)');
  console.log('6. viewer@test.com            - Store Viewer (main store)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database seeded successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
