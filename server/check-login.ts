import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
