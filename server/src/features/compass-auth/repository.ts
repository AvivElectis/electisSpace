import { prisma } from '../../config/index.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

// ─── CompanyUser Queries ─────────────────────────────

export const findCompanyUserByEmail = async (email: string) => {
    return prisma.companyUser.findFirst({
        where: {
            email,
            isActive: true,
            company: { compassEnabled: true },
        },
        include: {
            company: { select: { id: true, name: true, compassEnabled: true } },
            branch: { select: { id: true, name: true, code: true } },
        },
    });
};

export const findCompanyUserById = async (id: string) => {
    return prisma.companyUser.findUnique({
        where: { id },
        include: {
            company: { select: { id: true, name: true, compassEnabled: true } },
            branch: { select: { id: true, name: true, code: true } },
        },
    });
};

// ─── Verification Codes ──────────────────────────────

export const createVerificationCode = async (
    email: string,
    companyUserId: string | null,
    codeHash: string,
    expiresAt: Date,
) => {
    // Invalidate existing unused codes for this email
    await prisma.companyUserVerificationCode.updateMany({
        where: { email, consumed: false },
        data: { consumed: true },
    });

    return prisma.companyUserVerificationCode.create({
        data: {
            email,
            companyUserId,
            codeHash,
            expiresAt,
        },
    });
};

export const findValidVerificationCode = async (email: string) => {
    return prisma.companyUserVerificationCode.findFirst({
        where: {
            email,
            consumed: false,
            expiresAt: { gt: new Date() },
            attempts: { lt: 5 },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const incrementCodeAttempts = async (id: string) => {
    return prisma.companyUserVerificationCode.update({
        where: { id },
        data: { attempts: { increment: 1 } },
    });
};

export const consumeVerificationCode = async (id: string) => {
    return prisma.companyUserVerificationCode.update({
        where: { id },
        data: { consumed: true },
    });
};

// ─── Device Tokens ───────────────────────────────────

export const createDeviceToken = async (
    companyUserId: string,
    tokenHash: string,
    deviceName: string | null,
    platform: string | null,
    expiresAt: Date,
) => {
    return prisma.companyUserDeviceToken.create({
        data: {
            companyUserId,
            tokenHash,
            deviceName,
            platform,
            expiresAt,
        },
    });
};

export const findActiveDeviceTokens = async (companyUserId: string) => {
    return prisma.companyUserDeviceToken.findMany({
        where: {
            companyUserId,
            revoked: false,
            expiresAt: { gt: new Date() },
        },
        orderBy: { lastUsedAt: 'desc' },
    });
};

export const findDeviceTokenByHash = async (companyUserId: string) => {
    return prisma.companyUserDeviceToken.findMany({
        where: {
            companyUserId,
            revoked: false,
            expiresAt: { gt: new Date() },
        },
    });
};

export const updateDeviceTokenLastUsed = async (id: string) => {
    return prisma.companyUserDeviceToken.update({
        where: { id },
        data: { lastUsedAt: new Date() },
    });
};

export const revokeDeviceToken = async (id: string) => {
    return prisma.companyUserDeviceToken.update({
        where: { id },
        data: { revoked: true },
    });
};

// ─── Helpers ─────────────────────────────────────────

export const generateCode = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

export const hashCode = async (code: string): Promise<string> => {
    return bcrypt.hash(code, BCRYPT_ROUNDS);
};

export const verifyCode = async (code: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(code, hash);
};

export const generateDeviceToken = (): string => {
    return crypto.randomBytes(48).toString('hex');
};

export const hashDeviceToken = async (token: string): Promise<string> => {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
};

export const verifyDeviceToken = async (token: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(token, hash);
};
