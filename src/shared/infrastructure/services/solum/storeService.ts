import type { SolumConfig } from '@shared/domain/types';
import { logger } from '../logger';
import { buildUrl } from './authService';

/**
 * SoluM Store Service
 * Handles store-related operations
 */

/**
 * Get store summary (for connection verification)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @returns Store summary with configuration and statistics
 */
export async function getStoreSummary(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<any> {
    logger.info('SolumStoreService', 'Fetching store summary', { storeId });

    const url = buildUrl(config, `/common/api/v2/common/store/summary?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumStoreService', 'Fetch store summary failed', { status: response.status, error });
        throw new Error(`Fetch store summary failed: ${response.status}`);
    }

    const data = await response.json();
    logger.info('SolumStoreService', 'Store summary fetched', {
        labelCount: data.labelCount,
        articleCount: data.articleCount,
        gatewayCount: data.gatewayCount
    });
    return data;
}
