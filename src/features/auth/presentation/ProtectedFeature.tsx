/**
 * ProtectedFeature Component
 * 
 * Conditionally renders children based on user permissions.
 * Used to hide UI elements the user doesn't have access to.
 */

import { type ReactNode } from 'react';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import type { Feature } from '@features/auth/application/permissionHelpers';
import type { Store, Company } from '@shared/infrastructure/services/authService';

interface ProtectedFeatureProps {
    children: ReactNode;
    
    /** Fallback to render when access denied (default: null) */
    fallback?: ReactNode;
    
    // Permission checks (any matching condition grants access)
    
    /** Require platform admin role */
    requirePlatformAdmin?: boolean;
    
    /** Require company admin for active company */
    requireCompanyAdmin?: boolean;
    
    /** Require store admin for active store */
    requireStoreAdmin?: boolean;
    
    /** Require specific feature access */
    feature?: Feature;
    
    /** Require minimum store role */
    minimumStoreRole?: Store['role'];
    
    /** Require minimum company role */
    minimumCompanyRole?: Company['role'];
    
    /** Require ability to manage users */
    requireManageUsers?: boolean;
    
    /** Require ability to manage companies */
    requireManageCompanies?: boolean;
    
    /** Require ability to manage stores */
    requireManageStores?: boolean;
    
    /** Require ability to configure AIMS */
    requireConfigureAIMS?: boolean;
    
    /** Require ability to trigger sync */
    requireTriggerSync?: boolean;
    
    /** Custom permission check function */
    check?: () => boolean;
    
    /** If true, ALL conditions must pass (default: any passing grants access) */
    requireAll?: boolean;
}

/**
 * Component that conditionally renders based on user permissions
 * 
 * @example
 * // Show only to platform admins
 * <ProtectedFeature requirePlatformAdmin>
 *   <AdminPanel />
 * </ProtectedFeature>
 * 
 * @example
 * // Show only if user can access spaces feature
 * <ProtectedFeature feature="spaces">
 *   <SpacesButton />
 * </ProtectedFeature>
 * 
 * @example
 * // Show with fallback
 * <ProtectedFeature requireCompanyAdmin fallback={<UpgradePrompt />}>
 *   <AdvancedSettings />
 * </ProtectedFeature>
 * 
 * @example
 * // Require multiple conditions
 * <ProtectedFeature requireStoreAdmin feature="sync" requireAll>
 *   <SyncControls />
 * </ProtectedFeature>
 */
export function ProtectedFeature({
    children,
    fallback = null,
    requirePlatformAdmin,
    requireCompanyAdmin,
    requireStoreAdmin,
    feature,
    minimumStoreRole,
    minimumCompanyRole,
    requireManageUsers,
    requireManageCompanies,
    requireManageStores,
    requireConfigureAIMS,
    requireTriggerSync,
    check,
    requireAll = false,
}: ProtectedFeatureProps) {
    const {
        isPlatformAdmin,
        isCompanyAdmin,
        isStoreAdmin,
        canAccessFeature,
        hasStoreRole,
        hasCompanyRole,
        canManageUsers,
        canManageCompanies,
        canManageStores,
        canConfigureAIMS,
        canTriggerSync,
    } = useAuthContext();

    // Collect all permission check results
    const checks: boolean[] = [];

    if (requirePlatformAdmin !== undefined) {
        checks.push(isPlatformAdmin);
    }

    if (requireCompanyAdmin !== undefined) {
        checks.push(isCompanyAdmin);
    }

    if (requireStoreAdmin !== undefined) {
        checks.push(isStoreAdmin);
    }

    if (feature !== undefined) {
        checks.push(canAccessFeature(feature));
    }

    if (minimumStoreRole !== undefined) {
        checks.push(hasStoreRole(minimumStoreRole));
    }

    if (minimumCompanyRole !== undefined) {
        checks.push(hasCompanyRole(minimumCompanyRole));
    }

    if (requireManageUsers !== undefined) {
        checks.push(canManageUsers);
    }

    if (requireManageCompanies !== undefined) {
        checks.push(canManageCompanies);
    }

    if (requireManageStores !== undefined) {
        checks.push(canManageStores);
    }

    if (requireConfigureAIMS !== undefined) {
        checks.push(canConfigureAIMS);
    }

    if (requireTriggerSync !== undefined) {
        checks.push(canTriggerSync);
    }

    if (check !== undefined) {
        checks.push(check());
    }

    // If no checks specified, allow access
    if (checks.length === 0) {
        return <>{children}</>;
    }

    // Determine if access is granted
    const hasAccess = requireAll
        ? checks.every(Boolean) // All must pass
        : checks.some(Boolean); // Any passing grants access

    if (hasAccess) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}

/**
 * Hook version for programmatic permission checking
 */
export function usePermissionCheck(options: Omit<ProtectedFeatureProps, 'children' | 'fallback'>): boolean {
    const {
        isPlatformAdmin,
        isCompanyAdmin,
        isStoreAdmin,
        canAccessFeature,
        hasStoreRole,
        hasCompanyRole,
        canManageUsers,
        canManageCompanies,
        canManageStores,
        canConfigureAIMS,
        canTriggerSync,
    } = useAuthContext();

    const {
        requirePlatformAdmin,
        requireCompanyAdmin,
        requireStoreAdmin,
        feature,
        minimumStoreRole,
        minimumCompanyRole,
        requireManageUsers,
        requireManageCompanies,
        requireManageStores,
        requireConfigureAIMS,
        requireTriggerSync,
        check,
        requireAll = false,
    } = options;

    const checks: boolean[] = [];

    if (requirePlatformAdmin !== undefined) checks.push(isPlatformAdmin);
    if (requireCompanyAdmin !== undefined) checks.push(isCompanyAdmin);
    if (requireStoreAdmin !== undefined) checks.push(isStoreAdmin);
    if (feature !== undefined) checks.push(canAccessFeature(feature));
    if (minimumStoreRole !== undefined) checks.push(hasStoreRole(minimumStoreRole));
    if (minimumCompanyRole !== undefined) checks.push(hasCompanyRole(minimumCompanyRole));
    if (requireManageUsers !== undefined) checks.push(canManageUsers);
    if (requireManageCompanies !== undefined) checks.push(canManageCompanies);
    if (requireManageStores !== undefined) checks.push(canManageStores);
    if (requireConfigureAIMS !== undefined) checks.push(canConfigureAIMS);
    if (requireTriggerSync !== undefined) checks.push(canTriggerSync);
    if (check !== undefined) checks.push(check());

    if (checks.length === 0) return true;

    return requireAll ? checks.every(Boolean) : checks.some(Boolean);
}

export default ProtectedFeature;
