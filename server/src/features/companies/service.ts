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
// Compass Article Format
// ======================

import type { ArticleFormat } from '../../shared/infrastructure/services/solumService.js';

/** Dedicated AIMS article format for compass-enabled companies */
const COMPASS_ARTICLE_FORMAT: ArticleFormat = {
    fileExtension: 'csv',
    delimeter: ',',
    articleBasicInfo: ['store', 'articleId', 'articleName', 'nfcUrl'],
    articleData: [
        'STORE_ID', 'ARTICLE_ID', 'ITEM_NAME', 'NFC_URL',
        'BUILDING_NAME', 'FLOOR_NAME', 'AREA_NAME',
        'SPACE_TYPE', 'SPACE_MODE', 'SPACE_CAPACITY', 'SPACE_AMENITIES',
        'BOOKING_STATUS',
        'CURRENT_MEETING_NAME', 'CURRENT_MEETING_ORGANIZER',
        'CURRENT_MEETING_START', 'CURRENT_MEETING_END', 'CURRENT_MEETING_PARTICIPANTS',
        'NEXT1_MEETING_NAME', 'NEXT1_MEETING_ORGANIZER',
        'NEXT1_MEETING_START', 'NEXT1_MEETING_END', 'NEXT1_MEETING_PARTICIPANTS',
        'NEXT2_MEETING_NAME', 'NEXT2_MEETING_ORGANIZER',
        'NEXT2_MEETING_START', 'NEXT2_MEETING_END', 'NEXT2_MEETING_PARTICIPANTS',
    ],
    mappingInfo: {
        store: 'STORE_ID',
        articleId: 'ARTICLE_ID',
        articleName: 'ITEM_NAME',
        nfcUrl: 'NFC_URL',
    },
};

