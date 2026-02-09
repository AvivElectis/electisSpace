/**
 * Store Events Route — Server-Sent Events endpoint
 * 
 * GET /api/v1/stores/:storeId/events
 * 
 * Clients subscribe to real-time updates for a specific store.
 * Events are emitted when people are created/deleted/assigned or
 * when a user loads/frees a list.
 */
import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { authenticate } from '../../shared/middleware/index.js';
import { sseManager } from '../../shared/infrastructure/sse/SseManager.js';

const router = Router();

/**
 * GET /stores/:storeId/events
 * SSE endpoint — long-lived connection for real-time store updates
 */
router.get(
    '/stores/:storeId/events',
    authenticate,
    (req: Request, res: Response) => {
        const storeId = req.params.storeId as string;
        const user = (req as any).user;

        // Validate store access
        const userStoreIds = (user.stores || []).map((s: any) => s.id);
        if (!userStoreIds.includes(storeId)) {
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No access to this store' } });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // For nginx proxy
        res.flushHeaders();

        const clientId = randomUUID();

        sseManager.addClient({
            id: clientId,
            res,
            storeId,
            userId: user.id,
            userName: user.name || user.email,
        });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
            try {
                res.write(': keep-alive\n\n');
            } catch {
                clearInterval(keepAlive);
            }
        }, 30000);

        // Clean up on disconnect
        req.on('close', () => {
            clearInterval(keepAlive);
            sseManager.removeClient(clientId);
        });
    }
);

export default router;
