
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing all users...');
    const users = await prisma.user.findMany();
    users.forEach(u => {
        console.log(`${u.email} (${u.globalRole}) - Active: ${u.isActive}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
