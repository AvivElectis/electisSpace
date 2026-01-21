import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: config.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

if (!config.isProd) {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
