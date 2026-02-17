/**
 * Auth Feature - Repository
 * 
 * @description Data access layer for authentication. All Prisma operations.
 */
import { prisma } from '../../config/index.js';
import { CodeType } from '@prisma/client';
import type { UserWithRelations } from './types.js';

// ======================
// User Queries
// ======================

export const authRepository = {
    /**
     * Find user by email for login
     */
    async findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
        });
    },

    /**
     * Find user with stores and companies for token generation
     */
    async findUserWithRelations(userId: string): Promise<UserWithRelations | null> {
        return prisma.user.findUnique({
            where: { id: userId },
            include: {
                userStores: {
                    include: {
                        store: {
                            include: {
                                company: {
                                    select: { name: true, settings: true }
                                }
                            }
                        }
                    }
                },
                userCompanies: {
                    include: {
                        company: {
                            select: { name: true, code: true, settings: true }
                        }
                    }
                }
            }
        }) as unknown as UserWithRelations | null;
    },

    /**
     * Find user by email with full relations
     */
    async findUserByEmailWithRelations(email: string): Promise<UserWithRelations | null> {
        return prisma.user.findUnique({
            where: { email },
            include: {
                userStores: {
                    include: {
                        store: {
                            include: {
                                company: {
                                    select: { name: true, settings: true }
                                }
                            }
                        }
                    }
                },
                userCompanies: {
                    include: {
                        company: {
                            select: { name: true, code: true, settings: true }
                        }
                    }
                }
            }
        }) as unknown as UserWithRelations | null;
    },

    /**
     * Update user's last login timestamp
     */
    async updateLastLogin(userId: string) {
        return prisma.user.update({
            where: { id: userId },
            data: { lastLogin: new Date() },
        });
    },

    /**
     * Update user password
     */
    async updatePassword(userId: string, passwordHash: string) {
        return prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
    },

    // ======================
    // Verification Codes
    // ======================

    /**
     * Invalidate all verification codes of a type for a user
     */
    async invalidateVerificationCodes(userId: string, type: CodeType) {
        return prisma.verificationCode.updateMany({
            where: {
                userId,
                type,
                used: false,
            },
            data: { used: true },
        });
    },

    /**
     * Create verification code
     */
    async createVerificationCode(userId: string, code: string, type: CodeType, expiresAt: Date) {
        return prisma.verificationCode.create({
            data: {
                userId,
                code,
                type,
                expiresAt,
            },
        });
    },

    /**
     * Find valid verification code
     */
    async findValidVerificationCode(userId: string, code: string, type: CodeType) {
        return prisma.verificationCode.findFirst({
            where: {
                userId,
                code,
                type,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });
    },

    /**
     * Mark verification code as used
     */
    async markCodeAsUsed(codeId: string) {
        return prisma.verificationCode.update({
            where: { id: codeId },
            data: { used: true },
        });
    },

    // ======================
    // Refresh Tokens
    // ======================

    /**
     * Create refresh token record
     */
    async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
        return prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });
    },

    /**
     * Find user's active refresh tokens
     */
    async findUserRefreshTokens(userId: string) {
        return prisma.refreshToken.findMany({
            where: {
                userId,
                revoked: false,
            },
        });
    },

    /**
     * Revoke refresh token by ID
     */
    async revokeRefreshToken(tokenId: string) {
        return prisma.refreshToken.update({
            where: { id: tokenId },
            data: { revoked: true },
        });
    },

    /**
     * Revoke all user's refresh tokens
     */
    async revokeAllUserTokens(userId: string) {
        return prisma.refreshToken.updateMany({
            where: { userId },
            data: { revoked: true },
        });
    },

    // ======================
    // Transactions
    // ======================

    /**
     * Execute verify 2FA transaction - atomically verify code and update login
     */
    async executeVerify2FATransaction(
        userId: string,
        code: string,
        tokenHash: string,
        tokenExpiresAt: Date
    ) {
        return prisma.$transaction(async (tx) => {
            // Find and validate code
            const verificationCode = await tx.verificationCode.findFirst({
                where: {
                    userId,
                    code,
                    type: CodeType.LOGIN_2FA,
                    used: false,
                    expiresAt: { gt: new Date() },
                },
            });

            if (!verificationCode) {
                throw new Error('INVALID_CODE');
            }

            // Mark code as used
            await tx.verificationCode.update({
                where: { id: verificationCode.id },
                data: { used: true },
            });

            // Store refresh token
            await tx.refreshToken.create({
                data: {
                    userId,
                    tokenHash,
                    expiresAt: tokenExpiresAt,
                },
            });

            // Update last login
            await tx.user.update({
                where: { id: userId },
                data: { lastLogin: new Date() },
            });

            return true;
        });
    },

    /**
     * Execute password reset transaction
     */
    async executePasswordResetTransaction(userId: string, passwordHash: string) {
        return prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            }),
            prisma.refreshToken.updateMany({
                where: { userId },
                data: { revoked: true },
            }),
        ]);
    },

    // ======================
    // All-Stores Access Queries
    // ======================

    /**
     * Find all stores belonging to the given company IDs.
     * Used to populate the stores list for users with allStoresAccess.
     */
    async findStoresByCompanyIds(companyIds: string[]) {
        if (companyIds.length === 0) return [];
        return prisma.store.findMany({
            where: { companyId: { in: companyIds }, isActive: true },
            include: {
                company: {
                    select: { name: true, code: true, settings: true },
                },
            },
        });
    },

    // ======================
    // Store/SOLUM Queries
    // ======================

    /**
     * Find store with company for SOLUM connect
     */
    async findStoreWithCompany(storeId: string) {
        return prisma.store.findUnique({
            where: { id: storeId },
            include: {
                company: {
                    select: {
                        code: true,
                        aimsBaseUrl: true,
                        aimsCluster: true,
                    }
                }
            }
        });
    },
};
