/**
 * useAuthContext Hook
 * 
 * Enhanced authentication hook that provides:
 * - Current user and authentication state
 * - Active company/store context
 * - Permission checking utilities
 * - Context switching methods
 */

import { useMemo } from 'react';
import { useAuthStore } from '../infrastructure/authStore';
import {
    isPlatformAdmin,
    isCompanyAdmin,
    isStoreAdmin,
    hasStoreRole,
    hasCompanyRole,
    canAccessFeature,
    getEffectiveEnabledFeatures,
    getAccessibleCompanies,
    getAccessibleStores,
    canManageUsers,
    canManageCompanies,
    canManageStores,
    canConfigureAIMS,
    canTriggerSync,
    getHighestRole,
    type Feature,
} from './permissionHelpers';
import type { User, Store, Company, CompanyFeatures } from '@shared/infrastructure/services/authService';
import { DEFAULT_COMPANY_FEATURES } from '@shared/infrastructure/services/authService';

export interface AuthContext {
    // User state
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Active context
    activeCompanyId: string | null;
    activeStoreId: string | null;
    activeCompany: Company | null;
    activeStore: Store | null;

    // Accessible entities
    companies: Company[];
    stores: Store[];
    storesInActiveCompany: Store[];

    // Role checks
    isPlatformAdmin: boolean;
    isCompanyAdmin: boolean; // For active company
    isStoreAdmin: boolean; // For active store
    highestRole: string;

    // Permission checks (bound to active context)
    canAccessFeature: (feature: Feature) => boolean;
    hasStoreRole: (minimumRole: Store['role']) => boolean;
    hasCompanyRole: (minimumRole: Company['role']) => boolean;

    // Company/store-level feature config
    activeCompanyFeatures: CompanyFeatures | null;
    activeStoreEffectiveFeatures: CompanyFeatures | null;
    effectiveEnabledFeatures: Feature[];

    // Management permissions
    canManageUsers: boolean;
    canManageCompanies: boolean;
    canManageStores: boolean;
    canConfigureAIMS: boolean;
    canTriggerSync: boolean;

    // Context switching
    setActiveCompany: (companyId: string | null) => Promise<void>;
    setActiveStore: (storeId: string | null) => Promise<void>;
    setActiveContext: (companyId: string | null, storeId: string | null) => Promise<void>;

    // Auth actions
    logout: () => Promise<void>;
    clearError: () => void;
}

/**
 * Hook that provides comprehensive auth context with permissions
 */
