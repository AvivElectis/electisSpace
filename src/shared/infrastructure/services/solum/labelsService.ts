import type { SolumConfig } from '@shared/domain/types';
import { logger } from '../logger';
import { buildUrl } from './authService';

/**
 * SoluM Labels Service
 * Handles label operations (fetch, assign, unassign, page update, details)
 */

/**
 * Label response from AIMS API
 */
export interface AimsLabel {
    labelCode: string;
    labelMac?: string;
    gatewayMac?: string;
    firmwareVersion?: string;
    signal?: string;
    battery?: string;
    networkStatus?: string;
    status?: string;
    labelType?: string;
    articleList?: Array<{
        articleId: string;
        articleName?: string;
    }>;
}

/**
 * Get labels from SoluM API
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param page - Page number (0-based)
 * @param size - Page size
 * @returns Array of labels
 */
export async function getLabels(
    config: SolumConfig,
    storeId: string,
    token: string,
    page = 0,
    size = 100
): Promise<AimsLabel[]> {
    logger.info('SolumLabelsService', 'Fetching labels', { storeId, page, size });

    const url = buildUrl(config, `/common/api/v2/common/labels?company=${config.companyName}&store=${storeId}&page=${page}&size=${size}`);

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
 * Get all labels with pagination (fetches all pages)
 * Combines data from labels list and unassigned labels endpoints
 * to get both linked and unlinked labels with full details
 */
export async function getAllLabels(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<AimsLabel[]> {
    logger.info('SolumLabelsService', 'Fetching all labels with details');
    
    // Fetch basic labels (has articleList but minimal details)
    const basicLabels = await getLabels(config, storeId, token, 0, 500);
    
    // Fetch unassigned labels (has full details like signal, battery)
    const unassignedLabels = await getUnassignedLabels(config, storeId, token);
    
    // Create a map of unassigned labels for quick lookup
    const unassignedMap = new Map<string, AimsLabel>();
    for (const label of unassignedLabels) {
        unassignedMap.set(label.labelCode, label);
    }
    
    // Merge: if a label is in both, use unassigned data (more details)
    // If label has articles, it won't be in unassigned
    const mergedLabels: AimsLabel[] = [];
    const seenLabels = new Set<string>();
    
    for (const basic of basicLabels) {
        seenLabels.add(basic.labelCode);
        const unassigned = unassignedMap.get(basic.labelCode);
        if (unassigned) {
            // Use unassigned details but preserve articleList from basic
            mergedLabels.push({
                ...unassigned,
                articleList: basic.articleList,
            });
        } else {
            // Label has articles, use basic info
            mergedLabels.push(basic);
        }
    }
    
    // Add any unassigned labels not in basic list
    for (const label of unassignedLabels) {
        if (!seenLabels.has(label.labelCode)) {
            mergedLabels.push(label);
        }
    }
    
    logger.info('SolumLabelsService', 'All labels fetched', { 
        basic: basicLabels.length, 
        unassigned: unassignedLabels.length,
        merged: mergedLabels.length 
    });
    
    return mergedLabels;
}

/**
 * Get unassigned labels with full details (signal, battery, etc.)
 */
export async function getUnassignedLabels(
    config: SolumConfig,
    storeId: string,
    token: string
): Promise<AimsLabel[]> {
    logger.info('SolumLabelsService', 'Fetching unassigned labels', { storeId });

    const url = buildUrl(config, `/common/api/v2/common/labels/unassigned?company=${config.companyName}&store=${storeId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 204) {
        return [];
    }

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Fetch unassigned labels failed', { status: response.status, error });
        // Don't throw - just return empty array so we can still show basic labels
        return [];
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
        return [];
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        logger.error('SolumLabelsService', 'Failed to parse unassigned labels response', { text });
        return [];
    }

    const labels = Array.isArray(data) ? data : (data.labelList || data.content || data.data || []);
    logger.info('SolumLabelsService', 'Unassigned labels fetched', { count: labels.length });
    return labels;
}

/**
 * Get labels assigned to a specific article
 */
export async function getLabelsByArticle(
    config: SolumConfig,
    storeId: string,
    token: string,
    articleId: string
): Promise<AimsLabel[]> {
    logger.info('SolumLabelsService', 'Fetching labels by article', { storeId, articleId });

    const url = buildUrl(config, `/common/api/v2/common/labels/article?company=${config.companyName}&store=${storeId}&articleId=${articleId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 204) {
        return [];
    }

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Fetch labels by article failed', { status: response.status, error });
        throw new Error(`Fetch labels by article failed: ${response.status}`);
    }

    const data = await response.json();
    const labels = Array.isArray(data) ? data : (data.labelsList || data.labelList || data.content || []);

    logger.info('SolumLabelsService', 'Labels by article fetched', { count: labels.length });
    return labels;
}

/**
 * Link (assign) label to article
 * @param config - SoluM configuration
 * @param storeId - Store number
 * @param token - Access token
 * @param labelCode - Label code (e.g., "03704160B297")
 * @param articleId - Article ID
 * @param templateName - Optional template name
 */
export async function linkLabel(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string,
    articleId: string,
    templateName?: string
): Promise<void> {
    logger.info('SolumLabelsService', 'Linking label to article', { labelCode, articleId, templateName });

    const url = buildUrl(config, `/common/api/v2/common/labels/link?company=${config.companyName}&store=${storeId}`);

    const body = {
        assignList: [{
            labelCode,
            articleIdList: [articleId],
            ...(templateName && { templateName }),
        }],
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Link label failed', { status: response.status, error });
        throw new Error(`Link label failed: ${response.status} - ${error}`);
    }

    logger.info('SolumLabelsService', 'Label linked successfully');
}

/**
 * Unlink (unassign) label from article
 */
export async function unlinkLabel(
    config: SolumConfig,
    storeId: string,
    token: string,
    labelCode: string
): Promise<void> {
    logger.info('SolumLabelsService', 'Unlinking label', { labelCode });

    const url = buildUrl(config, `/common/api/v2/common/labels/unlink?company=${config.companyName}&store=${storeId}`);

    const body = {
        unAssignList: [labelCode],
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('SolumLabelsService', 'Unlink label failed', { status: response.status, error });
        throw new Error(`Unlink label failed: ${response.status} - ${error}`);
    }

    logger.info('SolumLabelsService', 'Label unlinked successfully');
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

/**
 * Assign label to article (backward compatible alias for linkLabel)
 * @deprecated Use linkLabel instead
 */
export const assignLabel = linkLabel;
