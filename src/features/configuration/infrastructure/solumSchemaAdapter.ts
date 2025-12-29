/**
 * SoluM Schema Adapter
 * 
 * Infrastructure layer for fetching and updating article format schemas
 * from the real SoluM API.
 */

import { buildUrl } from '@shared/infrastructure/services/solumService';
import { logger } from '@shared/infrastructure/services/logger';
import type { SolumConfig } from '@shared/domain/types';
import type { ArticleFormat } from '../domain/types';

/**
 * Adapter for SoluM Article Format API operations
 */
export class SolumSchemaAdapter {
    /**
     * Fetch article format schema from SoluM API
     * 
     * Endpoint: GET /common/api/v2/common/articles/upload/format
     * 
     * @param config - SoluM configuration with credentials
     * @returns ArticleFormat schema from SoluM
     * @throws Error if authentication or fetch fails
     */
    static async fetchSchema(config: SolumConfig): Promise<ArticleFormat> {
        logger.info('SolumSchemaAdapter', 'Fetching article format schema', {
            company: config.companyName,
            cluster: config.cluster,
            baseUrl: config.baseUrl
        });

        // Step 1: Use stored tokens from connection
        if (!config.tokens?.accessToken) {
            throw new Error('Not connected to SoluM API. Please connect first.');
        }

        const token = config.tokens.accessToken;

        // Step 2: Build URL with cluster awareness and company parameter
        const url = buildUrl(
            config,
            `/common/api/v2/common/articles/upload/format?company=${config.companyName}`
        );

        logger.debug('SolumSchemaAdapter', 'Schema fetch request', {
            url,
            method: 'GET',
            hasToken: !!token
        });

        // Step 3: Fetch schema from API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('SolumSchemaAdapter', 'Schema fetch failed', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to fetch article format schema: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const schema: ArticleFormat = await response.json();
        logger.info('SolumSchemaAdapter', 'Schema fetched successfully', {
            fileExtension: schema.fileExtension,
            delimiter: schema.delimeter,
            basicInfoCount: schema.articleBasicInfo?.length || 0,
            dataFieldCount: schema.articleData?.length || 0
        });
        return schema;
    }

    /**
     * Update article format schema on SoluM API
     * 
     * Endpoint: POST /common/api/v2/common/articles/upload/format
     * 
     * @param config - SoluM configuration with credentials
     * @param schema - ArticleFormat schema to save
     * @throws Error if authentication or update fails
     */
    static async updateSchema(config: SolumConfig, schema: ArticleFormat): Promise<void> {
        logger.info('SolumSchemaAdapter', 'Updating article format schema', {
            company: config.companyName,
            cluster: config.cluster
        });

        // Step 1: Use stored tokens from connection
        if (!config.tokens?.accessToken) {
            throw new Error('Not connected to SoluM API. Please connect first.');
        }

        const token = config.tokens.accessToken;

        // Step 2: Build URL with cluster awareness and company parameter
        const url = buildUrl(
            config,
            `/common/api/v2/common/articles/upload/format?company=${config.companyName}`
        );

        // console.log('='.repeat(80));
        // console.log('[SolumSchemaAdapter] UPDATE ARTICLE FORMAT REQUEST');
        // console.log('='.repeat(80));
        // console.log('URL:', url);
        // console.log('Method: POST');
        // console.log('Headers:', {
        //     'Authorization': `Bearer ${token.substring(0, 20)}...`,
        //     'Content-Type': 'application/json'
        // });
        // console.log('Payload:', JSON.stringify(schema, null, 2));
        // console.log('='.repeat(80));

        logger.debug('SolumSchemaAdapter', 'Schema update request', {
            url,
            method: 'POST',
            schemaFields: Object.keys(schema)
        });

        // Step 3: POST schema update
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(schema)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('SolumSchemaAdapter', 'Schema update failed', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to update article format schema: ${response.status} ${response.statusText} - ${errorText}`);
        }

        logger.info('SolumSchemaAdapter', 'Schema updated successfully');
    }
}
