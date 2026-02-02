import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, conflict, badRequest } from '../../shared/middleware/index.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// Validation schemas
const createRoomSchema = z.object({
    storeId: z.string().uuid(),
    externalId: z.string().max(50),
    roomName: z.string().max(100),
    labelCode: z.string().max(50).optional(),
});

const updateRoomSchema = z.object({
    roomName: z.string().max(100).optional(),
    labelCode: z.string().max(50).optional().nullable(),
});

const toggleSchema = z.object({
    meetingName: z.string().max(255).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    participants: z.array(z.string()).optional(),
});

// GET /conference - List all conference rooms for user's stores
router.get('/', requirePermission('conference', 'read'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        const { storeId } = req.query;
        
        // Build where clause
        const where: { storeId?: string | { in: string[] } } = {};
        if (storeId && typeof storeId === 'string') {
            // Filter by specific store (must be one user has access to)
            if (!storeIds.includes(storeId)) {
                throw badRequest('Access denied to this store');
            }
            where.storeId = storeId;
        } else {
            // Get rooms from all user's stores
            where.storeId = { in: storeIds };
        }
        
        const rooms = await prisma.conferenceRoom.findMany({
            where,
            orderBy: { externalId: 'asc' },
            include: {
                store: {
                    select: { name: true, code: true }
                }
            }
        });

        // Calculate stats
        const stats = {
            total: rooms.length,
            withLabels: rooms.filter((r: typeof rooms[0]) => r.labelCode).length,
            withMeetings: rooms.filter((r: typeof rooms[0]) => r.hasMeeting).length,
            available: rooms.filter((r: typeof rooms[0]) => !r.hasMeeting).length,
        };

        res.json({ data: rooms, stats });
    } catch (error) {
        next(error);
    }
});

// GET /conference/:id - Get room details
router.get('/:id', requirePermission('conference', 'read'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const room = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
            include: {
                store: {
                    select: { name: true, code: true }
                }
            }
        });

        if (!room) {
            throw notFound('Conference room');
        }

        res.json(room);
    } catch (error) {
        next(error);
    }
});

// POST /conference - Create conference room
router.post('/', requirePermission('conference', 'create'), async (req, res, next) => {
    try {
        const data = createRoomSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        // Check user has access to the store
        if (!storeIds.includes(data.storeId)) {
            throw badRequest('Access denied to this store');
        }

        // Check external ID unique within store
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                storeId: data.storeId,
                externalId: data.externalId,
            },
        });

        if (existing) {
            throw conflict('Conference room with this ID already exists');
        }

        const room = await prisma.conferenceRoom.create({
            data: {
                storeId: data.storeId,
                externalId: data.externalId,
                roomName: data.roomName,
                labelCode: data.labelCode,
                syncStatus: 'PENDING',
            },
        });

        // Queue sync job
        await syncQueueService.queueCreate(data.storeId, 'conference', room.id);

        res.status(201).json(room);
    } catch (error) {
        next(error);
    }
});

// PATCH /conference/:id - Update room
router.patch('/:id', requirePermission('conference', 'update'), async (req, res, next) => {
    try {
        const data = updateRoomSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);

        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        const room = await prisma.conferenceRoom.update({
            where: { id: req.params.id as string },
            data: {
                ...data,
                syncStatus: 'PENDING',
            },
        });

        // Queue sync job
        await syncQueueService.queueUpdate(existing.storeId, 'conference', room.id, data);

        res.json(room);
    } catch (error) {
        next(error);
    }
});

// DELETE /conference/:id - Delete room
router.delete('/:id', requirePermission('conference', 'delete'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        // Queue sync job to delete from AIMS
        await syncQueueService.queueDelete(existing.storeId, 'conference', existing.id, existing.externalId);

        await prisma.conferenceRoom.delete({
            where: { id: req.params.id as string },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /conference/:id/toggle - Toggle meeting status
router.post('/:id/toggle', requirePermission('conference', 'toggle'), async (req, res, next) => {
    try {
        const meetingData = toggleSchema.parse(req.body);
        const storeIds = getUserStoreIds(req);

        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        // Toggle meeting status
        const newHasMeeting = !existing.hasMeeting;

        const room = await prisma.conferenceRoom.update({
            where: { id: req.params.id as string },
            data: {
                hasMeeting: newHasMeeting,
                // If turning on, use provided data; if turning off, clear data
                meetingName: newHasMeeting ? meetingData.meetingName || null : null,
                startTime: newHasMeeting ? meetingData.startTime || null : null,
                endTime: newHasMeeting ? meetingData.endTime || null : null,
                participants: newHasMeeting ? meetingData.participants || [] : [],
                syncStatus: 'PENDING',
            },
        });

        // Queue sync job to update AIMS and flip ESL page
        await syncQueueService.queueUpdate(existing.storeId, 'conference', room.id, { hasMeeting: newHasMeeting });

        res.json(room);
    } catch (error) {
        next(error);
    }
});

// POST /conference/:id/flip-page - Manually flip ESL page
router.post('/:id/flip-page', requirePermission('conference', 'toggle'), async (req, res, next) => {
    try {
        const storeIds = getUserStoreIds(req);
        
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                storeId: { in: storeIds },
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        if (!existing.labelCode) {
            throw notFound('No label assigned to this room');
        }

        // Queue job to flip ESL page in AIMS (triggers page change via article update)
        await syncQueueService.queueUpdate(existing.storeId, 'conference', existing.id, { flipPage: true });

        res.json({
            message: 'Page flip requested',
            roomId: existing.id,
            labelCode: existing.labelCode,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
