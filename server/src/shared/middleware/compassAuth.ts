import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { unauthorized, forbidden } from './errorHandler.js';
import { prisma } from '../../config/index.js';
import type { CompassJwtPayload } from '../../features/compass-auth/types.js';

// Extend Express Request with compassUser
declare global {
    namespace Express {
        interface Request {
            compassUser?: {
                id: string;
                companyId: string;
                branchId: string;
                role: string;
            };
        }
    }
}

/**
 * Middleware to authenticate Compass JWT tokens.
 * Rejects admin JWTs by checking tokenType === 'COMPASS'.
 * Attaches user to req.compassUser.
 */
export const compassAuthenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw unauthorized('No token provided');
        }

        const token = authHeader.slice(7);

        let payload: CompassJwtPayload;
        try {
            payload = jwt.verify(token, config.jwt.accessSecret) as CompassJwtPayload;
        } catch {
            throw unauthorized('Invalid or expired token');
        }

        // Reject admin tokens
        if (payload.tokenType !== 'COMPASS') {
            throw unauthorized('Invalid token type for Compass');
        }

        req.compassUser = {
            id: payload.sub,
            companyId: payload.companyId,
            branchId: payload.branchId,
            role: payload.role,
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if Compass is enabled for the company.
 * Must be used AFTER compassAuthenticate.
 */
export const requireCompassEnabled = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    try {
        if (!req.compassUser) {
            throw unauthorized('Not authenticated');
        }

        const company = await prisma.company.findUnique({
            where: { id: req.compassUser.companyId },
            select: { compassEnabled: true },
        });

        if (!company?.compassEnabled) {
            throw forbidden('Compass is not enabled for this company');
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if Compass is enabled for a company (admin context).
 * Used on admin endpoints that manage Compass features.
 */
export const requireCompassEnabledForStore = async (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    try {
        const storeId = req.params.storeId as string | undefined;
        if (!storeId) {
            throw forbidden('Store context required');
        }

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { companyId: true },
        });

        if (!store) {
            throw forbidden('Store not found');
        }

        const company = await prisma.company.findUnique({
            where: { id: store.companyId },
            select: { compassEnabled: true },
        });

        if (!company?.compassEnabled) {
            throw forbidden('Compass is not enabled for this company');
        }

        next();
    } catch (error) {
        next(error);
    }
};
