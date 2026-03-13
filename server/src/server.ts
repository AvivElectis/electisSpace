import bcrypt from 'bcrypt';
import app from './app.js';
import { config, prisma, closeRedis } from './config/index.js';
import { appLogger } from './shared/infrastructure/services/appLogger.js';
import { syncQueueProcessor } from './shared/infrastructure/jobs/SyncQueueProcessor.js';
// NOTE: AimsVerificationJob disabled — the AimsSyncReconciliationJob (below)
// already handles full DB→AIMS reconciliation every 60s, making verification
// redundant. The old verification also had a lookup-key mismatch (used
// externalId instead of assignedSpaceId) that caused infinite re-sync loops.
// import { aimsVerificationJob } from './shared/infrastructure/jobs/AimsVerificationJob.js';
import { aimsPullSyncJob } from './shared/infrastructure/jobs/AimsPullSyncJob.js';

/**
 * Ensure admin user exists and password matches ADMIN_PASSWORD env var.
 * Creates the admin if missing, updates password if changed.
 */
async function ensureAdminUser() {
    const { email, password } = config.admin;
    if (!email || !password) return;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
        // Create admin user
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.create({
            data: {
                email,
                passwordHash,
                globalRole: 'PLATFORM_ADMIN',
                isActive: true,
            },
        });
        appLogger.info('Server', `Admin user created: ${email}`);
        return;
    }

    // Update password if it doesn't match
    const matches = await bcrypt.compare(password, existing.passwordHash);
    if (!matches) {
        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash },
        });
        appLogger.info('Server', `Admin password updated for: ${email}`);
    }
}

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        appLogger.info('Server', 'Database connected');

        // Ensure admin user exists with correct password
        await ensureAdminUser();

        // Start background jobs
        syncQueueProcessor.start(10000); // Process sync queue every 10 seconds
        appLogger.info('Server', 'Sync Queue Processor started');

        aimsPullSyncJob.start(60 * 1000); // Reconcile DB→AIMS every 60 seconds
        appLogger.info('Server', 'AIMS Reconciliation Job started');

        // Start HTTP server
        const server = app.listen(config.port, () => {
            appLogger.info('Server', `electisSpace Server started — env=${config.isDev ? 'Development' : 'Production'} port=${config.port} api=${config.apiVersion}`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            appLogger.info('Server', `${signal} received. Shutting down gracefully...`);

            // Stop background jobs first
            syncQueueProcessor.stop();
            appLogger.info('Server', 'Sync Queue Processor stopped');

            aimsPullSyncJob.stop();
            appLogger.info('Server', 'AIMS Reconciliation Job stopped');

            server.close(async () => {
                appLogger.info('Server', 'HTTP server closed');

                await prisma.$disconnect();
                appLogger.info('Server', 'Database disconnected');

                await closeRedis();
                appLogger.info('Server', 'Redis disconnected');

                process.exit(0);
            });

            // Force exit after 10 seconds
            setTimeout(() => {
                appLogger.error('Server', 'Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        appLogger.error('Server', 'Failed to start server', { error });
        process.exit(1);
    }
};

startServer();

