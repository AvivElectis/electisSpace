/**
 * Companies Feature - Service
 * 
 * @description Business logic layer for companies. Orchestrates repository calls,
 * handles authorization, and applies business rules.
 */
import { GlobalRole, CompanyRole } from '@prisma/client';
import { companyRepository } from './repository.js';
import { encrypt } from '../../shared/utils/encryption.js';
import { config } from '../../config/index.js';
import type {
    CompanyListParams,
    CompanyListItem,
    CompanyListResponse,
    CompanyDetailResponse,
    CreateCompanyDto,
    UpdateCompanyDto,
    UpdateAimsConfigDto,
    CodeValidationResponse,
    UserContext,
} from './types.js';

// ======================
// Authorization Helpers
// ======================

/**
 * Check if user is platform admin
 */
export function isPlatformAdmin(user: UserContext): boolean {
    return user.globalRole === GlobalRole.PLATFORM_ADMIN;
}

/**
 * Check if user can manage a specific company (PLATFORM_ADMIN or COMPANY_ADMIN)
 */
export function canManageCompany(user: UserContext, companyId: string): boolean {
    if (isPlatformAdmin(user)) return true;
    
    const companyAccess = user.companies?.find(c => c.id === companyId);
    return companyAccess?.role === CompanyRole.COMPANY_ADMIN;
}

/**
 * Check if user has any access to a company
 */
export function hasCompanyAccess(user: UserContext, companyId: string): boolean {
    if (isPlatformAdmin(user)) return true;
    return user.companies?.some(c => c.id === companyId) ?? false;
}

// ======================
// Service Functions
// ======================

