/**
 * Permission Test Utilities
 * 
 * Mock factories and test scenarios for permission system testing.
 * Phase 6.1 - Permission Testing
 */

import type { User, Store, Company } from '@shared/infrastructure/services/authService';
import {
    isPlatformAdmin,
    isCompanyAdmin,
    isStoreAdmin,
    hasStoreRole,
    hasCompanyRole,
    canAccessFeature,
    getAccessibleCompanies,
    getAccessibleStores,
    canManageUsers,
    canManageCompanies,
    canManageStores,
    canConfigureAIMS,
    canTriggerSync,
    getHighestRole,
    type Feature,
} from '@features/auth/application/permissionHelpers';

// Re-export permission helpers for tests
export {
    isPlatformAdmin,
    isCompanyAdmin,
    isStoreAdmin,
    hasStoreRole,
    hasCompanyRole,
    canAccessFeature,
    getAccessibleCompanies,
    getAccessibleStores,
    canManageUsers,
    canManageCompanies,
    canManageStores,
    canConfigureAIMS,
    canTriggerSync,
    getHighestRole,
};

// Type re-exports
export type { User, Store, Company };
export type StoreRole = Store['role'];
export type CompanyRole = Company['role'];

/**
 * Create a mock Store with defaults
 */
export function createMockStore(overrides: Partial<Store> = {}): Store {
    return {
        id: overrides.id || `store_${Date.now()}`,
        name: overrides.name || 'Test Store',
        code: overrides.code || 'TEST001',
        role: overrides.role || 'STORE_EMPLOYEE',
        features: overrides.features || ['dashboard', 'spaces', 'conference', 'people'],
        companyId: overrides.companyId || 'company_1',
        companyName: overrides.companyName || 'Test Company',
    };
}

/**
 * Create a mock Company with defaults
 */
export function createMockCompany(overrides: Partial<Company> = {}): Company {
    return {
        id: overrides.id || `company_${Date.now()}`,
        name: overrides.name || 'Test Company',
        code: overrides.code || 'TESTCO',
        role: overrides.role || 'VIEWER',
        allStoresAccess: overrides.allStoresAccess ?? false,
    };
}

/**
 * Create a mock User with defaults
 */
export function createMockUser(overrides: Partial<User & { role?: 'PLATFORM_ADMIN' | 'USER' }> = {}): User {
    const baseUser: User = {
        id: overrides.id || `user_${Date.now()}`,
        email: overrides.email || 'test@example.com',
        firstName: overrides.firstName ?? 'Test',
        lastName: overrides.lastName ?? 'User',
        globalRole: overrides.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : (overrides.globalRole ?? null),
        activeCompanyId: overrides.activeCompanyId ?? null,
        activeStoreId: overrides.activeStoreId ?? null,
        stores: overrides.stores || [],
        companies: overrides.companies || [],
    };
    return baseUser;
}

// Pre-defined test scenarios
export interface TestScenario {
    name: string;
    user: User;
    expectedPermissions: ExpectedPermissions;
}

export interface ExpectedPermissions {
    isPlatformAdmin: boolean;
    isCompanyAdmin: boolean;
    isStoreAdmin: boolean;
    canManageUsers: boolean;
    canManageCompanies: boolean;
    canManageStores: boolean;
    canConfigureAIMS: boolean;
    canTriggerSync: boolean;
    accessibleFeatures: Feature[];
}

