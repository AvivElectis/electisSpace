/**
 * Auth Feature - Controller
 * 
 * @description HTTP request/response handling for authentication endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { config, prisma } from '../../config/index.js';
import { badRequest, unauthorized } from '../../shared/middleware/index.js';
import { authService } from './service.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import {
    loginSchema,
    verify2FASchema,
    resendCodeSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    adminResetPasswordSchema,
    refreshSchema,
    changePasswordSchema,
    solumConnectSchema,
} from './types.js';

// ======================
// Controller
// ======================

export const authController = {
    /**
     * POST /auth/login
     * Step 1: Verify credentials and send 2FA code
     */
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = loginSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const result = await authService.login(
                validation.data.email,
                validation.data.password
            );

            res.json(result);
        } catch (error: any) {
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    }
                });
            }
            if (error.message === 'USER_NOT_FOUND') {
                return res.status(401).json({
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    }
                });
            }
            if (error.message === 'USER_INACTIVE') {
                return res.status(401).json({
                    error: {
                        code: 'USER_INACTIVE',
                        message: 'User account is inactive'
                    }
                });
            }
            if (error.message?.includes('Failed to send') || error.message?.includes('ECONNREFUSED')) {
                return res.status(503).json({
                    error: {
                        code: 'EMAIL_SERVICE_ERROR',
                        message: 'Failed to send verification code. Please try again later.'
                    }
                });
            }
            next(error);
        }
    },

    /**
     * POST /auth/verify-2fa
     * Step 2: Verify 2FA code and issue tokens
     */
    async verify2FA(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = verify2FASchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const result = await authService.verify2FA(
                validation.data.email,
                validation.data.code
            );

            // Set refresh token as HttpOnly cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: config.isProd,
                sameSite: 'lax',
                maxAge: config.jwt.refreshExpiresInMs,
            });

            // Strip refreshToken from response body (it's already in HttpOnly cookie)
            const { refreshToken: _rt, ...safeResult } = result;
            res.json(safeResult);
        } catch (error: any) {
            if (error.message === 'INVALID_CODE') {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_CODE',
                        message: 'Invalid verification code'
                    }
                });
            }
            if (error.message === 'CODE_EXPIRED') {
                return res.status(401).json({
                    error: {
                        code: 'CODE_EXPIRED',
                        message: 'Verification code has expired'
                    }
                });
            }
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid credentials'
                    }
                });
            }
            next(error);
        }
    },

    /**
     * POST /auth/resend-code
     * Resend 2FA verification code
     */

    async resendCode(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = resendCodeSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            await authService.resendCode(validation.data.email);

            res.json({ message: 'If the email exists, a new code has been sent' });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /auth/refresh
     * Refresh access token
     */
    async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = refreshSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const token = validation.data.refreshToken || req.cookies.refreshToken;
            if (!token) {
                throw unauthorized('No refresh token provided');
            }

            const result = await authService.refresh(token);

            // Set new cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: config.isProd,
                sameSite: 'lax',
                maxAge: config.jwt.refreshExpiresInMs,
            });

            res.json(result);
        } catch (error: any) {
            if (error.message === 'INVALID_TOKEN' || error.message === 'TOKEN_NOT_FOUND') {
                return next(unauthorized('Invalid refresh token'));
            }
            if (error.message === 'USER_NOT_FOUND') {
                return next(unauthorized('User not found or inactive'));
            }
            next(error);
        }
    },

    /**
     * GET /auth/me
     * Get current user info
     */
    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const result = await authService.getMe(userId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(unauthorized('User not found or inactive'));
            }
            next(error);
        }
    },

    /**
     * POST /auth/forgot-password
     * Request password reset code
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = forgotPasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            await authService.forgotPassword(validation.data.email);

            res.json({ message: 'If the email exists, a reset code has been sent' });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /auth/reset-password
     * Reset password with code
     */
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = resetPasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            await authService.resetPassword(
                validation.data.email,
                validation.data.code,
                validation.data.newPassword
            );

            res.json({ message: 'Password reset successfully' });
        } catch (error: any) {
            if (error.message === 'INVALID_CREDENTIALS' || error.message === 'INVALID_CODE') {
                return next(unauthorized('Invalid or expired reset code'));
            }
            next(error);
        }
    },

    /**
     * POST /auth/admin/reset-password
     * Admin-initiated password reset
     */
    async adminResetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = adminResetPasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const result = await authService.adminResetPassword(
                validation.data.userId,
                validation.data.resetType,
                validation.data.newPassword,
                req.user!.id
            );

            res.json(result);
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(badRequest('User not found'));
            }
            next(error);
        }
    },

    /**
     * POST /auth/logout
     * Logout and revoke tokens
     */
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.cookies.refreshToken;
            await authService.logout(token);

            res.clearCookie('refreshToken');
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /auth/change-password
     * Change password (authenticated)
     */
    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = changePasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            await authService.changePassword(
                req.user!.id,
                validation.data.currentPassword,
                validation.data.newPassword
            );

            res.json({ message: 'Password changed successfully' });
        } catch (error: any) {
            if (error.message === 'USER_NOT_FOUND') {
                return next(unauthorized('User not found'));
            }
            if (error.message === 'INVALID_PASSWORD') {
                return next(badRequest('Current password is incorrect'));
            }
            next(error);
        }
    },

    /**
     * POST /auth/solum-connect
     * Get SOLUM connection config
     */
    async solumConnect(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = solumConnectSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const result = await authService.solumConnect(
                validation.data.storeId,
                req.user!.id,
                req.user!.stores,
                req.user!.globalRole,
                req.user!.companies
            );

            res.json(result);
        } catch (error: any) {
            if (error.message === 'NO_ACCESS') {
                return next(unauthorized('You do not have access to this store'));
            }
            if (error.message === 'AIMS_NOT_CONFIGURED') {
                return res.status(400).json({
                    error: 'AIMS not configured',
                    message: 'Company AIMS credentials are not configured for this store',
                });
            }
            if (error.message === 'STORE_NOT_FOUND') {
                return next(badRequest('Store not found'));
            }
            next(error);
        }
    },

    /**
     * POST /auth/solum-refresh
     * Refresh AIMS/SoluM token for a store
     * Uses server-side credential management to get a fresh token
     * The server's aimsGateway handles token caching and re-login automatically
     */
    async solumRefresh(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = solumConnectSchema.safeParse(req.body);
            if (!validation.success) {
                throw badRequest(validation.error.errors[0].message);
            }

            const { storeId } = validation.data;

            // Verify user access to this store
            const hasAccess = req.user!.stores.some((s: any) => s.id === storeId) ||
                req.user!.globalRole === 'PLATFORM_ADMIN';

            if (!hasAccess) {
                return next(unauthorized('You do not have access to this store'));
            }

            // Get fresh token via aimsGateway (handles caching + re-login if expired)
            const { aimsGateway } = await import('../../shared/infrastructure/services/aimsGateway.js');

            const storeConfig = await aimsGateway.getStoreConfig(storeId);
            if (!storeConfig) {
                return res.status(400).json({
                    error: 'AIMS_NOT_CONFIGURED',
                    message: 'Company AIMS credentials are not configured for this store',
                });
            }

            // Invalidate cached token first to force a fresh login
            aimsGateway.invalidateToken(storeConfig.companyId);

            // Get fresh token
            const accessToken = await aimsGateway.getToken(storeConfig.companyId);

            res.json({
                accessToken,
                expiresAt: Date.now() + 3600000, // 1 hour
            });
        } catch (error: any) {
            appLogger.error('Auth', `AIMS token refresh failed: ${error.message}`);
            next(error);
        }
    },

    /**
     * GET /auth/store-connection-info?storeId=xxx
     * Returns AIMS connection status and admin contact info for a store.
     * Used during first-time user connection to determine the appropriate flow:
     * - If AIMS is configured: auto-connect
     * - If user is admin: prompt for credentials
     * - If user is not admin: show admin contact info
     */
    async storeConnectionInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const { storeId } = req.query;
            if (!storeId || typeof storeId !== 'string') {
                return next(badRequest('storeId is required'));
            }

            // Verify user access
            const hasAccess = req.user!.stores.some((s: any) => s.id === storeId) ||
                req.user!.globalRole === 'PLATFORM_ADMIN';

            if (!hasAccess) {
                return next(unauthorized('You do not have access to this store'));
            }

            // Get store + company info
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            aimsBaseUrl: true,
                            aimsUsername: true,
                            aimsPasswordEnc: true,
                        },
                    },
                },
            });

            if (!store) {
                return next(badRequest('Store not found'));
            }

            const aimsConfigured = !!(
                store.company.aimsBaseUrl &&
                store.company.aimsUsername &&
                store.company.aimsPasswordEnc
            );

            // Determine if current user is an admin for this store or company
            const userStoreAccess = req.user!.stores.find((s: any) => s.id === storeId);
            const isPlatformAdmin = req.user!.globalRole === 'PLATFORM_ADMIN';
            const isStoreAdmin = userStoreAccess?.role === 'STORE_ADMIN';

            // Check if user is company admin
            const userCompanyAccess = req.user!.companies?.find(
                (c: any) => c.id === store.companyId
            );
            const isCompanyAdmin = userCompanyAccess?.role === 'COMPANY_ADMIN';
            const isAdmin = isPlatformAdmin || isCompanyAdmin || isStoreAdmin;

            // If not admin and AIMS not configured, find admin contacts
            let adminContacts: Array<{ name: string; email: string; role: string }> = [];
            if (!aimsConfigured && !isAdmin) {
                // Find store admins for this store
                const storeAdmins = await prisma.userStore.findMany({
                    where: {
                        storeId,
                        role: 'STORE_ADMIN',
                        user: { isActive: true },
                    },
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, email: true },
                        },
                    },
                });

                if (storeAdmins.length > 0) {
                    adminContacts = storeAdmins.map((sa) => ({
                        name: [sa.user.firstName, sa.user.lastName].filter(Boolean).join(' ') || sa.user.email,
                        email: sa.user.email,
                        role: 'store_admin',
                    }));
                } else {
                    // Fallback to company admins
                    const companyAdmins = await prisma.userCompany.findMany({
                        where: {
                            companyId: store.companyId,
                            role: 'COMPANY_ADMIN',
                            user: { isActive: true },
                        },
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, email: true },
                            },
                        },
                    });

                    adminContacts = companyAdmins.map((ca) => ({
                        name: [ca.user.firstName, ca.user.lastName].filter(Boolean).join(' ') || ca.user.email,
                        email: ca.user.email,
                        role: 'company_admin',
                    }));
                }
            }

            res.json({
                storeId,
                storeName: store.name,
                companyId: store.companyId,
                companyName: store.company.name,
                companyCode: store.company.code,
                aimsConfigured,
                isAdmin,
                adminContacts,
            });
        } catch (error: any) {
            next(error);
        }
    },
};
