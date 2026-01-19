import { useCallback } from 'react';
import type { ConferenceRoom, SolumConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import * as solumService from '@shared/infrastructure/services/solumService';
import { 
    transformConferenceRoomToArticle, 
    transformArticleToConferenceRoom,
    filterConferenceArticles 
} from '../utils/conferenceTransformers';

/**
 * Conference AIMS Hook
 * Handles all AIMS-related operations for conference rooms
 */

interface UseConferenceAIMSProps {
    solumConfig?: SolumConfig;
    solumToken?: string;
    solumMappingConfig?: SolumMappingConfig;
}

interface UseConferenceAIMSResult {
    pushToAIMS: (room: ConferenceRoom) => Promise<void>;
    deleteFromAIMS: (id: string) => Promise<void>;
    fetchFromAIMS: () => Promise<ConferenceRoom[]>;
    flipLabelPage: (labelCode: string, currentPage: number) => Promise<void>;
    isAIMSConfigured: boolean;
}

export function useConferenceAIMS({
    solumConfig,
    solumToken,
    solumMappingConfig,
}: UseConferenceAIMSProps): UseConferenceAIMSResult {
    
    const isAIMSConfigured = !!(solumConfig && solumMappingConfig && solumToken);

    /**
     * Push a conference room to AIMS
     */
    const pushToAIMS = useCallback(
        async (room: ConferenceRoom): Promise<void> => {
            if (!solumConfig || !solumMappingConfig || !solumToken) {
                throw new Error('SoluM configuration, token, or mapping config not available');
            }

            logger.info('ConferenceAIMS', 'Pushing article to AIMS', { id: room.id });

            const { aimsArticle } = transformConferenceRoomToArticle(room, solumMappingConfig);

            await solumService.pushArticles(
                solumConfig,
                solumConfig.storeNumber,
                solumToken,
                [aimsArticle]
            );

            logger.info('ConferenceAIMS', 'Article pushed to AIMS successfully', { id: room.id });
        },
        [solumConfig, solumMappingConfig, solumToken]
    );

    /**
     * Delete a conference room from AIMS
     */
    const deleteFromAIMS = useCallback(
        async (id: string): Promise<void> => {
            if (!solumConfig || !solumToken) {
                throw new Error('SoluM configuration or token not available');
            }

            logger.info('ConferenceAIMS', 'Deleting article from AIMS', { id });

            await solumService.deleteArticles(
                solumConfig,
                solumConfig.storeNumber,
                solumToken,
                [`C${id}`]  // Prepend 'C' to match AIMS article ID format
            );

            logger.info('ConferenceAIMS', 'Article deleted from AIMS successfully', { id });
        },
        [solumConfig, solumToken]
    );

    /**
     * Fetch conference rooms from AIMS
     * Fetches all articles, filters IN those with 'C' prefix,
     * and maps them to ConferenceRoom entities using solumMappingConfig
     */
    const fetchFromAIMS = useCallback(
        async (): Promise<ConferenceRoom[]> => {
            if (!solumConfig || !solumToken || !solumMappingConfig) {
                throw new Error('SoluM configuration, token, or mapping config not available');
            }

            logger.info('ConferenceAIMS', 'Fetching conference rooms from AIMS');

            // Fetch all articles from SoluM
            const articles = await solumService.fetchArticles(
                solumConfig,
                solumConfig.storeNumber,
                solumToken
            );

            // Filter IN articles where articleId starts with 'C' (conference rooms)
            const conferenceArticles = filterConferenceArticles(
                articles, 
                solumMappingConfig.uniqueIdField
            );

            // Map articles to ConferenceRoom entities
            const mappedRooms: ConferenceRoom[] = conferenceArticles.map((article: any) => 
                transformArticleToConferenceRoom(article, solumMappingConfig)
            );

            logger.info('ConferenceAIMS', 'Conference rooms fetched from AIMS', {
                total: articles.length,
                conferenceRooms: mappedRooms.length,
                spaces: articles.length - mappedRooms.length
            });

            return mappedRooms;
        },
        [solumConfig, solumToken, solumMappingConfig]
    );

    /**
     * Flip label page (for SoluM simple conference mode)
     */
    const flipLabelPage = useCallback(
        async (labelCode: string, currentPage: number): Promise<void> => {
            if (!solumConfig || !solumToken) {
                throw new Error('SoluM configuration or token not available');
            }

            logger.info('ConferenceAIMS', 'Flipping label page', { labelCode, currentPage });

            const newPage = currentPage === 0 ? 1 : 0;

            await solumService.updateLabelPage(
                solumConfig,
                solumConfig.storeNumber,
                solumToken,
                labelCode,
                newPage
            );

            logger.info('ConferenceAIMS', 'Label page flipped', { labelCode, newPage });
        },
        [solumConfig, solumToken]
    );

    return {
        pushToAIMS,
        deleteFromAIMS,
        fetchFromAIMS,
        flipLabelPage,
        isAIMSConfigured,
    };
}
