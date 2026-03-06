/**
 * Companies Feature - Service
 * 
 * @description Business logic layer for companies. Orchestrates repository calls,
 * handles authorization, and applies business rules.
 */
import { GlobalRole, Prisma, BookingRuleType } from '@prisma/client';
import { companyRepository } from './repository.js';
import { encrypt } from '../../shared/utils/encryption.js';
import { config, prisma } from '../../config/index.js';
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
    CreateCompanyFullDto,
    UpdateCompanyDto,
    UpdateAimsConfigDto,
    CodeValidationResponse,
    UserContext,
} from './types.js';

// ======================
// Compass Article Data Fields
// ======================

/** Fields added to AIMS article format when compass is enabled */
const COMPASS_ARTICLE_DATA_FIELDS = [
    'BUILDING_NAME', 'FLOOR_NAME', 'AREA_NAME',
    'SPACE_MODE', 'SPACE_CAPACITY', 'SPACE_AMENITIES', 'SPACE_TYPE',
    'BOOKING_STATUS', 'BOOKED_BY', 'BOOKING_TIME',
];

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
    return companyAccess?.roleId === 'role-admin';
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
                    userRoleId: null, // Platform admin has implicit access
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
                        userRoleId: uc.roleId,
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
                companyRoleId: uc.roleId,
                allStoresAccess: uc.allStoresAccess,
                isActive: uc.user.isActive,
            })) : undefined,
        };
    },

    /**
     * Create a new company.
     * Accepts optional multi-store list, article format, and field mapping
     * from the 6-step wizard. Falls back to legacy single-store behavior
     * when `stores` is not provided.
     */
    async create(data: CreateCompanyDto | CreateCompanyFullDto): Promise<CompanyListItem> {
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

        // Check for extended wizard fields
        const fullData = data as CreateCompanyFullDto;

        // Sync legacy peopleManagerEnabled flag
        const initialSettings: Record<string, unknown> = {
            companyFeatures: { ...companyFeatures },
            spaceType,
            peopleManagerEnabled: companyFeatures.peopleEnabled,
        };

        // Save article format and field mapping from wizard
        if (fullData.articleFormat) {
            // When compass is enabled, inject compass data fields into article format
            if (companyFeatures.compassEnabled) {
                const format = fullData.articleFormat as Record<string, any>;
                const existingData = Array.isArray(format.articleData) ? format.articleData as string[] : [];
                const merged = [...new Set([...existingData, ...COMPASS_ARTICLE_DATA_FIELDS])];
                format.articleData = merged;
                appLogger.info('Companies', `Injected ${COMPASS_ARTICLE_DATA_FIELDS.length} compass fields into article format`);
            }
            initialSettings.solumArticleFormat = fullData.articleFormat;
        }
        if (fullData.fieldMapping) {
            initialSettings.solumMappingConfig = fullData.fieldMapping;
        }

        const company = await prisma.$transaction(async (tx) => {
            const created = await tx.company.create({
                data: {
                    code: upperCode,
                    name: data.name,
                    location: data.location ?? null,
                    description: data.description ?? null,
                    aimsBaseUrl: data.aimsConfig?.baseUrl ?? null,
                    aimsCluster: data.aimsConfig?.cluster ?? null,
                    aimsUsername: data.aimsConfig?.username ?? null,
                    aimsPasswordEnc: encryptedPassword ?? null,
                    settings: initialSettings as unknown as Prisma.InputJsonValue,
                },
                include: { _count: { select: { stores: true, userCompanies: true } } },
            });

            // Create stores from wizard multi-store selection
            if (fullData.stores && fullData.stores.length > 0) {
                for (const storeData of fullData.stores) {
                    await tx.store.create({
                        data: {
                            companyId: created.id,
                            code: storeData.code,
                            name: storeData.name || storeData.code,
                            timezone: storeData.timezone || 'UTC',
                            syncEnabled: true,
                            isActive: true,
                        },
                    });
                }
            }

            // Auto-assign all PLATFORM_ADMIN users to the new company
            const platformAdmins = await tx.user.findMany({
                where: { globalRole: GlobalRole.PLATFORM_ADMIN },
                select: { id: true },
            });
            for (const admin of platformAdmins) {
                await tx.userCompany.upsert({
                    where: { userId_companyId: { userId: admin.id, companyId: created.id } },
                    create: {
                        userId: admin.id,
                        companyId: created.id,
                        roleId: 'role-admin',
                        allStoresAccess: true,
                    },
                    update: {
                        roleId: 'role-admin',
                        allStoresAccess: true,
                    },
                });
            }

            // Create default Compass booking rules when compass is enabled
            if (companyFeatures.compassEnabled && fullData.compassConfig) {
                const cc = fullData.compassConfig;
                const ruleDefaults: Array<{ name: string; ruleType: BookingRuleType; config: Record<string, number> }> = [
                    { name: 'Max Duration', ruleType: BookingRuleType.MAX_DURATION, config: { value: cc.maxDurationMinutes } },
                    { name: 'Max Advance Booking', ruleType: BookingRuleType.MAX_ADVANCE_BOOKING, config: { value: cc.maxAdvanceBookingDays } },
                    { name: 'Check-in Window', ruleType: BookingRuleType.CHECK_IN_WINDOW, config: { value: cc.checkInWindowMinutes } },
                    { name: 'Auto Release', ruleType: BookingRuleType.AUTO_RELEASE, config: { value: cc.autoReleaseMinutes } },
                    { name: 'Max Concurrent', ruleType: BookingRuleType.MAX_CONCURRENT, config: { value: cc.maxConcurrentBookings } },
                ];
                for (const rule of ruleDefaults) {
                    await tx.bookingRule.create({
                        data: {
                            companyId: created.id,
                            name: rule.name,
                            ruleType: rule.ruleType,
                            config: rule.config as unknown as Prisma.InputJsonValue,
                            applyTo: 'ALL_BRANCHES',
                            priority: 0,
                            isActive: true,
                        },
                    });
                }
                appLogger.info('Companies', `Created ${ruleDefaults.length} default Compass booking rules for ${created.code}`);

                // Auto-create CompanyUser records for platform admins
                const firstStoreData = fullData.stores?.[0];
                if (firstStoreData) {
                    const store = await tx.store.findFirst({
                        where: { companyId: created.id, code: firstStoreData.code },
                        select: { id: true },
                    });
                    if (store) {
                        for (const admin of platformAdmins) {
                            const adminUser = await tx.user.findUnique({
                                where: { id: admin.id },
                                select: { id: true, email: true, firstName: true, lastName: true },
                            });
                            if (!adminUser) continue;

                            const existing = await tx.companyUser.findFirst({
                                where: { companyId: created.id, linkedUserId: adminUser.id },
                            });
                            if (existing) continue;

                            const existingByEmail = await tx.companyUser.findUnique({
                                where: { companyId_email: { companyId: created.id, email: adminUser.email } },
                            });
                            if (existingByEmail) continue;

                            const displayName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email.split('@')[0];
                            await tx.companyUser.create({
                                data: {
                                    companyId: created.id,
                                    branchId: store.id,
                                    email: adminUser.email,
                                    displayName,
                                    role: 'ADMIN',
                                    linkedUserId: adminUser.id,
                                    isActive: true,
                                },
                            });
                            appLogger.info('Companies', `Auto-created Compass ADMIN CompanyUser for ${adminUser.email} in ${created.code}`);
                        }
                    }
                }
            }

            // Create building hierarchy when compass is enabled
            if (companyFeatures.compassEnabled && fullData.buildings?.length) {
                const firstStore = await tx.store.findFirst({
                    where: { companyId: created.id },
                    select: { id: true },
                });
                if (firstStore) {
                    for (let bi = 0; bi < fullData.buildings.length; bi++) {
                        const b = fullData.buildings[bi];
                        if (!b.name?.trim()) continue;
                        const building = await tx.building.create({
                            data: {
                                companyId: created.id,
                                storeId: firstStore.id,
                                name: b.name.trim(),
                                code: b.name.trim().substring(0, 20).toUpperCase().replace(/\s+/g, '_'),
                                sortOrder: bi,
                            },
                        });
                        for (let fi = 0; fi < (b.floors?.length ?? 0); fi++) {
                            const f = b.floors[fi];
                            if (!f.name?.trim()) continue;
                            await tx.floor.create({
                                data: {
                                    buildingId: building.id,
                                    name: f.name.trim(),
                                    prefix: f.name.trim().substring(0, 20).toUpperCase().replace(/\s+/g, '_'),
                                    sortOrder: fi,
                                },
                            });
                        }
                    }
                    appLogger.info('Companies', `Created ${fullData.buildings.length} buildings for ${created.code}`);
                }
            }

            return created;
        });

        // Re-fetch to get accurate store count after creation
        const updatedCompany = await companyRepository.findWithCounts(company.id);
        const finalCompany = updatedCompany || company;

        return {
            id: finalCompany.id,
            code: finalCompany.code,
            name: finalCompany.name,
            location: finalCompany.location,
            description: finalCompany.description,
            isActive: finalCompany.isActive,
            storeCount: finalCompany._count.stores,
            userCount: finalCompany._count.userCompanies,
            userRoleId: null,
            aimsConfigured: !!(company.aimsBaseUrl && company.aimsUsername),
            companyFeatures,
            spaceType,
            createdAt: finalCompany.createdAt,
            updatedAt: finalCompany.updatedAt,
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
     * Fetch article format from AIMS using raw credentials (pre-save, for wizard).
     * Same pattern as fetchAimsStores — no company exists yet.
     */
    async fetchArticleFormat(params: {
        baseUrl: string;
        cluster?: string;
        username: string;
        password: string;
        companyCode: string;
    }) {
        const { baseUrl, cluster, username, password, companyCode } = params;

        try {
            const format = await aimsGateway.fetchArticleFormatWithCredentials(
                { baseUrl, cluster, username, password },
                companyCode
            );

            return {
                success: true,
                format,
            };
        } catch (error: any) {
            appLogger.error('CompanyService', 'Failed to fetch article format from AIMS', { error: String(error) });
            return {
                success: false,
                format: null,
                error: error.message || 'Failed to fetch article format',
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
