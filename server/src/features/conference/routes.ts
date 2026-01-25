import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, requirePermission, notFound, conflict } from '../../shared/middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createRoomSchema = z.object({
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

// GET /conference - List all conference rooms
router.get('/', requirePermission('conference', 'read'), async (req, res, next) => {
    try {
        const rooms = await prisma.conferenceRoom.findMany({
            where: { organizationId: req.user!.organizationId },
            orderBy: { externalId: 'asc' },
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
        const room = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
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

        // Check external ID unique
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                organizationId: req.user!.organizationId,
                externalId: data.externalId,
            },
        });

        if (existing) {
            throw conflict('Conference room with this ID already exists');
        }

        const room = await prisma.conferenceRoom.create({
            data: {
                ...data,
                organizationId: req.user!.organizationId,
                syncStatus: 'PENDING',
            },
        });

        // TODO: Queue sync job

        res.status(201).json(room);
    } catch (error) {
        next(error);
    }
});

// PATCH /conference/:id - Update room
router.patch('/:id', requirePermission('conference', 'update'), async (req, res, next) => {
    try {
        const data = updateRoomSchema.parse(req.body);

        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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

        // TODO: Queue sync job

        res.json(room);
    } catch (error) {
        next(error);
    }
});

// DELETE /conference/:id - Delete room
router.delete('/:id', requirePermission('conference', 'delete'), async (req, res, next) => {
    try {
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        await prisma.conferenceRoom.delete({
            where: { id: req.params.id as string },
        });

        // TODO: Queue sync job

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /conference/:id/toggle - Toggle meeting status
router.post('/:id/toggle', requirePermission('conference', 'toggle'), async (req, res, next) => {
    try {
        const meetingData = toggleSchema.parse(req.body);

        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
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

        // TODO: Queue sync job to update SoluM and flip ESL page

        res.json(room);
    } catch (error) {
        next(error);
    }
});

// POST /conference/:id/flip-page - Manually flip ESL page
router.post('/:id/flip-page', requirePermission('conference', 'toggle'), async (req, res, next) => {
    try {
        const existing = await prisma.conferenceRoom.findFirst({
            where: {
                id: req.params.id as string,
                organizationId: req.user!.organizationId,
            },
        });

        if (!existing) {
            throw notFound('Conference room');
        }

        if (!existing.labelCode) {
            throw notFound('No label assigned to this room');
        }

        // TODO: Queue job to flip ESL page in SoluM

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
