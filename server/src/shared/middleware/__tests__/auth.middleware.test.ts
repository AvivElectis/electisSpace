/**
 * Auth Middleware - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../../config/index.js', () => ({
    config: { jwt: { accessSecret: 'test-secret-32-chars-longenough!!' } },
    prisma: {
        user: { findUnique: vi.fn() },
        store: { findMany: vi.fn() },
        role: { findUnique: vi.fn() },
    },
}));

vi.mock('jsonwebtoken', () => ({
    default: { verify: vi.fn() },
}));

import jwt from 'jsonwebtoken';
import { authenticate, authorize, requireGlobalRole, requirePermission } from '../auth.js';
import { prisma } from '../../../config/index.js';

function createMocks(overrides: Partial<Request> = {}) {
    const req = { headers: {}, query: {}, user: undefined, ...overrides } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
}

describe('authenticate', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should reject when no token', async () => {
        const { req, res, next } = createMocks();
        await authenticate(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('No token') }));
    });

    it('should authenticate valid Bearer token', async () => {
        const { req, res, next } = createMocks({ headers: { authorization: 'Bearer valid-token' } as any });
        (jwt.verify as any).mockReturnValue({ sub: 'user-1', globalRole: 'PLATFORM_ADMIN', stores: [], companies: [] });
        (prisma.user.findUnique as any).mockResolvedValue({
            id: 'user-1', email: 'test@test.com', globalRole: 'PLATFORM_ADMIN', isActive: true,
            userStores: [], userCompanies: [],
        });

        await authenticate(req, res, next);
        expect(next).toHaveBeenCalledWith();
        expect(req.user!.id).toBe('user-1');
    });

    it('should reject inactive user', async () => {
        const { req, res, next } = createMocks({ headers: { authorization: 'Bearer token' } as any });
        (jwt.verify as any).mockReturnValue({ sub: 'user-3' });
        (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-3', isActive: false, userStores: [], userCompanies: [] });
        await authenticate(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('not found or inactive') }));
    });
});

describe('requireGlobalRole', () => {
    it('should pass for matching role', () => {
        const mw = requireGlobalRole('PLATFORM_ADMIN' as any);
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: 'PLATFORM_ADMIN' as any, stores: [], companies: [] };
        mw(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-matching role', () => {
        const mw = requireGlobalRole('PLATFORM_ADMIN' as any);
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: null, stores: [], companies: [] };
        mw(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('global role') }));
    });
});

describe('authorize', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should allow PLATFORM_ADMIN', async () => {
        const mw = authorize('Admin');
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: 'PLATFORM_ADMIN' as any, stores: [], companies: [] };
        await mw(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-matching role', async () => {
        const mw = authorize('Admin');
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: null, stores: [{ id: 's1', roleId: 'role-viewer', companyId: 'c1' }], companies: [] };
        (prisma.role.findUnique as any).mockResolvedValue({ name: 'Viewer' });
        await mw(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('permissions') }));
    });
});

describe('requirePermission', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should allow PLATFORM_ADMIN any permission', async () => {
        const mw = requirePermission('spaces', 'delete');
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: 'PLATFORM_ADMIN' as any, stores: [], companies: [] };
        await mw(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('should deny viewer write access', async () => {
        const mw = requirePermission('spaces', 'create');
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: null, stores: [{ id: 's1', roleId: 'role-viewer', companyId: 'c1' }], companies: [] };
        (prisma.role.findUnique as any).mockResolvedValue({
            permissions: { spaces: ['view'], people: ['view'] },
        });
        await mw(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Permission denied') }));
    });

    it('should allow allStoresAccess company user', async () => {
        const mw = requirePermission('users', 'create');
        const { req, res, next } = createMocks();
        req.user = { id: '1', email: 'a@b.com', globalRole: null, stores: [], companies: [{ id: 'c1', roleId: 'role-admin', allStoresAccess: true }] };
        (prisma.role.findUnique as any).mockResolvedValue({
            permissions: { users: ['view', 'create', 'edit', 'delete'] },
        });
        await mw(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });
});
