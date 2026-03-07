/**
 * Compass Booking Rule Engine - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock repository (rule engine uses repo.findRulesByCompany)
vi.mock('../repository.js', () => ({
    findRulesByCompany: vi.fn(),
}));

import * as repo from '../repository.js';
import { resolveRules, getDefaults, type ResolvedRules } from '../ruleEngine.js';

const mockFindRules = repo.findRulesByCompany as ReturnType<typeof vi.fn>;

// ─── Platform Defaults ──────────────────────────────

const EXPECTED_DEFAULTS: ResolvedRules = {
    maxBookingDurationMinutes: 600,
    minBookingDurationMinutes: 30,
    checkInWindowMinutes: 15,
    advanceBookingDays: 7,
    maxConcurrentBookings: 1,
    autoReleaseOnNoShow: true,
    bookingGranularityMinutes: 30,
    enforceWorkingHours: false,
};

// ─── getDefaults ────────────────────────────────────

describe('getDefaults', () => {
    it('should return platform defaults', () => {
        const defaults = getDefaults();
        expect(defaults).toEqual(EXPECTED_DEFAULTS);
    });

    it('should return a new object each call (no shared mutation)', () => {
        const a = getDefaults();
        const b = getDefaults();
        expect(a).not.toBe(b);
        expect(a).toEqual(b);
    });
});

// ─── resolveRules ───────────────────────────────────

describe('resolveRules', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return platform defaults when no rules exist', async () => {
        mockFindRules.mockResolvedValue([]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result).toEqual(EXPECTED_DEFAULTS);
        expect(mockFindRules).toHaveBeenCalledWith('company-1');
    });

    it('should apply a single company-wide rule', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_DURATION',
                config: { value: 120 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxBookingDurationMinutes).toBe(120);
        // Other defaults unchanged
        expect(result.checkInWindowMinutes).toBe(15);
        expect(result.maxConcurrentBookings).toBe(1);
    });

    it('should apply multiple rules of different types', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_DURATION',
                config: { value: 240 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 3 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
            {
                ruleType: 'CHECK_IN_WINDOW',
                config: { value: 30 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxBookingDurationMinutes).toBe(240);
        expect(result.maxConcurrentBookings).toBe(3);
        expect(result.checkInWindowMinutes).toBe(30);
    });

    it('should respect priority ordering (higher priority wins)', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 5 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 10, // higher priority, applied last (overrides)
            },
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 2 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1, // lower priority, applied first
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxConcurrentBookings).toBe(5);
    });

    it('should filter rules by SELECTED_BRANCHES', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_DURATION',
                config: { value: 120 },
                applyTo: 'SELECTED_BRANCHES',
                targetBranchIds: ['branch-2', 'branch-3'],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        // branch-1 is NOT in the target list
        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxBookingDurationMinutes).toBe(600); // default unchanged
    });

    it('should apply rule when branch is in SELECTED_BRANCHES list', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_DURATION',
                config: { value: 120 },
                applyTo: 'SELECTED_BRANCHES',
                targetBranchIds: ['branch-1', 'branch-2'],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxBookingDurationMinutes).toBe(120);
    });

    it('should filter rules by space type when provided', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 3 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: ['DESK'], // only applies to DESK
                priority: 1,
            },
        ]);

        // Querying for MEETING_ROOM, rule should not apply
        const result = await resolveRules('company-1', 'branch-1', 'MEETING_ROOM');

        expect(result.maxConcurrentBookings).toBe(1); // default
    });

    it('should apply rule when space type matches', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 3 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: ['DESK'],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1', 'DESK');

        expect(result.maxConcurrentBookings).toBe(3);
    });

    it('should skip space-type-scoped rules when no spaceType is provided', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 3 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: ['DESK'],
                priority: 1,
            },
        ]);

        // No spaceType provided — rule should be skipped
        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxConcurrentBookings).toBe(1); // default
    });

    it('should apply rule with empty targetSpaceTypes to all space types', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 5 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [], // empty = applies to all
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1', 'MEETING_ROOM');

        expect(result.maxConcurrentBookings).toBe(5);
    });

    it('should handle AUTO_RELEASE rule type', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'AUTO_RELEASE',
                config: { value: false },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.autoReleaseOnNoShow).toBe(false);
    });

    it('should handle MAX_ADVANCE_BOOKING rule type', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_ADVANCE_BOOKING',
                config: { value: 14 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.advanceBookingDays).toBe(14);
    });

    it('should ignore rules with unknown ruleType', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'UNKNOWN_TYPE',
                config: { value: 999 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result).toEqual(EXPECTED_DEFAULTS);
    });

    it('should ignore rules with missing config value', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_DURATION',
                config: {}, // no 'value' key
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxBookingDurationMinutes).toBe(600); // unchanged
    });

    it('should handle cascading priority: branch-specific overrides company-wide', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 2 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1, // company-wide base
            },
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 5 },
                applyTo: 'SELECTED_BRANCHES',
                targetBranchIds: ['branch-1'],
                targetSpaceTypes: [],
                priority: 10, // branch-specific override
            },
        ]);

        const result = await resolveRules('company-1', 'branch-1');

        expect(result.maxConcurrentBookings).toBe(5);
    });

    it('should not apply branch-specific override to other branches', async () => {
        mockFindRules.mockResolvedValue([
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 2 },
                applyTo: 'ALL_BRANCHES',
                targetBranchIds: [],
                targetSpaceTypes: [],
                priority: 1,
            },
            {
                ruleType: 'MAX_CONCURRENT',
                config: { value: 5 },
                applyTo: 'SELECTED_BRANCHES',
                targetBranchIds: ['branch-1'],
                targetSpaceTypes: [],
                priority: 10,
            },
        ]);

        const result = await resolveRules('company-1', 'branch-99');

        expect(result.maxConcurrentBookings).toBe(2); // only the company-wide rule applies
    });

    it('should resolve enforceWorkingHours when BLOCKED_TIMES rule is set', async () => {
        mockFindRules.mockResolvedValue([{
            ruleType: 'BLOCKED_TIMES',
            config: { value: true },
            applyTo: 'ALL_BRANCHES',
            targetBranchIds: [],
            targetSpaceTypes: [],
            priority: 1,
        }]);

        const result = await resolveRules('company-1', 'branch-1');
        expect(result.enforceWorkingHours).toBe(true);
    });
});
