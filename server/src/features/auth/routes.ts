/**
 * Auth Feature - Routes
 * 
 * @description Thin route definitions for authentication endpoints.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../../shared/middleware/index.js';
import { authController } from './controller.js';

const router = Router();

// ======================
// Rate Limiters
// ======================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase() || '';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `${ip}:${email}`;
    },
});

const twoFALimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    message: {
        error: {
            code: 'TWOFA_RATE_LIMITED',
            message: 'Too many verification attempts. Please try again in 5 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase() || '';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `2fa:${ip}:${email}`;
    },
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        error: {
            code: 'RESET_RATE_LIMITED',
            message: 'Too many password reset requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase() || '';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `reset:${ip}:${email}`;
    },
});

// ======================
// Public Routes
// ======================

// POST /auth/login - Step 1: Verify credentials and send 2FA code
router.post('/login', authLimiter, authController.login);

// POST /auth/verify-2fa - Step 2: Verify code and issue tokens
router.post('/verify-2fa', twoFALimiter, authController.verify2FA);

// POST /auth/resend-code - Resend 2FA code
router.post('/resend-code', twoFALimiter, authController.resendCode);

// POST /auth/refresh - Refresh access token
router.post('/refresh', authController.refresh);

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);

// POST /auth/reset-password - Reset password with code
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// POST /auth/logout - Logout
router.post('/logout', authController.logout);

// ======================
// Protected Routes
// ======================

// GET /auth/me - Get current user info
router.get('/me', authenticate, authController.me);

// POST /auth/change-password - Change password
router.post('/change-password', authenticate, authController.changePassword);

// POST /auth/solum-connect - Get SOLUM connection config
router.post('/solum-connect', authenticate, authController.solumConnect);

// ======================
// Admin Routes
// ======================

// POST /auth/admin/reset-password - Admin password reset
router.post(
    '/admin/reset-password',
    authenticate,
    authorize('PLATFORM_ADMIN'),
    authController.adminResetPassword
);

export default router;
