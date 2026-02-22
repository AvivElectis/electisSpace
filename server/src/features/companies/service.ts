/**
 * Companies Feature - Service
 * 
 * @description Business logic layer for companies. Orchestrates repository calls,
 * handles authorization, and applies business rules.
 */
import { GlobalRole, CompanyRole, Prisma } from '@prisma/client';
import { companyRepository } from './repository.js';
import { encrypt } from '../../shared/utils/encryption.js';
import { config } from '../../config/index.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import {
    DEFAULT_COMPANY_FEATURES,
    DEFAULT_SPACE_TYPE,
    extractCompanyFeatures,
    extractSpaceType,
} from '../../shared/utils/featureResolution.js';
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
            companies = fetchedCompanies.map(c => {
                const settings = c.settings as Record<string, unknown> | null;
                return {
                    id: c.id,
                    code: c.code,
                    name: c.name,
                    location: c.location,
                    description: c.description,
                    isActive: c.isActive,
                    storeCount: c._count.stores,
                    userCount: c._count.userCompanies,
                    userRole: null, // Platform admin has implicit access
                    aimsConfigured: !!(c.aimsBaseUrl && c.aimsUsername),
                    companyFeatures: extractCompanyFeatures(settings),
                    spaceType: extractSpaceType(settings),
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                };
            });
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
                .map(uc => {
                    const settings = uc.company.settings as Record<string, unknown> | null;
                    return {
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
                        aimsConfigured: !!(uc.company.aimsBaseUrl && uc.company.aimsUsername),
                        companyFeatures: extractCompanyFeatures(settings),
                        spaceType: extractSpaceType(settings),
                        createdAt: uc.company.createdAt,
                        updatedAt: uc.company.updatedAt,
                    };
                });
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
        const settings = company.settings as Record<string, unknown> | null;

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
                // AIMS fields at company level for frontend compatibility
                aimsBaseUrl: canManage ? company.aimsBaseUrl : null,
                aimsCluster: canManage ? company.aimsCluster : null,
                aimsUsername: canManage ? company.aimsUsername : null,
                aimsConfigured: !!(company.aimsBaseUrl && company.aimsUsername && company.aimsPasswordEnc),
                // Also include nested aimsConfig for backwards compatibility
                aimsConfig: canManage ? {
                    baseUrl: company.aimsBaseUrl,
                    cluster: company.aimsCluster,
                    username: company.aimsUsername,
                    hasPassword: !!company.aimsPasswordEnc,
                } : undefined,
                // Company-level features and space type
                companyFeatures: extractCompanyFeatures(settings),
                spaceType: extractSpaceType(settings),
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

        // Build initial settings with company features
        const companyFeatures = data.companyFeatures ?? DEFAULT_COMPANY_FEATURES;
        const spaceType = data.spaceType ?? DEFAULT_SPACE_TYPE;
        // Sync legacy peopleManagerEnabled flag
        const initialSettings = {
            companyFeatures: { ...companyFeatures },
            spaceType,
            peopleManagerEnabled: companyFeatures.peopleEnabled,
        };

        const company = await companyRepository.create({
            code: upperCode,
            name: data.name,
            location: data.location,
            description: data.description,
            aimsBaseUrl: data.aimsConfig?.baseUrl,
            aimsCluster: data.aimsConfig?.cluster,
            aimsUsername: data.aimsConfig?.username,
            aimsPasswordEnc: encryptedPassword,
            settings: initialSettings as unknown as Prisma.InputJsonValue,
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
            aimsConfigured: !!(company.aimsBaseUrl && company.aimsUsername),
            companyFeatures,
            spaceType,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
        };
    },

    /**
     * Update company basic info
     */
    async update(id: string, data: UpdateCompanyDto) {
        // If companyFeatures or spaceType are provided, merge into settings JSON
        const updateData: any = {
            name: data.name,
            location: data.location,
            description: data.description,
            isActive: data.isActive,
        };

        if (data.companyFeatures || data.spaceType) {
            // Fetch existing company to merge settings
            const existing = await companyRepository.findById(id);
            if (!existing) throw new Error('COMPANY_NOT_FOUND');

            const existingSettings = (existing.settings as Record<string, unknown>) || {};
            const newSettings = { ...existingSettings };

            if (data.companyFeatures) {
                newSettings.companyFeatures = data.companyFeatures;
                // Sync legacy peopleManagerEnabled flag
                newSettings.peopleManagerEnabled = data.companyFeatures.peopleEnabled;
            }
            if (data.spaceType) {
                newSettings.spaceType = data.spaceType;
            }

            updateData.settings = newSettings;
        }

        // Remove undefined keys
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const company = await companyRepository.update(id, updateData);

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
        const updateData: {
            aimsBaseUrl: string;
            aimsCluster?: string;
            aimsUsername: string;
            aimsPasswordEnc?: string;
        } = {
            aimsBaseUrl: data.baseUrl,
            aimsCluster: data.cluster,
            aimsUsername: data.username,
        };
        
        // Only update password if provided
        if (data.password) {
            updateData.aimsPasswordEnc = encrypt(data.password, config.encryptionKey);
        }
        
        const company = await companyRepository.updateAimsConfig(id, updateData);
        
        return {
            baseUrl: company.aimsBaseUrl,
            cluster: company.aimsCluster,
            username: company.aimsUsername,
            hasPassword: !!company.aimsPasswordEnc,
        };
    },

    /**
     * Test AIMS connection for a company
     */
    async testAimsConnection(id: string) {
        appLogger.info('CompanyService', `Testing AIMS connection for company ${id}`);
        
        // First check if company has AIMS config
        const credentials = await aimsGateway.getCredentials(id);
        if (!credentials) {
            appLogger.info('CompanyService', `No AIMS credentials found for company ${id}`);
            return {
                connected: false,
                error: 'No AIMS configuration found. Please configure AIMS credentials first.',
            };
        }

        appLogger.debug('CompanyService', `Found credentials - baseUrl: ${credentials.baseUrl}, username: ${credentials.username}`);

        try {
            const connected = await aimsGateway.checkCompanyHealth(id);
            appLogger.info('CompanyService', `AIMS health check result: ${connected}`);
            
            return {
                connected,
                error: connected ? null : 'Failed to connect to AIMS server. Please check your credentials.',
            };
        } catch (error: any) {
            appLogger.error('CompanyService', 'AIMS connection test failed', { error: String(error) });
            return {
                connected: false,
                error: error.message || 'Unknown error connecting to AIMS',
            };
        }
    },

    /**
     * Fetch AIMS stores using raw credentials (pre-save, for company creation wizard)
     */
    async fetchAimsStores(params: {
        baseUrl: string;
        cluster?: string;
        username: string;
        password: string;
        companyCode: string;
    }) {
        const { baseUrl, cluster, username, password, companyCode } = params;
        
        try {
            const stores = await aimsGateway.fetchStoresWithCredentials(
                { baseUrl, cluster, username, password },
                companyCode
            );
            
            return {
                success: true,
                stores: stores.map((s: any) => ({
                    code: s.store || s.storeCode || s.code,
                    name: s.storeName || s.name || '',
                    region: s.region || '',
                    city: s.city || '',
                    country: s.country || '',
                    labelCount: s.labelCount || 0,
                    gatewayCount: s.gatewayCount || 0,
                    articleCount: s.articleCount || 0,
                })),
            };
        } catch (error: any) {
            appLogger.error('CompanyService', 'Failed to fetch AIMS stores', { error: String(error) });
            return {
                success: false,
                stores: [],
                error: error.message || 'Failed to connect to AIMS',
            };
        }
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
            appLogger.warn('CompanyService', `Deleting company ${company.code} with ${company._count.stores} stores`);
        }
        
        await companyRepository.delete(id);
        
        return {
            code: company.code,
            deletedStores: company._count.stores,
        };
    },
};
