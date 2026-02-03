/**
 * Settings Feature - Controller
 * 
 * @description HTTP request/response handling for settings management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, badRequest, forbidden } from '../../shared/middleware/index.js';
import { settingsService } from './service.js';
import { updateSettingsSchema, fieldMappingConfigSchema } from './types.js';
import type { SettingsUserContext } from './types.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): SettingsUserContext {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
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
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'STORE_NOT_FOUND_OR_DENIED') return next(notFound('Store not found or access denied'));
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
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
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
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
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
            if (error.message === 'COMPANY_NOT_FOUND_OR_DENIED') return next(notFound('Company not found or access denied'));
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
};
