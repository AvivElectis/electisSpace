import { Router } from 'express';
import { z } from 'zod';
import { GlobalRole } from '@prisma/client';
import { prisma } from '../../config/index.js';
import { authenticate, notFound, badRequest, forbidden } from '../../shared/middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to check if user is platform admin
const isPlatformAdmin = (req: any): boolean => {
    return req.user?.globalRole === GlobalRole.PLATFORM_ADMIN;
};

// Validation schemas
const updateSettingsSchema = z.object({
    settings: z.record(z.any()),
});

/**
 * GET /settings/store/:storeId - Get settings for a store
 * Returns the store's settings JSON
 */
router.get('/store/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const userId = req.user!.id;

        // Platform admins can access any store
        if (isPlatformAdmin(req)) {
            const store = await prisma.store.findUnique({
                where: { id: storeId },
            });
            
            if (!store) {
                throw notFound('Store');
            }
            
            res.json({
                storeId: store.id,
                storeName: store.name,
                storeCode: store.code,
                settings: store.settings || {},
            });
            return;
        }

        // Verify user has access to this store
        const userStore = await prisma.userStore.findFirst({
            where: {
                userId,
                storeId,
            },
            include: {
                store: true,
            },
        });

        if (!userStore) {
            throw notFound('Store not found or access denied');
        }

        res.json({
            storeId: userStore.store.id,
            storeName: userStore.store.name,
            storeCode: userStore.store.code,
            settings: userStore.store.settings || {},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /settings/store/:storeId - Update settings for a store
 * Saves the entire settings object to the store
 */
router.put('/store/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const userId = req.user!.id;
        const { settings } = updateSettingsSchema.parse(req.body);

        // Platform admins can update any store's settings
        if (isPlatformAdmin(req)) {
            const store = await prisma.store.findUnique({
                where: { id: storeId },
            });
            
            if (!store) {
                throw notFound('Store');
            }
            
            const updatedStore = await prisma.store.update({
                where: { id: storeId },
                data: {
                    settings,
                    updatedAt: new Date(),
                },
            });
            
            res.json({
                storeId: updatedStore.id,
                settings: updatedStore.settings,
                message: 'Settings updated successfully',
            });
            return;
        }

        // Verify user has access to this store with appropriate role
        const userStore = await prisma.userStore.findFirst({
            where: {
                userId,
                storeId,
            },
        });

        if (!userStore) {
            throw notFound('Store not found or access denied');
        }

        // Check if user has permission to update settings (STORE_ADMIN or STORE_MANAGER)
        const allowedRoles = ['STORE_ADMIN', 'STORE_MANAGER'];
        if (!allowedRoles.includes(userStore.role)) {
            throw forbidden('Insufficient permissions to update settings');
        }

        // Update store settings
        const updatedStore = await prisma.store.update({
            where: { id: storeId },
            data: {
                settings,
                updatedAt: new Date(),
            },
        });

        res.json({
            storeId: updatedStore.id,
            settings: updatedStore.settings,
            message: 'Settings updated successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /settings/company/:companyId - Get company-wide settings
 * Returns the company's settings JSON
 */
router.get('/company/:companyId', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;

        // Platform admins can access any company
        if (isPlatformAdmin(req)) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            
            if (!company) {
                throw notFound('Company');
            }
            
            res.json({
                companyId: company.id,
                companyName: company.name,
                companyCode: company.code,
                settings: company.settings || {},
            });
            return;
        }

        // Verify user has access to this company
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId,
                companyId,
            },
            include: {
                company: true,
            },
        });

        if (!userCompany) {
            throw notFound('Company not found or access denied');
        }

        res.json({
            companyId: userCompany.company.id,
            companyName: userCompany.company.name,
            companyCode: userCompany.company.code,
            settings: userCompany.company.settings || {},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /settings/company/:companyId - Update company-wide settings
 * Only COMPANY_ADMIN or PLATFORM_ADMIN can update company settings
 */
router.put('/company/:companyId', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;
        const { settings } = updateSettingsSchema.parse(req.body);

        // Platform admins can update any company's settings
        if (isPlatformAdmin(req)) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            
            if (!company) {
                throw notFound('Company');
            }
            
            const updatedCompany = await prisma.company.update({
                where: { id: companyId },
                data: {
                    settings,
                    updatedAt: new Date(),
                },
            });
            
            res.json({
                companyId: updatedCompany.id,
                settings: updatedCompany.settings,
                message: 'Company settings updated successfully',
            });
            return;
        }

        // Verify user has COMPANY_ADMIN access
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId,
                companyId,
            },
        });

        if (!userCompany) {
            throw notFound('Company not found or access denied');
        }

        if (userCompany.role !== 'COMPANY_ADMIN') {
            throw forbidden('Only company admins can update company settings');
        }

        // Update company settings
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                settings,
                updatedAt: new Date(),
            },
        });

        res.json({
            companyId: updatedCompany.id,
            settings: updatedCompany.settings,
            message: 'Company settings updated successfully',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
