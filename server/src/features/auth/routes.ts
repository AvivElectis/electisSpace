import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { CodeType } from '@prisma/client';
import { prisma, config } from '../../config/index.js';
import { badRequest, unauthorized, authenticate, authorize } from '../../shared/middleware/index.js';
import { EmailService } from '../../shared/services/email.service.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const verify2FASchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

const resendCodeSchema = z.object({
    email: z.string().email(),
});

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    email: z.string().email(),
    code: z.string(),
    newPassword: z.string().min(8),
});

const adminResetPasswordSchema = z.object({
    userId: z.string().uuid(),
    resetType: z.enum(['temporary', 'fixed']),
    newPassword: z.string().min(8).optional(),
});

const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
});

// Helper: Generate random 6-digit code
const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Generate random password
const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate tokens with stores and companies
const generateTokens = async (userId: string) => {
    // Get user with stores and companies
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            userStores: {
                include: {
                    store: {
                        include: { company: true }
                    }
                }
            },
            userCompanies: {
                include: { company: true }
            }
        }
    });

    if (!user) {
        throw unauthorized('User not found');
    }

    // Build stores array for JWT
    const stores = user.userStores.map(us => ({
        id: us.storeId,
        role: us.role,
        companyId: us.store.companyId,
    }));

    // Build companies array for JWT
    const companies = user.userCompanies.map(uc => ({
        id: uc.companyId,
        role: uc.role,
    }));

    const accessToken = jwt.sign(
        {
            sub: userId,
            globalRole: user.globalRole,
            stores,
            companies,
        },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
        { sub: userId, jti: uuidv4() },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken, user };
};

// POST /auth/login - Step 1: Verify credentials and send 2FA code
router.post('/login', async (req, res, next) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = loginSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('User not found:', email);
            throw unauthorized('Invalid credentials');
        }

        if (!user.isActive) {
            console.log('User inactive:', email);
            throw unauthorized('Invalid credentials');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('Password valid:', isValid);

        if (!isValid) {
            throw unauthorized('Invalid credentials');
        }

        // Generate 6-digit code
        const code = generateCode();

        // Invalidate old codes
        await prisma.verificationCode.updateMany({
            where: {
                userId: user.id,
                type: CodeType.LOGIN_2FA,
                used: false,
            },
            data: { used: true },
        });

        // Create new verification code (expires in 10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await prisma.verificationCode.create({
            data: {
                userId: user.id,
                code,
                type: CodeType.LOGIN_2FA,
                expiresAt,
            },
        });

        // Send email
        try {
            await EmailService.send2FACode(email, code, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send 2FA email:', error);
            throw badRequest('Failed to send verification code. Please try again.');
        }

        res.json({
            message: 'Verification code sent to your email',
            email,
            requiresVerification: true,
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/verify-2fa - Step 2: Verify code and issue tokens
router.post('/verify-2fa', async (req, res, next) => {
    try {
        const { email, code } = verify2FASchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                userStores: {
                    include: {
                        store: {
                            include: { company: true }
                        }
                    }
                },
                userCompanies: {
                    include: { company: true }
                }
            }
        });

        if (!user || !user.isActive) {
            throw unauthorized('Invalid credentials');
        }

        // Find valid verification code
        const verificationCode = await prisma.verificationCode.findFirst({
            where: {
                userId: user.id,
                code,
                type: CodeType.LOGIN_2FA,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!verificationCode) {
            throw unauthorized('Invalid or expired verification code');
        }

        // Mark code as used
        await prisma.verificationCode.update({
            where: { id: verificationCode.id },
            data: { used: true },
        });

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user.id);

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

        // Build response with user stores and companies
        const stores = user.userStores.map(us => ({
            id: us.storeId,
            name: us.store.name,
            storeNumber: us.store.storeNumber,
            role: us.role,
            features: us.features as string[] || ['dashboard'],
            companyId: us.store.companyId,
            companyName: us.store.company.name,
        }));

        const companies = user.userCompanies.map(uc => ({
            id: uc.companyId,
            name: uc.company.name,
            aimsCompanyCode: uc.company.aimsCompanyCode,
            role: uc.role,
        }));

        res.json({
            accessToken,
            refreshToken,
            expiresIn: 3600, // 1 hour in seconds
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                globalRole: user.globalRole,
                stores,
                companies,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/resend-code - Resend 2FA code
router.post('/resend-code', async (req, res, next) => {
    try {
        const { email } = resendCodeSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            // Don't reveal if user exists
            res.json({ message: 'If the email exists, a new code has been sent' });
            return;
        }

        // Generate new code
        const code = generateCode();

        // Invalidate old codes
        await prisma.verificationCode.updateMany({
            where: {
                userId: user.id,
                type: CodeType.LOGIN_2FA,
                used: false,
            },
            data: { used: true },
        });

        // Create new verification code
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await prisma.verificationCode.create({
            data: {
                userId: user.id,
                code,
                type: CodeType.LOGIN_2FA,
                expiresAt,
            },
        });

        // Send email
        try {
            await EmailService.send2FACode(email, code, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send 2FA email:', error);
        }

        res.json({ message: 'If the email exists, a new code has been sent' });
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
        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user.id);

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
            expiresIn: 3600,
        });
    } catch (error) {
        next(error);
    }
});

// GET /auth/me - Get current user info (validates session)
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.id;

        // Get user with stores and companies
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userStores: {
                    include: {
                        store: {
                            include: { company: true }
                        }
                    }
                },
                userCompanies: {
                    include: { company: true }
                }
            }
        });

        if (!user || !user.isActive) {
            throw unauthorized('User not found or inactive');
        }

        // Build response with user stores and companies
        const stores = user.userStores.map(us => ({
            id: us.storeId,
            name: us.store.name,
            storeNumber: us.store.storeNumber,
            role: us.role,
            features: us.features as string[] || ['dashboard'],
            companyId: us.store.companyId,
            companyName: us.store.company.name,
        }));

        const companies = user.userCompanies.map(uc => ({
            id: uc.companyId,
            name: uc.company.name,
            aimsCompanyCode: uc.company.aimsCompanyCode,
            role: uc.role,
        }));

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                globalRole: user.globalRole,
                stores,
                companies,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/forgot-password - Request password reset code
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            // Don't reveal if user exists
            res.json({ message: 'If the email exists, a reset code has been sent' });
            return;
        }

        // Generate code
        const code = generateCode();

        // Invalidate old reset codes
        await prisma.verificationCode.updateMany({
            where: {
                userId: user.id,
                type: CodeType.PASSWORD_RESET,
                used: false,
            },
            data: { used: true },
        });

        // Create new reset code (expires in 30 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        await prisma.verificationCode.create({
            data: {
                userId: user.id,
                code,
                type: CodeType.PASSWORD_RESET,
                expiresAt,
            },
        });

        // Send email
        try {
            await EmailService.sendPasswordResetCode(email, code, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
        }

        res.json({ message: 'If the email exists, a reset code has been sent' });
    } catch (error) {
        next(error);
    }
});

