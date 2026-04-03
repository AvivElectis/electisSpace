/**
 * Store Events Route — Server-Sent Events endpoint
 *
 * GET /api/v1/stores/:storeId/events
 *
 * Clients subscribe to real-time updates for a specific store.
 * Events are emitted when people are created/deleted/assigned or
 * when a user loads/frees a list.
 *
 * SECURITY NOTE: EventSource cannot set custom headers, so the JWT is passed
 * as a ?token= query parameter. Ensure Nginx log_format is configured to
 * scrub or mask the token parameter to prevent JWT exposure in access logs.
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

        // Validate store access (allow platform admins and allStoresAccess users)
        const userStoreIds = (user.stores || []).map((s: any) => s.id);
        const isPlatformAdmin = user.globalRole === 'PLATFORM_ADMIN';
        const hasAllStoresAccess = (user.companies || []).some((c: any) => c.allStoresAccess);
        if (!isPlatformAdmin && !hasAllStoresAccess && !userStoreIds.includes(storeId)) {
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No access to this store' } });
        }

        // Check connection limits BEFORE flushing headers (cannot send 503 after flush)
        if (!sseManager.canAcceptClient(storeId)) {
            return res.status(503).json({ error: { code: 'TOO_MANY_CONNECTIONS', message: 'Connection limit reached' } });
        }

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

        const clientId = randomUUID();

        // addClient should always succeed here since we checked canAcceptClient above,
        // but handle the edge case of a race between the check and add
        const accepted = sseManager.addClient({
            id: clientId,
            res,
            storeId,
            userId: user.id,
            userName: user.firstName || user.email,
        });

        if (!accepted) {
            res.end();
            return;
        }

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
            try {
                res.write(': keep-alive\n\n');
            } catch {
                clearInterval(keepAlive);
            }
        }, 30000);

        // Handle async socket errors (e.g. broken pipe after client disconnect)
        res.socket?.on('error', () => {
            clearInterval(keepAlive);
            sseManager.removeClient(clientId);
        });

        // Clean up on disconnect
        req.on('close', () => {
            clearInterval(keepAlive);
            sseManager.removeClient(clientId);
        });
    }
);

export default router;
