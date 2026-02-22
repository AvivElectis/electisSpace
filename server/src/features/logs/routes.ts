/**
 * Logs Feature — API Routes
 *
 * Exposes the in-memory server log buffer for admin dashboards
 * and provides stats/clear endpoints.
 */

import { Router, type Request, type Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { authenticate } from '../../shared/middleware/auth.js';
import { forbidden } from '../../shared/middleware/errorHandler.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';

const router = Router();

/** Inline guard: only PLATFORM_ADMIN */
function requirePlatformAdmin(req: Request, res: Response, next: Function): void {
    if (req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
        next(forbidden('Platform admin access required'));
        return;
    }
    next();
}

/**
 * GET /logs
 * Query server logs from the in-memory ring buffer.
 *
 * Query params:
 *   level     — filter by log level (debug|info|warn|error)
 *   component — filter by component name
 *   limit     — max entries to return (default 200)
 */
router.get('/', authenticate, requirePlatformAdmin, (req: Request, res: Response) => {
    const { level, component, limit } = req.query;
    const logs = appLogger.getLogs({
        level: level as any,
        component: component as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 200,
    });
    res.json({ count: logs.length, logs });
});

/**
 * GET /logs/stats
 * Get aggregated log statistics.
 */
router.get('/stats', authenticate, requirePlatformAdmin, (_req: Request, res: Response) => {
    res.json(appLogger.getStats());
});

/**
 * DELETE /logs
 * Clear the in-memory log buffer.
 */
router.delete('/', authenticate, requirePlatformAdmin, (_req: Request, res: Response) => {
    appLogger.clearBuffer();
    res.json({ message: 'Log buffer cleared' });
});

export default router;
