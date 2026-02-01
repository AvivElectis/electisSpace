import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, notFound, badRequest } from '../../shared/middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
            storeNumber: userStore.store.storeNumber,
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
            throw badRequest('Insufficient permissions to update settings');
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
            aimsCompanyCode: userCompany.company.aimsCompanyCode,
            settings: userCompany.company.settings || {},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /settings/company/:companyId - Update company-wide settings
 * Only COMPANY_ADMIN can update company settings
 */
router.put('/company/:companyId', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;
        const { settings } = updateSettingsSchema.parse(req.body);

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
            throw badRequest('Only company admins can update company settings');
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
