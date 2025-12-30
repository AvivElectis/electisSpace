import { useCallback } from 'react';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';

/**
 * Shared AIMS Sync Hook
 * Provides a unified sync mechanism for all features to refresh from AIMS
 */
export function useSolumSync() {
    const { settings } = useSettingsStore();

    /**
     * Fetch all articles from AIMS
     * Features can call this after CRUD operations to refresh their data
     */
    const syncFromAims = useCallback(async (): Promise<any[]> => {
        if (settings.workingMode !== 'SOLUM_API') {
            logger.warn('SolumSync', 'Not in SOLUM_API mode, skipping sync');
            return [];
        }

        const { solumConfig, solumMappingConfig } = settings;
        const solumToken = solumConfig?.tokens?.accessToken;

        if (!solumConfig || !solumToken || !solumMappingConfig) {
            logger.warn('SolumSync', 'Missing SOLUM configuration, skipping sync');
            return [];
        }

        try {
            logger.info('SolumSync', 'Fetching articles from AIMS');

            const articles = await solumService.fetchArticles(
                solumConfig,
                solumConfig.storeNumber,
                solumToken
            );

            logger.info('SolumSync', 'Articles fetched from AIMS', { count: articles.length });
            return articles;
        } catch (error) {
            logger.error('SolumSync', 'Failed to fetch from AIMS', { error });
            throw error;
        }
    }, [settings]);

    return {
        syncFromAims,
    };
}