export function useAuthContext(): AuthContext {
    const {
        user,
        isAuthenticated,
        isLoading,
        error,
        activeCompanyId,
        activeStoreId,
        setActiveCompany,
        setActiveStore,
        setActiveContext,
        logout,
        clearError,
    } = useAuthStore();

    // Derive active company and store objects
    const activeCompany = useMemo(() => {
        if (!user || !activeCompanyId) return null;
        return user.companies.find(c => c.id === activeCompanyId) || null;
    }, [user, activeCompanyId]);

    const activeStore = useMemo(() => {
        if (!user || !activeStoreId) return null;
        return user.stores.find(s => s.id === activeStoreId) || null;
    }, [user, activeStoreId]);

    // Get accessible companies and stores
    const companies = useMemo(() => getAccessibleCompanies(user), [user]);
    const stores = useMemo(() => getAccessibleStores(user), [user]);
    const storesInActiveCompany = useMemo(
        () => getAccessibleStores(user, activeCompanyId || undefined),
        [user, activeCompanyId]
    );

    // Role checks
    const isPlatformAdminFlag = useMemo(() => isPlatformAdmin(user), [user]);
    const isCompanyAdminFlag = useMemo(
        () => activeCompanyId ? isCompanyAdmin(user, activeCompanyId) : false,
        [user, activeCompanyId]
    );
    const isStoreAdminFlag = useMemo(
        () => activeStoreId ? isStoreAdmin(user, activeStoreId) : false,
        [user, activeStoreId]
    );
    const highestRole = useMemo(() => getHighestRole(user), [user]);

    // Permission check functions bound to active context
    const canAccessFeatureFn = useMemo(() => {
        return (feature: Feature) => {
            if (!activeStoreId) return isPlatformAdminFlag;
            return canAccessFeature(user, activeStoreId, feature);
        };
    }, [user, activeStoreId, isPlatformAdminFlag]);

    const hasStoreRoleFn = useMemo(() => {
        return (minimumRole: Store['role']) => {
            if (!activeStoreId) return isPlatformAdminFlag;
            return hasStoreRole(user, activeStoreId, minimumRole);
        };
    }, [user, activeStoreId, isPlatformAdminFlag]);

    const hasCompanyRoleFn = useMemo(() => {
        return (minimumRole: Company['role']) => {
            if (!activeCompanyId) return isPlatformAdminFlag;
            return hasCompanyRole(user, activeCompanyId, minimumRole);
        };
    }, [user, activeCompanyId, isPlatformAdminFlag]);

    // Company/store-level feature config
    const activeCompanyFeatures = useMemo<CompanyFeatures | null>(() => {
        if (!activeCompany) return null;
        return activeCompany.companyFeatures ?? DEFAULT_COMPANY_FEATURES;
    }, [activeCompany]);

    const activeStoreEffectiveFeatures = useMemo<CompanyFeatures | null>(() => {
        if (!activeStore) return null;
        return activeStore.effectiveFeatures ?? DEFAULT_COMPANY_FEATURES;
    }, [activeStore]);

    const effectiveEnabledFeatures = useMemo<Feature[]>(() => {
        if (!user || !activeStoreId) return [];
        return getEffectiveEnabledFeatures(user, activeStoreId);
    }, [user, activeStoreId]);

    // Management permissions
    const canManageUsersFlag = useMemo(
        () => canManageUsers(user, activeCompanyId || undefined),
        [user, activeCompanyId]
    );
    const canManageCompaniesFlag = useMemo(() => canManageCompanies(user), [user]);
    const canManageStoresFlag = useMemo(
        () => activeCompanyId ? canManageStores(user, activeCompanyId) : isPlatformAdminFlag,
        [user, activeCompanyId, isPlatformAdminFlag]
    );
    const canConfigureAIMSFlag = useMemo(
        () => activeCompanyId ? canConfigureAIMS(user, activeCompanyId) : isPlatformAdminFlag,
        [user, activeCompanyId, isPlatformAdminFlag]
    );
    const canTriggerSyncFlag = useMemo(
        () => activeStoreId ? canTriggerSync(user, activeStoreId) : false,
        [user, activeStoreId]
    );

    return {
        // User state
        user,
        isAuthenticated,
        isLoading,
        error,

        // Active context
        activeCompanyId,
        activeStoreId,
        activeCompany,
        activeStore,

        // Accessible entities
        companies,
        stores,
        storesInActiveCompany,

        // Role checks
        isPlatformAdmin: isPlatformAdminFlag,
        isCompanyAdmin: isCompanyAdminFlag,
        isStoreAdmin: isStoreAdminFlag,
        highestRole,

        // Permission checks
        canAccessFeature: canAccessFeatureFn,
        hasStoreRole: hasStoreRoleFn,
        hasCompanyRole: hasCompanyRoleFn,

        // Company/store-level feature config
        activeCompanyFeatures,
        activeStoreEffectiveFeatures,
        effectiveEnabledFeatures,

        // Management permissions
        canManageUsers: canManageUsersFlag,
        canManageCompanies: canManageCompaniesFlag,
        canManageStores: canManageStoresFlag,
        canConfigureAIMS: canConfigureAIMSFlag,
        canTriggerSync: canTriggerSyncFlag,

        // Context switching
        setActiveCompany,
        setActiveStore,
        setActiveContext,

        // Auth actions
        logout,
        clearError,
    };
}

export default useAuthContext;
