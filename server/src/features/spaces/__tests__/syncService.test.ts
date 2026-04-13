import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Top-level mock function handles
// ============================================================================

const mockPullArticleInfo = vi.fn();
const mockSyncQueueFindMany = vi.fn();
const mockSpaceFindMany = vi.fn();
const mockSpaceCreate = vi.fn();
const mockSpaceUpdate = vi.fn();
const mockStoreFindUnique = vi.fn();
const mockStoreUpdate = vi.fn();
const mockResolveEffectiveFeatures = vi.fn();
const mockExtractCompanyFeatures = vi.fn();
const mockExtractStoreFeatures = vi.fn();
const mockUpsertConference = vi.fn();

// ============================================================================
// Mocks (must appear before any imports that consume them)
// ============================================================================

vi.mock('../../../config/index.js', () => ({
    prisma: {
        syncQueueItem: { findMany: (...a: unknown[]) => mockSyncQueueFindMany(...a) },
        space: {
            findMany: (...a: unknown[]) => mockSpaceFindMany(...a),
            create: (...a: unknown[]) => mockSpaceCreate(...a),
            update: (...a: unknown[]) => mockSpaceUpdate(...a),
        },
        store: {
            findUnique: (...a: unknown[]) => mockStoreFindUnique(...a),
            update: (...a: unknown[]) => mockStoreUpdate(...a),
        },
    },
}));

vi.mock('../../../shared/infrastructure/services/aimsGateway.js', () => ({
    aimsGateway: { pullArticleInfo: (...a: unknown[]) => mockPullArticleInfo(...a) },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../shared/utils/featureResolution.js', () => ({
    extractCompanyFeatures: (...a: unknown[]) => mockExtractCompanyFeatures(...a),
    extractStoreFeatures: (...a: unknown[]) => mockExtractStoreFeatures(...a),
    resolveEffectiveFeatures: (...a: unknown[]) => mockResolveEffectiveFeatures(...a),
}));

vi.mock('../../conference/syncService.js', () => ({
    conferenceSyncService: {
        upsertManyFromArticles: (...a: unknown[]) => mockUpsertConference(...a),
    },
}));

// Must also mock the sync queue processor (imported but not exercised in pull tests)
vi.mock('../../../shared/infrastructure/jobs/SyncQueueProcessor.js', () => ({
    syncQueueProcessor: { processPendingItems: vi.fn() },
}));

// ============================================================================
// Subject under test (imported AFTER all vi.mock calls)
// ============================================================================

import { spacesSyncService } from '../syncService.js';

// ============================================================================
// Test fixtures
// ============================================================================

const mockUser = { id: 'user-1', stores: [{ id: 'store-1' }], globalRole: 'PLATFORM_ADMIN' };

beforeEach(() => {
    vi.clearAllMocks();
    // Default: no pending deletes
    mockSyncQueueFindMany.mockResolvedValue([]);
    // Default: no existing spaces
    mockSpaceFindMany.mockResolvedValue([]);
    // Default: create/update succeed
    mockSpaceCreate.mockResolvedValue({});
    mockSpaceUpdate.mockResolvedValue({});
    // Default store update succeeds
    mockStoreUpdate.mockResolvedValue({});
    // Default store with company (no settings → conference enabled via ALL_FEATURES_ENABLED fallback)
    mockStoreFindUnique.mockResolvedValue({ id: 'store-1', settings: null, company: { settings: null } });
    // Default feature resolution: extractCompanyFeatures / extractStoreFeatures return something,
    // resolveEffectiveFeatures returns conferenceEnabled: true
    mockExtractCompanyFeatures.mockReturnValue({});
    mockExtractStoreFeatures.mockReturnValue(null);
    mockResolveEffectiveFeatures.mockReturnValue({ conferenceEnabled: true });
    // Default conference upsert
    mockUpsertConference.mockResolvedValue({ created: 0, updated: 0, unchanged: 0, skipped: 0 });
});

// ============================================================================
// Tests
// ============================================================================

describe('spacesSyncService.pullFromAims', () => {
    it('routes C-prefixed articles to conferenceSyncService when conference feature enabled', async () => {
        mockPullArticleInfo.mockResolvedValue([
            { articleId: '101', data: { name: 'Office A' } },
            { articleId: 'C201', data: { name: 'Boardroom' } },
            { articleId: '102', data: { name: 'Office B' } },
        ]);
        mockStoreFindUnique.mockResolvedValue({ id: 'store-1', settings: null, company: { settings: null } });
        mockResolveEffectiveFeatures.mockReturnValue({ conferenceEnabled: true });
        mockUpsertConference.mockResolvedValue({ created: 1, updated: 0, unchanged: 0, skipped: 0 });

        const result = await spacesSyncService.pullFromAims('store-1', mockUser);

        expect(mockSpaceCreate).toHaveBeenCalledTimes(2); // only the non-C ones
        expect(mockUpsertConference).toHaveBeenCalledWith(
            [expect.objectContaining({ articleId: 'C201' })],
            'store-1',
        );
        expect(result.conference).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
    });

    it('skips C-prefixed articles entirely when conference feature is disabled', async () => {
        mockPullArticleInfo.mockResolvedValue([
            { articleId: '101', data: { name: 'Office A' } },
            { articleId: 'C201', data: { name: 'Boardroom' } },
        ]);
        mockStoreFindUnique.mockResolvedValue({ id: 'store-1', settings: null, company: { settings: null } });
        mockResolveEffectiveFeatures.mockReturnValue({ conferenceEnabled: false });

        const result = await spacesSyncService.pullFromAims('store-1', mockUser);

        expect(mockSpaceCreate).toHaveBeenCalledTimes(1); // only the non-C
        expect(mockUpsertConference).not.toHaveBeenCalled();
        expect(result.conference).toBeUndefined();
    });

    it('skips space upsert for externalIds with non-terminal DELETE in the sync queue', async () => {
        mockPullArticleInfo.mockResolvedValue([
            { articleId: '101', data: { name: 'A' } },
            { articleId: '102', data: { name: 'B' } },
        ]);
        mockSyncQueueFindMany.mockResolvedValue([
            { payload: { externalId: '101' } },
        ]);
        mockStoreFindUnique.mockResolvedValue({ id: 'store-1', settings: null, company: { settings: null } });
        mockResolveEffectiveFeatures.mockReturnValue({ conferenceEnabled: true });

        const result = await spacesSyncService.pullFromAims('store-1', mockUser);

        expect(mockSpaceCreate).toHaveBeenCalledTimes(1);
        expect(mockSpaceCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ externalId: '102' }) }),
        );
    });

    it('forwards single-char articleId "C" to conferenceSyncService when conference feature enabled', async () => {
        mockPullArticleInfo.mockResolvedValue([{ articleId: 'C', data: {} }]);
        mockStoreFindUnique.mockResolvedValue({ id: 'store-1', settings: null, company: { settings: null } });
        mockResolveEffectiveFeatures.mockReturnValue({ conferenceEnabled: true });
        mockUpsertConference.mockResolvedValue({ created: 0, updated: 0, unchanged: 0, skipped: 1 });

        await spacesSyncService.pullFromAims('store-1', mockUser);

        expect(mockUpsertConference).toHaveBeenCalledWith(
            [{ articleId: 'C', data: {} }],
            'store-1',
        );
        expect(mockSpaceCreate).not.toHaveBeenCalled();
    });
});
