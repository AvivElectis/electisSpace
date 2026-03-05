/**
 * Compass Auth Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
vi.mock('../repository.js', () => ({
    findCompanyUserByEmail: vi.fn(),
    findCompanyUserById: vi.fn(),
    generateCode: vi.fn(),
    hashCode: vi.fn(),
    verifyCode: vi.fn(),
    createVerificationCode: vi.fn(),
    findValidVerificationCode: vi.fn(),
    incrementCodeAttempts: vi.fn(),
    consumeVerificationCode: vi.fn(),
    generateDeviceToken: vi.fn(),
    hashDeviceToken: vi.fn(),
    verifyDeviceToken: vi.fn(),
    createDeviceToken: vi.fn(),
    findActiveDeviceTokens: vi.fn(),
    updateDeviceTokenLastUsed: vi.fn(),
    revokeDeviceToken: vi.fn(),
}));

// Mock config
vi.mock('../../../config/index.js', () => ({
    config: {
        isDev: false,
        jwt: {
            accessSecret: 'test-access-secret-for-unit-tests-only',
            refreshSecret: 'test-refresh-secret-for-unit-tests-only',
            accessExpiresIn: '15m',
            refreshExpiresIn: '7d',
        },
    },
}));

// Mock email service
vi.mock('../../../shared/services/email.service.js', () => ({
    EmailService: {
        sendCompassLoginCode: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock logger
vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock middleware error factories
vi.mock('../../../shared/middleware/index.js', () => {
    class AppError extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.statusCode = statusCode;
        }
    }
    return {
        unauthorized: (msg: string) => new AppError(msg, 401),
        forbidden: (msg: string) => new AppError(msg, 403),
        badRequest: (msg: string) => new AppError(msg, 400),
        tooManyRequests: (msg: string) => new AppError(msg, 429),
    };
});

import * as repo from '../repository.js';
import * as service from '../service.js';

const mockRepo = repo as {
    findCompanyUserByEmail: ReturnType<typeof vi.fn>;
    findCompanyUserById: ReturnType<typeof vi.fn>;
    generateCode: ReturnType<typeof vi.fn>;
    hashCode: ReturnType<typeof vi.fn>;
    verifyCode: ReturnType<typeof vi.fn>;
    createVerificationCode: ReturnType<typeof vi.fn>;
    findValidVerificationCode: ReturnType<typeof vi.fn>;
    incrementCodeAttempts: ReturnType<typeof vi.fn>;
    consumeVerificationCode: ReturnType<typeof vi.fn>;
    generateDeviceToken: ReturnType<typeof vi.fn>;
    hashDeviceToken: ReturnType<typeof vi.fn>;
    verifyDeviceToken: ReturnType<typeof vi.fn>;
    createDeviceToken: ReturnType<typeof vi.fn>;
    findActiveDeviceTokens: ReturnType<typeof vi.fn>;
    updateDeviceTokenLastUsed: ReturnType<typeof vi.fn>;
    revokeDeviceToken: ReturnType<typeof vi.fn>;
};

// ─── Test Data ──────────────────────────────────────

const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    role: 'EMPLOYEE',
    companyId: 'company-1',
    branchId: 'branch-1',
    buildingId: null,
    floorId: null,
    preferences: {},
    isActive: true,
    company: { id: 'company-1', name: 'Test Corp', compassEnabled: true },
    branch: { id: 'branch-1', name: 'HQ', code: 'HQ' },
};

const mockUserCompassDisabled = {
    ...mockUser,
    company: { ...mockUser.company, compassEnabled: false },
};

// ─── sendLoginCode ──────────────────────────────────

describe('sendLoginCode', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return generic message when email not found', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(null);

        const result = await service.sendLoginCode('unknown@example.com');

        expect(result.message).toContain('If this email is registered');
        expect(mockRepo.createVerificationCode).not.toHaveBeenCalled();
    });

    it('should throw forbidden when compass is not enabled', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUserCompassDisabled);

        await expect(service.sendLoginCode('test@example.com'))
            .rejects.toThrow('Compass is not enabled for this company');
    });

    it('should generate code and create verification entry', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.generateCode.mockReturnValue('123456');
        mockRepo.hashCode.mockResolvedValue('hashed-code');
        mockRepo.createVerificationCode.mockResolvedValue({});

        const result = await service.sendLoginCode('test@example.com');

        expect(result.message).toContain('If this email is registered');
        expect(mockRepo.generateCode).toHaveBeenCalledOnce();
        expect(mockRepo.hashCode).toHaveBeenCalledWith('123456');
        expect(mockRepo.createVerificationCode).toHaveBeenCalledWith(
            'test@example.com',
            'user-1',
            'hashed-code',
            expect.any(Date),
        );
    });

    it('should still succeed if email sending fails', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.generateCode.mockReturnValue('654321');
        mockRepo.hashCode.mockResolvedValue('hashed');
        mockRepo.createVerificationCode.mockResolvedValue({});

        // Email service is already mocked to succeed, but let's make it fail
        const { EmailService } = await import('../../../shared/services/email.service.js');
        (EmailService.sendCompassLoginCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('SMTP down'));

        const result = await service.sendLoginCode('test@example.com');

        expect(result.message).toContain('If this email is registered');
    });
});

// ─── verifyCodeAndLogin ─────────────────────────────

describe('verifyCodeAndLogin', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw unauthorized for unknown email', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(null);

        await expect(service.verifyCodeAndLogin('unknown@example.com', '123456'))
            .rejects.toThrow('Invalid email or code');
    });

    it('should throw forbidden when compass is disabled', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUserCompassDisabled);

        await expect(service.verifyCodeAndLogin('test@example.com', '123456'))
            .rejects.toThrow('Compass is not enabled for this company');
    });

    it('should throw unauthorized for invalid/expired code', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue(null);

        await expect(service.verifyCodeAndLogin('test@example.com', '123456'))
            .rejects.toThrow('Invalid or expired verification code');
    });

    it('should increment attempts on invalid code', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue({
            id: 'code-1',
            codeHash: 'some-hash',
        });
        mockRepo.verifyCode.mockResolvedValue(false);

        await expect(service.verifyCodeAndLogin('test@example.com', '000000'))
            .rejects.toThrow('Invalid or expired verification code');

        expect(mockRepo.incrementCodeAttempts).toHaveBeenCalledWith('code-1');
    });

    it('should return tokens on valid code', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue({
            id: 'code-1',
            codeHash: 'valid-hash',
        });
        mockRepo.verifyCode.mockResolvedValue(true);
        mockRepo.consumeVerificationCode.mockResolvedValue({});

        const result = await service.verifyCodeAndLogin('test@example.com', '123456');

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.expiresIn).toBe(900);
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.companyId).toBe('company-1');
        expect(mockRepo.consumeVerificationCode).toHaveBeenCalledWith('code-1');
    });

    it('should create device token when deviceInfo is provided', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue({
            id: 'code-1',
            codeHash: 'valid-hash',
        });
        mockRepo.verifyCode.mockResolvedValue(true);
        mockRepo.consumeVerificationCode.mockResolvedValue({});
        mockRepo.generateDeviceToken.mockReturnValue('device-token-hex');
        mockRepo.hashDeviceToken.mockResolvedValue('hashed-device-token');
        mockRepo.createDeviceToken.mockResolvedValue({});

        await service.verifyCodeAndLogin('test@example.com', '123456', {
            deviceId: 'device-abc',
            deviceName: 'Pixel 7',
            platform: 'ANDROID',
        });

        expect(mockRepo.generateDeviceToken).toHaveBeenCalledOnce();
        expect(mockRepo.hashDeviceToken).toHaveBeenCalledWith('device-token-hex');
        expect(mockRepo.createDeviceToken).toHaveBeenCalledWith(
            'user-1',
            'hashed-device-token',
            'Pixel 7',
            'ANDROID',
            expect.any(Date),
        );
    });
});

// ─── refreshAccessToken ─────────────────────────────

describe('refreshAccessToken', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw unauthorized for invalid refresh token', async () => {
        await expect(service.refreshAccessToken('invalid-jwt-string'))
            .rejects.toThrow('Invalid refresh token');
    });

    it('should throw unauthorized when user not found', async () => {
        // First get a valid token via verifyCodeAndLogin
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue({
            id: 'c1',
            codeHash: 'h',
        });
        mockRepo.verifyCode.mockResolvedValue(true);
        mockRepo.consumeVerificationCode.mockResolvedValue({});

        const loginResult = await service.verifyCodeAndLogin('test@example.com', '123456');

        // Now mock user as not found for refresh
        mockRepo.findCompanyUserById.mockResolvedValue(null);

        await expect(service.refreshAccessToken(loginResult.refreshToken))
            .rejects.toThrow('User not found or inactive');
    });

    it('should return new tokens for valid refresh token', async () => {
        // Get a valid refresh token first
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findValidVerificationCode.mockResolvedValue({
            id: 'c1',
            codeHash: 'h',
        });
        mockRepo.verifyCode.mockResolvedValue(true);
        mockRepo.consumeVerificationCode.mockResolvedValue({});

        const loginResult = await service.verifyCodeAndLogin('test@example.com', '123456');

        // Now refresh
        mockRepo.findCompanyUserById.mockResolvedValue(mockUser);

        const result = await service.refreshAccessToken(loginResult.refreshToken);

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.user.id).toBe('user-1');
    });
});

// ─── authenticateWithDeviceToken ────────────────────

describe('authenticateWithDeviceToken', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw unauthorized for unknown email', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(null);

        await expect(service.authenticateWithDeviceToken('token', 'unknown@example.com'))
            .rejects.toThrow('Invalid credentials');
    });

    it('should throw forbidden when compass is disabled', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUserCompassDisabled);

        await expect(service.authenticateWithDeviceToken('token', 'test@example.com'))
            .rejects.toThrow('Compass is not enabled for this company');
    });

    it('should throw unauthorized when no device tokens exist', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findActiveDeviceTokens.mockResolvedValue([]);

        await expect(service.authenticateWithDeviceToken('token', 'test@example.com'))
            .rejects.toThrow('No registered device tokens');
    });

    it('should throw unauthorized when device token does not match', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findActiveDeviceTokens.mockResolvedValue([
            { id: 'dt-1', tokenHash: 'hash-1' },
        ]);
        mockRepo.verifyDeviceToken.mockResolvedValue(false);

        await expect(service.authenticateWithDeviceToken('wrong-token', 'test@example.com'))
            .rejects.toThrow('Invalid device token');
    });

    it('should return tokens when device token matches', async () => {
        mockRepo.findCompanyUserByEmail.mockResolvedValue(mockUser);
        mockRepo.findActiveDeviceTokens.mockResolvedValue([
            { id: 'dt-1', tokenHash: 'hash-1' },
            { id: 'dt-2', tokenHash: 'hash-2' },
        ]);
        // First token doesn't match, second does
        mockRepo.verifyDeviceToken
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        mockRepo.updateDeviceTokenLastUsed.mockResolvedValue({});

        const result = await service.authenticateWithDeviceToken('valid-token', 'test@example.com');

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.user.email).toBe('test@example.com');
        expect(mockRepo.updateDeviceTokenLastUsed).toHaveBeenCalledWith('dt-2');
    });
});

// ─── listDevices ────────────────────────────────────

describe('listDevices', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return active device tokens', async () => {
        const tokens = [
            { id: 'dt-1', deviceName: 'Pixel 7', platform: 'ANDROID' },
        ];
        mockRepo.findActiveDeviceTokens.mockResolvedValue(tokens);

        const result = await service.listDevices('user-1');

        expect(result).toEqual(tokens);
        expect(mockRepo.findActiveDeviceTokens).toHaveBeenCalledWith('user-1');
    });
});

// ─── revokeDevice ───────────────────────────────────

describe('revokeDevice', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw badRequest when device token not found', async () => {
        mockRepo.findActiveDeviceTokens.mockResolvedValue([
            { id: 'dt-1' },
        ]);

        await expect(service.revokeDevice('user-1', 'dt-nonexistent'))
            .rejects.toThrow('Device token not found');
    });

    it('should revoke the device token', async () => {
        mockRepo.findActiveDeviceTokens.mockResolvedValue([
            { id: 'dt-1' },
            { id: 'dt-2' },
        ]);
        mockRepo.revokeDeviceToken.mockResolvedValue({});

        const result = await service.revokeDevice('user-1', 'dt-2');

        expect(result.message).toBe('Device revoked');
        expect(mockRepo.revokeDeviceToken).toHaveBeenCalledWith('dt-2');
    });
});
