/**
 * Labels Store - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@features/settings/infrastructure/settingsStore', () => ({
    useSettingsStore: { getState: vi.fn(() => ({ settings: { workingMode: 'SOLUM_API', solumApiUrl: 'https://api.test', solumCompanyCode: 'T', solumStoreCode: 'S1', solumAccessToken: 'tok' } })) },
}));
vi.mock('@shared/infrastructure/services/aimsTokenManager', () => ({ withAimsTokenRefresh: vi.fn((fn: Function) => fn()) }));
vi.mock('@shared/infrastructure/services/solum/labelsService', () => ({
    getAllLabels: vi.fn().mockResolvedValue([]),
    getLabelImages: vi.fn().mockResolvedValue(null),
    linkLabel: vi.fn().mockResolvedValue(undefined),
    unlinkLabel: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@shared/infrastructure/services/labelsApi', () => ({
    labelsApi: {
        fetchLabels: vi.fn().mockResolvedValue([]),
        linkLabel: vi.fn(), unlinkLabel: vi.fn(), blinkLabel: vi.fn(),
        getLabelImages: vi.fn(),
        checkAimsStatus: vi.fn().mockResolvedValue({ configured: true, connected: true }),
    },
}));
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useLabelsStore } from '../infrastructure/labelsStore';

describe('LabelsStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const s = useLabelsStore.getState();
        s.clearError();
        s.setSearchQuery('');
        s.setFilterLinkedOnly(false);
    });

    it('should have empty labels initially', () => { expect(useLabelsStore.getState().labels).toEqual([]); });
    it('should not be loading', () => { expect(useLabelsStore.getState().isLoading).toBe(false); });
    it('should update search query', () => {
        useLabelsStore.getState().setSearchQuery('ABC');
        expect(useLabelsStore.getState().searchQuery).toBe('ABC');
    });
    it('should update filter', () => {
        useLabelsStore.getState().setFilterLinkedOnly(true);
        expect(useLabelsStore.getState().filterLinkedOnly).toBe(true);
    });
    it('should clear images', () => {
        useLabelsStore.getState().clearLabelImages();
        expect(useLabelsStore.getState().selectedLabelImages).toBeNull();
    });
    it('should update scanner state', () => {
        useLabelsStore.getState().setScannerState({ isActive: true });
        expect(useLabelsStore.getState().scanner.isActive).toBe(true);
    });
});
