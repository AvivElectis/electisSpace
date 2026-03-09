import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { unauthorized, forbidden, badRequest, tooManyRequests } from '../../shared/middleware/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import type { CompanyUserRole } from '@prisma/client';
import type { CompassJwtPayload, CompassUserInfo, CompassTokenResponse } from './types.js';
import { prisma } from '../../config/index.js';
import * as repo from './repository.js';
import { EmailService } from '../../shared/services/email.service.js';

const COMPASS_TOKEN_TYPE = 'COMPASS' as const;
const CODE_EXPIRY_MINUTES = 15;
const DEVICE_TOKEN_EXPIRY_DAYS = 365;
const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes

// ─── Login (send verification code) ──────────────────

export const sendLoginCode = async (email: string): Promise<{ message: string; codeExpiryMinutes: number }> => {
    let user = await repo.findCompanyUserByEmail(email);

    // If no CompanyUser found, check if an admin User exists with access to a compass-enabled company
    if (!user) {
        const adminUser = await prisma.user.findUnique({
            where: { email, isActive: true },
            select: {
                id: true, email: true, firstName: true, lastName: true,
                globalRole: true,
                userCompanies: {
                    select: {
                        company: { select: { id: true, name: true, compassEnabled: true } },
                    },
                },
                userStores: {
                    select: { storeId: true },
                    take: 1,
                },
            },
        });

        if (adminUser) {
            // Find first compass-enabled company the admin has access to
            const compassCompany = adminUser.userCompanies.find(uc => uc.company.compassEnabled);
            if (compassCompany && adminUser.userStores[0]) {
                // Auto-create CompanyUser linked to admin (upsert to avoid race condition)
                const displayName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email.split('@')[0];
                await prisma.companyUser.upsert({
                    where: { companyId_email: { companyId: compassCompany.company.id, email: adminUser.email } },
                    update: {},
                    create: {
                        companyId: compassCompany.company.id,
                        branchId: adminUser.userStores[0].storeId,
                        email: adminUser.email,
                        displayName,
                        role: 'ADMIN',
                        linkedUserId: adminUser.id,
                        isActive: true,
                    },
                });
                appLogger.info('CompassAuth', `Auto-created Compass ADMIN for admin user ${email}`);
                // Re-fetch with proper relations
                user = await repo.findCompanyUserByEmail(email);
            }
        }
    }

    if (!user) {
        // Don't reveal whether the email exists
        appLogger.info('CompassAuth', `Login attempt for unknown email`, { email });
        return { message: 'If this email is registered, a verification code has been sent.', codeExpiryMinutes: CODE_EXPIRY_MINUTES };
    }

    if (!user.company.compassEnabled) {
        throw forbidden('Compass is not enabled for this company');
    }

    const code = repo.generateCode();
    const codeHash = await repo.hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await repo.createVerificationCode(email, user.id, codeHash, expiresAt);

    // Send verification code via email
    try {
        await EmailService.sendCompassLoginCode(email, code, user.displayName);
    } catch (err) {
        // Log but don't fail — still log code in dev for debugging
        appLogger.error('CompassAuth', `Failed to send verification email to ${email}`, { error: String(err) });
    }

    // Also log in dev for easy debugging
    if (config.isDev) {
        appLogger.info('CompassAuth', `Verification code for ${email}: ${code}`);
    }

    return {
        message: 'If this email is registered, a verification code has been sent.',
        codeExpiryMinutes: CODE_EXPIRY_MINUTES,
    };
};

// ─── Verify Code & Issue Tokens ──────────────────────

