import * as repo from './repository.js';

// ─── Platform Defaults ──────────────────────────────

export interface ResolvedRules {
    maxBookingDurationMinutes: number;
    minBookingDurationMinutes: number;
    checkInWindowMinutes: number;
    advanceBookingDays: number;
    maxConcurrentBookings: number;
    autoReleaseOnNoShow: boolean;
    bookingGranularityMinutes: number;
}

const PLATFORM_DEFAULTS: ResolvedRules = {
    maxBookingDurationMinutes: 600,  // 10 hours
    minBookingDurationMinutes: 30,
    checkInWindowMinutes: 15,
    advanceBookingDays: 7,
    maxConcurrentBookings: 1,
    autoReleaseOnNoShow: true,
    bookingGranularityMinutes: 30,
};

// Rule type → resolved field mapping
const RULE_TYPE_MAP: Record<string, keyof ResolvedRules> = {
    MAX_DURATION: 'maxBookingDurationMinutes',
    MAX_ADVANCE_BOOKING: 'advanceBookingDays',
    MAX_CONCURRENT: 'maxConcurrentBookings',
    CHECK_IN_WINDOW: 'checkInWindowMinutes',
    AUTO_RELEASE: 'autoReleaseOnNoShow',
};

// ─── Rule Resolution ─────────────────────────────────

/**
 * Resolve effective booking rules for a given branch and optional space type.
 * Cascade: Space-level → Branch-level → Company-level → Platform defaults.
 */
export const resolveRules = async (
    companyId: string,
    branchId: string,
    spaceType?: string,
): Promise<ResolvedRules> => {
    const rules = await repo.findRulesByCompany(companyId);

    // Start with defaults
    const resolved = { ...PLATFORM_DEFAULTS };

    // Apply rules in priority order (lowest first, highest overrides)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
        // Check if rule applies to this branch
        if (!ruleAppliesToBranch(rule, branchId)) continue;

        // Check if rule applies to this space type
        if (spaceType && rule.targetSpaceTypes.length > 0) {
            if (!rule.targetSpaceTypes.includes(spaceType)) continue;
        }

        // Apply the rule value
        const config = rule.config as Record<string, unknown>;
        const field = RULE_TYPE_MAP[rule.ruleType];

        if (field && config.value !== undefined) {
            (resolved as any)[field] = config.value;
        }
    }

    return resolved;
};

/**
 * Get default rules (no company-specific overrides).
 */
export const getDefaults = (): ResolvedRules => ({ ...PLATFORM_DEFAULTS });

// ─── Helpers ─────────────────────────────────────────

const ruleAppliesToBranch = (
    rule: { applyTo: string; targetBranchIds: string[] },
    branchId: string,
): boolean => {
    switch (rule.applyTo) {
        case 'ALL_BRANCHES':
            return true;
        case 'SPECIFIC_BRANCHES':
            return rule.targetBranchIds.includes(branchId);
        default:
            return true;
    }
};
