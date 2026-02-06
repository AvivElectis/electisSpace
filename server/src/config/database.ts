import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from './env.js';

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: config.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

if (!config.isProd) {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
});

export default prisma;
