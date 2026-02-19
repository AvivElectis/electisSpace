/**
 * Permission Helpers
 * 
 * Utility functions for checking user permissions, roles, and feature access.
 * These work with the User type from authService.
 */

import type { User, Store, Company, CompanyFeatures } from '@shared/infrastructure/services/authService';

// Role hierarchy for comparison
const STORE_ROLE_HIERARCHY: Record<Store['role'], number> = {
    'STORE_ADMIN': 4,
    'STORE_MANAGER': 3,
    'STORE_EMPLOYEE': 2,
    'STORE_VIEWER': 1,
};

const COMPANY_ROLE_HIERARCHY: Record<Company['role'], number> = {
    'SUPER_USER': 4,
    'COMPANY_ADMIN': 3,
    'STORE_ADMIN': 2,
    'STORE_VIEWER': 1,
    'VIEWER': 1,
};

// Feature names
export type Feature = 'dashboard' | 'spaces' | 'conference' | 'people' | 'sync' | 'settings' | 'labels';

/**
 * Check if user is a Platform Admin
 */
export function isPlatformAdmin(user: User | null): boolean {
    return user?.globalRole === 'PLATFORM_ADMIN';
}

/**
 * Check if user has Company Admin role for a specific company
 */
export function isCompanyAdmin(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    const company = user.companies.find(c => c.id === companyId);
    return company?.role === 'COMPANY_ADMIN' || company?.role === 'SUPER_USER';
}

/**
 * Check if user has Store Admin role for a specific store
 */
export function isStoreAdmin(user: User | null, storeId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    const store = user.stores.find(s => s.id === storeId);
    if (!store) return false;
    
    // Check if user is company admin for the store's company
    if (isCompanyAdmin(user, store.companyId)) return true;
    
    return store.role === 'STORE_ADMIN';
}

/**
 * Check if user has at least a certain store role
 */
export function hasStoreRole(
    user: User | null, 
    storeId: string, 
    minimumRole: Store['role']
): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    const store = user.stores.find(s => s.id === storeId);
    if (!store) {
        // Check if user has all-stores access for the company
        const company = user.companies.find(c => 
            c.allStoresAccess && user.stores.some(s => s.companyId === c.id)
        );
        if (company && isCompanyAdmin(user, company.id)) return true;
        return false;
    }
    
    // Check if user is company admin for the store's company
    if (isCompanyAdmin(user, store.companyId)) return true;
    
    return STORE_ROLE_HIERARCHY[store.role] >= STORE_ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if user has at least a certain company role
 */
export function hasCompanyRole(
    user: User | null, 
    companyId: string, 
    minimumRole: Company['role']
): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    const company = user.companies.find(c => c.id === companyId);
    if (!company) return false;
    
    return COMPANY_ROLE_HIERARCHY[company.role] >= COMPANY_ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if a feature is enabled at the company/store level (effective features).
 * Dashboard, sync, and settings are always considered enabled.
 * When features is undefined/null (backward compat — old data without company features),
 * all features are considered enabled.
 */
export function isFeatureEnabled(features: CompanyFeatures | undefined | null, feature: Feature): boolean {
    // These features are always available (not governed by company features)
    if (feature === 'dashboard' || feature === 'sync' || feature === 'settings') return true;

    // Backward compat: if no features config exists, all features are enabled
    if (!features) return true;

    switch (feature) {
        case 'spaces': return features.spacesEnabled;
        case 'people': return features.peopleEnabled;
        case 'conference': return features.conferenceEnabled;
        case 'labels': return features.labelsEnabled;
        default: return true;
    }
}

/**
 * Get the list of Feature names that are effectively enabled for a store.
 */
export function getEffectiveEnabledFeatures(user: User | null, storeId: string): Feature[] {
    const allFeatures: Feature[] = ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels'];
    if (!user) return [];

    const store = user.stores.find(s => s.id === storeId);
    // Pass undefined when no effective features (backward compat: all enabled)
    const effectiveFeatures = store?.effectiveFeatures ?? undefined;

    return allFeatures.filter(f => isFeatureEnabled(effectiveFeatures, f));
}

/**
 * Check if user can access a specific feature in a store.
 * First checks if the feature is enabled at the company/store level,
 * then checks user-level permissions.
 */
