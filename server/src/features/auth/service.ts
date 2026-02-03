/**
 * Auth Feature - Service
 * 
 * @description Business logic for authentication. Token generation, password handling,
 * verification codes, and authorization checks.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { CodeType, GlobalRole } from '@prisma/client';
import { config } from '../../config/index.js';
import { authRepository } from './repository.js';
import { EmailService } from '../../shared/services/email.service.js';
import type {
    TokenPair,
    TokenResponse,
    UserInfo,
    StoreInfo,
    CompanyInfo,
    UserWithRelations,
    LoginResponse,
    RefreshResponse,
    MeResponse,
    AdminResetResponse,
    SolumConnectResponse,
} from './types.js';

// ======================
// Helpers
// ======================

/**
 * Generate random 6-digit code
 */
function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate random password
 */
function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Map user with relations to UserInfo response
 */
function mapUserToInfo(user: UserWithRelations): UserInfo {
    const stores: StoreInfo[] = user.userStores.map(us => ({
        id: us.storeId,
        name: us.store.name,
        code: us.store.code,
        role: us.role,
        features: (us.features as string[]) || ['dashboard'],
        companyId: us.store.companyId,
        companyName: us.store.company.name,
    }));

    const companies: CompanyInfo[] = user.userCompanies.map(uc => ({
        id: uc.companyId,
        name: uc.company.name,
        code: uc.company.code,
        role: uc.role,
    }));

    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
        stores,
        companies,
    };
}

// ======================
// Service
// ======================

