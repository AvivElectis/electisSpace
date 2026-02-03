/**
 * Admin Feature - Controller
 * 
 * @description HTTP request/response handling for admin panel endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, badRequest } from '../../shared/middleware/index.js';
import { adminService } from './service.js';
import { paginationSchema, impersonateContextSchema } from './types.js';

// ======================
// Controller
// ======================

export const adminController = {
    /**
     * GET /admin/overview
     * Platform-wide statistics
     */
    async getOverview(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getOverview();
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /admin/companies
     * List all companies
     */
    async listCompanies(req: Request, res: Response, next: NextFunction) {
        try {
            const params = paginationSchema.parse(req.query);
            const result = await adminService.listCompanies(params);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /admin/companies/:companyId
     * Get detailed company info
     */
    async getCompanyDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId as string;
            const result = await adminService.getCompanyDetails(companyId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            next(error);
        }
    },

    /**
     * GET /admin/stores
     * List all stores
     */
    async listStores(req: Request, res: Response, next: NextFunction) {
        try {
            const params = paginationSchema.parse(req.query);
            const companyId = req.query.companyId as string | undefined;
            const result = await adminService.listStores({ ...params, companyId });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /admin/stores/:storeId
     * Get detailed store info
     */
    async getStoreDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const result = await adminService.getStoreDetails(storeId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * GET /admin/stores/:storeId/spaces
     * List spaces in a store
     */
    async listSpaces(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const params = paginationSchema.parse(req.query);
            const result = await adminService.listSpaces({ ...params, storeId });
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * GET /admin/stores/:storeId/people
     * List people in a store
     */
    async listPeople(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const params = paginationSchema.parse(req.query);
            const result = await adminService.listPeople({ ...params, storeId });
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * GET /admin/stores/:storeId/conference-rooms
     * List conference rooms in a store
     */
    async listConferenceRooms(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const params = paginationSchema.parse(req.query);
            const result = await adminService.listConferenceRooms({ ...params, storeId });
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * GET /admin/stores/:storeId/sync-queue
     * List sync queue items
     */
    async listSyncQueue(req: Request, res: Response, next: NextFunction) {
        try {
            const storeId = req.params.storeId as string;
            const params = paginationSchema.parse(req.query);
            const status = req.query.status as string | undefined;
            const result = await adminService.listSyncQueue({ ...params, storeId, status });
            res.json(result);
        } catch (error: any) {
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            next(error);
        }
    },

    /**
     * POST /admin/impersonate-context
     * Get context for admin viewing
     */
    async impersonateContext(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = impersonateContextSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const result = await adminService.getImpersonateContext(validation.data);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'STORE_COMPANY_MISMATCH') return next(badRequest('Store does not belong to the specified company'));
            next(error);
        }
    },

    /**
     * GET /admin/audit-log
     * View audit log
     */
    async listAuditLog(req: Request, res: Response, next: NextFunction) {
        try {
            const params = paginationSchema.parse(req.query);
            const userId = req.query.userId as string | undefined;
            const companyId = req.query.companyId as string | undefined;
            const storeId = req.query.storeId as string | undefined;
            const action = req.query.action as string | undefined;
            
            const result = await adminService.listAuditLog({
                ...params,
                userId,
                companyId,
                storeId,
                action,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};