export const testScenarios: TestScenario[] = [
    // Scenario 1: Platform Admin
    {
        name: 'Platform Admin',
        user: createMockUser({
            id: 'user_platform_admin',
            role: 'PLATFORM_ADMIN',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'COMPANY_ADMIN' })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_ADMIN' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: true,
            isCompanyAdmin: true,
            isStoreAdmin: true,
            canManageUsers: true,
            canManageCompanies: true,
            canManageStores: true,
            canConfigureAIMS: true,
            canTriggerSync: true,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'],
        },
    },

    // Scenario 2: Company Admin
    {
        name: 'Company Admin',
        user: createMockUser({
            id: 'user_company_admin',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'COMPANY_ADMIN', allStoresAccess: true })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_ADMIN' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: true,
            isStoreAdmin: true,
            canManageUsers: true,
            canManageCompanies: false,
            canManageStores: true,
            canConfigureAIMS: true,
            canTriggerSync: true,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'],
        },
    },

    // Scenario 3: Store Admin
    {
        name: 'Store Admin',
        user: createMockUser({
            id: 'user_store_admin',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'VIEWER' })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_ADMIN' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: false,
            isStoreAdmin: true,
            canManageUsers: false,
            canManageCompanies: false,
            canManageStores: false,
            canConfigureAIMS: false,
            canTriggerSync: true,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'],
        },
    },

    // Scenario 4: Store Manager
    {
        name: 'Store Manager',
        user: createMockUser({
            id: 'user_store_manager',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'VIEWER' })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_MANAGER' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: false,
            isStoreAdmin: false,
            canManageUsers: false,
            canManageCompanies: false,
            canManageStores: false,
            canConfigureAIMS: false,
            canTriggerSync: true,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people'],
        },
    },

    // Scenario 5: Store Employee
    {
        name: 'Store Employee',
        user: createMockUser({
            id: 'user_store_employee',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'VIEWER' })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_EMPLOYEE' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: false,
            isStoreAdmin: false,
            canManageUsers: false,
            canManageCompanies: false,
            canManageStores: false,
            canConfigureAIMS: false,
            canTriggerSync: false,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people'],
        },
    },

    // Scenario 6: Store Viewer
    {
        name: 'Store Viewer',
        user: createMockUser({
            id: 'user_store_viewer',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [createMockCompany({ id: 'company_1', role: 'VIEWER' })],
            stores: [createMockStore({ id: 'store_1', companyId: 'company_1', role: 'STORE_VIEWER' })],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: false,
            isStoreAdmin: false,
            canManageUsers: false,
            canManageCompanies: false,
            canManageStores: false,
            canConfigureAIMS: false,
            canTriggerSync: false,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people'],
        },
    },

    // Scenario 7: Multi-company User
    {
        name: 'Multi-Company User',
        user: createMockUser({
            id: 'user_multi_company',
            activeCompanyId: 'company_1',
            activeStoreId: 'store_1',
            companies: [
                createMockCompany({ id: 'company_1', name: 'Company 1', role: 'COMPANY_ADMIN' }),
                createMockCompany({ id: 'company_2', name: 'Company 2', role: 'VIEWER' }),
            ],
            stores: [
                createMockStore({ id: 'store_1', name: 'Store 1', companyId: 'company_1', role: 'STORE_ADMIN' }),
                createMockStore({ id: 'store_2', name: 'Store 2', companyId: 'company_2', role: 'STORE_MANAGER' }),
            ],
        }),
        expectedPermissions: {
            isPlatformAdmin: false,
            isCompanyAdmin: true, // Admin for company_1
            isStoreAdmin: true,    // Admin for store_1
            canManageUsers: true,
            canManageCompanies: false,
            canManageStores: true,
            canConfigureAIMS: true,
            canTriggerSync: true,
            accessibleFeatures: ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'],
        },
    },
];

/**
 * Run all permission tests for a scenario
 */
export function runPermissionTest(scenario: TestScenario): { passed: boolean; failures: string[] } {
    const { user, expectedPermissions } = scenario;
    const failures: string[] = [];

    const activeCompanyId = user.activeCompanyId || '';
    const activeStoreId = user.activeStoreId || '';

    // Check isPlatformAdmin
    if (isPlatformAdmin(user) !== expectedPermissions.isPlatformAdmin) {
        failures.push(`isPlatformAdmin: expected ${expectedPermissions.isPlatformAdmin}, got ${isPlatformAdmin(user)}`);
    }

    // Check isCompanyAdmin
    if (activeCompanyId && isCompanyAdmin(user, activeCompanyId) !== expectedPermissions.isCompanyAdmin) {
        failures.push(`isCompanyAdmin: expected ${expectedPermissions.isCompanyAdmin}, got ${isCompanyAdmin(user, activeCompanyId)}`);
    }

    // Check isStoreAdmin
    if (activeStoreId && isStoreAdmin(user, activeStoreId) !== expectedPermissions.isStoreAdmin) {
        failures.push(`isStoreAdmin: expected ${expectedPermissions.isStoreAdmin}, got ${isStoreAdmin(user, activeStoreId)}`);
    }

    // Check canManageUsers
    if (canManageUsers(user, activeCompanyId || undefined) !== expectedPermissions.canManageUsers) {
        failures.push(`canManageUsers: expected ${expectedPermissions.canManageUsers}, got ${canManageUsers(user, activeCompanyId || undefined)}`);
    }

    // Check canManageCompanies
    if (canManageCompanies(user) !== expectedPermissions.canManageCompanies) {
        failures.push(`canManageCompanies: expected ${expectedPermissions.canManageCompanies}, got ${canManageCompanies(user)}`);
    }

    // Check canManageStores
    if (activeCompanyId && canManageStores(user, activeCompanyId) !== expectedPermissions.canManageStores) {
        failures.push(`canManageStores: expected ${expectedPermissions.canManageStores}, got ${canManageStores(user, activeCompanyId)}`);
    }

    // Check canConfigureAIMS
    if (activeCompanyId && canConfigureAIMS(user, activeCompanyId) !== expectedPermissions.canConfigureAIMS) {
        failures.push(`canConfigureAIMS: expected ${expectedPermissions.canConfigureAIMS}, got ${canConfigureAIMS(user, activeCompanyId)}`);
    }

    // Check canTriggerSync
    if (activeStoreId && canTriggerSync(user, activeStoreId) !== expectedPermissions.canTriggerSync) {
        failures.push(`canTriggerSync: expected ${expectedPermissions.canTriggerSync}, got ${canTriggerSync(user, activeStoreId)}`);
    }

    // Check feature access
    if (activeStoreId) {
        for (const feature of expectedPermissions.accessibleFeatures) {
            if (!canAccessFeature(user, activeStoreId, feature)) {
                failures.push(`canAccessFeature(${feature}): expected true, got false`);
            }
        }
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}

/**
 * Run all test scenarios
 */
export function runPermissionTests(): { scenario: string; passed: boolean; failures: string[] }[] {
    return testScenarios.map(scenario => ({
        scenario: scenario.name,
        ...runPermissionTest(scenario),
    }));
}
