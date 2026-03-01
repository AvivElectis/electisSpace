/**
 * Permission Helpers
 *
 * Utility functions for checking user permissions, roles, and feature access.
 * These work with the User type from authService.
 *
 * Roles are identified by `roleId` (FK to the Role table: 'role-admin',
 * 'role-manager', 'role-employee', 'role-viewer').
 */

import type { User, Store, Company, CompanyFeatures } from '@shared/infrastructure/services/authService';
import type { Resource, Action } from '@features/roles/domain/types';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';

// Well-known default role IDs (created by DB seed)
export const DEFAULT_ROLE_IDS = {
    ADMIN: 'role-admin',
    MANAGER: 'role-manager',
    EMPLOYEE: 'role-employee',
    VIEWER: 'role-viewer',
} as const;

// Map well-known roleIds to their hierarchy level
const ROLE_ID_HIERARCHY: Record<string, number> = {
    'role-admin': 4,
    'role-manager': 3,
    'role-employee': 2,
    'role-viewer': 1,
};

// Legacy store role hierarchy (for backward compat with store.role enum)
const STORE_ROLE_HIERARCHY: Record<string, number> = {
    'STORE_ADMIN': 4,
    'STORE_MANAGER': 3,
    'STORE_EMPLOYEE': 2,
    'STORE_VIEWER': 1,
};

// Feature names
export type Feature = 'dashboard' | 'spaces' | 'conference' | 'people' | 'sync' | 'settings' | 'labels' | 'aims-management';

/**
 * Check if user is a Platform Admin
 */
export function isPlatformAdmin(user: User | null): boolean {
    return user?.globalRole === 'PLATFORM_ADMIN';
}

/**
 * Check if user is an App Viewer (read-only access, all CUD buttons disabled)
 */
export function isAppViewer(user: User | null): boolean {
    if (!user) return false;
    return user.isAppViewer ?? user.globalRole === 'APP_VIEWER';
}

/**
 * Check if user has Company Admin role for a specific company
 */
export function isCompanyAdmin(user: User | null, companyId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;
    
    const company = user.companies.find(c => c.id === companyId);
    return company?.roleId === DEFAULT_ROLE_IDS.ADMIN;
}

/**
 * Check if user has Store Admin role for a specific store.
 */
export function isStoreAdmin(user: User | null, storeId: string): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;

    const store = user.stores.find(s => s.id === storeId);
    if (!store) return false;

    // Check if user is company admin for the store's company
    if (isCompanyAdmin(user, store.companyId)) return true;

    return store.roleId === DEFAULT_ROLE_IDS.ADMIN;
}

/**
 * Check if user has at least a certain store role (by roleId hierarchy).
 */
export function hasStoreRole(
    user: User | null,
    storeId: string,
    minimumRole: string
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

    // Compare via roleId hierarchy (also accept legacy STORE_* names as minimumRole)
    const storeLevel = ROLE_ID_HIERARCHY[store.roleId] ?? 0;
    const requiredLevel = ROLE_ID_HIERARCHY[minimumRole] ?? STORE_ROLE_HIERARCHY[minimumRole] ?? 0;
    return storeLevel >= requiredLevel;
}

/**
 * Check if user has at least a certain company role (by roleId hierarchy)
 */
export function hasCompanyRole(
    user: User | null,
    companyId: string,
    minimumRoleId: string
): boolean {
    if (!user) return false;
    if (isPlatformAdmin(user)) return true;

    const company = user.companies.find(c => c.id === companyId);
    if (!company) return false;

    const userLevel = ROLE_ID_HIERARCHY[company.roleId] ?? 0;
    const requiredLevel = ROLE_ID_HIERARCHY[minimumRoleId] ?? 0;
    return userLevel >= requiredLevel;
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
        case 'aims-management': return features.aimsManagementEnabled;
        default: return true;
    }
}

/**
 * Get the list of Feature names that are effectively enabled for a store.
 */