export const verifyCodeAndLogin = async (
    email: string,
    code: string,
    deviceInfo?: { deviceId?: string; deviceName?: string; platform?: string },
): Promise<CompassTokenResponse> => {
    const user = await repo.findCompanyUserByEmail(email);
    if (!user) {
        throw unauthorized('Invalid email or code');
    }

    if (!user.company.compassEnabled) {
        throw forbidden('Compass is not enabled for this company');
    }

    const verificationCode = await repo.findValidVerificationCode(email);
    if (!verificationCode) {
        throw unauthorized('Invalid or expired verification code');
    }

    // Increment attempts unconditionally before verifying (pessimistic approach)
    await repo.incrementCodeAttempts(verificationCode.id);

    const isValid = await repo.verifyCode(code, verificationCode.codeHash);
    if (!isValid) {
        throw unauthorized('Invalid or expired verification code');
    }

    await repo.consumeVerificationCode(verificationCode.id);

    // Generate tokens
    const tokens = generateCompassTokens(user.id, user.companyId, user.branchId, user.role);

    // If device info provided, create device token for biometric login
    let deviceToken: string | undefined;
    if (deviceInfo?.deviceId) {
        deviceToken = repo.generateDeviceToken();
        const tokenHash = await repo.hashDeviceToken(deviceToken);
        const expiresAt = new Date(Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        await repo.createDeviceToken(
            user.id,
            tokenHash,
            deviceInfo.deviceName ?? null,
            deviceInfo.platform ?? null,
            expiresAt,
        );
    }

    appLogger.info('CompassAuth', `User logged in: ${email}`, { companyUserId: user.id });

    return {
        ...tokens,
        user: mapToUserInfo(user),
        ...(deviceToken && { deviceToken }),
    };
};

// ─── Refresh Token ───────────────────────────────────

export const refreshAccessToken = async (refreshToken: string): Promise<CompassTokenResponse> => {
    let payload: CompassJwtPayload;
    try {
        payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as CompassJwtPayload;
    } catch {
        throw unauthorized('Invalid refresh token');
    }

    if (payload.tokenType !== COMPASS_TOKEN_TYPE) {
        throw unauthorized('Invalid token type');
    }

    const user = await repo.findCompanyUserById(payload.sub);
    if (!user || !user.isActive) {
        throw unauthorized('User not found or inactive');
    }

    if (!user.company.compassEnabled) {
        throw forbidden('Compass is not enabled for this company');
    }

    const tokens = generateCompassTokens(user.id, user.companyId, user.branchId, user.role);

    return {
        ...tokens,
        user: mapToUserInfo(user),
    };
};

// ─── Device Token Auth ───────────────────────────────

export const authenticateWithDeviceToken = async (
    deviceToken: string,
    email: string,
): Promise<CompassTokenResponse> => {
    const user = await repo.findCompanyUserByEmail(email);
    if (!user) {
        throw unauthorized('Invalid credentials');
    }

    if (!user.company.compassEnabled) {
        throw forbidden('Compass is not enabled for this company');
    }

    // Get all active device tokens for this user
    const deviceTokens = await repo.findActiveDeviceTokens(user.id);
    if (deviceTokens.length === 0) {
        throw unauthorized('No registered device tokens');
    }

    // Check each token hash (bcrypt compare)
    let matchedToken: (typeof deviceTokens)[0] | null = null;
    for (const dt of deviceTokens) {
        const isValid = await repo.verifyDeviceToken(deviceToken, dt.tokenHash);
        if (isValid) {
            matchedToken = dt;
            break;
        }
    }

    if (!matchedToken) {
        throw unauthorized('Invalid device token');
    }

    // Update last used timestamp
    await repo.updateDeviceTokenLastUsed(matchedToken.id);

    const tokens = generateCompassTokens(user.id, user.companyId, user.branchId, user.role);

    appLogger.info('CompassAuth', `Device token login: ${email}`, { companyUserId: user.id });

    return {
        ...tokens,
        user: mapToUserInfo(user),
    };
};

// ─── Token Generation ────────────────────────────────

const generateCompassTokens = (
    companyUserId: string,
    companyId: string,
    branchId: string,
    role: CompanyUserRole,
) => {
    const accessPayload: CompassJwtPayload = {
        sub: companyUserId,
        companyId,
        branchId,
        role,
        tokenType: COMPASS_TOKEN_TYPE,
    };

    const accessToken = jwt.sign(accessPayload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshPayload: CompassJwtPayload = {
        ...accessPayload,
    };

    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });

    return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
};

// ─── Device Management ───────────────────────────────

export const listDevices = async (companyUserId: string) => {
    return repo.findActiveDeviceTokens(companyUserId);
};

export const revokeDevice = async (companyUserId: string, deviceTokenId: string) => {
    const tokens = await repo.findActiveDeviceTokens(companyUserId);
    const token = tokens.find(t => t.id === deviceTokenId);
    if (!token) {
        throw badRequest('Device token not found');
    }
    await repo.revokeDeviceToken(deviceTokenId);
    return { message: 'Device revoked' };
};

// ─── Expired Device Token Cleanup ────────────────────

export const cleanupExpiredDeviceTokens = async (): Promise<number> => {
    const result = await prisma.deviceToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
        appLogger.info('CompassAuth', `Cleaned up ${result.count} expired device tokens`);
    }
    return result.count;
};

// ─── Helpers ─────────────────────────────────────────

type CompassUserRecord = NonNullable<Awaited<ReturnType<typeof repo.findCompanyUserByEmail>>>;

const mapToUserInfo = (user: CompassUserRecord): CompassUserInfo => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    companyId: user.companyId,
    branchId: user.branchId,
    buildingId: user.buildingId,
    floorId: user.floorId,
    departmentName: user.department?.name ?? null,
    branchName: user.branch?.name ?? null,
    branchAddress: [user.branch?.addressLine1, user.branch?.city, user.branch?.country].filter(Boolean).join(', ') || null,
    preferences: user.preferences,
});
