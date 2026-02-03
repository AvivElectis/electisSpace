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

// Field mapping validation schemas
const solumFieldMappingSchema = z.object({
    friendlyNameEn: z.string(),
    friendlyNameHe: z.string(),
    visible: z.boolean(),
});

const conferenceMappingSchema = z.object({
    meetingName: z.string(),
    meetingTime: z.string(),
    participants: z.string(),
});

const fieldMappingConfigSchema = z.object({
    uniqueIdField: z.string().min(1),
    fields: z.record(solumFieldMappingSchema),
    conferenceMapping: conferenceMappingSchema,
    globalFieldAssignments: z.record(z.string()).optional(),
    mappingInfo: z.object({
        articleIdField: z.string().optional(),
        articleNameField: z.string().optional(),
    }).optional(),
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

// ===================
// Field Mapping Routes (Company-Level)
// ===================

/**
 * GET /settings/company/:companyId/field-mappings
 * Get field mapping configuration for a company
 * Field mappings are now stored at the company level, not store level
 */
router.get('/company/:companyId/field-mappings', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;

        // Get company with access check
        let company;
        if (isPlatformAdmin(req)) {
            company = await prisma.company.findUnique({ where: { id: companyId } });
        } else {
            const userCompany = await prisma.userCompany.findFirst({
                where: { userId, companyId },
                include: { company: true },
            });
            company = userCompany?.company;
        }

        if (!company) {
            throw notFound('Company not found or access denied');
        }

        const settings = company.settings as Record<string, any> || {};
        const fieldMappings = settings.solumMappingConfig || {
            uniqueIdField: '',
            fields: {},
            conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
            globalFieldAssignments: {},
        };

        res.json({
            companyId: company.id,
            fieldMappings,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /settings/company/:companyId/field-mappings
 * Update field mapping configuration for a company
 * Field mappings are now stored at the company level
 */
router.put('/company/:companyId/field-mappings', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;
        const fieldMappings = fieldMappingConfigSchema.parse(req.body);

        // Get company with access check
        let company;
        let hasWriteAccess = false;
        
        if (isPlatformAdmin(req)) {
            company = await prisma.company.findUnique({ where: { id: companyId } });
            hasWriteAccess = true;
        } else {
            const userCompany = await prisma.userCompany.findFirst({
                where: { userId, companyId },
                include: { company: true },
            });
            company = userCompany?.company;
            hasWriteAccess = userCompany?.role === 'COMPANY_ADMIN';
        }

        if (!company) {
            throw notFound('Company not found or access denied');
        }

        if (!hasWriteAccess) {
            throw forbidden('Insufficient permissions to update field mappings');
        }

        // Merge with existing settings
        const currentSettings = company.settings as Record<string, any> || {};
        const updatedSettings = {
            ...currentSettings,
            solumMappingConfig: fieldMappings,
        };

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                settings: updatedSettings,
                updatedAt: new Date(),
            },
        });

        res.json({
            companyId: updatedCompany.id,
            fieldMappings,
            message: 'Field mappings updated successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /settings/company/:companyId/aims-config
 * Get AIMS configuration for a company (without sensitive data)
 */
router.get('/company/:companyId/aims-config', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;

        // Get company with access check
        let company;
        if (isPlatformAdmin(req)) {
            company = await prisma.company.findUnique({ where: { id: companyId } });
        } else {
            const userCompany = await prisma.userCompany.findFirst({
                where: { userId, companyId },
                include: { company: true },
            });
            company = userCompany?.company;
        }

        if (!company) {
            throw notFound('Company not found or access denied');
        }

        res.json({
            companyId: company.id,
            aimsConfig: {
                configured: !!(company.aimsBaseUrl && company.aimsUsername),
                baseUrl: company.aimsBaseUrl,
                cluster: company.aimsCluster,
                username: company.aimsUsername,
                hasPassword: !!company.aimsPasswordEnc,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /settings/company/:companyId/aims-test
 * Test AIMS connection for a company
 * Tests the saved AIMS credentials by attempting to authenticate
 */
router.post('/company/:companyId/aims-test', async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user!.id;

        // Platform admin or company admin can test connection
        let company;
        if (isPlatformAdmin(req)) {
            company = await prisma.company.findUnique({ where: { id: companyId } });
        } else {
            const userCompany = await prisma.userCompany.findFirst({
                where: { 
                    userId, 
                    companyId,
                    role: 'COMPANY_ADMIN',
                },
                include: { company: true },
            });
            company = userCompany?.company;
        }

        if (!company) {
            throw notFound('Company not found or access denied');
        }

        // Check if AIMS is configured
        if (!company.aimsBaseUrl || !company.aimsUsername || !company.aimsPasswordEnc) {
            res.json({
                success: false,
                message: 'AIMS credentials not configured',
                configured: false,
            });
            return;
        }

        // Import encryption utility and solum service dynamically to avoid circular deps
        const { decrypt } = await import('../../shared/utils/encryption.js');
        const { config } = await import('../../config/index.js');
        const { solumService } = await import('../../shared/infrastructure/services/solumService.js');

        // Decrypt password
        let password: string;
        try {
            password = decrypt(company.aimsPasswordEnc, config.encryptionKey);
        } catch (error) {
            console.error('[AIMS Test] Failed to decrypt password:', error);
            res.json({
                success: false,
                message: 'Failed to decrypt stored credentials',
                configured: true,
            });
            return;
        }

        // Create config and test connection
        const solumConfig = {
            baseUrl: company.aimsBaseUrl,
            cluster: company.aimsCluster || undefined,
            companyName: company.code,
            username: company.aimsUsername,
            password,
        };

        // Test health endpoint
        const isHealthy = await solumService.checkHealth(solumConfig);
        
        if (isHealthy) {
            res.json({
                success: true,
                message: 'AIMS connection successful',
                configured: true,
            });
        } else {
            res.json({
                success: false,
                message: 'AIMS server not reachable or credentials invalid',
                configured: true,
            });
        }
    } catch (error: any) {
        console.error('[AIMS Test] Connection test failed:', error);
        res.json({
            success: false,
            message: error.message || 'Connection test failed',
            configured: true,
        });
    }
});

export default router;
