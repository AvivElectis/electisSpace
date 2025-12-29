import Papa from 'papaparse';
import type { Person } from '../domain/types';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { SolumConfig } from '@shared/domain/types';
import { pushArticles } from '@shared/infrastructure/services/solumService';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * People Service
 * Handles CSV parsing and AIMS integration for people management
 */

/**
 * Parse people CSV file
 * CSV structure follows articleData array, excluding global fields
 * @param csvContent - Raw CSV string
 * @param articleFormat - SoluM article format configuration
 * @param mappingConfig - SoluM mapping configuration (optional, for global field exclusion)
 * @returns Parsed people array
 */
export function parsePeopleCSV(
    csvContent: string,
    articleFormat: ArticleFormat,
    mappingConfig?: SolumMappingConfig
): Person[] {
    logger.info('PeopleService', 'Parsing people CSV', { length: csvContent.length });

    const delimiter = articleFormat.delimeter || ';';  // Note: SoluM API spells it 'delimeter'
    const globalFields = mappingConfig?.globalFieldAssignments || {};
    const globalFieldKeys = Object.keys(globalFields);

    // Get non-global fields in order
    const csvColumns = articleFormat.articleData.filter(
        fieldKey => !globalFieldKeys.includes(fieldKey)
    );

    logger.debug('PeopleService', 'CSV structure', {
        delimiter,
        totalFields: articleFormat.articleData.length,
        globalFields: globalFieldKeys,
        csvColumns: csvColumns.length
    });

    const result = Papa.parse<string[]>(csvContent, {
        delimiter,
        skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
        logger.error('PeopleService', 'CSV parsing errors', { errors: result.errors });
        throw new Error(`CSV parsing failed: ${result.errors[0].message}`);
    }

    const rows = result.data;
    if (rows.length === 0) {
        logger.warn('PeopleService', 'Empty CSV file');
        return [];
    }

    // Remove header row
    const headerRow = rows.shift();
    logger.debug('PeopleService', 'Header row', { header: headerRow });

    const people: Person[] = [];
    const articleIdField = articleFormat.mappingInfo?.articleId || 'ARTICLE_ID';
    const articleIdIndex = csvColumns.indexOf(articleIdField);

    if (articleIdIndex === -1) {
        throw new Error(`Article ID field "${articleIdField}" not found in CSV columns`);
    }

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip rows that don't have enough columns
        if (row.length < csvColumns.length) {
            logger.warn('PeopleService', `Skipping row ${i + 1}: insufficient columns`, { row, expected: csvColumns.length });
            continue;
        }

        // Build data object from row
        const data: Record<string, string> = {};
        for (let j = 0; j < csvColumns.length; j++) {
            const fieldKey = csvColumns[j];
            data[fieldKey] = row[j] || '';
        }

        const id = data[articleIdField] || '';
        if (!id) {
            logger.warn('PeopleService', `Skipping row ${i + 1}: missing ID`, { row });
            continue;
        }

        const person: Person = {
            id,
            data,
        };

        people.push(person);
    }

    logger.info('PeopleService', 'CSV parsed successfully', { peopleCount: people.length });
    return people;
}

/**
 * Build complete article data for AIMS
 * Merges person data with global field assignments
 * @param person - Person to build article for
 * @param mappingConfig - SoluM mapping configuration for global field assignments
 * @returns Complete article data
 */
export function buildArticleData(person: Person, mappingConfig?: SolumMappingConfig): Record<string, string> {
    const globalFields = mappingConfig?.globalFieldAssignments || {};

    // Merge person data with global fields
    const articleData = {
        ...globalFields,  // Global fields first
        ...person.data,   // Person data overrides if there's overlap
    };

    logger.debug('PeopleService', 'Built article data', {
        personId: person.id,
        hasGlobalFields: Object.keys(globalFields).length > 0
    });

    return articleData;
}

/**
 * Post single person assignment to AIMS
 * @param person - Person to post
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function postPersonAssignment(
    person: Person,
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    logger.info('PeopleService', 'Posting person assignment to AIMS', { personId: person.id });

    const articleData = buildArticleData(person, mappingConfig);

    // Push article to AIMS
    await pushArticles(config, config.storeNumber, token, [articleData]);

    logger.info('PeopleService', 'Person assignment posted successfully', { personId: person.id });
}

/**
 * Post bulk person assignments to AIMS
 * @param people - People to post
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function postBulkAssignments(
    people: Person[],
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    logger.info('PeopleService', 'Posting bulk assignments to AIMS', { count: people.length });

    // Build article data for all people
    const articles = people.map(person => buildArticleData(person, mappingConfig));

    // Push all articles to AIMS in one batch
    await pushArticles(config, config.storeNumber, token, articles);

    logger.info('PeopleService', 'Bulk assignments posted successfully', { count: people.length });
}
