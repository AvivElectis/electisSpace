import { useCallback } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { parsePeopleCSV, buildArticleDataWithMetadata } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import { getVirtualSpaceId } from '../../domain/types';
import { isPoolId } from '../../infrastructure/virtualPoolService';
import type { SolumConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

/**
 * Fetch empty POOL articles from AIMS
 * These are POOL-ID articles that have no meaningful data (only the article ID)
 * Returns a Set of POOL-IDs that can be reused
 */
export async function fetchEmptyPoolArticlesFromAims(
    solumConfig: SolumConfig,
    mappingConfig?: SolumMappingConfig
): Promise<Set<string>> {
    const emptyPoolIds = new Set<string>();
    
    try {
        const { fetchArticles } = await import('@shared/infrastructure/services/solumService');
        
        if (!solumConfig.tokens?.accessToken) {
            return emptyPoolIds;
        }
        
        const articles = await fetchArticles(
            solumConfig,
            solumConfig.storeNumber,
            solumConfig.tokens.accessToken
        );
        
        const articleIdField = mappingConfig?.mappingInfo?.articleId || 'ARTICLE_ID';
        
        articles.forEach((article: any) => {
            const articleId = article.id || article.data?.[articleIdField] || article.data?.ARTICLE_ID;
            
            // Only consider POOL-ID articles
            if (!articleId || !isPoolId(articleId)) {
                return;
            }
            
            // Check if this article is empty (no meaningful data beyond the ID)
            const data = article.data || {};
            const hasData = Object.entries(data).some(([key, value]) => {
                // Skip ID fields and metadata fields
                if (key === articleIdField || key === 'ARTICLE_ID' || key.startsWith('__')) {
                    return false;
                }
                return value && String(value).trim().length > 0;
            });
            
            if (!hasData) {
                emptyPoolIds.add(articleId);
                logger.debug('PeopleCSV', 'Found empty POOL article in AIMS', { poolId: articleId });
            }
        });
        
        logger.info('PeopleCSV', 'Fetched empty POOL articles from AIMS', { count: emptyPoolIds.size });
    } catch (error: any) {
        logger.warn('PeopleCSV', 'Failed to fetch empty POOL articles from AIMS', { error: error.message });
    }
    
    return emptyPoolIds;
}

/**
 * Hook for CSV-related operations in People Management
 */
export function usePeopleCSV() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);

    /**
     * Load people from CSV file (no AIMS sync)
     */
    const loadPeopleFromCSV = useCallback(async (file: File): Promise<void> => {
        try {
            logger.info('PeopleCSV', 'Loading CSV file', { filename: file.name, size: file.size });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const csvContent = await file.text();
            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig);

            peopleStore.setPeople(people);
            logger.info('PeopleCSV', 'People loaded from CSV', { count: people.length });
        } catch (error: any) {
            logger.error('PeopleCSV', 'Failed to load CSV', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, peopleStore]);

    /**
     * Load people from CSV content string with sync to AIMS
     * Generates UUIDs and virtual pool IDs for all people
     * If connected to AIMS, reuses empty POOL articles first
     */
    const loadPeopleFromContent = useCallback(async (csvContent: string): Promise<void> => {
        try {
            logger.info('PeopleCSV', 'Loading CSV content with sync', { length: csvContent.length });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            // Get existing pool IDs from local store to avoid collisions
            const existingPoolIds = new Set(
                peopleStore.people
                    .map(p => getVirtualSpaceId(p))
                    .filter((id): id is string => id !== undefined && isPoolId(id))
            );

            // If connected to AIMS, fetch empty POOL articles that can be reused
            let preferredPoolIds: Set<string> | undefined;
            if (settings.solumConfig?.tokens?.accessToken) {
                preferredPoolIds = await fetchEmptyPoolArticlesFromAims(
                    settings.solumConfig,
                    settings.solumMappingConfig
                );
                logger.info('PeopleCSV', 'Fetched empty POOL articles for CSV import', { 
                    count: preferredPoolIds.size 
                });
            }

            const people = parsePeopleCSV(
                csvContent, 
                settings.solumArticleFormat, 
                settings.solumMappingConfig, 
                existingPoolIds,
                preferredPoolIds
            );

            // Update local store
            peopleStore.setPeople(people);
            logger.info('PeopleCSV', 'People loaded from CSV content', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                peopleStore.updateSyncStatusLocal(personIds, 'pending');

                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');
                    
                    // Batch sync in chunks of 10
                    const batchSize = 10;
                    for (let i = 0; i < people.length; i += batchSize) {
                        const batch = people.slice(i, i + batchSize);
                        
                        const articles = batch.map(person => {
                            const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                            articleData.articleId = getVirtualSpaceId(person) || person.id;
                            return articleData;
                        });
                        
                        await pushArticles(
                            settings.solumConfig!,
                            settings.solumConfig!.storeNumber,
                            settings.solumConfig!.tokens!.accessToken,
                            articles
                        );
                    }

                    peopleStore.updateSyncStatusLocal(personIds, 'synced');
                    logger.info('PeopleCSV', 'CSV content synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleCSV', 'Failed to sync CSV content to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleCSV', 'Failed to load CSV content', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, peopleStore]);

    /**
     * Load people from CSV file with sync to AIMS
     * Generates UUIDs and virtual pool IDs for all people
     */
    const loadPeopleFromCSVWithSync = useCallback(async (file: File): Promise<void> => {
        try {
            logger.info('PeopleCSV', 'Loading CSV file with sync', { filename: file.name, size: file.size });

            if (!settings.solumArticleFormat) {
                throw new Error('SoluM article format not configured');
            }

            const csvContent = await file.text();
            
            // Get existing pool IDs to avoid collisions
            const existingPoolIds = new Set(
                peopleStore.people
                    .map(p => getVirtualSpaceId(p))
                    .filter((id): id is string => id !== undefined && isPoolId(id))
            );

            const people = parsePeopleCSV(csvContent, settings.solumArticleFormat, settings.solumMappingConfig, existingPoolIds);

            // Update local store
            peopleStore.setPeople(people);
            logger.info('PeopleCSV', 'People loaded from CSV', { count: people.length });

            // Sync to AIMS if connected
            if (settings.solumConfig?.tokens?.accessToken && people.length > 0) {
                const personIds = people.map(p => p.id);
                peopleStore.updateSyncStatusLocal(personIds, 'pending');

                try {
                    const { pushArticles } = await import('@shared/infrastructure/services/solumService');
                    
                    // Batch sync in chunks of 10
                    const batchSize = 10;
                    for (let i = 0; i < people.length; i += batchSize) {
                        const batch = people.slice(i, i + batchSize);
                        
                        const articles = batch.map(person => {
                            const articleData = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                            articleData.articleId = getVirtualSpaceId(person) || person.id;
                            return articleData;
                        });
                        
                        await pushArticles(
                            settings.solumConfig!,
                            settings.solumConfig!.storeNumber,
                            settings.solumConfig!.tokens!.accessToken,
                            articles
                        );
                    }

                    peopleStore.updateSyncStatusLocal(personIds, 'synced');
                    logger.info('PeopleCSV', 'CSV people synced to AIMS', { count: people.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleCSV', 'Failed to sync CSV people to AIMS', { error: syncError.message });
                }
            }
        } catch (error: any) {
            logger.error('PeopleCSV', 'Failed to load CSV with sync', { error: error.message });
            throw error;
        }
    }, [settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, peopleStore]);

    return {
        loadPeopleFromCSV,
        loadPeopleFromContent,
        loadPeopleFromCSVWithSync,
    };
}
