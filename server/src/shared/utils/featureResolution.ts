/**
 * Feature Resolution Utility
 *
 * Resolves effective features and space type using the override chain:
 * Store override (if set) > Company default
 */

// ======================
// Types
// ======================

export interface CompanyFeatures {
    spacesEnabled: boolean;
    peopleEnabled: boolean;
    conferenceEnabled: boolean;
    simpleConferenceMode: boolean;
    labelsEnabled: boolean;
}

export type SpaceType = 'office' | 'room' | 'chair' | 'person-tag';

export const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
    spacesEnabled: false,
    peopleEnabled: true,
    conferenceEnabled: true,
    simpleConferenceMode: false,
    labelsEnabled: false,
};

export const DEFAULT_SPACE_TYPE: SpaceType = 'office';

// ======================
// Resolution Functions
// ======================

/**
 * Resolve effective features: store override wins if present, otherwise company default.
 */
export function resolveEffectiveFeatures(
    companyFeatures: CompanyFeatures | undefined | null,
    storeFeatures?: CompanyFeatures | undefined | null,
): CompanyFeatures {
    if (storeFeatures) return storeFeatures;
    return companyFeatures ?? ALL_FEATURES_ENABLED;
}

/**
 * Resolve effective space type: store override wins if present, otherwise company default.
 */
export function resolveEffectiveSpaceType(
    companySpaceType: SpaceType | undefined | null,
    storeSpaceType?: SpaceType | undefined | null,
): SpaceType {
    if (storeSpaceType) return storeSpaceType;
    return companySpaceType ?? DEFAULT_SPACE_TYPE;
}

/** All features enabled — used for backward compatibility when no features are configured */
export const ALL_FEATURES_ENABLED: CompanyFeatures = {
    spacesEnabled: true,
    peopleEnabled: true,
    conferenceEnabled: true,
    simpleConferenceMode: false,
    labelsEnabled: true,
};

/**
 * Extract CompanyFeatures from a settings JSON object.
 * Returns the companyFeatures sub-object, or ALL_FEATURES_ENABLED for backward compat
 * (old companies without feature config should have all features enabled).
 */
export function extractCompanyFeatures(settings: Record<string, unknown> | null | undefined): CompanyFeatures {
    if (!settings || !settings.companyFeatures) return ALL_FEATURES_ENABLED;
    const f = settings.companyFeatures as Partial<CompanyFeatures>;
    return {
        spacesEnabled: f.spacesEnabled ?? DEFAULT_COMPANY_FEATURES.spacesEnabled,
        peopleEnabled: f.peopleEnabled ?? DEFAULT_COMPANY_FEATURES.peopleEnabled,
        conferenceEnabled: f.conferenceEnabled ?? DEFAULT_COMPANY_FEATURES.conferenceEnabled,
        simpleConferenceMode: f.simpleConferenceMode ?? DEFAULT_COMPANY_FEATURES.simpleConferenceMode,
        labelsEnabled: f.labelsEnabled ?? DEFAULT_COMPANY_FEATURES.labelsEnabled,
    };
}

/**
 * Extract spaceType from a settings JSON object.
 */
export function extractSpaceType(settings: Record<string, unknown> | null | undefined): SpaceType {
    if (!settings || !settings.spaceType) return DEFAULT_SPACE_TYPE;
    return settings.spaceType as SpaceType;
}

/**
 * Extract store-level feature overrides from a store's settings JSON.
 * Returns null if no override is set (meaning inherit from company).
 */
export function extractStoreFeatures(settings: Record<string, unknown> | null | undefined): CompanyFeatures | null {
    if (!settings || !settings.storeFeatures) return null;
    return settings.storeFeatures as CompanyFeatures;
}

/**
 * Extract store-level space type override from a store's settings JSON.
 * Returns null if no override is set (meaning inherit from company).
 */
export function extractStoreSpaceType(settings: Record<string, unknown> | null | undefined): SpaceType | null {
    if (!settings || !settings.storeSpaceType) return null;
    return settings.storeSpaceType as SpaceType;
}
