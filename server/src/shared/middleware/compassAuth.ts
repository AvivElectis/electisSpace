import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { unauthorized, forbidden, badRequest } from './errorHandler.js';
import { prisma } from '../../config/index.js';
import type { CompassJwtPayload } from '../../features/compass-auth/types.js';
import { isPlatformAdmin, canManageCompany } from '../../features/companies/service.js';

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
 * Middleware to verify the admin user can manage the specified company's Compass data.
 * Requires PLATFORM_ADMIN role or company admin access.
 * Must be used AFTER `authenticate`.
 */
export const requireCompassAdmin = (paramName = 'companyId') => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const companyId = req.params[paramName] as string | undefined;
            if (!companyId) {
                throw badRequest('Company ID required');
            }

            const user = (req as any).user;
            if (!user) {
                throw unauthorized('Not authenticated');
            }

            if (isPlatformAdmin(user)) return next();
            if (canManageCompany(user, companyId)) return next();

            throw forbidden('Not authorized to manage this company');
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to verify admin access via a store/branch param.
 * Resolves the store's company, then checks admin access.
 * Must be used AFTER `authenticate`.
 */
export const requireCompassAdminForStore = (paramName = 'branchId') => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const storeId = req.params[paramName] as string | undefined;
            if (!storeId) {
                throw badRequest('Store ID required');
            }

            const user = (req as any).user;
            if (!user) {
                throw unauthorized('Not authenticated');
            }

            if (isPlatformAdmin(user)) return next();

            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: { companyId: true },
            });
            if (!store) {
                throw badRequest('Store not found');
            }

            if (canManageCompany(user, store.companyId)) return next();

            throw forbidden('Not authorized to manage this company');
        } catch (error) {
            next(error);
        }
    };
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
