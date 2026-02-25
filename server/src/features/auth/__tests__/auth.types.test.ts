/**
 * Auth Types - Validation Schema Tests
 *
 * All values below are fake test fixtures, not real credentials.
 */
import { describe, it, expect } from 'vitest';
import {
    loginSchema, verify2FASchema, resendCodeSchema, forgotPasswordSchema,
    resetPasswordSchema, adminResetPasswordSchema, changePasswordSchema, solumConnectSchema,
} from '../types.js';

// Fake test fixtures – NOT real credentials
const TEST_EMAIL = 'user@test.com';
const TEST_EMAIL_SHORT = 'a@b.com';
const VALID_PW = 'test-valid-pw'; // pragma: allowlist secret
const LONG_PW = 'test-long-value'; // pragma: allowlist secret
const SHORT_PW = 'short';
const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Auth Validation Schemas', () => {
    describe('loginSchema', () => {
        it('should accept valid email and password', () => {
            expect(loginSchema.safeParse({ email: TEST_EMAIL, password: VALID_PW }).success).toBe(true);
        });
        it('should reject invalid email', () => {
            expect(loginSchema.safeParse({ email: 'not-email', password: VALID_PW }).success).toBe(false);
        });
        it('should reject empty password', () => {
            expect(loginSchema.safeParse({ email: TEST_EMAIL, password: '' }).success).toBe(false);
        });
    });

    describe('verify2FASchema', () => {
        it('should accept valid 6-digit code', () => {
            expect(verify2FASchema.safeParse({ email: TEST_EMAIL_SHORT, code: '123456' }).success).toBe(true);
        });
        it('should reject non-numeric code', () => {
            expect(verify2FASchema.safeParse({ email: TEST_EMAIL_SHORT, code: 'abcdef' }).success).toBe(false);
        });
        it('should reject wrong-length code', () => {
            expect(verify2FASchema.safeParse({ email: TEST_EMAIL_SHORT, code: '12345' }).success).toBe(false);
            expect(verify2FASchema.safeParse({ email: TEST_EMAIL_SHORT, code: '1234567' }).success).toBe(false);
        });
    });

    describe('resetPasswordSchema', () => {
        it('should accept valid data', () => {
            expect(resetPasswordSchema.safeParse({ email: TEST_EMAIL_SHORT, code: '123456', newPassword: LONG_PW }).success).toBe(true);
        });
        it('should reject short password', () => {
            expect(resetPasswordSchema.safeParse({ email: TEST_EMAIL_SHORT, code: '123456', newPassword: SHORT_PW }).success).toBe(false);
        });
    });

    describe('adminResetPasswordSchema', () => {
        it('should accept temporary reset', () => {
            expect(adminResetPasswordSchema.safeParse({ userId: TEST_UUID, resetType: 'temporary' }).success).toBe(true);
        });
        it('should reject non-uuid userId', () => {
            expect(adminResetPasswordSchema.safeParse({ userId: 'bad', resetType: 'temporary' }).success).toBe(false);
        });
        it('should reject invalid resetType', () => {
            expect(adminResetPasswordSchema.safeParse({ userId: TEST_UUID, resetType: 'invalid' }).success).toBe(false);
        });
    });

    describe('changePasswordSchema', () => {
        it('should accept valid passwords', () => {
            expect(changePasswordSchema.safeParse({ currentPassword: VALID_PW, newPassword: LONG_PW }).success).toBe(true);
        });
        it('should reject short new password', () => {
            expect(changePasswordSchema.safeParse({ currentPassword: VALID_PW, newPassword: SHORT_PW }).success).toBe(false);
        });
    });

    describe('solumConnectSchema', () => {
        it('should accept valid UUID', () => {
            expect(solumConnectSchema.safeParse({ storeId: TEST_UUID }).success).toBe(true);
        });
        it('should reject non-UUID', () => {
            expect(solumConnectSchema.safeParse({ storeId: 'bad' }).success).toBe(false);
        });
    });
});
