import { useCallback } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { postBulkAssignments, postEmptyAssignments, convertSpacesToPeopleWithVirtualPool } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Hook for AIMS synchronization operations in People Management
 */
export function usePeopleAIMS() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);

    /**
     * Post selected people to AIMS
     * @param personIds - Array of person IDs to post
     */
    const postSelectedToAims = useCallback(async (personIds: string[]): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleAIMS', 'Posting selected people to AIMS', { count: personIds.length });

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM configuration not complete');
            }

            const selectedPeople = peopleStore.people.filter(p => personIds.includes(p.id));

            if (selectedPeople.length === 0) {
                throw new Error('No people found with the provided IDs');
            }

            peopleStore.updateSyncStatus(personIds, 'pending');

            try {
                await postBulkAssignments(
                    selectedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                peopleStore.updateSyncStatus(personIds, 'synced');
                logger.info('PeopleAIMS', 'Selected people posted to AIMS', { count: selectedPeople.length });
                return { success: true, syncedCount: selectedPeople.length };
            } catch (aimsError: any) {
                peopleStore.updateSyncStatus(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleAIMS', 'Failed to post selected people to AIMS', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Post ALL assigned people to AIMS
     */
    const postAllAssignmentsToAims = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId);
            
            if (assignedPeople.length === 0) {
                logger.warn('PeopleAIMS', 'No assigned people to post');
                return { success: true, syncedCount: 0 };
            }

            logger.info('PeopleAIMS', 'Posting all assignments to AIMS', { count: assignedPeople.length });

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM configuration not complete');
            }

            const personIds = assignedPeople.map(p => p.id);
            peopleStore.updateSyncStatus(personIds, 'pending');

            try {
                await postBulkAssignments(
                    assignedPeople,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                peopleStore.updateSyncStatus(personIds, 'synced');
                logger.info('PeopleAIMS', 'All assignments posted to AIMS', { count: assignedPeople.length });
                return { success: true, syncedCount: assignedPeople.length };
            } catch (aimsError: any) {
                peopleStore.updateSyncStatus(personIds, 'error');
                throw aimsError;
            }
        } catch (error: any) {
            logger.error('PeopleAIMS', 'Failed to post all assignments to AIMS', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Cancel all assignments - clear locally and send empty data to AIMS
     */
    const cancelAllAssignments = useCallback(async (): Promise<{ success: boolean; clearedCount: number }> => {
        try {
            const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId);
            
            if (assignedPeople.length === 0) {
                logger.warn('PeopleAIMS', 'No assignments to cancel');
                return { success: true, clearedCount: 0 };
            }

            logger.info('PeopleAIMS', 'Canceling all assignments', { count: assignedPeople.length });

            // Post empty data to AIMS first (if configured)
            if (settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    await postEmptyAssignments(
                        assignedPeople,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleAIMS', 'Empty assignments posted to AIMS', { count: assignedPeople.length });
                } catch (aimsError: any) {
                    logger.error('PeopleAIMS', 'Failed to post empty to AIMS', { error: aimsError.message });
                    // Continue with local clearing even if AIMS fails
                }
            }

            // Clear all local assignments
            peopleStore.unassignAllSpaces();

            logger.info('PeopleAIMS', 'All assignments canceled', { count: assignedPeople.length });
            return { success: true, clearedCount: assignedPeople.length };
        } catch (error: any) {
            logger.error('PeopleAIMS', 'Failed to cancel all assignments', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Sync people data FROM AIMS
     * Downloads current articles from AIMS and converts them to People format
     * This allows the People table to reflect the current state in AIMS
     */
    const syncFromAims = useCallback(async (): Promise<void> => {
        try {
            logger.info('PeopleAIMS', 'Starting sync from AIMS');

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM API not connected. Please connect in Settings first.');
            }

            // Import and use fetchArticles directly
            const { fetchArticles } = await import('@shared/infrastructure/services/solumService');
            
            const token = settings.solumConfig.tokens.accessToken;
            const storeNumber = settings.solumConfig.storeNumber;

            // Fetch all articles with pagination
            let allArticles: any[] = [];
            let page = 0;
            const pageSize = 100;
            let hasMore = true;

            logger.info('PeopleAIMS', 'Fetching articles from AIMS', { storeNumber });

            while (hasMore) {
                const articlesChunk = await fetchArticles(
                    settings.solumConfig,
                    storeNumber,
                    token,
                    page,
                    pageSize
                );

                if (articlesChunk.length > 0) {
                    allArticles = [...allArticles, ...articlesChunk];
                    if (articlesChunk.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            logger.info('PeopleAIMS', 'Articles fetched from AIMS', { count: allArticles.length });

            // Convert articles to Space-like format for the converter
            const spaces = allArticles.map(article => ({
                id: article.articleId || article.id,
                data: article.data || article.articleData || {},
                labelCode: article.labelCode,
            }));

            // Convert spaces to people using virtual pool support
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            peopleStore.setPeople(people);

            logger.info('PeopleAIMS', 'Sync from AIMS complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleAIMS', 'Failed to sync from AIMS', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig, peopleStore]);

    /**
     * Sync from AIMS with Virtual Pool support
     * Downloads articles and extracts cross-device metadata
     */
    const syncFromAimsWithVirtualPool = useCallback(async (): Promise<void> => {
        try {
            logger.info('PeopleAIMS', 'Starting sync from AIMS with virtual pool support');

            if (!settings.solumConfig || !settings.solumConfig.tokens) {
                throw new Error('SoluM API not connected. Please connect in Settings first.');
            }

            const { fetchArticles } = await import('@shared/infrastructure/services/solumService');
            
            const token = settings.solumConfig.tokens.accessToken;
            const storeNumber = settings.solumConfig.storeNumber;

            // Fetch all articles with pagination
            let allArticles: any[] = [];
            let page = 0;
            const pageSize = 100;
            let hasMore = true;

            logger.info('PeopleAIMS', 'Fetching articles from AIMS', { storeNumber });

            while (hasMore) {
                const articlesChunk = await fetchArticles(
                    settings.solumConfig,
                    storeNumber,
                    token,
                    page,
                    pageSize
                );

                if (articlesChunk.length > 0) {
                    allArticles = [...allArticles, ...articlesChunk];
                    if (articlesChunk.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            logger.info('PeopleAIMS', 'Articles fetched from AIMS', { count: allArticles.length });

            // Convert articles to Space-like format for the converter
            const spaces = allArticles.map(article => ({
                id: article.articleId || article.id,
                data: article.data || article.articleData || {},
                labelCode: article.labelCode,
            }));

            // Convert spaces to people with virtual pool support
            const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);

            // Update the store with synced people
            peopleStore.setPeople(people);

            logger.info('PeopleAIMS', 'Sync from AIMS with virtual pool complete', { peopleCount: people.length });
        } catch (error: any) {
            logger.error('PeopleAIMS', 'Failed to sync from AIMS with virtual pool', { error: error.message });
            throw error;
        }
    }, [settings.solumConfig, settings.solumMappingConfig, peopleStore]);

    return {
        postSelectedToAims,
        postAllAssignmentsToAims,
        cancelAllAssignments,
        syncFromAims,
        syncFromAimsWithVirtualPool,
    };
}
