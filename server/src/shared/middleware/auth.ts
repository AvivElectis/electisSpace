import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../../config/index.js';
import { unauthorized, forbidden } from './errorHandler.js';
import { GlobalRole, StoreRole } from '@prisma/client';

// Store access info
interface StoreAccess {
    id: string;
    role: StoreRole;
    companyId: string;
}

// Company access info
interface CompanyAccess {
    id: string;
    role: string;
}

// User context as attached to request
interface UserContext {
    id: string;
    email: string;
    globalRole: GlobalRole | null;
    stores: StoreAccess[];
    companies: CompanyAccess[];
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: UserContext;
        }
    }
}

// JWT payload interface
interface JwtPayload {
    sub: string;
    globalRole: GlobalRole | null;
    stores: StoreAccess[];
    companies: CompanyAccess[];
    iat: number;
    exp: number;
}

// ---- User context cache ----
// Reduces DB queries: each user's context is cached for up to 60 seconds.
// Cache is keyed by userId. Entries auto-expire after USER_CACHE_TTL_MS.
const USER_CACHE_TTL_MS = 60_000;
const USER_CACHE_MAX_SIZE = 500;

interface CachedUser {
    context: UserContext;
    expiresAt: number;
}

const userCache = new Map<string, CachedUser>();

function getCachedUser(userId: string): UserContext | null {
    const entry = userCache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        userCache.delete(userId);
        return null;
    }
    return entry.context;
}

function setCachedUser(userId: string, context: UserContext): void {
    // Evict oldest entries if cache is full
    if (userCache.size >= USER_CACHE_MAX_SIZE) {
        const firstKey = userCache.keys().next().value;
        if (firstKey) userCache.delete(firstKey);
    }
    userCache.set(userId, {
        context,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
    });
}

/** Invalidate a user's cached context (call after role/store changes) */
export function invalidateUserCache(userId: string): void {
    userCache.delete(userId);
}

// Authentication middleware
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        // Support token from query param (for SSE EventSource which can't set headers)
        const queryToken = req.query.token as string | undefined;

        let token: string;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (queryToken) {
            token = queryToken;
        } else {
            throw unauthorized('No token provided');
        }

        // Verify token
        const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

        // Check cache first
        const cached = getCachedUser(payload.sub);
        if (cached) {
            req.user = cached;
            next();
            return;
        }

        // Get user from database with stores and companies
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                globalRole: true,
                isActive: true,
                userStores: {
                    select: {
                        storeId: true,
                        role: true,
                        store: {
                            select: {
                                companyId: true,
                            }
                        }
                    }
                },
                userCompanies: {
                    select: {
                        companyId: true,
                        role: true,
                    }
                }
            },
        });

        if (!user || !user.isActive) {
            throw unauthorized('User not found or inactive');
        }

        // Build user context
        const userContext: UserContext = {
            id: user.id,
            email: user.email,
            globalRole: user.globalRole,
            stores: user.userStores.map(us => ({
                id: us.storeId,
                role: us.role,
                companyId: us.store.companyId,
            })),
            companies: user.userCompanies.map(uc => ({
                id: uc.companyId,
                role: uc.role,
            })),
        };

        // Cache and attach to request
        setCachedUser(user.id, userContext);
        req.user = userContext;

        next();
    } catch (error) {
        next(error);
    }
};

// Role-based authorization middleware (for backward compatibility)
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        // Platform admin has all access
        if (req.user.globalRole === GlobalRole.PLATFORM_ADMIN) {
            next();
            return;
        }

        // Check if user has any of the allowed store roles
        const hasRole = req.user.stores.some(s => allowedRoles.includes(s.role));
        if (!hasRole) {
            next(forbidden('Insufficient permissions'));
            return;
        }

        next();
    };
};

// Permission-based authorization
type Resource = 'spaces' | 'people' | 'conference' | 'settings' | 'users' | 'audit' | 'sync' | 'labels';
type Action = 'create' | 'read' | 'update' | 'delete' | 'import' | 'assign' | 'toggle' | 'trigger' | 'view' | 'manage';

const STORE_ROLE_PERMISSIONS: Record<StoreRole, Partial<Record<Resource, Action[]>>> = {
    STORE_ADMIN: {
        spaces: ['create', 'read', 'update', 'delete'],
        people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
        conference: ['create', 'read', 'update', 'delete', 'toggle'],
        settings: ['read', 'update'],
        users: ['create', 'read', 'update', 'delete'],
        audit: ['read'],
        sync: ['trigger', 'view'],
        labels: ['view', 'manage'],
    },
    STORE_MANAGER: {
        spaces: ['create', 'read', 'update', 'delete'],
        people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
        conference: ['create', 'read', 'update', 'delete', 'toggle'],
        settings: ['read'],
        sync: ['trigger', 'view'],
        labels: ['view', 'manage'],
    },
    STORE_EMPLOYEE: {
        spaces: ['read', 'update'],
        people: ['read', 'update'],
        conference: ['read', 'update'],
        sync: ['view'],
        labels: ['view'],
    },
    STORE_VIEWER: {
        spaces: ['read'],
        people: ['read'],
        conference: ['read'],
        sync: ['view'],
        labels: ['view'],
    },
};

export const requirePermission = (resource: Resource, action: Action) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        // Platform admin has all permissions
        if (req.user.globalRole === GlobalRole.PLATFORM_ADMIN) {
            next();
            return;
        }

        // Check if any store role has the required permission
        const hasPermission = req.user.stores.some(s => {
            const permissions = STORE_ROLE_PERMISSIONS[s.role];
            const resourcePermissions = permissions[resource] || [];
            return resourcePermissions.includes(action);
        });

        if (!hasPermission) {
            next(forbidden(`Permission denied: ${action} on ${resource}`));
            return;
        }

        next();
    };
};

