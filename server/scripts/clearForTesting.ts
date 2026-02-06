import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearData() {
  const adminEmail = 'aviv@electis.co.il';
  
  // Find admin user
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    console.log('Admin user not found!');
    return;
  }
  console.log('Found admin:', admin.email);
  
  // Delete all related data
  console.log('Deleting sync queue items...');
  await prisma.syncQueueItem.deleteMany();
  
  console.log('Deleting audit logs...');
  await prisma.auditLog.deleteMany();
  
  console.log('Deleting people list memberships...');
  await prisma.peopleListMembership.deleteMany();
  
  console.log('Deleting people lists...');
  await prisma.peopleList.deleteMany();
  
  console.log('Deleting conference rooms...');
  await prisma.conferenceRoom.deleteMany();
  
  console.log('Deleting people...');
  await prisma.person.deleteMany();
  
  console.log('Deleting spaces...');
  await prisma.space.deleteMany();
  
  console.log('Deleting verification codes...');
  await prisma.verificationCode.deleteMany();
  
  console.log('Deleting refresh tokens...');
  await prisma.refreshToken.deleteMany();
  
  console.log('Deleting user-store assignments...');
  await prisma.userStore.deleteMany();
  
  console.log('Deleting user-company assignments...');
  await prisma.userCompany.deleteMany();
  
  console.log('Deleting users except admin...');
  await prisma.user.deleteMany({ where: { email: { not: adminEmail } } });
  
  console.log('Deleting stores...');
  await prisma.store.deleteMany();
  
  console.log('Deleting companies...');
  await prisma.company.deleteMany();
  
  // Clear admin context
  await prisma.user.update({
    where: { email: adminEmail },
    data: { activeCompanyId: null, activeStoreId: null }
  });
  
  console.log('Done! Database cleared except for admin user.');
  
  const remaining = await prisma.user.findMany();
  console.log('Remaining users:', remaining.map(u => u.email));
}

clearData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
