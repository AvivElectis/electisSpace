/**
 * Users Feature - Controller
 * 
 * @description HTTP request/response handling for user management endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { userService } from './service.js';
import {
    createUserSchema,
    updateUserSchema,
    updateUserStoreSchema,
    assignUserToStoreSchema,
    elevateUserSchema,
    assignUserToCompanySchema,
    updateUserCompanySchema,
    updateContextSchema,
    AVAILABLE_FEATURES,
} from './types.js';
import type { UserContext } from './types.js';

// ======================
// Helpers
// ======================

function getUserContext(req: Request): UserContext {
    return {
        id: req.user!.id,
        globalRole: req.user!.globalRole ?? null,
        stores: req.user?.stores?.map(s => ({ id: s.id, role: s.role })),
        companies: req.user?.companies?.map(c => ({ id: c.id, role: c.role })),
    };
}

// ======================
// Controller
// ======================

export const userController = {
    /**
     * GET /users/me
     * Get current user's full profile
     */
    async getMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const profile = await userService.getMyProfile(userId);
            res.json(profile);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(notFound('User not found'));
            }
            next(error);
        }
    },

    /**
     * PATCH /users/me
     * Update current user's profile
     */
    async updateMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { firstName, lastName, phone } = req.body;
            
            const updated = await userService.updateMyProfile(userId, { firstName, lastName, phone });
            res.json(updated);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(notFound('User not found'));
            }
            next(error);
        }
    },

    /**
     * POST /users/me/change-password
     * Change current user's password
     */
    async changeMyPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return next(badRequest('Current password and new password are required'));
            }
            
            if (newPassword.length < 8) {
                return next(badRequest('New password must be at least 8 characters'));
            }
            
            await userService.changeMyPassword(userId, currentPassword, newPassword);
            res.json({ message: 'Password changed successfully' });
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(notFound('User not found'));
            }
            if (error.message === 'INVALID_PASSWORD') {
                return next(badRequest('Current password is incorrect'));
            }
            next(error);
        }
    },

    /**
     * GET /users
     * List users
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getUserContext(req);
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
            const search = req.query.search as string | undefined;
            const storeId = req.query.storeId as string | undefined;
            const companyId = req.query.companyId as string | undefined;

            const result = await userService.list({ page, limit, search, storeId, companyId }, user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /users/check-email?email=...
     * Check if an email is already registered
     */
    async checkEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const email = req.query.email as string;
            if (!email) {
                return next(badRequest('Email is required'));
            }
            const exists = await userService.checkEmailExists(email.trim().toLowerCase());
            res.json({ exists });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /users/features
     * Get available features
     */
    async getFeatures(_req: Request, res: Response) {
        res.json({
            features: AVAILABLE_FEATURES.map(f => ({
                id: f,
                name: f.charAt(0).toUpperCase() + f.slice(1),
            })),
        });
    },

    /**
     * GET /users/:id
     * Get user details
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = await userService.getById(id);

            if (!user) {
                throw notFound('User');
            }

            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /users
     * Create new user
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = createUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const currentUser = getUserContext(req);
            const user = await userService.create(validation.data, currentUser);

            res.status(201).json({
                ...user,
                companies: user.userCompanies.map((uc: any) => ({
                    id: uc.companyId,
                    code: uc.company.code,
                    name: uc.company.name,
                    allStoresAccess: uc.allStoresAccess,
                    isCompanyAdmin: uc.role === 'COMPANY_ADMIN',
                })),
                stores: user.userStores.map((us: any) => ({
                    id: us.storeId,
                    code: us.store.code,
                    name: us.store.name,
                    role: us.role,
                    features: us.features as string[],
                })),
                userCompanies: undefined,
                userStores: undefined,
            });
        } catch (error: any) {
            if (error.message === 'EMAIL_EXISTS') return next(conflict('Email already exists'));
            if (error.message === 'FORBIDDEN_CREATE_COMPANY') return next(forbidden('Only platform admins can create new companies'));
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'FORBIDDEN_MANAGE_COMPANY') return next(forbidden('You do not have permission to add users to this company'));
            if (error.message === 'COMPANY_CODE_EXISTS') return next(conflict('Company code already exists'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'STORE_COMPANY_MISMATCH') return next(badRequest('Store does not belong to the specified company'));
            if (error.message?.startsWith('STORE_CODE_EXISTS:')) return next(conflict(`Store code ${error.message.split(':')[1]} already exists in this company`));
            next(error);
        }
    },

    /**
     * PATCH /users/:id
     * Update user
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const id = req.params.id as string;
            const currentUser = getUserContext(req);
            const user = await userService.update(id, validation.data, currentUser);

            res.json(user);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to update this user'));
            if (error.message === 'CANNOT_DEACTIVATE_SELF') return next(badRequest('Cannot deactivate yourself'));
            next(error);
        }
    },

    /**
     * PATCH /users/:id/stores/:storeId
     * Update user-store assignment
     */
    async updateUserStore(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateUserStoreSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const userId = req.params.id as string;
            const storeId = req.params.storeId as string;
            const currentUser = getUserContext(req);

            const updated = await userService.updateUserStore(userId, storeId, validation.data, currentUser);

            res.json({
                storeId: updated.storeId,
                name: updated.store.name,
                code: updated.store.code,
                role: updated.role,
                features: updated.features as string[],
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to manage users in this store'));
            if (error.message === 'USER_STORE_NOT_FOUND') return next(notFound('User is not assigned to this store'));
            if (error.message === 'CANNOT_DEMOTE_SELF') return next(badRequest('Cannot demote yourself from store admin'));
            next(error);
        }
    },

    /**
     * POST /users/:id/stores
     * Assign user to store
     */
    async assignToStore(req: Request, res: Response, next: NextFunction) {
        try {
            const data = assignUserToStoreSchema.parse({ ...req.body, userId: req.params.id });
            const currentUser = getUserContext(req);

            const userStore = await userService.assignToStore(
                data.userId,
                data.storeId,
                data.role,
                data.features,
                currentUser
            );

            res.status(201).json({
                storeId: userStore.storeId,
                name: userStore.store.name,
                code: userStore.store.code,
                role: userStore.role,
                features: userStore.features as string[],
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to add users to this store'));
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'ALREADY_ASSIGNED') return next(conflict('User is already assigned to this store'));
            next(error);
        }
    },

    /**
     * DELETE /users/:id/stores/:storeId
     * Remove user from store
     */
    async removeFromStore(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.params.id as string;
            const storeId = req.params.storeId as string;
            const currentUser = getUserContext(req);

            await userService.removeFromStore(userId, storeId, currentUser);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to remove users from this store'));
            if (error.message === 'CANNOT_REMOVE_SELF') return next(badRequest('Cannot remove yourself from a store'));
            if (error.message === 'USER_STORE_NOT_FOUND') return next(notFound('User is not assigned to this store'));
            next(error);
        }
    },

    /**
     * DELETE /users/:id
     * Delete user
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const currentUser = getUserContext(req);

            await userService.delete(id, currentUser);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'CANNOT_DELETE_SELF') return next(badRequest('Cannot delete yourself'));
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to delete this user. You must be admin for all their stores.'));
            next(error);
        }
    },

    /**
     * POST /users/:id/elevate
     * Elevate user role
     */
    async elevate(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = elevateUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const userId = req.params.id as string;
            const currentUser = getUserContext(req);
            const result = await userService.elevate(userId, validation.data, currentUser);

            if (validation.data.globalRole === 'COMPANY_ADMIN' && result && 'userCompanies' in result) {
                const typedResult = result as { id: string; email: string; globalRole: string | null; userCompanies: Array<{ companyId: string; company: { name: string; code: string } }> };
                res.json({
                    id: typedResult.id,
                    email: typedResult.email,
                    globalRole: typedResult.globalRole,
                    companyAdmin: typedResult.userCompanies[0] ? {
                        companyId: typedResult.userCompanies[0].companyId,
                        companyName: typedResult.userCompanies[0].company.name,
                        companyCode: typedResult.userCompanies[0].company.code,
                    } : null,
                });
            } else {
                res.json(result);
            }
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('Only platform admins can elevate user roles'));
            if (error.message === 'CANNOT_DEMOTE_SELF') return next(badRequest('Cannot demote yourself'));
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            next(error);
        }
    },

    /**
     * GET /users/:id/companies
     * Get user's company assignments
     */
    async getUserCompanies(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.params.id as string;
            const result = await userService.getUserCompanies(userId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            next(error);
        }
    },

    /**
     * POST /users/:id/companies
     * Assign user to company
     */
    async assignToCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = assignUserToCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const userId = req.params.id as string;
            const currentUser = getUserContext(req);
            const result = await userService.assignToCompany(userId, validation.data, currentUser);

            res.status(201).json({
                companyId: result.companyId,
                code: result.company.code,
                name: result.company.name,
                location: result.company.location,
                allStoresAccess: result.allStoresAccess,
                isCompanyAdmin: result.role === 'COMPANY_ADMIN',
            });
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            if (error.message === 'FORBIDDEN_CREATE_COMPANY') return next(forbidden('Only platform admins can create new companies'));
            if (error.message === 'COMPANY_NOT_FOUND') return next(notFound('Company'));
            if (error.message === 'FORBIDDEN_MANAGE_COMPANY') return next(forbidden('You do not have permission to assign users to this company'));
            if (error.message === 'COMPANY_CODE_EXISTS') return next(conflict('Company code already exists'));
            if (error.message === 'ALREADY_ASSIGNED') return next(conflict('User is already assigned to this company'));
            next(error);
        }
    },

    /**
     * PATCH /users/:id/companies/:companyId
     * Update user-company assignment
     */
    async updateUserCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateUserCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const userId = req.params.id as string;
            const companyId = req.params.companyId as string;
            const currentUser = getUserContext(req);

            const updated = await userService.updateUserCompany(userId, companyId, validation.data, currentUser);

            res.json({
                companyId: updated.companyId,
                code: updated.company.code,
                name: updated.company.name,
                allStoresAccess: updated.allStoresAccess,
                isCompanyAdmin: updated.role === 'COMPANY_ADMIN',
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to update this assignment'));
            if (error.message === 'FORBIDDEN_GRANT_ADMIN') return next(forbidden('Only platform admins can grant company admin role'));
            if (error.message === 'USER_COMPANY_NOT_FOUND') return next(notFound('User is not assigned to this company'));
            next(error);
        }
    },

    /**
     * DELETE /users/:id/companies/:companyId
     * Remove user from company
     */
    async removeFromCompany(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.params.id as string;
            const companyId = req.params.companyId as string;
            const currentUser = getUserContext(req);

            await userService.removeFromCompany(userId, companyId, currentUser);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') return next(forbidden('You do not have permission to remove users from this company'));
            if (error.message === 'LAST_ADMIN') return next(badRequest('Cannot remove yourself as the only company admin'));
            if (error.message === 'USER_COMPANY_NOT_FOUND') return next(notFound('User is not assigned to this company'));
            next(error);
        }
    },

    /**
     * GET /users/me/context
     * Get current user context
     */
    async getContext(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const result = await userService.getContext(userId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') return next(notFound('User'));
            next(error);
        }
    },

    /**
     * PATCH /users/me/context
     * Update current user context
     */
    async updateContext(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateContextSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const userId = req.user!.id;
            const result = await userService.updateContext(userId, validation.data);

            res.json({
                activeCompanyId: result.activeCompanyId,
                activeStoreId: result.activeStoreId,
            });
        } catch (error: any) {
            if (error.message === 'FORBIDDEN_COMPANY') return next(forbidden('You do not have access to this company'));
            if (error.message === 'STORE_NOT_FOUND') return next(notFound('Store'));
            if (error.message === 'FORBIDDEN_STORE') return next(forbidden('You do not have access to this store'));
            next(error);
        }
    },
};
