import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { GlobalRole, CompanyRole, StoreRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Validation Schemas
// ======================

// Store code: numeric string like "01", "002", "200"
const storeCodeSchema = z.string()
    .min(1, 'Store code is required')
    .max(10, 'Store code must be at most 10 characters')
    .regex(/^\d+$/, 'Store code must contain only digits');

const createStoreSchema = z.object({
    code: storeCodeSchema,
    name: z.string().min(1).max(100),
    timezone: z.string().max(50).default('UTC'),
    syncEnabled: z.boolean().default(true),
});

const updateStoreSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    timezone: z.string().max(50).optional(),
    syncEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

// ======================
// Helper Functions
// ======================

const isPlatformAdmin = (req: any): boolean => {
    return req.user?.globalRole === GlobalRole.PLATFORM_ADMIN;
};

// Check if user can manage a company (create/delete stores)
const canManageCompany = (req: any, companyId: string): boolean => {
    if (isPlatformAdmin(req)) return true;
    
    const companyAccess = req.user?.companies?.find((c: any) => c.id === companyId);
    return companyAccess?.role === CompanyRole.COMPANY_ADMIN;
};

// Check if user can manage a specific store
const canManageStore = (req: any, storeId: string): boolean => {
    if (isPlatformAdmin(req)) return true;
    
    const storeAccess = req.user?.stores?.find((s: any) => s.id === storeId);
    if (storeAccess?.role === StoreRole.STORE_ADMIN) return true;
    
    // Also check if user is company admin with allStoresAccess
    // (This would require additional logic to check the store's company)
    return false;
};

// Check if user has any access to a store
const hasStoreAccess = (req: any, storeId: string, companyId?: string): boolean => {
    if (isPlatformAdmin(req)) return true;
    
    // Direct store access
    if (req.user?.stores?.some((s: any) => s.id === storeId)) return true;
    
    // Company-wide access
    if (companyId) {
        const companyAccess = req.user?.companies?.find((c: any) => c.id === companyId);
        if (companyAccess?.allStoresAccess) return true;
    }
    
    return false;
};

// ======================
// Routes
// ======================

/**
 * GET /companies/:companyId/stores
 * List stores in a company
 */
router.get('/companies/:companyId/stores', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        
        // Verify company exists and user has access
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, code: true, name: true }
        });
        
        if (!company) {
            throw notFound('Company');
        }
        
        // Check access
        if (!isPlatformAdmin(req)) {
            const hasAccess = req.user?.companies?.some((c: any) => c.id === companyId);
            if (!hasAccess) {
                throw forbidden('You do not have access to this company');
            }
        }
        
        // Get user's store access for this company
        const userCompany = await prisma.userCompany.findUnique({
            where: { userId_companyId: { userId: req.user!.id, companyId } },
            select: { allStoresAccess: true }
        });
        const allStoresAccess = isPlatformAdmin(req) || userCompany?.allStoresAccess;
        const userStoreIds = req.user?.stores?.map((s: any) => s.id) || [];
        
        const stores = await prisma.store.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true }
                },
                userStores: {
                    where: { userId: req.user!.id },
                    select: { role: true, features: true }
                }
            },
            orderBy: { code: 'asc' }
        });
        
        // Filter stores based on access (unless allStoresAccess)
        const accessibleStores = stores
            .filter(s => allStoresAccess || userStoreIds.includes(s.id))
            .map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                timezone: s.timezone,
                syncEnabled: s.syncEnabled,
                lastAimsSyncAt: s.lastAimsSyncAt,
                isActive: s.isActive,
                spaceCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomCount: s._count.conferenceRooms,
                userRole: s.userStores[0]?.role || (allStoresAccess ? 'COMPANY_WIDE_ACCESS' : null),
                userFeatures: s.userStores[0]?.features || (allStoresAccess ? ['dashboard', 'spaces', 'conference', 'people'] : []),
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            }));
        
        res.json({
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
            },
            stores: accessibleStores,
            allStoresAccess,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /companies/:companyId/stores/validate-code/:code
 * Validate if a store code is available within a company
 */
router.get('/companies/:companyId/stores/validate-code/:code', async (req, res, next) => {
    try {
        const { companyId, code } = req.params;
        
        // Validate format
        const validation = storeCodeSchema.safeParse(code);
        if (!validation.success) {
            return res.json({ 
                available: false, 
                reason: validation.error.errors[0].message 
            });
        }
        
        const existing = await prisma.store.findUnique({
            where: { 
                companyId_code: { companyId, code }
            },
            select: { id: true }
        });
        
        res.json({ 
            available: !existing,
            reason: existing ? 'Store code already exists in this company' : null
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stores/:id
 * Get store details
 */
router.get('/stores/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const store = await prisma.store.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, code: true, name: true }
                },
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true, userStores: true }
                },
                userStores: {
                    where: { userId: req.user!.id },
                    select: { role: true, features: true }
                }
            }
        });
        
        if (!store) {
            throw notFound('Store');
        }
        
        // Check access
        if (!hasStoreAccess(req, id, store.companyId)) {
            throw forbidden('You do not have access to this store');
        }
        
        res.json({
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                lastAimsSyncAt: store.lastAimsSyncAt,
                isActive: store.isActive,
                spaceCount: store._count.spaces,
                peopleCount: store._count.people,
                conferenceRoomCount: store._count.conferenceRooms,
                userCount: store._count.userStores,
                userRole: store.userStores[0]?.role,
                userFeatures: store.userStores[0]?.features,
                createdAt: store.createdAt,
                updatedAt: store.updatedAt,
            },
            company: store.company,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /companies/:companyId/stores
 * Create a new store in a company
 */
router.post('/companies/:companyId/stores', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        
        // Verify company exists
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, code: true }
        });
        
        if (!company) {
            throw notFound('Company');
        }
        
        // Check permission to create stores
        if (!canManageCompany(req, companyId)) {
            throw forbidden('You do not have permission to create stores in this company');
        }
        
        const validation = createStoreSchema.safeParse(req.body);
        if (!validation.success) {
            throw badRequest(validation.error.errors[0].message);
        }
        
        const { code, name, timezone, syncEnabled } = validation.data;
        
        // Check code uniqueness within company
        const existing = await prisma.store.findUnique({
            where: { companyId_code: { companyId, code } }
        });
        
        if (existing) {
            throw conflict('Store code already exists in this company');
        }
        
        const store = await prisma.store.create({
            data: {
                companyId,
                code,
                name,
                timezone,
                syncEnabled,
            },
            include: {
                _count: {
                    select: { spaces: true, people: true }
                }
            }
        });
        
        res.status(201).json({
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                isActive: store.isActive,
                spaceCount: store._count.spaces,
                peopleCount: store._count.people,
                createdAt: store.createdAt,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /stores/:id
 * Update store
 */
router.patch('/stores/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Get store to check company
        const existingStore = await prisma.store.findUnique({
            where: { id },
            select: { companyId: true }
        });
        
        if (!existingStore) {
            throw notFound('Store');
        }
        
        // Check permission (store admin or company admin)
        if (!canManageStore(req, id) && !canManageCompany(req, existingStore.companyId)) {
            throw forbidden('You do not have permission to update this store');
        }
        
        const validation = updateStoreSchema.safeParse(req.body);
        if (!validation.success) {
            throw badRequest(validation.error.errors[0].message);
        }
        
        const store = await prisma.store.update({
            where: { id },
            data: validation.data,
        });
        
        res.json({
            store: {
                id: store.id,
                code: store.code,
                name: store.name,
                timezone: store.timezone,
                syncEnabled: store.syncEnabled,
                isActive: store.isActive,
                updatedAt: store.updatedAt,
            }
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw notFound('Store');
        }
        next(error);
    }
});

/**
 * DELETE /stores/:id
 * Delete a store
 */
router.delete('/stores/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Get store to check company
        const store = await prisma.store.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { spaces: true, people: true, conferenceRooms: true }
                }
            }
        });
        
        if (!store) {
            throw notFound('Store');
        }
        
        // Only company admins or platform admins can delete stores
        if (!canManageCompany(req, store.companyId)) {
            throw forbidden('You do not have permission to delete this store');
        }
        
        // Warn about cascading deletes
        const totalEntities = store._count.spaces + store._count.people + store._count.conferenceRooms;
        if (totalEntities > 0) {
            console.warn(`Deleting store ${store.code} with ${totalEntities} entities`);
        }
        
        await prisma.store.delete({
            where: { id }
        });
        
        res.json({ 
            success: true,
            message: `Store ${store.code} deleted`,
            deletedSpaces: store._count.spaces,
            deletedPeople: store._count.people,
            deletedConferenceRooms: store._count.conferenceRooms,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw notFound('Store');
        }
        next(error);
    }
});

export default router;
