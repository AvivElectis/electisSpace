/**
 * Companies Feature - Controller
 * 
 * @description HTTP request/response handling. Validates input, calls services,
 * and formats responses. No business logic here.
 */
import type { Request, Response, NextFunction } from 'express';
import { companyService, isPlatformAdmin, canManageCompany, hasCompanyAccess } from './service.js';
import { 
    companyCodeSchema,
    createCompanySchema, 
    updateCompanySchema, 
    updateAimsConfigSchema,
} from './types.js';
import { notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import type { UserContext } from './types.js';

/**
 * Extract user context from request
 */
function getUserContext(req: Request): UserContext {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
        companies: req.user?.companies?.map(c => ({ id: c.id, role: c.role })),
    };
}

// ======================
// Controller Functions
// ======================

export const companyController = {
    /**
     * GET /companies
     * List companies accessible to the current user
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const search = req.query.search as string | undefined;
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
            
            const result = await companyService.list({ search, page, limit }, user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /companies/validate-code/:code
     * Validate if a company code is available
     */
    async validateCode(req: Request, res: Response, next: NextFunction) {
        try {
            const code = (req.params.code as string).toUpperCase();
            
            // Validate format
            const validation = companyCodeSchema.safeParse(code);
            if (!validation.success) {
                return res.json({ 
                    available: false, 
                    reason: validation.error.errors[0].message 
                });
            }
            
            const result = await companyService.validateCode(code);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /companies/:id
     * Get company details with stores and users
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            // Check access
            if (!hasCompanyAccess(user, id) && !isPlatformAdmin(user)) {
                throw forbidden('You do not have access to this company');
            }
            
            const result = await companyService.getById(id, user);
            if (!result) {
                throw notFound('Company');
            }
            
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /companies
     * Create a new company (Platform Admin only)
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            
            // Only platform admins can create companies
            if (!isPlatformAdmin(user)) {
                throw forbidden('Only platform administrators can create companies');
            }
            
            // Validate input
            const validation = createCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }
            
            const company = await companyService.create(validation.data);
            res.status(201).json({ company });
        } catch (error: any) {
            if (error.message === 'COMPANY_CODE_EXISTS') {
                return next(conflict('Company code already exists'));
            }
            next(error);
        }
    },

    /**
     * PATCH /companies/:id
     * Update company basic info
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            // Check management access
            if (!canManageCompany(user, id)) {
                throw forbidden('You do not have permission to update this company');
            }
            
            // Validate input
            const validation = updateCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }
            
            const company = await companyService.update(id, validation.data);
            res.json({ company });
        } catch (error: any) {
            if (error.code === 'P2025') {
                return next(notFound('Company'));
            }
            next(error);
        }
    },

    /**
     * PATCH /companies/:id/aims
     * Update AIMS configuration
     */
    async updateAimsConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            // Check management access
            if (!canManageCompany(user, id)) {
                throw forbidden('You do not have permission to update AIMS configuration');
            }
            
            // Validate input
            const validation = updateAimsConfigSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }
            
            const aimsConfig = await companyService.updateAimsConfig(id, validation.data);
            res.json({ aimsConfig });
        } catch (error: any) {
            if (error.code === 'P2025') {
                return next(notFound('Company'));
            }
            next(error);
        }
    },

    /**
     * DELETE /companies/:id
     * Delete a company (Platform Admin only)
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            // Only platform admins can delete companies
            if (!isPlatformAdmin(user)) {
                throw forbidden('Only platform administrators can delete companies');
            }
            
            const result = await companyService.delete(id);
            res.json({ 
                success: true,
                message: `Company ${result.code} deleted`,
                deletedStores: result.deletedStores,
            });
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND' || error.code === 'P2025') {
                return next(notFound('Company'));
            }
            next(error);
        }
    },
};
