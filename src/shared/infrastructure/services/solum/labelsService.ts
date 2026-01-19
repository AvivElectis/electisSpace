import type { SolumConfig } from '@shared/domain/types';
import { logger } from '../logger';
import { buildUrl } from './authService';

/**
 * SoluM Labels Service
 * Handles label operations (fetch, assign, page update, details)
 */

/**
 * Get labels from SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @returns Array of labels
 */
export async function getLabels(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<any[]> {
    logger.info('SolumLabelsService', 'Fetching labels', { storeId });

    const url = buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Fetch labels failed', { status: response.status, error });
        throw new Error(`Fetch labels failed: ${response.status}`);
    }

    const text = await response.text();
    // Handle empty response
    if (!text || text.trim().length === 0) {
        logger.info('SolumLabelsService', 'Labels fetched (empty response)', { count: 0 });
        return [];
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        logger.error('SolumLabelsService', 'Failed to parse labels response', { text });
        throw new Error('Invalid JSON response from SoluM API');
    }

    // The API might return an object with nested labels array or direct array
    const labels = Array.isArray(data) ? data : (data.labelList || data.content || data.data || []);

    logger.info('SolumLabelsService', 'Labels fetched', { count: labels.length });
    return labels;
}

/**
 * Assign label to article
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code (e.g., "ESL001")
 * @param articleId - Article ID
 * @param templateName - Optional template name
 */
export async function assignLabel(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string,
    articleId: string,
    templateName?: string
): Promise<void> {
    logger.info('SolumLabelsService', 'Assigning label', { labelCode, articleId, templateName });

    const url = buildUrl(config, `/common/api/v2/common/labels/assign?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            articleId,
            templateName,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Assign label failed', { status: response.status, error });
        throw new Error(`Assign label failed: ${response.status}`);
    }

    logger.info('SolumLabelsService', 'Label assigned successfully');
}

/**
 * Update label page (for simple conference mode)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code
 * @param page - Page number (0 or 1)
 */
export async function updateLabelPage(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string,
    page: number
): Promise<void> {
    logger.info('SolumLabelsService', 'Updating label page', { labelCode, page });

    const url = buildUrl(config, `/common/api/v2/common/labels/changePage?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page }),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Update label page failed', { status: response.status, error });
        throw new Error(`Update label page failed: ${response.status}`);
    }

    logger.info('SolumLabelsService', 'Label page updated successfully');
}

/**
 * Get label detail (includes active page information)
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code
 * @returns Label details
 */
export async function getLabelDetail(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string
): Promise<any> {
    logger.info('SolumLabelsService', 'Fetching label detail', { labelCode });

    const url = buildUrl(config, `/common/api/v2/common/labels/unassigned/detail?company=${config.companyName}&labelCode=${labelCode}&storeCode=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Fetch label detail failed', { status: response.status, error });
        throw new Error(`Fetch label detail failed: ${response.status}`);
    }

    const data = await response.json();
    logger.info('SolumLabelsService', 'Label detail fetched');
    return data;
}
