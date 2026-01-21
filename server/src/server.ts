import app from './app.js';
import { config, prisma, closeRedis } from './config/index.js';

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

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
