/**
 * Compass Socket.IO Namespace
 *
 * Handles real-time events for the Compass employee app.
 * Authenticates using Compass JWT, joins company and branch rooms.
 *
 * Events emitted:
 *   space:booked    — A space was booked
 *   space:checkedIn — Someone checked into a space
 *   space:released  — A space was released
 *   friend:checkedIn — A friend checked in
 *   friend:left      — A friend left/released
 *   friend:request   — Incoming friend request
 */
import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';
import type { CompassJwtPayload } from '../../../features/compass-auth/types.js';
import { appLogger } from './appLogger.js';

let io: Server | null = null;

// ─── Initialize ──────────────────────────────────────

export const initCompassSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        path: '/compass-ws',
        cors: {
            origin: config.corsOrigins,
            credentials: true,
        },
    });

    const compassNs = io.of('/compass');

    // Authentication middleware
    compassNs.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const payload = jwt.verify(token, config.jwt.accessSecret) as CompassJwtPayload;
            if (payload.tokenType !== 'COMPASS') {
                return next(new Error('Invalid token type'));
            }

            // Attach user data to socket
            (socket as any).compassUser = {
                id: payload.sub,
                companyId: payload.companyId,
                branchId: payload.branchId,
                role: payload.role,
            };

            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // Connection handler
    compassNs.on('connection', (socket: Socket) => {
        const user = (socket as any).compassUser;

        // Join company and branch rooms
        socket.join(`company:${user.companyId}`);
        socket.join(`branch:${user.branchId}`);
        socket.join(`user:${user.id}`);

        appLogger.info('CompassSocket', `User connected: ${user.id}`, {
            companyId: user.companyId,
            branchId: user.branchId,
        });

        socket.on('disconnect', () => {
            appLogger.info('CompassSocket', `User disconnected: ${user.id}`);
        });
    });

    appLogger.info('CompassSocket', 'Compass Socket.IO namespace initialized');
    return io;
};

// ─── Event Emitters ──────────────────────────────────

export const emitBookingEvent = (
    event: 'space:booked' | 'space:checkedIn' | 'space:released',
    branchId: string,
    data: Record<string, unknown>,
) => {
    if (!io) return;
    io.of('/compass').to(`branch:${branchId}`).emit(event, data);
};

export const emitFriendEvent = (
    event: 'friend:checkedIn' | 'friend:left' | 'friend:request',
    userId: string,
    data: Record<string, unknown>,
) => {
    if (!io) return;
    io.of('/compass').to(`user:${userId}`).emit(event, data);
};

export const emitToCompany = (
    companyId: string,
    event: string,
    data: Record<string, unknown>,
) => {
    if (!io) return;
    io.of('/compass').to(`company:${companyId}`).emit(event, data);
};

export const getCompassIO = () => io;
