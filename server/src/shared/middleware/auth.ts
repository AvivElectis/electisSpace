import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../../config/index.js';
import { unauthorized, forbidden } from './errorHandler.js';
import { GlobalRole } from '@prisma/client';
import type { Resource, Action, PermissionsMap } from '../../features/roles/types.js';

// Store access info
interface StoreAccess {
    id: string;
    roleId: string;
    companyId: string;
}

// Company access info
interface CompanyAccess {
    id: string;
    role: string;
    allStoresAccess?: boolean;
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

// ---- Role permissions cache ----
const ROLE_CACHE_TTL_MS = 60_000;
const rolePermissionsCache = new Map<string, { permissions: PermissionsMap; expiresAt: number }>();

async function getRolePermissions(roleId: string): Promise<PermissionsMap> {
    const cached = rolePermissionsCache.get(roleId);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.permissions;
    }
    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { permissions: true },
    });
    const permissions = (role?.permissions || {}) as PermissionsMap;
    rolePermissionsCache.set(roleId, { permissions, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
    return permissions;
}

/** Invalidate role permissions cache (call after role update) */
export function invalidateRoleCache(roleId?: string): void {
    if (roleId) rolePermissionsCache.delete(roleId);
    else rolePermissionsCache.clear();
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
                        roleId: true,
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
                        allStoresAccess: true,
                    }
                }
            },
        });

        if (!user || !user.isActive) {
            throw unauthorized('User not found or inactive');
        }

        // Build user context
        const stores: StoreAccess[] = user.userStores.map(us => ({
            id: us.storeId,
            roleId: us.roleId,
            companyId: us.store.companyId,
        }));

        const companies: CompanyAccess[] = user.userCompanies.map(uc => ({
            id: uc.companyId,
            role: uc.role,
            allStoresAccess: uc.allStoresAccess,
        }));

        // For companies where user has allStoresAccess, expand into stores array
        // so all downstream services that check req.user.stores work correctly.
        const allStoresCompanyIds = companies
            .filter(c => c.allStoresAccess)
            .map(c => c.id);

        if (allStoresCompanyIds.length > 0) {
            const existingStoreIds = new Set(stores.map(s => s.id));
            const companyStores = await prisma.store.findMany({
                where: { companyId: { in: allStoresCompanyIds }, isActive: true },
                select: { id: true, companyId: true },
            });
            for (const cs of companyStores) {
                if (!existingStoreIds.has(cs.id)) {
                    stores.push({
                        id: cs.id,
                        roleId: 'role-admin',  // Company admins with allStoresAccess get admin role
                        companyId: cs.companyId,
                    });
                }
            }
        }

        const userContext: UserContext = {
            id: user.id,
            email: user.email,
            globalRole: user.globalRole,
            stores,
            companies,
        };

        // Cache and attach to request
        setCachedUser(user.id, userContext);
        req.user = userContext;

        next();
    } catch (error) {
        next(error);
    }
};

// Global-role authorization middleware
export const requireGlobalRole = (...allowedRoles: GlobalRole[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        if (!req.user.globalRole || !allowedRoles.includes(req.user.globalRole)) {
            next(forbidden('Insufficient global role'));
            return;
        }

        next();
    };
};

// Role-based authorization middleware (checks by role name from DB)
export const authorize = (...allowedRoleNames: string[]) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        // Platform admin has all access
        if (req.user.globalRole === GlobalRole.PLATFORM_ADMIN) {
            next();
            return;
        }

        // Look up role names for user's stores
        for (const store of req.user.stores) {
            const role = await prisma.role.findUnique({
                where: { id: store.roleId },
                select: { name: true },
            });
            if (role && allowedRoleNames.includes(role.name)) {
                next();
                return;
            }
        }

        next(forbidden('Insufficient permissions'));
    };
};

// Permission-based authorization (DB-backed)
export const requirePermission = (resource: Resource, action: Action) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            next(unauthorized('Authentication required'));
            return;
        }

        // Platform admin has all permissions
        if (req.user.globalRole === GlobalRole.PLATFORM_ADMIN) {
            next();
            return;
        }

        // Check store role permissions
        for (const store of req.user.stores) {
            const permissions = await getRolePermissions(store.roleId);
            const resourcePerms = permissions[resource] || [];
            if (resourcePerms.includes(action)) {
                next();
                return;
            }
        }

        // Fallback: allStoresAccess companies get admin permissions
        for (const company of req.user.companies) {
            if (company.allStoresAccess) {
                const adminPerms = await getRolePermissions('role-admin');
                if (adminPerms[resource]?.includes(action)) {
                    next();
                    return;
                }
            }
        }

        next(forbidden(`Permission denied: ${action} on ${resource}`));
    };
};
