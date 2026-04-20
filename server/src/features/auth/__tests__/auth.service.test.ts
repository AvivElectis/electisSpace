/**
 * Auth Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/index.js', () => ({
    config: {
        jwt: {
            accessSecret: 'test-access-secret-32chars-long!!',
            refreshSecret: 'test-refresh-secret-32chars-long!',
            accessExpiresIn: '15m',
            refreshExpiresIn: '7d',
            refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
        },
        authRateLimit: { windowMs: 60000, max: 10 },
        twofaRateLimit: { windowMs: 60000, max: 5 },
    },
    prisma: {},
}));

vi.mock('../repository.js', () => ({
    authRepository: {
        findUserByEmail: vi.fn(),
        findUserWithRelations: vi.fn(),
        findUserByEmailWithRelations: vi.fn(),
        invalidateVerificationCodes: vi.fn(),
        createVerificationCode: vi.fn(),
        executeVerify2FATransaction: vi.fn(),
        findUserRefreshTokens: vi.fn(),
        revokeRefreshToken: vi.fn(),
        createRefreshToken: vi.fn(),
        revokeAllUserTokens: vi.fn(),
        findValidVerificationCode: vi.fn(),
        markCodeAsUsed: vi.fn(),
        executePasswordResetTransaction: vi.fn(),
        findStoresByCompanyIds: vi.fn(),
        findStoreWithCompany: vi.fn(),
    },
}));

vi.mock('../../../shared/services/email.service.js', () => ({
    EmailService: {
        send2FACode: vi.fn().mockResolvedValue(undefined),
        sendPasswordResetCode: vi.fn().mockResolvedValue(undefined),
        sendPasswordChangedConfirmation: vi.fn().mockResolvedValue(undefined),
        sendPasswordResetNotification: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../shared/utils/featureResolution.js', () => ({
    extractCompanyFeatures: vi.fn(() => ({})),
    extractSpaceType: vi.fn(() => 'retail'),
    extractPeopleType: vi.fn(() => 'people'),
    extractStoreFeatures: vi.fn(() => null),
    extractStoreSpaceType: vi.fn(() => null),
    extractStorePeopleType: vi.fn(() => null),
    resolveEffectiveFeatures: vi.fn(() => ({})),
    resolveEffectiveSpaceType: vi.fn(() => 'retail'),
    resolveEffectivePeopleType: vi.fn(() => 'people'),
}));

vi.mock('bcrypt', () => ({
    default: { compare: vi.fn(), hash: vi.fn().mockResolvedValue('hashed-value') },
}));

vi.mock('jsonwebtoken', () => ({
    default: { sign: vi.fn().mockReturnValue('mock-token'), verify: vi.fn() },
}));

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repository.js';
import { EmailService } from '../../../shared/services/email.service.js';
import { authService } from '../service.js';

const mockRepo = authRepository as any;
const mockEmail = EmailService as any;

const makeUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-1',
    email: 'test@electis.co.il',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2b$12$hashedpassword',
    isActive: true,
    globalRole: 'PLATFORM_ADMIN',
    activeCompanyId: 'comp-1',
    activeStoreId: 'store-1',
    userStores: [{
        storeId: 'store-1', roleId: 'role-admin', features: ['dashboard'],
        store: { name: 'Store 1', code: 'S1', companyId: 'comp-1', company: { name: 'Company 1', settings: null }, settings: null },
    }],
    userCompanies: [{
        companyId: 'comp-1', role: 'COMPANY_ADMIN', allStoresAccess: false,
        company: { name: 'Company 1', code: 'C1', settings: null },
    }],
    ...overrides,
});

describe('AuthService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('login', () => {
        it('should throw USER_NOT_FOUND when email does not exist', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(null);
            await expect(authService.login('nobody@test.com', 'pass')).rejects.toThrow('USER_NOT_FOUND');
        });

        it('should throw USER_INACTIVE when user is deactivated', async () => {
            mockRepo.findUserByEmail.mockResolvedValue({ ...makeUser(), isActive: false });
            await expect(authService.login('test@electis.co.il', 'pass')).rejects.toThrow('USER_INACTIVE');
        });

        it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(makeUser());
            (bcrypt.compare as any).mockResolvedValue(false);
            await expect(authService.login('test@electis.co.il', 'wrong')).rejects.toThrow('INVALID_CREDENTIALS');
        });

        it('should send 2FA code on successful credential check', async () => {
            const user = makeUser();
            mockRepo.findUserByEmail.mockResolvedValue(user);
            (bcrypt.compare as any).mockResolvedValue(true);

            const result = await authService.login('test@electis.co.il', 'password123');

            expect(result).toEqual({
                message: 'Verification code sent to your email',
                email: 'test@electis.co.il',
                requiresVerification: true,
            });
            expect(mockRepo.invalidateVerificationCodes).toHaveBeenCalledWith(user.id, 'LOGIN_2FA');
            expect(mockRepo.createVerificationCode).toHaveBeenCalled();
            expect(mockEmail.send2FACode).toHaveBeenCalledWith('test@electis.co.il', expect.any(String), 'Test');
        });
    });

    describe('verify2FA', () => {
        it('should throw INVALID_CREDENTIALS when user not found', async () => {
            mockRepo.findUserByEmailWithRelations.mockResolvedValue(null);
            await expect(authService.verify2FA('nobody@test.com', '123456')).rejects.toThrow('INVALID_CREDENTIALS');
        });

        it('should throw INVALID_CODE when transaction fails', async () => {
            const user = makeUser();
            mockRepo.findUserByEmailWithRelations.mockResolvedValue(user);
            mockRepo.findUserWithRelations.mockResolvedValue(user);
            mockRepo.executeVerify2FATransaction.mockRejectedValue(new Error('INVALID_CODE'));
            await expect(authService.verify2FA('test@electis.co.il', '000000')).rejects.toThrow('INVALID_CODE');
        });

        it('should return tokens and user info on valid code', async () => {
            const user = makeUser();
            mockRepo.findUserByEmailWithRelations.mockResolvedValue(user);
            mockRepo.findUserWithRelations.mockResolvedValue(user);
            mockRepo.executeVerify2FATransaction.mockResolvedValue(undefined);

            const result = await authService.verify2FA('test@electis.co.il', '123456');

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.expiresIn).toBe(900);
            expect(result.user.email).toBe('test@electis.co.il');
        });
    });

    describe('resendCode', () => {
        it('should silently return when user not found', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(null);
            await expect(authService.resendCode('nobody@test.com')).resolves.toBeUndefined();
            expect(mockRepo.createVerificationCode).not.toHaveBeenCalled();
        });

        it('should create new code and send email', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(makeUser());
            await authService.resendCode('test@electis.co.il');
            expect(mockRepo.invalidateVerificationCodes).toHaveBeenCalled();
            expect(mockEmail.send2FACode).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should throw INVALID_TOKEN when jwt fails', async () => {
            (jwt.verify as any).mockImplementation(() => { throw new Error('invalid'); });
            await expect(authService.refresh('bad-token')).rejects.toThrow('INVALID_TOKEN');
        });

        it('should throw TOKEN_NOT_FOUND when no matching token', async () => {
            (jwt.verify as any).mockReturnValue({ sub: 'user-1', jti: 'jti-1' });
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            mockRepo.findUserRefreshTokens.mockResolvedValue([]);
            await expect(authService.refresh('valid-token')).rejects.toThrow('TOKEN_NOT_FOUND');
        });

        it('should revoke old and return new tokens', async () => {
            (jwt.verify as any).mockReturnValue({ sub: 'user-1', jti: 'jti-1' });
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            mockRepo.findUserRefreshTokens.mockResolvedValue([
                { id: 'tok-1', tokenHash: 'hash', expiresAt: new Date(Date.now() + 100000) },
            ]);
            (bcrypt.compare as any).mockResolvedValue(true);

            const result = await authService.refresh('valid-token');

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith('tok-1');
        });
    });

    describe('getMe', () => {
        it('should throw USER_NOT_FOUND', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(null);
            await expect(authService.getMe('missing')).rejects.toThrow('USER_NOT_FOUND');
        });

        it('should return user info', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            const result = await authService.getMe('user-1');
            expect(result.user.id).toBe('user-1');
            expect(result.user.stores).toHaveLength(1);
        });
    });

    describe('forgotPassword', () => {
        it('should silently return for non-existent user', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(null);
            await authService.forgotPassword('nobody@test.com');
            expect(mockEmail.sendPasswordResetCode).not.toHaveBeenCalled();
        });

        it('should send reset code', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(makeUser());
            await authService.forgotPassword('test@electis.co.il');
            expect(mockRepo.invalidateVerificationCodes).toHaveBeenCalledWith('user-1', 'PASSWORD_RESET');
        });
    });

    describe('resetPassword', () => {
        it('should throw INVALID_CODE', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(makeUser());
            mockRepo.findValidVerificationCode.mockResolvedValue(null);
            await expect(authService.resetPassword('test@electis.co.il', '000000', 'newpass12')).rejects.toThrow('INVALID_CODE');
        });

        it('should reset password', async () => {
            mockRepo.findUserByEmail.mockResolvedValue(makeUser());
            mockRepo.findValidVerificationCode.mockResolvedValue({ id: 'code-1' });
            await authService.resetPassword('test@electis.co.il', '123456', 'newpass12');
            expect(mockRepo.markCodeAsUsed).toHaveBeenCalledWith('code-1');
        });
    });

    describe('changePassword', () => {
        it('should throw INVALID_PASSWORD', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            (bcrypt.compare as any).mockResolvedValue(false);
            await expect(authService.changePassword('user-1', 'wrong', 'new12345')).rejects.toThrow('INVALID_PASSWORD');
        });

        it('should update password', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            (bcrypt.compare as any).mockResolvedValue(true);
            await authService.changePassword('user-1', 'old', 'newpass12');
            expect(mockRepo.executePasswordResetTransaction).toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should do nothing with empty token', async () => {
            await authService.logout('');
            expect(mockRepo.revokeAllUserTokens).not.toHaveBeenCalled();
        });

        it('should revoke all tokens', async () => {
            (jwt.verify as any).mockReturnValue({ sub: 'user-1' });
            await authService.logout('valid-token');
            expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
        });

        it('should handle invalid token silently', async () => {
            (jwt.verify as any).mockImplementation(() => { throw new Error(); });
            await expect(authService.logout('bad')).resolves.toBeUndefined();
        });
    });

    describe('generateTokens', () => {
        it('should throw USER_NOT_FOUND', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(null);
            await expect(authService.generateTokens('missing')).rejects.toThrow('USER_NOT_FOUND');
        });

        it('should return token pair', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            (jwt.sign as any).mockReturnValueOnce('access').mockReturnValueOnce('refresh');
            const result = await authService.generateTokens('user-1');
            expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
        });
    });

    describe('adminResetPassword', () => {
        it('should throw USER_NOT_FOUND', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(null);
            await expect(authService.adminResetPassword('missing', 'temporary')).rejects.toThrow('USER_NOT_FOUND');
        });

        it('should generate temporary password', async () => {
            mockRepo.findUserWithRelations.mockResolvedValue(makeUser());
            const result = await authService.adminResetPassword('user-1', 'temporary');
            expect(result.temporaryPassword).toBeDefined();
        });
    });
});
