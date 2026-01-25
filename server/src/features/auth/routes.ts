import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma, config } from '../../config/index.js';
import { badRequest, unauthorized } from '../../shared/middleware/index.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
});

// Generate tokens
const generateTokens = (userId: string, organizationId: string, role: string) => {
    const accessToken = jwt.sign(
        { sub: userId, org: organizationId, role },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
        { sub: userId, jti: uuidv4() },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
};

// POST /auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });

        if (!user || !user.isActive) {
            throw unauthorized('Invalid credentials');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            throw unauthorized('Invalid credentials');
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(
            user.id,
            user.organizationId,
            user.role
        );

        // Store refresh token hash
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        // Set refresh token as HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    code: user.organization.code,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken: bodyToken } = refreshSchema.parse(req.body);
        const cookieToken = req.cookies.refreshToken;
        const token = bodyToken || cookieToken;

        if (!token) {
            throw unauthorized('No refresh token provided');
        }

        // Verify token
        let payload: { sub: string; jti: string };
        try {
            payload = jwt.verify(token, config.jwt.refreshSecret) as typeof payload;
        } catch {
            throw unauthorized('Invalid refresh token');
        }

        // Find user and valid refresh tokens
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: { refreshTokens: { where: { revoked: false } } },
        });

        if (!user || !user.isActive) {
            throw unauthorized('User not found or inactive');
        }

        // Find matching token
        let matchingToken = null;
        for (const storedToken of user.refreshTokens) {
            const isMatch = await bcrypt.compare(token, storedToken.tokenHash);
            if (isMatch && storedToken.expiresAt > new Date()) {
                matchingToken = storedToken;
                break;
            }
        }

        if (!matchingToken) {
            throw unauthorized('Refresh token not found or expired');
        }

        // Revoke old token
        await prisma.refreshToken.update({
            where: { id: matchingToken.id },
            data: { revoked: true },
        });

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(
            user.id,
            user.organizationId,
            user.role
        );

        // Store new refresh token
        const tokenHash = await bcrypt.hash(newRefreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        // Set new cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: 900,
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            // Revoke all matching tokens
            try {
                const payload = jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
                await prisma.refreshToken.updateMany({
                    where: { userId: payload.sub },
                    data: { revoked: true },
                });
            } catch {
                // Token invalid, just clear cookie
            }
        }

        res.clearCookie('refreshToken');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// POST /auth/change-password (authenticated)
import { authenticate } from '../../shared/middleware/index.js';

router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user) {
            throw unauthorized('User not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isValid) {
            throw badRequest('Current password is incorrect');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and revoke all refresh tokens
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: user.id },
                data: { revoked: true },
            }),
        ]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
