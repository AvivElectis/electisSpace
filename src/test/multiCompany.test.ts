/**
 * Multi-Company Test Scenarios
 * 
 * Test scenarios for multi-company/store operations (Phase 6.3).
 * Verifies data isolation and cross-company access controls.
 */

import { describe, it, expect } from 'vitest';
import {
    createMockUser,
    createMockCompany,
    createMockStore,
    isCompanyAdmin,
    isStoreAdmin,
    canAccessFeature,
    getAccessibleCompanies,
    getAccessibleStores,
    canManageStores,
} from './utils/permissionTestUtils';

describe('Multi-Company Scenarios', () => {
    describe('Data Isolation', () => {
        it('should not allow access to stores in unassigned companies', () => {
            // User only has access to Company A
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', role: 'STORE_ADMIN' }),
                ],
            });

            // Should have access to Company A stores
            const accessibleStores = getAccessibleStores(user);
            expect(accessibleStores.map(s => s.id)).toContain('store_a1');

            // Should not have Company B in accessible companies
            const accessibleCompanies = getAccessibleCompanies(user);
            expect(accessibleCompanies.map(c => c.id)).not.toContain('company_b');
        });

        it('should isolate features between stores', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', features: ['dashboard', 'spaces'] }),
                    createMockStore({ id: 'store_a2', companyId: 'company_a', features: ['dashboard', 'sync'] }),
                ],
            });

            // Store A1 has spaces but not sync
            expect(canAccessFeature(user, 'store_a1', 'spaces')).toBe(true);
            expect(canAccessFeature(user, 'store_a1', 'sync')).toBe(false);

            // Store A2 has sync but not spaces
            expect(canAccessFeature(user, 'store_a2', 'spaces')).toBe(false);
            expect(canAccessFeature(user, 'store_a2', 'sync')).toBe(true);
        });
    });

    describe('Multi-Company User', () => {
        it('should allow switching between companies', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'COMPANY_ADMIN' }),
                    createMockCompany({ id: 'company_b', role: 'VIEWER' }),
                ],
                activeCompanyId: 'company_a',
            });

            // User has access to both companies
            const companies = getAccessibleCompanies(user);
            expect(companies.length).toBe(2);

            // User is Company Admin for Company A
            expect(isCompanyAdmin(user, 'company_a')).toBe(true);
            
            // User is NOT Company Admin for Company B
            expect(isCompanyAdmin(user, 'company_b')).toBe(false);
        });

        it('should have different permissions per company', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'COMPANY_ADMIN' }),
                    createMockCompany({ id: 'company_b', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', role: 'STORE_ADMIN' }),
                    createMockStore({ id: 'store_b1', companyId: 'company_b', role: 'STORE_VIEWER' }),
                ],
            });

            // Can manage stores in Company A
            expect(canManageStores(user, 'company_a')).toBe(true);

            // Cannot manage stores in Company B
            expect(canManageStores(user, 'company_b')).toBe(false);

            // Is Store Admin in Company A
            expect(isStoreAdmin(user, 'store_a1')).toBe(true);

            // Is NOT Store Admin in Company B
            expect(isStoreAdmin(user, 'store_b1')).toBe(false);
        });
    });

    describe('Multi-Store User', () => {
        it('should allow access to multiple stores in same company', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', role: 'STORE_ADMIN' }),
                    createMockStore({ id: 'store_a2', companyId: 'company_a', role: 'STORE_MANAGER' }),
                ],
            });

            const stores = getAccessibleStores(user, 'company_a');
            expect(stores.length).toBe(2);

            // Store Admin for store_a1
            expect(isStoreAdmin(user, 'store_a1')).toBe(true);

            // Not Store Admin for store_a2 (only Manager)
            expect(isStoreAdmin(user, 'store_a2')).toBe(false);
        });

        it('should apply different features per store', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ 
                        id: 'store_a1', 
                        companyId: 'company_a',
                        features: ['dashboard', 'spaces', 'people', 'conference', 'sync', 'settings'] 
                    }),
                    createMockStore({ 
                        id: 'store_a2', 
                        companyId: 'company_a',
                        features: ['dashboard', 'spaces'] 
                    }),
                ],
            });

            // Store A1 has all features
            expect(canAccessFeature(user, 'store_a1', 'settings')).toBe(true);
            expect(canAccessFeature(user, 'store_a1', 'people')).toBe(true);

            // Store A2 has limited features
            expect(canAccessFeature(user, 'store_a2', 'settings')).toBe(false);
            expect(canAccessFeature(user, 'store_a2', 'people')).toBe(false);
        });
    });

    describe('Platform Admin Override', () => {
        it('should give platform admin full access to all companies', () => {
            const user = createMockUser({
                role: 'PLATFORM_ADMIN',
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                    createMockCompany({ id: 'company_b', role: 'VIEWER' }),
                ],
            });

            // Platform admin should be Company Admin for both
            expect(isCompanyAdmin(user, 'company_a')).toBe(true);
            expect(isCompanyAdmin(user, 'company_b')).toBe(true);

            // Can manage stores in both
            expect(canManageStores(user, 'company_a')).toBe(true);
            expect(canManageStores(user, 'company_b')).toBe(true);
        });

        it('should give platform admin access to all features', () => {
            const user = createMockUser({
                role: 'PLATFORM_ADMIN',
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', features: [] }),
                ],
            });

            // Should have access to all features even though store has none assigned
            expect(canAccessFeature(user, 'store_a1', 'dashboard')).toBe(true);
            expect(canAccessFeature(user, 'store_a1', 'settings')).toBe(true);
            expect(canAccessFeature(user, 'store_a1', 'sync')).toBe(true);
        });
    });

    describe('Company Admin Scope', () => {
        it('should limit company admin to their company', () => {
            const user = createMockUser({
                role: 'USER',
                companies: [
                    createMockCompany({ id: 'company_a', role: 'COMPANY_ADMIN' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a' }),
                    createMockStore({ id: 'store_a2', companyId: 'company_a' }),
                ],
            });

            // Should be able to manage stores in their company
            expect(canManageStores(user, 'company_a')).toBe(true);

            // Should NOT be able to manage stores in other companies
            expect(canManageStores(user, 'company_b')).toBe(false);

            // Should be Store Admin for all stores in their company
            expect(isStoreAdmin(user, 'store_a1')).toBe(true);
            expect(isStoreAdmin(user, 'store_a2')).toBe(true);
        });

        it('should allow company admin to access all stores in their company', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'COMPANY_ADMIN' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a', features: ['dashboard'] }),
                    createMockStore({ id: 'store_a2', companyId: 'company_a', features: ['dashboard'] }),
                ],
            });

            // All stores in company should be accessible
            const stores = getAccessibleStores(user, 'company_a');
            expect(stores.length).toBe(2);
        });
    });

    describe('Store Assignment Scenarios', () => {
        it('should restrict user to explicitly assigned stores', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [
                    createMockStore({ id: 'store_a1', companyId: 'company_a' }),
                    // Note: store_a2 exists but user is not assigned
                ],
            });

            const stores = getAccessibleStores(user, 'company_a');
            expect(stores.map(s => s.id)).toContain('store_a1');
            expect(stores.length).toBe(1); // Only assigned store
        });

        it('should handle user with no store assignments', () => {
            const user = createMockUser({
                companies: [
                    createMockCompany({ id: 'company_a', role: 'VIEWER' }),
                ],
                stores: [], // No stores assigned
            });

            const stores = getAccessibleStores(user);
            expect(stores.length).toBe(0);
        });
    });
});
