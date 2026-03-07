/**
 * Settings Feature - Controller
 * 
 * @description HTTP request/response handling for settings management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, badRequest, forbidden } from '../../shared/middleware/index.js';
import { settingsService } from './service.js';
import { updateSettingsSchema, fieldMappingConfigSchema, articleFormatSchema } from './types.js';
import type { SettingsUserContext } from './types.js';
import { workConfigSchema, storeAddressSchema } from '../companies/types.js';
import { prisma } from '../../config/index.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): SettingsUserContext {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
        companies: req.user!.companies,
    };
}

// ======================
// Controller
// ======================

export const settingsController = {
    // ======================
    // Store Settings
    // ======================

    /**
     * GET /settings/store/:storeId
     * Get settings for a store
     */
    async getStoreSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const user = getUserContext(req);

            const result = await settingsService.getStoreSettings(storeId, user);
            res.json(result);
        } catch (error: any) {
            // Graceful defaults for stale sessions referencing deleted stores
            if (error.message === 'STORE_NOT_FOUND' || error.message === 'STORE_NOT_FOUND_OR_DENIED') {
                return res.json({ storeId: req.params.storeId, storeName: '', storeCode: '', settings: {} });
            }
            next(error);
        }
    },

    /**
     * PUT /settings/store/:storeId
     * Update settings for a store
     */
    async updateStoreSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateSettingsSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const storeId = req.params.storeId as string;
            const user = getUserContext(req);
            
            const result = await settingsService.updateStoreSettings(storeId, validation.data.settings, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'STORE_NOT_FOUND_OR_DENIED') return next(notFound('Store not found or access denied'));
            if (error.message === 'FORBIDDEN') return next(forbidden('Insufficient permissions to update settings'));
            next(error);
        }
    },

    // ======================
    // Company Settings
    // ======================

    /**
     * GET /settings/company/:companyId
     * Get company-wide settings
     */
    async getCompanySettings(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.getCompanySettings(companyId, user);
            res.json(result);
        } catch (error: any) {
            // Graceful defaults for stale sessions referencing deleted companies
            if (error.message === 'COMPANY_NOT_FOUND' || error.message === 'COMPANY_NOT_FOUND_OR_DENIED') {
                return res.json({ companyId: req.params.companyId, settings: {} });
            }
            next(error);
        }
    },

    /**
     * PUT /settings/company/:companyId
     * Update company-wide settings
     */
    async updateCompanySettings(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateSettingsSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const companyId = req.params.companyId as string;
            const user = getUserContext(req);
            
            const result = await settingsService.updateCompanySettings(companyId, validation.data.settings, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
            if (error.message === 'FORBIDDEN_NOT_ADMIN') return next(forbidden('Only company admins can update company settings'));
            next(error);
        }
    },

    // ======================
    // Field Mappings (Company-Level)
    // ======================

    /**
     * GET /settings/company/:companyId/field-mappings
     * Get field mapping configuration for a company
     */
    async getFieldMappings(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.getFieldMappings(companyId, user);
            res.json(result);
        } catch (error: any) {
            // Graceful defaults for stale sessions
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') {
                return res.json({ companyId: req.params.companyId, fieldMappings: null });
            }
            next(error);
        }
    },

    /**
     * PUT /settings/company/:companyId/field-mappings
     * Update field mapping configuration for a company
     */
    async updateFieldMappings(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = fieldMappingConfigSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const companyId = req.params.companyId as string;
            const user = getUserContext(req);
            
            const result = await settingsService.updateFieldMappings(companyId, validation.data, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
            if (error.message === 'FORBIDDEN') return next(forbidden('Insufficient permissions to update field mappings'));
            next(error);
        }
    },

    // ======================
    // Article Format (Company-Level)
    // ======================

    /**
     * GET /settings/company/:companyId/article-format
     * Get article format for a company (from DB, or fetches from AIMS if not stored)
     */
    async getArticleFormat(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.getArticleFormat(companyId, user);
            res.json(result);
        } catch (error: any) {
            // Graceful defaults for stale sessions or unconfigured companies
            if (
                error.message === 'COMPANY_NOT_FOUND_OR_DENIED' ||
                error.message === 'AIMS_NOT_CONFIGURED' ||
                error.message === 'NO_STORE_FOR_COMPANY'
            ) {
                return res.json({ companyId: req.params.companyId, format: null });
            }
            if (error.message === 'AIMS_FORMAT_FETCH_FAILED') return next(badRequest('Failed to fetch article format from AIMS'));
            next(error);
        }
    },

    /**
     * PUT /settings/company/:companyId/article-format
     * Update article format for a company (saves to DB + pushes to AIMS)
     */
    async updateArticleFormat(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = articleFormatSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.updateArticleFormat(companyId, validation.data, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
            if (error.message === 'FORBIDDEN') return next(forbidden('Insufficient permissions to update article format'));
            next(error);
        }
    },

    // ======================
    // AIMS Configuration
    // ======================

    /**
     * GET /settings/company/:companyId/aims-config
     * Get AIMS configuration for a company
     */
    async getAimsConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.getAimsConfig(companyId, user);
            res.json(result);
        } catch (error: any) {
            // Graceful defaults for stale sessions
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') {
                return res.json({ companyId: req.params.companyId, aimsConfig: null });
            }
            next(error);
        }
    },

    /**
     * POST /settings/company/:companyId/aims-test
     * Test AIMS connection for a company
     */
    async testAimsConnection(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            const result = await settingsService.testAimsConnection(companyId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
            next(error);
        }
    },

    // ======================
    // Work Configuration (Phase 21)
    // ======================

    /**
     * PUT /settings/company/:companyId/work-config
     * Update company work configuration
     */
    async updateWorkConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const parsed = workConfigSchema.safeParse(req.body);
            if (!parsed.success) {
                throw badRequest('Invalid work config');
            }

            const companyId = req.params.companyId as string;
            const user = getUserContext(req);

            // Verify user has access
            const canManage = user.globalRole === 'PLATFORM_ADMIN' ||
                user.companies?.some(c => c.id === companyId);
            if (!canManage) throw forbidden('Access denied');

            const company = await prisma.company.update({
                where: { id: companyId },
                data: {
                    ...parsed.data,
                    workingDays: parsed.data.workingDays ? (parsed.data.workingDays as any) : undefined,
                },
            });

            res.json({ data: company });
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /settings/store/:storeId/address
     * Update store address and capacity
     */
    async updateStoreAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const parsed = storeAddressSchema.safeParse(req.body);
            if (!parsed.success) {
                throw badRequest('Invalid store address data');
            }

            const storeId = req.params.storeId as string;

            const store = await prisma.store.update({
                where: { id: storeId },
                data: {
                    ...parsed.data,
                    workingDays: parsed.data.workingDays ? (parsed.data.workingDays as any) : undefined,
                },
            });

            res.json({ data: store });
        } catch (error) {
            next(error);
        }
    },
};
