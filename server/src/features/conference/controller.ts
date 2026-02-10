import type { Request, Response, NextFunction } from 'express';
import { conferenceService } from './service.js';
import { createRoomSchema, updateRoomSchema, toggleMeetingSchema } from './types.js';
import type { ConferenceUserContext } from './types.js';
import { notFound, badRequest, conflict } from '../../shared/middleware/index.js';
import { sseManager } from '../../shared/infrastructure/sse/SseManager.js';
// SSE broadcasts for real-time updates

// ============================================================================
// Helpers
// ============================================================================

function getUserContext(req: Request): ConferenceUserContext {
    return {
        userId: req.user?.id || '',
        storeIds: req.user?.stores?.map((s) => s.id) || [],
    };
}

function mapServiceError(error: unknown): Error {
    if (error === 'NOT_FOUND') {
        return notFound('Conference room');
    }
    if (error === 'STORE_ACCESS_DENIED') {
        return badRequest('Access denied to this store');
    }
    if (error === 'CONFLICT') {
        return conflict('Conference room with this ID already exists');
    }
    if (error === 'NO_LABEL_ASSIGNED') {
        return notFound('No label assigned to this room');
    }
    throw error;
}

// ============================================================================
// Conference Controller
// ============================================================================

export const conferenceController = {
    /**
     * GET /conference - List conference rooms
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const filters = {
                storeId: typeof req.query.storeId === 'string' ? req.query.storeId : undefined,
            };

            const { rooms, stats } = await conferenceService.list(userContext, filters);
            res.json({ data: rooms, stats });
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * GET /conference/:id - Get room details
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const room = await conferenceService.getById(userContext, req.params.id as string);
            res.json(room);
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /conference - Create conference room
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const data = createRoomSchema.parse(req.body);
            const room = await conferenceService.create(userContext, data);

            // Broadcast conference:changed event to all clients in this store
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(data.storeId, {
                type: 'conference:changed',
                payload: {
                    action: 'create',
                    roomId: room.externalId,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: sseClientId,
            });

            res.status(201).json(room);
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * PATCH /conference/:id - Update room
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const data = updateRoomSchema.parse(req.body);
            const room = await conferenceService.update(userContext, req.params.id as string, data);

            // Broadcast conference:changed event to all clients in this store
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(room.storeId, {
                type: 'conference:changed',
                payload: {
                    action: 'update',
                    roomId: room.externalId,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: sseClientId,
            });

            res.json(room);
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * DELETE /conference/:id - Delete room
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const roomId = req.params.id as string;

            // Get room details before deletion to access storeId and externalId
            const room = await conferenceService.getById(userContext, roomId);
            const storeId = room.storeId;
            const externalId = room.externalId;

            await conferenceService.delete(userContext, roomId);

            // Broadcast conference:changed event to all clients in this store
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(storeId, {
                type: 'conference:changed',
                payload: {
                    action: 'delete',
                    roomId: externalId,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: sseClientId,
            });

            res.status(204).send();
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /conference/:id/toggle - Toggle meeting status
     */
    async toggleMeeting(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const meetingData = toggleMeetingSchema.parse(req.body);
            const room = await conferenceService.toggleMeeting(userContext, req.params.id as string, meetingData);

            // Broadcast conference:changed event to all clients in this store
            const sseClientId = req.headers['x-sse-client-id'] as string | undefined;
            sseManager.broadcastToStore(room.storeId, {
                type: 'conference:changed',
                payload: {
                    action: 'toggle',
                    roomId: room.externalId,
                    hasMeeting: room.hasMeeting,
                    userName: req.user?.email || 'Unknown',
                },
                excludeClientId: sseClientId,
            });

            res.json(room);
        } catch (error) {
            next(mapServiceError(error));
        }
    },

    /**
     * POST /conference/:id/flip-page - Manually flip ESL page
     */
    async flipPage(req: Request, res: Response, next: NextFunction) {
        try {
            const userContext = getUserContext(req);
            const result = await conferenceService.flipPage(userContext, req.params.id as string);
            res.json(result);
        } catch (error) {
            next(mapServiceError(error));
        }
    },
};
