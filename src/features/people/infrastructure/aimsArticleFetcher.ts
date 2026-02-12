import { logger } from '@shared/infrastructure/services/logger';
import type { SolumConfig } from '@shared/domain/types';

/**
 * Fetch all articles from AIMS with automatic pagination.
 * Shared utility used by the People controller for sync-from-AIMS operations.
 *
 * @param solumConfig - SoluM API configuration (server URL, store, tokens)
 * @param token - Valid AIMS access token
 * @param pageSize - Articles per page (default 100)
 * @returns All articles from AIMS for the configured store
 */
export async function fetchAllArticlesFromAims(
    solumConfig: SolumConfig,
    token: string,
    pageSize = 100
): Promise<any[]> {
    const { fetchArticles } = await import('@shared/infrastructure/services/solumService');
    const storeNumber = solumConfig.storeNumber;

    let allArticles: any[] = [];
    let page = 0;
    let hasMore = true;

    logger.info('AimsArticleFetcher', 'Fetching articles from AIMS', { storeNumber });

    while (hasMore) {
        const chunk = await fetchArticles(solumConfig, storeNumber, token, page, pageSize);

        if (chunk.length > 0) {
            allArticles = [...allArticles, ...chunk];
            hasMore = chunk.length >= pageSize;
            page++;
        } else {
            hasMore = false;
        }
    }

    logger.info('AimsArticleFetcher', 'All articles fetched', { count: allArticles.length });
    return allArticles;
}
