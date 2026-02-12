/**
 * Companies Feature - Repository
 * 
 * @description Data access layer for companies. Handles all Prisma database operations.
 * This layer is purely for data retrieval and persistence - no business logic.
 */
import { prisma } from '../../config/index.js';
import type { Prisma, Company, UserCompany } from '@prisma/client';
import { cacheInvalidate } from '../../shared/infrastructure/services/redisCache.js';

// ======================
// Types
// ======================

type CompanyWithCounts = Company & {
    _count: { stores: number; userCompanies: number };
};

type UserCompanyWithCompany = UserCompany & {
    company: CompanyWithCounts;
};

export interface CompanyCreateData {
    code: string;
    name: string;
    location?: string;
    description?: string;
    aimsBaseUrl?: string;
    aimsCluster?: string;
    aimsUsername?: string;
    aimsPasswordEnc?: string;
}

export interface CompanyUpdateData {
    name?: string;
    location?: string | null;
    description?: string | null;
    isActive?: boolean;
}

export interface AimsConfigData {
    aimsBaseUrl: string;
    aimsCluster?: string;
    aimsUsername: string;
    aimsPasswordEnc?: string;
}

// ======================
// Repository
// ======================

export const companyRepository = {
    /**
     * Find all companies with pagination and optional search
     */
    async findMany(params: {
        where?: Prisma.CompanyWhereInput;
        skip?: number;
        take?: number;
        orderBy?: Prisma.CompanyOrderByWithRelationInput;
    }): Promise<CompanyWithCounts[]> {
        return prisma.company.findMany({
            ...params,
            include: {
                _count: {
                    select: { stores: true, userCompanies: true }
                }
            }
        });
    },

    /**
     * Count companies matching criteria
     */
    async count(where?: Prisma.CompanyWhereInput): Promise<number> {
        return prisma.company.count({ where });
    },

    /**
     * Find company by ID with full details
     */
    async findById(id: string): Promise<Company | null> {
        return prisma.company.findUnique({ where: { id } });
    },

    /**
     * Find company by ID with stores and users
     */
    async findByIdWithDetails(id: string) {
        return prisma.company.findUnique({
            where: { id },
            include: {
                stores: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        timezone: true,
                        syncEnabled: true,
                        lastAimsSyncAt: true,
                        isActive: true,
                        _count: {
                            select: { spaces: true, people: true, conferenceRooms: true }
                        }
                    },
                    orderBy: { code: 'asc' }
                },
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                globalRole: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Find company by code
     */
    async findByCode(code: string): Promise<Company | null> {
        return prisma.company.findUnique({ where: { code } });
    },

    /**
     * Check if code exists (for validation)
     */
    async codeExists(code: string): Promise<boolean> {
        const company = await prisma.company.findUnique({
            where: { code },
            select: { id: true }
        });
        return !!company;
    },

    /**
     * Find user's company assignments
     */
    async findUserCompanies(userId: string): Promise<UserCompanyWithCompany[]> {
        return prisma.userCompany.findMany({
            where: { userId },
            include: {
                company: {
                    include: {
                        _count: {
                            select: { stores: true, userCompanies: true }
                        }
                    }
                }
            }
        });
    },

    /**
     * Create a new company
     */
    async create(data: CompanyCreateData): Promise<CompanyWithCounts> {
        return prisma.company.create({
            data,
            include: {
                _count: {
                    select: { stores: true, userCompanies: true }
                }
            }
        });
    },

    /**
     * Update company basic info
     */
    async update(id: string, data: CompanyUpdateData): Promise<Company> {
        const result = await prisma.company.update({
            where: { id },
            data,
        });
        await cacheInvalidate(`company-settings:${id}`);
        return result;
    },

    /**
     * Update AIMS configuration
     */
    async updateAimsConfig(id: string, data: AimsConfigData): Promise<Company> {
        const result = await prisma.company.update({
            where: { id },
            data,
        });
        await cacheInvalidate(`company-settings:${id}`);
        return result;
    },

    /**
     * Delete a company
     */
    async delete(id: string): Promise<Company> {
        return prisma.company.delete({ where: { id } });
    },

    /**
     * Find company with store count (for delete confirmation)
     */
    async findWithCounts(id: string): Promise<CompanyWithCounts | null> {
        return prisma.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { stores: true, userCompanies: true }
                }
            }
        });
    },
};
