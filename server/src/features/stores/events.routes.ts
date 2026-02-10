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
            console.log('[SSE-ROUTE] Access denied - user does not have access to this store');
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No access to this store' } });
        }

        console.log('[SSE-ROUTE] Store access validated, setting up SSE connection...');

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // For nginx proxy

        // CRITICAL: Set response to unbuffered mode for Node.js streams
        if (res.socket) {
            res.socket.setNoDelay(true);
            res.socket.setKeepAlive(true);
        }

        res.flushHeaders();

        // IMMEDIATE TEST: Send a message right away to verify the stream works
        res.write('data: {"type":"test","message":"SSE stream working"}\n\n');
        console.log('[SSE-ROUTE] Sent immediate test message');

        const clientId = randomUUID();

        console.log('[SSE-ROUTE] About to add client to SSEManager', { clientId, storeId });

        sseManager.addClient({
            id: clientId,
            res,
            storeId,
            userId: user.id,
            userName: user.name || user.email,
        });

        console.log('[SSE-ROUTE] Client added to SSEManager successfully');

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
