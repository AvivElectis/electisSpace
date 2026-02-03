import type { Request, Response } from 'express';
import { healthService } from './service.js';

// ============================================================================
// Health Controller
// ============================================================================

export const healthController = {
    /**
     * GET /health - Basic liveness check
     */
    liveness(_req: Request, res: Response) {
        res.json(healthService.getLiveness());
    },

    /**
     * GET /health/ready - Readiness check with dependencies
     */
    async readiness(_req: Request, res: Response) {
        const result = await healthService.getReadiness();
        res.status(result.status === 'ok' ? 200 : 503).json(result);
    },

    /**
     * GET /health/aims - AIMS specific probe
     */
    async aimsHealth(_req: Request, res: Response) {
        const result = await healthService.getAimsHealth();
        res.status(result.status === 'ok' ? 200 : 503).json(result);
    },

    /**
     * GET /health/detailed - Detailed health metrics
     */
    async detailed(_req: Request, res: Response) {
        const result = await healthService.getDetailedHealth();
        res.status(result.status === 'ok' ? 200 : 503).json(result);
    },
};
