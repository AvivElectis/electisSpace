import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';
import { badRequest } from '../../shared/middleware/index.js';
import {
    compassLoginSchema,
    compassVerifySchema,
    compassRefreshSchema,
    compassDeviceAuthSchema,
} from './types.js';
import * as service from './service.js';

// ─── POST /api/v2/compass/auth/login ─────────────────

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = compassLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const result = await service.sendLoginCode(parsed.data.email);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/v2/compass/auth/verify ─────────────────

export const verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = compassVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const { email, code, deviceId, deviceName, platform } = parsed.data;

        const result = await service.verifyCodeAndLogin(email, code, {
            deviceId,
            deviceName,
            platform,
        });

        // Set refresh token as httpOnly cookie (never send in body)
        res.cookie('compassRefreshToken', result.refreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: 'lax',
            maxAge: config.jwt.refreshExpiresInMs,
            path: '/',
        });

        const { refreshToken: _rt, ...responseBody } = result;
        res.json(responseBody);
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/v2/compass/auth/refresh ────────────────

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies?.compassRefreshToken;

        if (!refreshToken) {
            throw badRequest('Refresh token required');
        }

        const result = await service.refreshAccessToken(refreshToken);

        // Set new refresh token cookie (never send in body)
        res.cookie('compassRefreshToken', result.refreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: 'lax',
            maxAge: config.jwt.refreshExpiresInMs,
            path: '/',
        });

        const { refreshToken: _rt, ...responseBody } = result;
        res.json(responseBody);
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/v2/compass/auth/logout ─────────────────

export const logout = async (_req: Request, res: Response) => {
    res.clearCookie('compassRefreshToken', { path: '/' });
    res.json({ message: 'Logged out' });
};

// ─── POST /api/v2/compass/auth/device ─────────────────

export const deviceAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = compassDeviceAuthSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const { email, deviceToken } = parsed.data;
        const result = await service.authenticateWithDeviceToken(deviceToken, email);

        // Set refresh token as httpOnly cookie (never send in body)
        res.cookie('compassRefreshToken', result.refreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: 'lax',
            maxAge: config.jwt.refreshExpiresInMs,
            path: '/',
        });

        const { refreshToken: _rt, ...responseBody } = result;
        res.json(responseBody);
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/v2/compass/auth/devices ─────────────────

export const getDevices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const devices = await service.listDevices(req.compassUser!.id);
        res.json({ data: devices });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/v2/compass/auth/devices/:id ──────────

export const revokeDevice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.revokeDevice(req.compassUser!.id, req.params.id as string);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
