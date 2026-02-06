/**
 * Settings Feature - Service
 * 
 * @description Business logic for settings management.
 */
import { GlobalRole } from '@prisma/client';
import { settingsRepository } from './repository.js';
import type {
    SettingsUserContext,
    StoreSettingsResponse,
    CompanySettingsResponse,
    FieldMappingsResponse,
    FieldMappingConfigInput,
    AimsConfigResponse,
    AimsTestResponse,
    UpdateSuccessResponse,
} from './types.js';

// ======================
// Authorization Helpers
// ======================

const isPlatformAdmin = (user: SettingsUserContext): boolean => {
    return user.globalRole === GlobalRole.PLATFORM_ADMIN;
};

// ======================
// Service
// ======================

export const settingsService = {
    // ======================
    // Store Settings
    // ======================

    /**
     * Get store settings
     */
    async getStoreSettings(storeId: string, user: SettingsUserContext): Promise<StoreSettingsResponse> {
        // Platform admins can access any store
        if (isPlatformAdmin(user)) {
            const store = await settingsRepository.getStore(storeId);
            if (!store) {
                throw new Error('STORE_NOT_FOUND');
            }
            
            return {
                storeId: store.id,
                storeName: store.name,
                storeCode: store.code,
                settings: (store.settings as Record<string, any>) || {},
            };
        }

        // Regular user - check access
        const userStore = await settingsRepository.getUserStoreAccess(user.id, storeId);
        if (!userStore) {
            throw new Error('STORE_NOT_FOUND_OR_DENIED');
        }

        return {
            storeId: userStore.store.id,
            storeName: userStore.store.name,
            storeCode: userStore.store.code,
            settings: (userStore.store.settings as Record<string, any>) || {},
        };
    },

    /**
     * Update store settings
     */
    async updateStoreSettings(
        storeId: string,
        settings: Record<string, any>,
        user: SettingsUserContext
    ): Promise<UpdateSuccessResponse> {
        // Platform admins can update any store's settings
        if (isPlatformAdmin(user)) {
            const store = await settingsRepository.getStore(storeId);
            if (!store) {
                throw new Error('STORE_NOT_FOUND');
            }
            
            const updatedStore = await settingsRepository.updateStoreSettings(storeId, settings);
            
            return {
                storeId: updatedStore.id,
                settings: updatedStore.settings as Record<string, any>,
                message: 'Settings updated successfully',
            };
        }

        // Regular user - check access and role
        const userStore = await settingsRepository.getUserStoreAccess(user.id, storeId);
        if (!userStore) {
            throw new Error('STORE_NOT_FOUND_OR_DENIED');
        }

        // Check if user has permission to update settings (STORE_ADMIN or STORE_MANAGER)
        const allowedRoles = ['STORE_ADMIN', 'STORE_MANAGER'];
        if (!allowedRoles.includes(userStore.role)) {
            throw new Error('FORBIDDEN');
        }

        const updatedStore = await settingsRepository.updateStoreSettings(storeId, settings);

        return {
            storeId: updatedStore.id,
            settings: updatedStore.settings as Record<string, any>,
            message: 'Settings updated successfully',
        };
    },

    // ======================
    // Company Settings
    // ======================

    /**
     * Get company settings
     */
    async getCompanySettings(companyId: string, user: SettingsUserContext): Promise<CompanySettingsResponse> {
        // Platform admins can access any company
        if (isPlatformAdmin(user)) {
            const company = await settingsRepository.getCompany(companyId);
            if (!company) {
                throw new Error('COMPANY_NOT_FOUND');
            }
            
            return {
                companyId: company.id,
                companyName: company.name,
                companyCode: company.code,
                settings: (company.settings as Record<string, any>) || {},
            };
        }

        // Regular user - check access
        const userCompany = await settingsRepository.getUserCompanyAccess(user.id, companyId);
        if (!userCompany) {
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        return {
            companyId: userCompany.company.id,
            companyName: userCompany.company.name,
            companyCode: userCompany.company.code,
            settings: (userCompany.company.settings as Record<string, any>) || {},
        };
    },

    /**
     * Update company settings
     */
    async updateCompanySettings(
        companyId: string,
        settings: Record<string, any>,
        user: SettingsUserContext
    ): Promise<UpdateSuccessResponse> {
        // Platform admins can update any company's settings
        if (isPlatformAdmin(user)) {
            const company = await settingsRepository.getCompany(companyId);
            if (!company) {
                throw new Error('COMPANY_NOT_FOUND');
            }
            
            const updatedCompany = await settingsRepository.updateCompanySettings(companyId, settings);
            
            return {
                companyId: updatedCompany.id,
                settings: updatedCompany.settings as Record<string, any>,
                message: 'Company settings updated successfully',
            };
        }

        // Regular user - check access and role
        const userCompany = await settingsRepository.getUserCompanyAccess(user.id, companyId);
        if (!userCompany) {
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        if (userCompany.role !== 'COMPANY_ADMIN') {
            throw new Error('FORBIDDEN_NOT_ADMIN');
        }

        const updatedCompany = await settingsRepository.updateCompanySettings(companyId, settings);

        return {
            companyId: updatedCompany.id,
            settings: updatedCompany.settings as Record<string, any>,
            message: 'Company settings updated successfully',
        };
    },

    // ======================
    // Field Mappings (Company-Level)
    // ======================

    /**
     * Get field mappings for a company
     */
    async getFieldMappings(companyId: string, user: SettingsUserContext): Promise<FieldMappingsResponse> {
        let company;
        if (isPlatformAdmin(user)) {
            company = await settingsRepository.getCompany(companyId);
        } else {
            const userCompany = await settingsRepository.getUserCompanyAccess(user.id, companyId);
            company = userCompany?.company;
        }

        if (!company) {
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        const settings = (company.settings as Record<string, any>) || {};
        const fieldMappings = settings.solumMappingConfig || {
            uniqueIdField: '',
            fields: {},
            conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
            globalFieldAssignments: {},
        };

        return {
            companyId: company.id,
            fieldMappings,
        };
    },

    /**
     * Update field mappings for a company
     */
    async updateFieldMappings(
        companyId: string,
        fieldMappings: FieldMappingConfigInput,
        user: SettingsUserContext
    ): Promise<UpdateSuccessResponse> {
        let company;
        let hasWriteAccess = false;
        
        if (isPlatformAdmin(user)) {
            company = await settingsRepository.getCompany(companyId);
            hasWriteAccess = true;
        } else {
            const userCompany = await settingsRepository.getUserCompanyAccess(user.id, companyId);
            company = userCompany?.company;
            hasWriteAccess = userCompany?.role === 'COMPANY_ADMIN';
        }

        if (!company) {
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        if (!hasWriteAccess) {
            throw new Error('FORBIDDEN');
        }

        // Merge with existing settings
        const currentSettings = (company.settings as Record<string, any>) || {};
        const updatedSettings = {
            ...currentSettings,
            solumMappingConfig: fieldMappings,
        };

        const updatedCompany = await settingsRepository.updateCompanySettings(companyId, updatedSettings);

        return {
            companyId: updatedCompany.id,
            fieldMappings,
            message: 'Field mappings updated successfully',
        };
    },

    // ======================
    // AIMS Configuration
    // ======================

    /**
     * Get AIMS configuration for a company
     */
    async getAimsConfig(companyId: string, user: SettingsUserContext): Promise<AimsConfigResponse> {
        let company;
        if (isPlatformAdmin(user)) {
            company = await settingsRepository.getCompany(companyId);
        } else {
            const userCompany = await settingsRepository.getUserCompanyAccess(user.id, companyId);
            company = userCompany?.company;
        }

        if (!company) {
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        return {
            companyId: company.id,
            aimsConfig: {
                configured: !!(company.aimsBaseUrl && company.aimsUsername),
                baseUrl: company.aimsBaseUrl,
                cluster: company.aimsCluster,
                username: company.aimsUsername,
                hasPassword: !!company.aimsPasswordEnc,
            },
        };
    },

    /**
     * Test AIMS connection for a company
     */
    async testAimsConnection(companyId: string, user: SettingsUserContext): Promise<AimsTestResponse> {
        console.log(`[AIMS Test] Testing connection for company ${companyId}`);
        
        // Platform admin or company admin can test connection
        let company;
        if (isPlatformAdmin(user)) {
            company = await settingsRepository.getCompany(companyId);
        } else {
            const userCompany = await settingsRepository.getUserCompanyAdminAccess(user.id, companyId);
            company = userCompany?.company;
        }

        if (!company) {
            console.log(`[AIMS Test] Company not found or access denied: ${companyId}`);
            throw new Error('COMPANY_NOT_FOUND_OR_DENIED');
        }

        console.log(`[AIMS Test] Company found: ${company.code}`);
        console.log(`[AIMS Test] aimsBaseUrl: ${company.aimsBaseUrl}`);
        console.log(`[AIMS Test] aimsUsername: ${company.aimsUsername}`);
        console.log(`[AIMS Test] aimsPasswordEnc exists: ${!!company.aimsPasswordEnc}`);
        console.log(`[AIMS Test] aimsCluster: ${company.aimsCluster}`);

        // Check if AIMS is configured
        if (!company.aimsBaseUrl || !company.aimsUsername || !company.aimsPasswordEnc) {
            console.log(`[AIMS Test] AIMS credentials not fully configured`);
            return {
                success: false,
                message: 'AIMS credentials not configured',
                configured: false,
            };
        }

        try {
            // Import encryption utility and solum service dynamically to avoid circular deps
            const { decrypt } = await import('../../shared/utils/encryption.js');
            const { config } = await import('../../config/index.js');
            const { solumService } = await import('../../shared/infrastructure/services/solumService.js');

            console.log(`[AIMS Test] Decrypting password...`);
            
            // Decrypt password
            let password: string;
            try {
                password = decrypt(company.aimsPasswordEnc, config.encryptionKey);
                console.log(`[AIMS Test] Password decrypted successfully, length: ${password.length}`);
            } catch (error) {
                console.error('[AIMS Test] Failed to decrypt password:', error);
                return {
                    success: false,
                    message: 'Failed to decrypt stored credentials',
                    configured: true,
                };
            }

            // Create config and test connection
            const solumConfig = {
                baseUrl: company.aimsBaseUrl,
                cluster: company.aimsCluster || undefined,
                companyName: company.code,
                username: company.aimsUsername,
                password,
            };

            console.log(`[AIMS Test] Testing connection with config:`, {
                baseUrl: solumConfig.baseUrl,
                cluster: solumConfig.cluster,
                companyName: solumConfig.companyName,
                username: solumConfig.username,
                passwordLength: solumConfig.password?.length,
            });

            // Test health endpoint
            const isHealthy = await solumService.checkHealth(solumConfig);
            console.log(`[AIMS Test] Health check result: ${isHealthy}`);
            
            if (isHealthy) {
                return {
                    success: true,
                    message: 'AIMS connection successful',
                    configured: true,
                };
            } else {
                return {
                    success: false,
                    message: 'AIMS server not reachable or credentials invalid',
                    configured: true,
                };
            }
        } catch (error: any) {
            console.error('[AIMS Test] Connection test failed:', error);
            return {
                success: false,
                message: error.message || 'Connection test failed',
                configured: true,
            };
        }
    },
};