export const authService = {
    /**
     * Generate JWT token pair for a user
     */
    async generateTokens(userId: string): Promise<TokenPair> {
        const user = await authRepository.findUserWithRelations(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const stores = user.userStores.map(us => ({
            id: us.storeId,
            role: us.role,
            companyId: us.store.companyId,
        }));

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

        return { accessToken, refreshToken };
    },

    /**
     * Login step 1: Verify credentials and send 2FA code
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await authRepository.findUserByEmail(email);

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.isActive) {
            throw new Error('USER_INACTIVE');
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new Error('INVALID_CREDENTIALS');
        }

        // Generate and store 2FA code
        const code = generateCode();
        await authRepository.invalidateVerificationCodes(user.id, CodeType.LOGIN_2FA);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        await authRepository.createVerificationCode(user.id, code, CodeType.LOGIN_2FA, expiresAt);

        // Send email
        await EmailService.send2FACode(email, code, user.firstName || undefined);

        return {
            message: 'Verification code sent to your email',
            email,
            requiresVerification: true,
        };
    },

    /**
     * Login step 2: Verify 2FA code and issue tokens
     */
    async verify2FA(email: string, code: string): Promise<TokenResponse> {
        const user = await authRepository.findUserByEmailWithRelations(email);

        if (!user || !user.isActive) {
            throw new Error('INVALID_CREDENTIALS');
        }

        // Generate tokens
        const { accessToken, refreshToken } = await this.generateTokens(user.id);

        // Hash refresh token for storage
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

        // Execute transaction
        try {
            await authRepository.executeVerify2FATransaction(
                user.id,
                code,
                tokenHash,
                tokenExpiresAt
            );
        } catch (error: any) {
            if (error.message === 'INVALID_CODE') {
                throw new Error('INVALID_CODE');
            }
            throw error;
        }

        return {
            accessToken,
            refreshToken,
            expiresIn: 3600,
            user: mapUserToInfo(user),
        };
    },

    /**
     * Resend 2FA code
     */
    async resendCode(email: string): Promise<void> {
        const user = await authRepository.findUserByEmail(email);

        if (!user || !user.isActive) {
            // Don't reveal if user exists
            return;
        }

        const code = generateCode();
        await authRepository.invalidateVerificationCodes(user.id, CodeType.LOGIN_2FA);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        await authRepository.createVerificationCode(user.id, code, CodeType.LOGIN_2FA, expiresAt);

        try {
            await EmailService.send2FACode(email, code, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send 2FA email:', error);
        }
    },

    /**
     * Refresh access token
     */
    async refresh(token: string): Promise<RefreshResponse> {
        // Verify token
        let payload: { sub: string; jti: string };
        try {
            payload = jwt.verify(token, config.jwt.refreshSecret) as typeof payload;
        } catch {
            throw new Error('INVALID_TOKEN');
        }

        // Find user and tokens
        const user = await authRepository.findUserWithRelations(payload.sub);
        if (!user || !user.isActive) {
            throw new Error('USER_NOT_FOUND');
        }

        // Find matching token
        const storedTokens = await authRepository.findUserRefreshTokens(user.id);
        let matchingToken = null;
        for (const storedToken of storedTokens) {
            const isMatch = await bcrypt.compare(token, storedToken.tokenHash);
            if (isMatch && storedToken.expiresAt > new Date()) {
                matchingToken = storedToken;
                break;
            }
        }

        if (!matchingToken) {
            throw new Error('TOKEN_NOT_FOUND');
        }

        // Revoke old token
        await authRepository.revokeRefreshToken(matchingToken.id);

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user.id);

        // Store new refresh token
        const tokenHash = await bcrypt.hash(newRefreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await authRepository.createRefreshToken(user.id, tokenHash, expiresAt);

        return {
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: 3600,
        };
    },

    /**
     * Get current user info
     */
    async getMe(userId: string): Promise<MeResponse> {
        const user = await authRepository.findUserWithRelations(userId);

        if (!user || !user.isActive) {
            throw new Error('USER_NOT_FOUND');
        }

        return { user: mapUserToInfo(user) };
    },

    /**
     * Request password reset
     */
    async forgotPassword(email: string): Promise<void> {
        const user = await authRepository.findUserByEmail(email);

        if (!user || !user.isActive) {
            return; // Don't reveal if user exists
        }

        const code = generateCode();
        await authRepository.invalidateVerificationCodes(user.id, CodeType.PASSWORD_RESET);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        await authRepository.createVerificationCode(user.id, code, CodeType.PASSWORD_RESET, expiresAt);

        try {
            await EmailService.sendPasswordResetCode(email, code, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
        }
    },

    /**
     * Reset password with code
     */
    async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
        const user = await authRepository.findUserByEmail(email);

        if (!user || !user.isActive) {
            throw new Error('INVALID_CREDENTIALS');
        }

        // Find valid reset code
        const verificationCode = await authRepository.findValidVerificationCode(
            user.id,
            code,
            CodeType.PASSWORD_RESET
        );

        if (!verificationCode) {
            throw new Error('INVALID_CODE');
        }

        // Mark code as used
        await authRepository.markCodeAsUsed(verificationCode.id);

        // Hash and update password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await authRepository.executePasswordResetTransaction(user.id, passwordHash);

        try {
            await EmailService.sendPasswordChangedConfirmation(email, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send password changed email:', error);
        }
    },

    /**
     * Admin reset password
     */
    async adminResetPassword(
        targetUserId: string,
        resetType: 'temporary' | 'fixed',
        newPassword?: string,
        adminUserId?: string
    ): Promise<AdminResetResponse> {
        const targetUser = await authRepository.findUserByEmail(targetUserId);
        if (!targetUser) {
            // Try by ID
            const userById = await authRepository.findUserWithRelations(targetUserId);
            if (!userById) {
                throw new Error('USER_NOT_FOUND');
            }
        }

        let password = newPassword;
        let isTemporary = false;

        if (resetType === 'temporary' || !newPassword) {
            password = generatePassword();
            isTemporary = true;
        }

        const passwordHash = await bcrypt.hash(password!, 12);
        await authRepository.executePasswordResetTransaction(targetUserId, passwordHash);

        // Get target user for email
        const user = await authRepository.findUserWithRelations(targetUserId);
        if (user) {
            try {
                let adminName = 'Admin';
                if (adminUserId) {
                    const admin = await authRepository.findUserWithRelations(adminUserId);
                    if (admin) {
                        adminName = `${admin.firstName} ${admin.lastName}`.trim() || 'Admin';
                    }
                }

                if (isTemporary) {
                    await EmailService.sendPasswordResetNotification(
                        user.email,
                        password!,
                        user.firstName || undefined,
                        adminName
                    );
                } else {
                    await EmailService.sendPasswordChangedConfirmation(
                        user.email,
                        user.firstName || undefined
                    );
                }
            } catch (error) {
                console.error('Failed to send password reset email:', error);
            }
        }

        return {
            message: 'Password reset successfully',
            temporaryPassword: isTemporary ? password : undefined,
        };
    },

    /**
     * Change password (authenticated user)
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await authRepository.findUserWithRelations(userId);

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new Error('INVALID_PASSWORD');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await authRepository.executePasswordResetTransaction(userId, passwordHash);

        try {
            await EmailService.sendPasswordChangedConfirmation(user.email, user.firstName || undefined);
        } catch (error) {
            console.error('Failed to send password changed email:', error);
        }
    },

    /**
     * Logout - revoke all user's tokens
     */
    async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) return;

        try {
            const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string };
            await authRepository.revokeAllUserTokens(payload.sub);
        } catch {
            // Token invalid, nothing to revoke
        }
    },

    /**
     * Connect to SOLUM
     */
    async solumConnect(
        storeId: string,
        userId: string,
        userStores: Array<{ id: string }>,
        userGlobalRole: string | null
    ): Promise<SolumConnectResponse> {
        // Verify access
        const hasAccess = userStores.some(s => s.id === storeId) ||
            userGlobalRole === GlobalRole.PLATFORM_ADMIN;

        if (!hasAccess) {
            throw new Error('NO_ACCESS');
        }

        // Get AIMS gateway
        const { aimsGateway } = await import('../../shared/infrastructure/services/aimsGateway.js');

        // Get store config
        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw new Error('AIMS_NOT_CONFIGURED');
        }

        // Get access token
        const accessToken = await aimsGateway.getToken(storeConfig.companyId);

        // Get store details
        const store = await authRepository.findStoreWithCompany(storeId);
        if (!store) {
            throw new Error('STORE_NOT_FOUND');
        }

        return {
            connected: true,
            config: {
                baseUrl: store.company.aimsBaseUrl,
                cluster: store.company.aimsCluster || 'common',
                companyCode: store.company.code,
                storeCode: store.code,
            },
            tokens: {
                accessToken,
            },
        };
    },
};