export function getEffectiveEnabledFeatures(user: User | null, storeId: string): Feature[] {
    const allFeatures: Feature[] = ['dashboard', 'spaces', 'conference', 'people', 'sync', 'settings', 'labels', 'aims-management'];
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
    if (store.roleId === DEFAULT_ROLE_IDS.ADMIN) return true;

    // aims-management is a company-level feature (aimsManagementEnabled toggle).
    // Access is role-gated (manager+), not per-user feature whitelisted.
    // The company toggle was already validated by isFeatureEnabled above.
    if (feature === 'aims-management') {
        return (ROLE_ID_HIERARCHY[store.roleId] ?? 0) >= ROLE_ID_HIERARCHY[DEFAULT_ROLE_IDS.MANAGER];
    }

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
 * Get user's roleId in a specific store
 */
export function getStoreRole(user: User | null, storeId: string): string | null {
    if (!user) return null;

    const store = user.stores.find(s => s.id === storeId);
    return store?.roleId || null;
}

/**
 * Get user's roleId in a specific company
 */
export function getCompanyRole(user: User | null, companyId: string): string | null {
    if (!user) return null;

    const company = user.companies.find(c => c.id === companyId);
    return company?.roleId || null;
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
    
    // Can manage users in any company they admin
    return user.companies.some(c => c.roleId === DEFAULT_ROLE_IDS.ADMIN);
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
 * Check if user has a specific permission via their role in a store.
 * Looks up role permissions from the rolesStore cache.
 * Falls back to false if the role data isn't cached yet.
 */
export function hasRolePermission(roleId: string, resource: Resource, action: Action): boolean {
    const rolesState = useRolesStore.getState();
    const role = rolesState.roles.find(r => r.id === roleId);
    if (!role) return false;

    const resourcePerms = role.permissions[resource];
    if (!resourcePerms) return false;

    return resourcePerms.includes(action);
}

/**
 * Get the highest role level for display purposes.
 */
export function getHighestRole(user: User | null): string {
    if (!user) return 'Guest';
    if (isPlatformAdmin(user)) return 'App Admin';
    if (isAppViewer(user)) return 'App Viewer';

    const hasCompanyAdmin = user.companies.some(c => c.roleId === DEFAULT_ROLE_IDS.ADMIN);
    if (hasCompanyAdmin) return 'Company Admin';

    const hasStoreAdmin = user.stores.some(s => s.roleId === DEFAULT_ROLE_IDS.ADMIN);
    if (hasStoreAdmin) return 'Store Admin';

    const hasStoreManager = user.stores.some(s => s.roleId === DEFAULT_ROLE_IDS.MANAGER);
    if (hasStoreManager) return 'Manager';

    const hasStoreEmployee = user.stores.some(s => s.roleId === DEFAULT_ROLE_IDS.EMPLOYEE);
    if (hasStoreEmployee) return 'Employee';

    return 'Viewer';
}

/**
 * Get the roleId for a user's store, falling back to null.
 */
export function getStoreRoleId(user: User | null, storeId: string): string | null {
    if (!user) return null;
    const store = user.stores.find(s => s.id === storeId);
    return store?.roleId || null;
}

/**
 * Check if the current user can elevate/change the target user's app role.
 * Only platform admins can change app roles. They cannot change their own role
 * or elevate users who are already PLATFORM_ADMIN.
 */
export function canElevateUser(currentUser: User | null, targetUser: { id: string; globalRole?: string | null; companies?: Array<{ id: string }> }): boolean {
    if (!currentUser) return false;
    if (!isPlatformAdmin(currentUser)) return false;
    if (targetUser.id === currentUser.id) return false;
    if (targetUser.globalRole === 'PLATFORM_ADMIN') return false;

    return true;
}

/**
 * Get the app roles the current user is allowed to assign.
 * Only platform admins can assign app roles.
 */
export function getAllowedAppRoles(currentUser: User | null): Array<'PLATFORM_ADMIN' | 'APP_VIEWER' | 'USER'> {
    if (!currentUser) return [];
    if (isPlatformAdmin(currentUser)) return ['PLATFORM_ADMIN', 'APP_VIEWER', 'USER'];
    return [];
}

/**
 * Get allowed company roles based on the target user's app role.
 * - If target is APP_VIEWER: only role-viewer
 * - Otherwise: normal role filtering
 */
export function getAllowedCompanyRoles(targetGlobalRole: string | null | undefined): string[] {
    if (targetGlobalRole === 'APP_VIEWER') return [DEFAULT_ROLE_IDS.VIEWER];
    return [DEFAULT_ROLE_IDS.ADMIN, DEFAULT_ROLE_IDS.MANAGER, DEFAULT_ROLE_IDS.EMPLOYEE, DEFAULT_ROLE_IDS.VIEWER];
}

/**
 * Get allowed store roles based on the target user's app role.
 * - If target is APP_VIEWER: only role-viewer
 * - Otherwise: all roles
 */
export function getAllowedStoreRoles(targetGlobalRole: string | null | undefined): string[] {
    if (targetGlobalRole === 'APP_VIEWER') return [DEFAULT_ROLE_IDS.VIEWER];
    return [DEFAULT_ROLE_IDS.ADMIN, DEFAULT_ROLE_IDS.MANAGER, DEFAULT_ROLE_IDS.EMPLOYEE, DEFAULT_ROLE_IDS.VIEWER];
}

/**
 * Check if a user can perform a specific action on a resource in a store.
 * App Viewers are always blocked from mutating actions.
 * Platform admins and company admins bypass permission checks.
 * Otherwise checks the role's permission matrix.
 */
export function canPerformAction(
    user: User | null,
    storeId: string,
    resource: Resource,
    action: Action,
): boolean {
    if (!user) return false;

    // App Viewers can only view
    if (isAppViewer(user) && action !== 'view' && action !== 'read') return false;

    if (isPlatformAdmin(user)) return true;

    const store = user.stores.find(s => s.id === storeId);
    if (!store) return false;

    // Company admins have full permissions
    if (isCompanyAdmin(user, store.companyId)) return true;

    // Check role permissions
    if (store.roleId) {
        return hasRolePermission(store.roleId, resource, action);
    }

    return false;
}
