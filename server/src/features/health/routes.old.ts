import { Router } from 'express';
import { prisma, getRedisClient } from '../../config/index.js';
import { solumService } from '../../shared/infrastructure/services/solumService.js';
import { env } from '../../config/env.js';

const router = Router();

// Basic liveness check
router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// Readiness check (with dependencies)
router.get('/ready', async (_req, res) => {
    const checks: Record<string, 'ok' | 'error'> = {
        database: 'error',
        redis: 'error',
        solum: 'error',
    };

    try {
        // Check database
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
    } catch {
        checks.database = 'error';
    }

    try {
        // Check Redis
        const redis = getRedisClient();
        await redis.ping();
        checks.redis = 'ok';
    } catch {
        checks.redis = 'error';
    }

    try {
        // Check SoluM
        // Use default env config for health check
        const isSolumReachable = await solumService.checkHealth({
            baseUrl: env.SOLUM_DEFAULT_API_URL || 'https://eu.common.solumesl.com',
            companyName: 'HEALTH_CHECK',
            cluster: env.SOLUM_DEFAULT_CLUSTER,
        });
        checks.solum = isSolumReachable ? 'ok' : 'error';
    } catch {
        checks.solum = 'error';
    }

    const allOk = Object.values(checks).every((c) => c === 'ok');

    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        checks,
    });
});

// AIMS specific probe
router.get('/aims', async (_req, res) => {
    try {
        const isAlive = await solumService.checkHealth({
            baseUrl: env.SOLUM_DEFAULT_API_URL || 'https://eu.common.solumesl.com',
            companyName: 'HEALTH_CHECK',
            cluster: env.SOLUM_DEFAULT_CLUSTER,
        });

        res.status(isAlive ? 200 : 503).json({
            status: isAlive ? 'ok' : 'error',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: (error as Error).message
        });
    }
});

// Detailed health metrics
router.get('/detailed', async (_req, res) => {
    const memoryUsage = process.memoryUsage();

    const checks: Record<string, unknown> = {
        database: { status: 'error' },
        redis: { status: 'error' },
        solum: { status: 'error' },
    };

    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        checks.database = {
            status: 'ok',
            latencyMs: Date.now() - start,
        };
    } catch (err) {
        checks.database = { status: 'error', error: (err as Error).message };
    }

    try {
        const redis = getRedisClient();
        const start = Date.now();
        await redis.ping();
        const info = await redis.info('memory');
        const usedMemory = info.match(/used_memory:(\d+)/)?.[1];

        checks.redis = {
            status: 'ok',
            latencyMs: Date.now() - start,
            memoryBytes: usedMemory ? parseInt(usedMemory) : undefined,
        };
    } catch (err) {
        checks.redis = { status: 'error', error: (err as Error).message };
    }

    try {
        const start = Date.now();
        const isAlive = await solumService.checkHealth({
            baseUrl: env.SOLUM_DEFAULT_API_URL || 'https://eu.common.solumesl.com',
            companyName: 'HEALTH_CHECK',
            cluster: env.SOLUM_DEFAULT_CLUSTER,
        });
        checks.solum = {
            status: isAlive ? 'ok' : 'error',
            latencyMs: Date.now() - start,
        };
    } catch (err) {
        checks.solum = { status: 'error', error: (err as Error).message };
    }

    const allOk = Object.values(checks).every(
        (c) => (c as { status: string }).status === 'ok'
    );

    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        uptime: process.uptime(),
        version: "1.0.0", // process.env.npm_package_version is flaky in some envs
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            unit: 'MB',
        },
        ...checks,
    });
});

export default router;
