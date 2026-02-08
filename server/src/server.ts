import app from './app.js';
import { config, prisma, closeRedis } from './config/index.js';
import { syncQueueProcessor } from './shared/infrastructure/jobs/SyncQueueProcessor.js';
// NOTE: AimsVerificationJob disabled — the AimsSyncReconciliationJob (below)
// already handles full DB→AIMS reconciliation every 60s, making verification
// redundant. The old verification also had a lookup-key mismatch (used
// externalId instead of assignedSpaceId) that caused infinite re-sync loops.
// import { aimsVerificationJob } from './shared/infrastructure/jobs/AimsVerificationJob.js';
import { aimsPullSyncJob } from './shared/infrastructure/jobs/AimsPullSyncJob.js';

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Start background jobs
        syncQueueProcessor.start(10000); // Process sync queue every 10 seconds
        console.log('✅ Sync Queue Processor started');

        aimsPullSyncJob.start(60 * 1000); // Reconcile DB→AIMS every 60 seconds
        console.log('✅ AIMS Reconciliation Job started');

        // Start HTTP server
        const server = app.listen(config.port, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 electisSpace Server                                   ║
║                                                            ║
║   Environment: ${config.isDev ? 'Development' : 'Production'}                              ║
║   Port:        ${config.port}                                        ║
║   API Version: ${config.apiVersion}                                          ║
║                                                            ║
║   Health:      http://localhost:${config.port}/health                  ║
║   API:         http://localhost:${config.port}/api/${config.apiVersion}                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);

            // Stop background jobs first
            syncQueueProcessor.stop();
            console.log('Sync Queue Processor stopped');

            aimsPullSyncJob.stop();
            console.log('AIMS Reconciliation Job stopped');

            server.close(async () => {
                console.log('HTTP server closed');

                await prisma.$disconnect();
                console.log('Database disconnected');

                await closeRedis();
                console.log('Redis disconnected');

                process.exit(0);
            });

            // Force exit after 10 seconds
            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