export function canAccessFeature(
    user: User | null,
    storeId: string,
    feature: Feature
): boolean {
    if (!user) return false;

    const store = user.stores.find(s => s.id === storeId);

    // Feature toggle check applies to ALL users including platform admins.
    // This is a company/store-level feature gate, not a permission.
    if (store && !isFeatureEnabled(store.effectiveFeatures, feature)) return false;

    if (isPlatformAdmin(user)) return true;

    if (!store) {
        // Check all-stores access
        const company = user.companies.find(c => c.allStoresAccess);
        if (company && isCompanyAdmin(user, company.id)) return true;
        return false;
    }

    // Company admins have access to all enabled features
    if (isCompanyAdmin(user, store.companyId)) return true;

    // Store admins have access to all enabled features
    if (store.role === 'STORE_ADMIN') return true;

    // Check feature list for other roles
    return store.features.includes(feature);
}

/**
 * Check if user has access to any store
 */
export function hasAnyStoreAccess(user: User | null): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    return user.stores.length > 0 || user.companies.some(c => c.allStoresAccess);
}

/**
 * Check if user has access to any company
 */
export function hasAnyCompanyAccess(user: User | null): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    return user.companies.length > 0;
}

/**
 * Get all companies user has access to
 */
export function getAccessibleCompanies(user: User | null): Company[] {
    if (!user) return [];
    return user.companies;
}

/**
 * Get all stores user has access to, optionally filtered by company
 */
export function getAccessibleStores(user: User | null, companyId?: string): Store[] {
    if (!user) return [];
    
    if (companyId) {
        return user.stores.filter(s => s.companyId === companyId);
    }
    
    return user.stores;
}

/**
 * Get user's role in a specific store
 */
export function getStoreRole(user: User | null, storeId: string): Store['role'] | null {
    if (!user) return null;
    
    const store = user.stores.find(s => s.id === storeId);
    if (!store) return null;
    
    return store.role;
}

/**
 * Get user's role in a specific company
 */
export function getCompanyRole(user: User | null, companyId: string): Company['role'] | null {
    if (!user) return null;
    
    const company = user.companies.find(c => c.id === companyId);
    if (!company) return null;
    
    return company.role;
}

/**
 * Check if user can manage users (create/edit/delete)
 */
export function canManageUsers(user: User | null, targetCompanyId?: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    if (targetCompanyId) {
        return isCompanyAdmin(user, targetCompanyId);
    }
    
    // Can manage users in any company they admin (COMPANY_ADMIN or SUPER_USER)
    return user.companies.some(c => c.role === 'COMPANY_ADMIN' || c.role === 'SUPER_USER');
}

/**
 * Check if user can manage companies
 */
export function canManageCompanies(user: User | null): boolean {
    return isPlatformAdmin(user);
}

/**
 * Check if user can manage stores in a company
 */
export function canManageStores(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    return isCompanyAdmin(user, companyId);
}

/**
 * Check if user can configure AIMS settings for a company
 */
export function canConfigureAIMS(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    return isCompanyAdmin(user, companyId);
}

/**
 * Check if user can trigger sync for a store
 */
export function canTriggerSync(user: User | null, storeId: string): boolean {
    return hasStoreRole(user, storeId, 'STORE_MANAGER');
}

/**
 * Get the highest role level for display purposes
 */
export function getHighestRole(user: User | null): string {
    if (!user) return 'Guest';
    if (isPlatformAdmin(user)) return 'App Admin';

    const hasCompanyAdmin = user.companies.some(c => c.role === 'COMPANY_ADMIN' || c.role === 'SUPER_USER');
    if (hasCompanyAdmin) return 'Company Admin';

    const hasCompanyStoreAdmin = user.companies.some(c => c.role === 'STORE_ADMIN');
    if (hasCompanyStoreAdmin) return 'Store Manager';

    const hasStoreAdmin = user.stores.some(s => s.role === 'STORE_ADMIN');
    if (hasStoreAdmin) return 'Store Manager';

    const hasStoreManager = user.stores.some(s => s.role === 'STORE_MANAGER');
    if (hasStoreManager) return 'Store Manager';

    const hasStoreEmployee = user.stores.some(s => s.role === 'STORE_EMPLOYEE');
    if (hasStoreEmployee) return 'Store Viewer';
    
    return 'Viewer';
}
