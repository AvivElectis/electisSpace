import { prisma, getRedisClient } from '../../config/index.js';
import { solumService } from '../../shared/infrastructure/services/solumService.js';
import { env } from '../../config/env.js';
import type {
    HealthStatus,
    BasicHealthResponse,
    ReadinessResponse,
    DetailedHealthCheck,
    DetailedHealthResponse,
    MemoryInfo,
} from './types.js';

// ============================================================================
// Helper Functions
// ============================================================================

function getSolumConfig() {
    return {
        baseUrl: env.SOLUM_DEFAULT_API_URL || 'https://eu.common.solumesl.com',
        companyName: 'HEALTH_CHECK',
        cluster: env.SOLUM_DEFAULT_CLUSTER,
    };
}

// ============================================================================
// Health Service - Business Logic
// ============================================================================

export const healthService = {
    /**
     * Basic liveness check
     */
    getLiveness(): BasicHealthResponse {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    },

    /**
     * Readiness check with dependency status
     */
    async getReadiness(): Promise<ReadinessResponse> {
        const checks: Record<string, HealthStatus> = {
            database: 'error',
            redis: 'error',
            solum: 'error',
        };

        // Check database
        try {
            await prisma.$queryRaw`SELECT 1`;
            checks.database = 'ok';
        } catch {
            checks.database = 'error';
        }

        // Check Redis
        try {
            const redis = getRedisClient();
            await redis.ping();
            checks.redis = 'ok';
        } catch {
            checks.redis = 'error';
        }

        // Check SoluM
        try {
            const isSolumReachable = await solumService.checkHealth(getSolumConfig());
            checks.solum = isSolumReachable ? 'ok' : 'error';
        } catch {
            checks.solum = 'error';
        }

        const allOk = Object.values(checks).every((c) => c === 'ok');

        return {
            status: allOk ? 'ok' : 'degraded',
            checks,
        };
    },

    /**
     * AIMS-specific health probe
     */
    async getAimsHealth(): Promise<BasicHealthResponse & { error?: string }> {
        try {
            const isAlive = await solumService.checkHealth(getSolumConfig());
            return {
                status: isAlive ? 'ok' : 'error',
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: (error as Error).message,
            };
        }
    },

    /**
     * Detailed health metrics with latency and memory info
     */
    async getDetailedHealth(): Promise<DetailedHealthResponse> {
        const memoryUsage = process.memoryUsage();

        const checks: Record<string, DetailedHealthCheck> = {
            database: { status: 'error' },
            redis: { status: 'error' },
            solum: { status: 'error' },
        };

        // Check database with latency
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

        // Check Redis with latency and memory
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

        // Check SoluM with latency
        try {
            const start = Date.now();
            const isAlive = await solumService.checkHealth(getSolumConfig());
            checks.solum = {
                status: isAlive ? 'ok' : 'error',
                latencyMs: Date.now() - start,
            };
        } catch (err) {
            checks.solum = { status: 'error', error: (err as Error).message };
        }

        const allOk = Object.values(checks).every((c) => c.status === 'ok');

        const memory: MemoryInfo = {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            unit: 'MB',
        };

        return {
            status: allOk ? 'ok' : 'degraded',
            uptime: process.uptime(),
            version: '1.0.0',
            memory,
            database: checks.database,
            redis: checks.redis,
            solum: checks.solum,
        };
    },
};