// POST /auth/reset-password - Reset password with code
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            throw unauthorized('Invalid credentials');
        }

        // Find valid reset code
        const verificationCode = await prisma.verificationCode.findFirst({
            where: {
                userId: user.id,
                code,
                type: CodeType.PASSWORD_RESET,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!verificationCode) {
            throw unauthorized('Invalid or expired reset code');
        }

        // Mark code as used
        await prisma.verificationCode.update({
            where: { id: verificationCode.id },
            data: { used: true },
        });

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

        // Send confirmation email
        try {
            await EmailService.sendPasswordChangedConfirmation(email, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send password changed email:', error);
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
});

// POST /auth/admin/reset-password - Admin-initiated password reset (requires PLATFORM_ADMIN)
router.post('/admin/reset-password', authenticate, authorize('PLATFORM_ADMIN'), async (req, res, next) => {
    try {
        const { userId, resetType, newPassword } = adminResetPasswordSchema.parse(req.body);

        // Find target user
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!targetUser) {
            throw badRequest('User not found');
        }

        let password = newPassword;
        let isTemporary = false;

        if (resetType === 'temporary' || !newPassword) {
            // Generate temporary password
            password = generatePassword();
            isTemporary = true;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password!, 12);

        // Update password and revoke all refresh tokens
        await prisma.$transaction([
            prisma.user.update({
                where: { id: targetUser.id },
                data: { passwordHash },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: targetUser.id },
                data: { revoked: true },
            }),
        ]);

        // Send email notification
        try {
            const adminUser = await prisma.user.findUnique({
                where: { id: req.user!.id },
            });
            const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}`.trim() : 'Admin';
            
            if (isTemporary) {
                await EmailService.sendPasswordResetNotification(
                    targetUser.email,
                    password!,
                    targetUser.firstName || undefined,
                    adminName
                );
            } else {
                await EmailService.sendPasswordChangedConfirmation(
                    targetUser.email,
                    targetUser.firstName || undefined
                );
            }
        } catch (error) {
            console.error('Failed to send password reset email:', error);
        }

        res.json({
            message: 'Password reset successfully',
            temporaryPassword: isTemporary ? password : undefined,
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

        // Send confirmation email
        try {
            await EmailService.sendPasswordChangedConfirmation(
                user.email,
                user.firstName || undefined
            );
        } catch (error) {
            console.error('Failed to send password changed email:', error);
        }

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
