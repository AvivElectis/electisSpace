/**
 * Permission Tests
 * 
 * End-to-end permission testing for Phase 6.1.
 * Tests all permission helper functions across various user scenarios.
 */

import {
    runPermissionTests,
    createMockUser,
    createMockCompany,
    createMockStore,
    isPlatformAdmin,
    isCompanyAdmin,
    isStoreAdmin,
    hasStoreRole,
    canAccessFeature,
    getAccessibleCompanies,
    getAccessibleStores,
    canManageUsers,
    canManageCompanies,
    canManageStores,
    canConfigureAIMS,
    canTriggerSync,
    getHighestRole,
} from './utils/permissionTestUtils';

describe('Permission System', () => {
    describe('All Test Scenarios', () => {
        it('should pass all predefined test scenarios', () => {
            const results = runPermissionTests();
            const failedTests = results.filter((r: { passed: boolean }) => !r.passed);
            
            if (failedTests.length > 0) {
                console.log('Failed tests:');
                failedTests.forEach((t: { scenario: string; failures: string[] }) => {
                    console.log(`  ${t.scenario}:`);
                    t.failures.forEach((f: string) => console.log(`    - ${f}`));
                });
            }
            
            expect(failedTests.length).toBe(0);
        });
    });

    describe('isPlatformAdmin', () => {
        it('should return true for PLATFORM_ADMIN role', () => {
            const user = createMockUser({ role: 'PLATFORM_ADMIN' });
            expect(isPlatformAdmin(user)).toBe(true);
        });

        it('should return false for USER role', () => {
            const user = createMockUser({ role: 'USER' });
            expect(isPlatformAdmin(user)).toBe(false);
        });
    });

    describe('isCompanyAdmin', () => {
        it('should return true for user with COMPANY_ADMIN role in company', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'COMPANY_ADMIN' }),
                ],
            });
            expect(isCompanyAdmin(user, 'c1')).toBe(true);
        });

        it('should return false for user with VIEWER role in company', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
            });
            expect(isCompanyAdmin(user, 'c1')).toBe(false);
        });

        it('should return true for PLATFORM_ADMIN regardless of company role', () => {
            const user = createMockUser({
                role: 'PLATFORM_ADMIN',
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
            });
            expect(isCompanyAdmin(user, 'c1')).toBe(true);
        });
    });

    describe('isStoreAdmin', () => {
        it('should return true for user with STORE_ADMIN role in store', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
                stores: [createMockStore({ id: 's1', companyId: 'c1', role: 'STORE_ADMIN' })],
            });
            expect(isStoreAdmin(user, 's1')).toBe(true);
        });

        it('should return true for COMPANY_ADMIN even with lower store role', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'COMPANY_ADMIN' }),
                ],
                stores: [createMockStore({ id: 's1', companyId: 'c1', role: 'STORE_EMPLOYEE' })],
            });
            expect(isStoreAdmin(user, 's1')).toBe(true);
        });
    });

    describe('hasStoreRole', () => {
        it('should check minimum role level correctly', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
                stores: [createMockStore({ id: 's1', companyId: 'c1', role: 'STORE_MANAGER' })],
            });

            expect(hasStoreRole(user, 's1', 'STORE_VIEWER')).toBe(true);
            expect(hasStoreRole(user, 's1', 'STORE_EMPLOYEE')).toBe(true);
            expect(hasStoreRole(user, 's1', 'STORE_MANAGER')).toBe(true);
            expect(hasStoreRole(user, 's1', 'STORE_ADMIN')).toBe(false);
        });
    });

    describe('canAccessFeature', () => {
        it('should allow access to assigned features', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
                stores: [createMockStore({ 
                    id: 's1', 
                    companyId: 'c1',
                    features: ['dashboard', 'spaces', 'sync'] 
                })],
            });

            // canAccessFeature signature: (user, storeId, feature)
            expect(canAccessFeature(user, 's1', 'dashboard')).toBe(true);
            expect(canAccessFeature(user, 's1', 'spaces')).toBe(true);
            expect(canAccessFeature(user, 's1', 'sync')).toBe(true);
            expect(canAccessFeature(user, 's1', 'settings')).toBe(false);
        });

        it('should allow PLATFORM_ADMIN to access all features', () => {
            const user = createMockUser({
                role: 'PLATFORM_ADMIN',
                companies: [
                    createMockCompany({ id: 'c1', role: 'VIEWER' }),
                ],
                stores: [createMockStore({ id: 's1', companyId: 'c1', features: [] })],
            });

            expect(canAccessFeature(user, 's1', 'dashboard')).toBe(true);
            expect(canAccessFeature(user, 's1', 'settings')).toBe(true);
        });
    });

    describe('getAccessibleCompanies', () => {
        it('should return all companies for a user', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1' }),
                    createMockCompany({ id: 'c2' }),
                ],
            });

            const companies = getAccessibleCompanies(user);
            expect(companies.length).toBe(2);
        });
    });

    describe('getAccessibleStores', () => {
        it('should return all stores across all companies', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1' }),
                    createMockCompany({ id: 'c2' }),
                ],
                stores: [
                    createMockStore({ id: 's1', companyId: 'c1' }),
                    createMockStore({ id: 's2', companyId: 'c1' }),
                    createMockStore({ id: 's3', companyId: 'c2' }),
                ],
            });

            const stores = getAccessibleStores(user);
            expect(stores.length).toBe(3);
        });

        it('should filter by company when companyId provided', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'c1' }),
                    createMockCompany({ id: 'c2' }),
                ],
                stores: [
                    createMockStore({ id: 's1', companyId: 'c1' }),
                    createMockStore({ id: 's2', companyId: 'c1' }),
                    createMockStore({ id: 's3', companyId: 'c2' }),
                ],
            });

            const stores = getAccessibleStores(user, 'c1');
            expect(stores.length).toBe(2);
        });
    });

    describe('canManageUsers', () => {
        it('should allow PLATFORM_ADMIN to manage users', () => {
            const user = createMockUser({ role: 'PLATFORM_ADMIN' });
            expect(canManageUsers(user)).toBe(true);
        });

        it('should allow COMPANY_ADMIN to manage users in their company', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'COMPANY_ADMIN' })],
            });
            expect(canManageUsers(user, 'c1')).toBe(true);
        });

        it('should not allow VIEWER to manage users', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'VIEWER' })],
            });
            expect(canManageUsers(user, 'c1')).toBe(false);
        });
    });

    describe('canManageCompanies', () => {
        it('should only allow PLATFORM_ADMIN to manage companies', () => {
            expect(canManageCompanies(createMockUser({ role: 'PLATFORM_ADMIN' }))).toBe(true);
            expect(canManageCompanies(createMockUser({ role: 'USER' }))).toBe(false);
        });
    });

    describe('canManageStores', () => {
        it('should allow PLATFORM_ADMIN to manage stores', () => {
            const user = createMockUser({ role: 'PLATFORM_ADMIN' });
            expect(canManageStores(user, 'any')).toBe(true);
        });

        it('should allow COMPANY_ADMIN to manage stores in their company', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'COMPANY_ADMIN' })],
            });
            expect(canManageStores(user, 'c1')).toBe(true);
        });

        it('should not allow VIEWER to manage stores', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'VIEWER' })],
            });
            expect(canManageStores(user, 'c1')).toBe(false);
        });
    });

    describe('canConfigureAIMS', () => {
        it('should allow PLATFORM_ADMIN to configure AIMS', () => {
            const user = createMockUser({ role: 'PLATFORM_ADMIN' });
            expect(canConfigureAIMS(user, 'any')).toBe(true);
        });

        it('should allow COMPANY_ADMIN to configure AIMS for their company', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'COMPANY_ADMIN' })],
            });
            expect(canConfigureAIMS(user, 'c1')).toBe(true);
        });

        it('should not allow VIEWER to configure AIMS', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'VIEWER' })],
            });
            expect(canConfigureAIMS(user, 'c1')).toBe(false);
        });
    });

    describe('canTriggerSync', () => {
        it('should allow PLATFORM_ADMIN to trigger sync', () => {
            const user = createMockUser({ role: 'PLATFORM_ADMIN' });
            expect(canTriggerSync(user, 'any')).toBe(true);
        });

        it('should allow STORE_MANAGER to trigger sync', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'VIEWER' })],
                stores: [createMockStore({ id: 's1', companyId: 'c1', role: 'STORE_MANAGER' })],
            });
            expect(canTriggerSync(user, 's1')).toBe(true);
        });

        it('should not allow STORE_EMPLOYEE to trigger sync', () => {
            const user = createMockUser({
                companies: [createMockCompany({ id: 'c1', role: 'VIEWER' })],
                stores: [createMockStore({ id: 's1', companyId: 'c1', role: 'STORE_EMPLOYEE' })],
            });
            expect(canTriggerSync(user, 's1')).toBe(false);
        });
    });

    describe('getHighestRole', () => {
        it('should return Platform Admin as highest', () => {
            const user = createMockUser({
                role: 'PLATFORM_ADMIN',
                companies: [createMockCompany({ role: 'VIEWER' })],
            });
            expect(getHighestRole(user)).toBe('Platform Admin');
        });

        it('should return Company Admin for company admin', () => {
            const user = createMockUser({
                role: 'USER',
                companies: [
                    createMockCompany({ role: 'VIEWER' }),
                    createMockCompany({ role: 'COMPANY_ADMIN' }),
                ],
            });
            expect(getHighestRole(user)).toBe('Company Admin');
        });
    });
});
