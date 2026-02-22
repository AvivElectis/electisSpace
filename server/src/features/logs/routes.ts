/**
 * Logs Feature — API Routes
 *
 * Exposes the in-memory server log buffer for admin dashboards
 * and provides stats/clear endpoints.
 */

import { Router, type Request, type Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { authenticate, requireGlobalRole } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';

const router = Router();

const adminOnly = requireGlobalRole(GlobalRole.PLATFORM_ADMIN);

/**
 * GET /logs
 * Query server logs from the in-memory ring buffer.
 *
 * Query params:
 *   level     — filter by log level (debug|info|warn|error)
 *   component — filter by component name
 *   limit     — max entries to return (default 200)
 */
router.get('/', authenticate, adminOnly, (req: Request, res: Response) => {
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
router.get('/stats', authenticate, adminOnly, (_req: Request, res: Response) => {
    res.json(appLogger.getStats());
});

/**
 * DELETE /logs
 * Clear the in-memory log buffer.
 */
router.delete('/', authenticate, adminOnly, (_req: Request, res: Response) => {
    appLogger.clearBuffer();
    res.json({ message: 'Log buffer cleared' });
});

export default router;
