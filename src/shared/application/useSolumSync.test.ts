/**
 * useSolumSync Hook Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests the shared AIMS sync hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSolumSync } from './useSolumSync';

// Mock dependencies
vi.mock('@features/settings/infrastructure/settingsStore', () => ({
    useSettingsStore: vi.fn(),
}));

vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@shared/infrastructure/services/solumService', () => ({
    fetchArticles: vi.fn(),
}));

import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';

describe('useSolumSync Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('syncFromAims', () => {
        it('should return empty array when missing solumConfig', async () => {
            vi.mocked(useSettingsStore).mockReturnValue({
                settings: {
                    workingMode: 'SOLUM_API',
                    solumConfig: null,
                },
            } as any);

            const { result } = renderHook(() => useSolumSync());

            let articles: any[];
            await act(async () => {
                articles = await result.current.syncFromAims();
            });

            expect(articles!).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(
                'SolumSync',
                'Missing SOLUM configuration, skipping sync'
            );
        });

        it('should return empty array when missing token', async () => {
            vi.mocked(useSettingsStore).mockReturnValue({
                settings: {
                    workingMode: 'SOLUM_API',
                    solumConfig: {
                        tokens: null,
                    },
                    solumMappingConfig: {},
                },
            } as any);

            const { result } = renderHook(() => useSolumSync());

            let articles: any[];
            await act(async () => {
                articles = await result.current.syncFromAims();
            });

            expect(articles!).toEqual([]);
        });

        it('should fetch articles when properly configured', async () => {
            const mockArticles = [{ id: '1' }, { id: '2' }];
            vi.mocked(solumService.fetchArticles).mockResolvedValue(mockArticles);
            vi.mocked(useSettingsStore).mockReturnValue({
                settings: {
                    workingMode: 'SOLUM_API',
                    solumConfig: {
                        storeNumber: '01',
                        tokens: {
                            accessToken: 'test-token',
                        },
                    },
                    solumMappingConfig: {
                        uniqueIdField: 'id',
                    },
                },
            } as any);

            const { result } = renderHook(() => useSolumSync());

            let articles: any[];
            await act(async () => {
                articles = await result.current.syncFromAims();
            });

            expect(articles!).toEqual(mockArticles);
            expect(solumService.fetchArticles).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'SolumSync',
                'Articles fetched from AIMS',
                { count: 2 }
            );
        });

        it('should throw error when fetch fails', async () => {
            const testError = new Error('Network error');
            vi.mocked(solumService.fetchArticles).mockRejectedValue(testError);
            vi.mocked(useSettingsStore).mockReturnValue({
                settings: {
                    workingMode: 'SOLUM_API',
                    solumConfig: {
                        storeNumber: '01',
                        tokens: {
                            accessToken: 'test-token',
                        },
                    },
                    solumMappingConfig: {},
                },
            } as any);

            const { result } = renderHook(() => useSolumSync());

            await expect(
                act(async () => {
                    await result.current.syncFromAims();
                })
            ).rejects.toThrow('Network error');

            expect(logger.error).toHaveBeenCalledWith(
                'SolumSync',
                'Failed to fetch from AIMS',
                { error: testError }
            );
        });
    });

    describe('hook return value', () => {
        it('should return syncFromAims function', () => {
            vi.mocked(useSettingsStore).mockReturnValue({
                settings: { workingMode: 'SOLUM_API' },
            } as any);

            const { result } = renderHook(() => useSolumSync());

            expect(typeof result.current.syncFromAims).toBe('function');
        });
    });
});