/** Default field mapping for compass companies */
const COMPASS_FIELD_MAPPING = {
    uniqueIdField: 'ARTICLE_ID',
    fields: {
        ITEM_NAME: { friendlyNameEn: 'Space Name', friendlyNameHe: 'שם מקום', visible: true },
        BUILDING_NAME: { friendlyNameEn: 'Building', friendlyNameHe: 'בניין', visible: true },
        FLOOR_NAME: { friendlyNameEn: 'Floor', friendlyNameHe: 'קומה', visible: true },
        AREA_NAME: { friendlyNameEn: 'Area', friendlyNameHe: 'אזור', visible: true },
        SPACE_TYPE: { friendlyNameEn: 'Type', friendlyNameHe: 'סוג', visible: true },
        SPACE_MODE: { friendlyNameEn: 'Mode', friendlyNameHe: 'מצב', visible: true },
        SPACE_CAPACITY: { friendlyNameEn: 'Capacity', friendlyNameHe: 'קיבולת', visible: true },
        SPACE_AMENITIES: { friendlyNameEn: 'Amenities', friendlyNameHe: 'מתקנים', visible: true },
        BOOKING_STATUS: { friendlyNameEn: 'Status', friendlyNameHe: 'סטטוס', visible: true },
        CURRENT_MEETING_NAME: { friendlyNameEn: 'Current Meeting', friendlyNameHe: 'פגישה נוכחית', visible: true },
        CURRENT_MEETING_ORGANIZER: { friendlyNameEn: 'Organizer', friendlyNameHe: 'מארגן', visible: true },
        CURRENT_MEETING_START: { friendlyNameEn: 'Start Time', friendlyNameHe: 'שעת התחלה', visible: true },
        CURRENT_MEETING_END: { friendlyNameEn: 'End Time', friendlyNameHe: 'שעת סיום', visible: true },
        CURRENT_MEETING_PARTICIPANTS: { friendlyNameEn: 'Participants', friendlyNameHe: 'משתתפים', visible: true },
        NEXT1_MEETING_NAME: { friendlyNameEn: 'Next Meeting', friendlyNameHe: 'פגישה הבאה', visible: true },
        NEXT1_MEETING_ORGANIZER: { friendlyNameEn: 'Next Organizer', friendlyNameHe: 'מארגן הבא', visible: true },
        NEXT1_MEETING_START: { friendlyNameEn: 'Next Start', friendlyNameHe: 'התחלה הבאה', visible: true },
        NEXT1_MEETING_END: { friendlyNameEn: 'Next End', friendlyNameHe: 'סיום הבא', visible: true },
        NEXT1_MEETING_PARTICIPANTS: { friendlyNameEn: 'Next Participants', friendlyNameHe: 'משתתפים הבאים', visible: true },
        NEXT2_MEETING_NAME: { friendlyNameEn: 'Meeting After', friendlyNameHe: 'פגישה אחר כך', visible: true },
        NEXT2_MEETING_ORGANIZER: { friendlyNameEn: 'Organizer After', friendlyNameHe: 'מארגן אחר כך', visible: true },
        NEXT2_MEETING_START: { friendlyNameEn: 'Start After', friendlyNameHe: 'התחלה אחר כך', visible: true },
        NEXT2_MEETING_END: { friendlyNameEn: 'End After', friendlyNameHe: 'סיום אחר כך', visible: true },
        NEXT2_MEETING_PARTICIPANTS: { friendlyNameEn: 'Participants After', friendlyNameHe: 'משתתפים אחר כך', visible: true },
    },
    conferenceMapping: {
        meetingName: 'CURRENT_MEETING_NAME',
        meetingTime: 'CURRENT_MEETING_START',
        participants: 'CURRENT_MEETING_PARTICIPANTS',
    },
};

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
        if (companyFeatures.compassEnabled) {
            // Compass companies use a dedicated format — ignore any fetched format
            initialSettings.solumArticleFormat = COMPASS_ARTICLE_FORMAT;
            initialSettings.solumMappingConfig = COMPASS_FIELD_MAPPING;
            appLogger.info('Companies', 'Using dedicated compass article format and field mapping');
        } else {
            if (fullData.articleFormat) {
                initialSettings.solumArticleFormat = fullData.articleFormat;
            }
            if (fullData.fieldMapping) {
                initialSettings.solumMappingConfig = fullData.fieldMapping;
            }
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
                    // Work configuration (Phase 21)
                    workWeekStart: fullData.workConfig?.workWeekStart ?? undefined,
                    workWeekEnd: fullData.workConfig?.workWeekEnd ?? undefined,
                    workingDays: fullData.workConfig?.workingDays ? (fullData.workConfig.workingDays as unknown as Prisma.InputJsonValue) : undefined,
                    workingHoursStart: fullData.workConfig?.workingHoursStart ?? undefined,
                    workingHoursEnd: fullData.workConfig?.workingHoursEnd ?? undefined,
                    defaultTimezone: fullData.workConfig?.defaultTimezone ?? undefined,
                    defaultLocale: fullData.workConfig?.defaultLocale ?? undefined,
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

        // Push compass article format to AIMS after company creation
        if (companyFeatures.compassEnabled && data.aimsConfig) {
            try {
                await aimsGateway.saveArticleFormatWithCredentials(
                    {
                        baseUrl: data.aimsConfig.baseUrl,
                        cluster: data.aimsConfig.cluster || '',
                        username: data.aimsConfig.username,
                        password: data.aimsConfig.password,
                    },
                    upperCode,
                    COMPASS_ARTICLE_FORMAT,
                );
                appLogger.info('Companies', `Pushed compass article format to AIMS for ${upperCode}`);
            } catch (err: any) {
                appLogger.warn('Companies', `Failed to push compass article format to AIMS: ${err.message}`);
                // Non-fatal — format is saved in DB settings, can be pushed manually later
            }
        }

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
     * Push article format to AIMS using raw credentials (pre-save, for wizard).
     * Same pattern as fetchArticleFormat — no company exists yet.
     */
    async pushArticleFormat(params: {
        baseUrl: string;
        cluster?: string;
        username: string;
        password: string;
        companyCode: string;
        format: Record<string, unknown>;
    }) {
        const { baseUrl, cluster, username, password, companyCode, format } = params;

        try {
            await aimsGateway.saveArticleFormatWithCredentials(
                { baseUrl, cluster, username, password },
                companyCode,
                format as any
            );

            return { success: true };
        } catch (error: any) {
            appLogger.error('CompanyService', 'Failed to push article format to AIMS', { error: String(error) });
            return {
                success: false,
                error: error.message || 'Failed to save article format to AIMS',
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
