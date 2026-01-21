import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../../config/index.js';
import { unauthorized, forbidden } from './errorHandler.js';
import type { Role } from '@prisma/client';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                organizationId: string;
                role: Role;
            };
        }
    }
}

// JWT payload interface
interface JwtPayload {
    sub: string;
    org: string;
    role: Role;
    iat: number;
    exp: number;
}

// Authentication middleware
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw unauthorized('No token provided');
        }

        const token = authHeader.substring(7);

        // Verify token
        const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                organizationId: true,
                role: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            throw unauthorized('User not found or inactive');
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        };

        next();
    } catch (error) {
        next(error);
    }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            next(forbidden('Insufficient permissions'));
            return;
        }

        next();
    };
};

// Permission-based authorization
type Resource = 'spaces' | 'people' | 'conference' | 'settings' | 'users' | 'audit' | 'sync';
type Action = 'create' | 'read' | 'update' | 'delete' | 'import' | 'assign' | 'toggle' | 'trigger' | 'view';

const ROLE_PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
    ADMIN: {
        spaces: ['create', 'read', 'update', 'delete'],
        people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
        conference: ['create', 'read', 'update', 'delete', 'toggle'],
        settings: ['read', 'update'],
        users: ['create', 'read', 'update', 'delete'],
        audit: ['read'],
        sync: ['trigger', 'view'],
    },
    MANAGER: {
        spaces: ['create', 'read', 'update', 'delete'],
        people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
        conference: ['create', 'read', 'update', 'delete', 'toggle'],
        settings: ['read'],
        sync: ['trigger', 'view'],
    },
    VIEWER: {
        spaces: ['read'],
        people: ['read'],
        conference: ['read'],
        sync: ['view'],
    },
};

export const requirePermission = (resource: Resource, action: Action) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        const permissions = ROLE_PERMISSIONS[req.user.role];
        const resourcePermissions = permissions[resource] || [];

        if (!resourcePermissions.includes(action)) {
            next(forbidden(`Permission denied: ${action} on ${resource}`));
            return;
        }

        next();
    };
};
