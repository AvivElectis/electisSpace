/**
 * Compass Auth Feature - Routes
 *
 * @description Route definitions for Compass employee authentication.
 * Mounted at /api/v2/compass/auth
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import * as controller from './controller.js';

const router = Router();

// ======================
// Rate Limiters
// ======================

const compassLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        error: {
            code: 'COMPASS_AUTH_RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase() || '';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `compass:${ip}:${email}`;
    },
});

const compassVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: {
            code: 'COMPASS_VERIFY_RATE_LIMITED',
            message: 'Too many verification attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase() || '';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `compass-verify:${ip}:${email}`;
    },
});

// ======================
// Public Routes
// ======================

// POST /auth/login - Send verification code to email
router.post('/login', compassLoginLimiter, controller.login);

// POST /auth/verify - Verify code and issue tokens
router.post('/verify', compassVerifyLimiter, controller.verify);

// POST /auth/device - Biometric/device token auth
router.post('/device', compassLoginLimiter, controller.deviceAuth);

// POST /auth/refresh - Refresh access token
router.post('/refresh', controller.refresh);

// POST /auth/logout - Clear refresh cookie
router.post('/logout', controller.logout);

// ======================
// Protected Routes (Compass JWT required)
// ======================

// GET /auth/devices - List user's registered devices
router.get('/devices', compassAuthenticate, requireCompassEnabled, controller.getDevices);

// DELETE /auth/devices/:id - Revoke a device token
router.delete('/devices/:id', compassAuthenticate, requireCompassEnabled, controller.revokeDevice);

export default router;