export const companyService = {
    /**
     * List companies accessible to the user
     * - Platform admins see all companies
     * - Regular users see only their assigned companies
     */
    async list(params: CompanyListParams, user: UserContext): Promise<CompanyListResponse> {
        const { search, page, limit } = params;
        const skip = (page - 1) * limit;
        
        let companies: CompanyListItem[];
        let total: number;
        
        if (isPlatformAdmin(user)) {
            // Platform admins see all companies
            const whereClause = search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { code: { contains: search, mode: 'insensitive' as const } },
                    { location: { contains: search, mode: 'insensitive' as const } },
                ],
            } : undefined;
            
            const [fetchedCompanies, count] = await Promise.all([
                companyRepository.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' },
                }),
                companyRepository.count(whereClause),
            ]);
            
            total = count;
            companies = fetchedCompanies.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                location: c.location,
                description: c.description,
                isActive: c.isActive,
                storeCount: c._count.stores,
                userCount: c._count.userCompanies,
                userRole: null, // Platform admin has implicit access
                hasAimsConfig: !!(c.aimsBaseUrl && c.aimsUsername),
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }));
        } else {
            // Regular users see only assigned companies
            const userCompanies = await companyRepository.findUserCompanies(user.id);
            
            const filtered = userCompanies.filter(uc => {
                if (!search) return true;
                const searchLower = search.toLowerCase();
                return uc.company.name.toLowerCase().includes(searchLower) ||
                       uc.company.code.toLowerCase().includes(searchLower) ||
                       uc.company.location?.toLowerCase().includes(searchLower);
            });
            
            total = filtered.length;
            companies = filtered
                .slice(skip, skip + limit)
                .map(uc => ({
                    id: uc.company.id,
                    code: uc.company.code,
                    name: uc.company.name,
                    location: uc.company.location,
                    description: uc.company.description,
                    isActive: uc.company.isActive,
                    storeCount: uc.company._count.stores,
                    userCount: uc.company._count.userCompanies,
                    userRole: uc.role,
                    allStoresAccess: uc.allStoresAccess,
                    hasAimsConfig: !!(uc.company.aimsBaseUrl && uc.company.aimsUsername),
                    createdAt: uc.company.createdAt,
                    updatedAt: uc.company.updatedAt,
                }));
        }
        
        return {
            data: companies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Validate company code availability
     */
    async validateCode(code: string): Promise<CodeValidationResponse> {
        const exists = await companyRepository.codeExists(code);
        return {
            available: !exists,
            reason: exists ? 'Company code already exists' : null,
        };
    },

    /**
     * Get company details by ID
     */
    async getById(id: string, user: UserContext): Promise<CompanyDetailResponse | null> {
        const company = await companyRepository.findByIdWithDetails(id);
        if (!company) return null;
        
        const canManage = canManageCompany(user, id);
        
        return {
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
                location: company.location,
                description: company.description,
                isActive: company.isActive,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,
                // Only show AIMS config to managers
                aimsConfig: canManage ? {
                    baseUrl: company.aimsBaseUrl,
                    cluster: company.aimsCluster,
                    username: company.aimsUsername,
                    hasPassword: !!company.aimsPasswordEnc,
                } : undefined,
            },
            stores: company.stores.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                timezone: s.timezone,
                syncEnabled: s.syncEnabled,
                lastAimsSyncAt: s.lastAimsSyncAt,
                isActive: s.isActive,
                spaceCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomCount: s._count.conferenceRooms,
            })),
            users: canManage ? company.userCompanies.map(uc => ({
                id: uc.user.id,
                email: uc.user.email,
                firstName: uc.user.firstName,
                lastName: uc.user.lastName,
                globalRole: uc.user.globalRole,
                companyRole: uc.role,
                allStoresAccess: uc.allStoresAccess,
                isActive: uc.user.isActive,
            })) : undefined,
        };
    },

    /**
     * Create a new company
     */
    async create(data: CreateCompanyDto): Promise<CompanyListItem> {
        const upperCode = data.code.toUpperCase();
        
        // Check code uniqueness
        const exists = await companyRepository.codeExists(upperCode);
        if (exists) {
            throw new Error('COMPANY_CODE_EXISTS');
        }
        
        // Encrypt AIMS password if provided
        let encryptedPassword: string | undefined;
        if (data.aimsConfig?.password) {
            encryptedPassword = encrypt(data.aimsConfig.password, config.encryptionKey);
        }
        
        const company = await companyRepository.create({
            code: upperCode,
            name: data.name,
            location: data.location,
            description: data.description,
            aimsBaseUrl: data.aimsConfig?.baseUrl,
            aimsCluster: data.aimsConfig?.cluster,
            aimsUsername: data.aimsConfig?.username,
            aimsPasswordEnc: encryptedPassword,
        });
        
        return {
            id: company.id,
            code: company.code,
            name: company.name,
            location: company.location,
            description: company.description,
            isActive: company.isActive,
            storeCount: company._count.stores,
            userCount: company._count.userCompanies,
            userRole: null,
            hasAimsConfig: !!(company.aimsBaseUrl && company.aimsUsername),
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
        };
    },

    /**
     * Update company basic info
     */
    async update(id: string, data: UpdateCompanyDto) {
        const company = await companyRepository.update(id, data);
        
        return {
            id: company.id,
            code: company.code,
            name: company.name,
            location: company.location,
            description: company.description,
            isActive: company.isActive,
            updatedAt: company.updatedAt,
        };
    },

    /**
     * Update AIMS configuration
     */
    async updateAimsConfig(id: string, data: UpdateAimsConfigDto) {
        const encryptedPassword = encrypt(data.password, config.encryptionKey);
        
        const company = await companyRepository.updateAimsConfig(id, {
            aimsBaseUrl: data.baseUrl,
            aimsCluster: data.cluster,
            aimsUsername: data.username,
            aimsPasswordEnc: encryptedPassword,
        });
        
        return {
            baseUrl: company.aimsBaseUrl,
            cluster: company.aimsCluster,
            username: company.aimsUsername,
            hasPassword: true,
        };
    },

    /**
     * Delete a company
     */
    async delete(id: string) {
        // Get company with counts for response
        const company = await companyRepository.findWithCounts(id);
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }
        
        // Warn about cascading deletes
        if (company._count.stores > 0) {
            console.warn(`Deleting company ${company.code} with ${company._count.stores} stores`);
        }
        
        await companyRepository.delete(id);
        
        return {
            code: company.code,
            deletedStores: company._count.stores,
        };
    },
};
