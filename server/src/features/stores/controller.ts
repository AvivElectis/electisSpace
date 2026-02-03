/**
 * Stores Feature - Controller
 * 
 * @description HTTP request/response handling for store management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { storeService } from './service.js';
import { createStoreSchema, updateStoreSchema } from './types.js';
import type { StoreUserContext } from './types.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): StoreUserContext {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
        stores: req.user?.stores?.map(s => ({ id: s.id, role: s.role })),
        companies: req.user?.companies?.map(c => ({ 
            id: c.id, 
            role: c.role,
            allStoresAccess: c.allStoresAccess 
        })),
    };
}

// ======================
// Controller
// ======================

export const storeController = {
    /**
     * GET /companies/:companyId/stores
     * List stores in a company
     */
    async listByCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);
            
            const result = await storeService.listByCompany(companyId, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'FORBIDDEN_COMPANY') return next(forbidden('You do not have access to this company'));
            next(error);
        }
    },

    /**
     * GET /companies/:companyId/stores/validate-code/:code
     * Validate if a store code is available
     */
    async validateCode(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const code = req.params.code as string;
            const result = await storeService.validateCode(companyId, code);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /stores/:id
     * Get store details
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await storeService.getById(id, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'FORBIDDEN_STORE') return next(forbidden('You do not have access to this store'));
            next(error);
        }
    },

    /**
     * POST /companies/:companyId/stores
     * Create a new store
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = createStoreSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }
            
            const companyId = req.params.companyId as string;
            const user = getUserContext(req);
            
            const result = await storeService.create(companyId, validation.data, user);
            res.status(201).json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'FORBIDDEN_CREATE') return next(forbidden('You do not have permission to create stores in this company'));
            if (error.message === 'CODE_EXISTS') return next(conflict('Store code already exists in this company'));
            next(error);
        }
    },

    /**
     * PATCH /stores/:id
     * Update store
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateStoreSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }
            
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await storeService.update(id, validation.data, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'FORBIDDEN_UPDATE') return next(forbidden('You do not have permission to update this store'));
            next(error);
        }
    },

    /**
     * DELETE /stores/:id
     * Delete a store
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = getUserContext(req);
            
            const result = await storeService.delete(id, user);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'FORBIDDEN_DELETE') return next(forbidden('You do not have permission to delete this store'));
            next(error);
        }
    },
};
