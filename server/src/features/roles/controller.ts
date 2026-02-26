/**
 * Roles Feature - Controller
 *
 * @description HTTP request/response handling for role management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, badRequest, forbidden, conflict } from '../../shared/middleware/index.js';
import { rolesService } from './service.js';
import { createRoleSchema, updateRoleSchema } from './types.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request) {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
        companies: req.user?.companies?.map(c => ({ id: c.id, role: c.role })),
    };
}

// ======================
// Controller
// ======================

export const rolesController = {
    /**
     * GET /roles
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.query.companyId as string | undefined;
            const roles = await rolesService.list(companyId);
            res.json({ data: roles });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /roles/permissions-matrix
     */
    async getPermissionsMatrix(_req: Request, res: Response, _next: NextFunction) {
        const matrix = rolesService.getPermissionsMatrix();
        res.json({ data: matrix });
    },

    /**
     * GET /roles/:id
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const role = await rolesService.getById(id);
            if (!role) {
                return next(notFound('Role'));
            }
            res.json(role);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /roles
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = createRoleSchema.safeParse(req.body);
            if (!validation.success) {
                return next(badRequest(validation.error.errors[0].message));
            }

            const user = getUserContext(req);
            const role = await rolesService.create(validation.data, user);
            res.status(201).json(role);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN_SYSTEM_ROLE') return next(forbidden('Only platform admins can create system roles'));
            if (error.message === 'FORBIDDEN_COMPANY_ROLE') return next(forbidden('You do not have permission to create roles for this company'));
            if (error.code === 'P2002') return next(conflict('A role with this name already exists'));
            next(error);
        }
    },

    /**
     * PATCH /roles/:id
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateRoleSchema.safeParse(req.body);
            if (!validation.success) {
                return next(badRequest(validation.error.errors[0].message));
            }

            const user = getUserContext(req);
            const id = req.params.id as string;
            const role = await rolesService.update(id, validation.data, user);
            res.json(role);
        } catch (error: any) {
            if (error.message === 'ROLE_NOT_FOUND') return next(notFound('Role'));
            if (error.message === 'CANNOT_RENAME_DEFAULT') return next(badRequest('Cannot rename default system roles'));
            if (error.message === 'FORBIDDEN_SYSTEM_ROLE') return next(forbidden('Only platform admins can edit system roles'));
            if (error.message === 'FORBIDDEN_COMPANY_ROLE') return next(forbidden('You do not have permission to edit roles for this company'));
            if (error.code === 'P2002') return next(conflict('A role with this name already exists'));
            next(error);
        }
    },

    /**
     * DELETE /roles/:id
     */
    async remove(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const id = req.params.id as string;
            await rolesService.remove(id, user);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'ROLE_NOT_FOUND') return next(notFound('Role'));
            if (error.message === 'CANNOT_DELETE_DEFAULT') return next(badRequest('Cannot delete default system roles'));
            if (error.message === 'ROLE_IN_USE') return next(conflict('Cannot delete role that is still assigned to users'));
            if (error.message === 'FORBIDDEN_SYSTEM_ROLE') return next(forbidden('Only platform admins can delete system roles'));
            if (error.message === 'FORBIDDEN_COMPANY_ROLE') return next(forbidden('You do not have permission to delete roles for this company'));
            next(error);
        }
    },
};
