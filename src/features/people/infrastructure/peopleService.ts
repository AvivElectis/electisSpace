import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Person, ListMembership } from '../domain/types';
import { getVirtualSpaceId } from '../domain/types';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { SolumConfig } from '@shared/domain/types';
import { pushArticles } from '@shared/infrastructure/services/solumService';
import { logger } from '@shared/infrastructure/services/logger';
import { generatePoolIds, isPoolId } from './virtualPoolService';

/**
 * Parse list memberships JSON from AIMS field
 * Returns empty array if parsing fails or field is empty
 */
function parseListMemberships(jsonStr: string | undefined): ListMembership[] {
    if (!jsonStr || jsonStr.trim() === '') return [];
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            return parsed.filter(m => m && typeof m.listName === 'string');
        }
    } catch (e) {
        logger.warn('PeopleService', 'Failed to parse list memberships JSON', { jsonStr });
    }
    return [];
}

/**
 * Serialize list memberships to JSON for AIMS storage
 */
function serializeListMemberships(memberships: ListMembership[] | undefined): string {
    if (!memberships || memberships.length === 0) return '';
    return JSON.stringify(memberships);
}

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
 * @param existingPoolIds - Optional set of existing pool IDs to avoid collisions
 * @param preferredPoolIds - Optional set of pool IDs to reuse first (e.g., empty POOL articles from AIMS)
 * @returns Parsed people array with UUIDs and virtual pool IDs
 */
export function parsePeopleCSV(
    csvContent: string,
    articleFormat: ArticleFormat,
    mappingConfig?: SolumMappingConfig,
    existingPoolIds?: Set<string>,
    preferredPoolIds?: Set<string>
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

    // Exclude the ID field from CSV columns - we'll auto-generate it
    const csvColumnsWithoutId = csvColumns.filter(col => col !== articleIdField);

    logger.debug('PeopleService', 'CSV columns (excluding ID)', {
        articleIdField,
        csvColumnsWithoutId: csvColumnsWithoutId.length
    });

    // Generate pool IDs for all rows upfront, reusing empty POOL articles from AIMS if available
    const poolIds = generatePoolIds(rows.length, existingPoolIds || new Set(), undefined, preferredPoolIds);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip rows that don't have enough columns
        if (row.length < csvColumnsWithoutId.length) {
            logger.warn('PeopleService', `Skipping row ${i + 1}: insufficient columns`, { row, expected: csvColumnsWithoutId.length });
            continue;
        }

        // Build data object from row (without ID field)
        const data: Record<string, string> = {};
        for (let j = 0; j < csvColumnsWithoutId.length; j++) {
            const fieldKey = csvColumnsWithoutId[j];
            data[fieldKey] = row[j] || '';
        }

        // Apply global field assignments (company-wide constants like NFC_URL)
        if (globalFields) {
            Object.assign(data, globalFields);
        }

        // Generate stable UUID for cross-device sync
        const personId = uuidv4();
        // Assign virtual pool ID for AIMS sync
        const virtualSpaceId = poolIds[i];
        
        // Set the articleId field to the virtual space ID
        data[articleIdField] = virtualSpaceId;

        const person: Person = {
            id: personId,
            virtualSpaceId,
            data,
            // No assignedSpaceId - person is in pool until assigned to physical space
        };

        people.push(person);
    }

    logger.info('PeopleService', 'CSV parsed successfully', { peopleCount: people.length, poolIdsAssigned: poolIds.length });
    return people;
}

/**
 * Convert AIMS articles (or Spaces from sync) to People format
 * This enables syncing data FROM AIMS back to the People Manager
 * 
 * @param spaces - Spaces downloaded from AIMS via sync adapter
 * @param mappingConfig - SoluM mapping configuration
 * @returns People array with data from AIMS
 */
export function convertSpacesToPeople(
    spaces: Array<{ id: string; data: Record<string, string>; labelCode?: string }>,
    mappingConfig?: SolumMappingConfig
): Person[] {
    logger.info('PeopleService', 'Converting spaces to people', { count: spaces.length });

    const mappingInfo = mappingConfig?.mappingInfo;
    const articleIdField = mappingInfo?.articleId || 'ARTICLE_ID';

    const people: Person[] = spaces.map((space, index) => {
        // The space.id is the articleId (which is the space number in People Manager)
        const spaceIdValue = space.id;

        // Copy the data from the space
        const data: Record<string, string> = { ...space.data };

        // Ensure the articleId field has the space number
        if (articleIdField && !data[articleIdField]) {
            data[articleIdField] = space.id;
        }

        // Check if this space has meaningful data (not just empty/ID-only)
        const hasData = Object.entries(data).some(([key, value]) => {
            // Skip ID fields and check if there's actual content
            if (key === articleIdField) return false;
            return value && value.trim().length > 0;
        });

        // Don't set assignedSpaceId for POOL-IDs - they are virtual, not physical spaces
        const isPhysicalSpace = !isPoolId(spaceIdValue);

        const person: Person = {
            id: `aims-${space.id}-${index}`, // Generate unique ID
            virtualSpaceId: spaceIdValue, // Track the virtual space ID (POOL or physical)
            data,
            assignedSpaceId: hasData && isPhysicalSpace ? spaceIdValue : undefined, // Only assign if physical space with data
            aimsSyncStatus: 'synced', // Data came from AIMS, so it's synced
            lastSyncedAt: new Date().toISOString(),
        };

        return person;
    });

    // Filter out people with no meaningful data (empty articles)
    const filteredPeople = people.filter(person => {
        const hasData = Object.entries(person.data).some(([key, value]) => {
            const articleIdField = mappingConfig?.mappingInfo?.articleId || 'ARTICLE_ID';
            if (key === articleIdField) return false;
            return value && value.trim().length > 0;
        });
        return hasData;
    });

    logger.info('PeopleService', 'Converted spaces to people', { 
        total: spaces.length, 
        withData: filteredPeople.length 
    });

    return filteredPeople;
}

/**
 * Convert spaces to people with virtual pool support and cross-device metadata
 * This version extracts __PERSON_UUID__ and __VIRTUAL_SPACE__ metadata from AIMS articles
 * for stable cross-device identification.
 * 
 * @param spaces - Spaces downloaded from AIMS via sync adapter
 * @param mappingConfig - SoluM mapping configuration
 * @returns People array with stable IDs and virtual space assignments
 */
export function convertSpacesToPeopleWithVirtualPool(
    spaces: Array<{ id: string; data: Record<string, string>; labelCode?: string }>,
    mappingConfig?: SolumMappingConfig
): Person[] {
    logger.info('PeopleService', 'Converting spaces with virtual pool support', { count: spaces.length });

    const mappingInfo = mappingConfig?.mappingInfo;
    const articleIdField = mappingInfo?.articleId || 'ARTICLE_ID';
    const people: Person[] = [];

    spaces.forEach((space) => {
        // Extract cross-device metadata (if present)
        const personId = space.data['__PERSON_UUID__'] || uuidv4();
        const virtualSpaceId = space.data['__VIRTUAL_SPACE__'] || space.id;
        
        // Extract list memberships from AIMS (JSON format)
        const listMemberships = parseListMemberships(space.data['_LIST_MEMBERSHIPS_']);

        // Clean data - remove metadata fields
        const cleanData: Record<string, string> = {};
        Object.entries(space.data).forEach(([key, value]) => {
            if (!key.startsWith('__') && 
                key !== '_LIST_MEMBERSHIPS_') {
                cleanData[key] = value;
            }
        });

        // Ensure the articleId field has the space ID
        if (articleIdField && !cleanData[articleIdField]) {
            cleanData[articleIdField] = space.id;
        }

        // Check if this space has meaningful data
        const hasData = Object.entries(cleanData).some(([key, value]) => {
            if (key === articleIdField) return false;
            return value && value.trim().length > 0;
        });

        if (!hasData) return; // Skip empty articles

        // Determine if this is a physical space assignment or pool assignment
        const isPhysicalSpace = !isPoolId(virtualSpaceId);

        const person: Person = {
            id: personId,
            virtualSpaceId,
            assignedSpaceId: isPhysicalSpace ? virtualSpaceId : undefined,
            data: cleanData,
            aimsSyncStatus: 'synced',
            lastSyncedAt: space.data['__LAST_MODIFIED__'] || new Date().toISOString(),
            // New multi-list format
            listMemberships: listMemberships.length > 0 ? listMemberships : undefined,
        };

        people.push(person);
    });

    logger.info('PeopleService', 'Converted spaces with virtual pool', {
        total: spaces.length,
        peopleCount: people.length
    });

    return people;
}

/**
 * Build complete article data for AIMS in the correct format
 * The article format is driven by mappingInfo configuration:
 * - Root level: articleId, articleName, store, nfcUrl (values pulled from data)
 * - data object: all articleData fields with their values
 * 
 * For People Mode (POOL-based), virtualSpaceId is the AIMS article ID (POOL slot).
 * For assigned spaces, assignedSpaceId is used.
 * 
 * @param person - Person to build article for
 * @param mappingConfig - SoluM mapping configuration
 * @returns Complete article in AIMS format
 */
export function buildArticleData(person: Person, mappingConfig?: SolumMappingConfig): Record<string, any> {
    const globalFields = mappingConfig?.globalFieldAssignments || {};
    const mappingInfo = mappingConfig?.mappingInfo;

    // Determine the effective article ID - POOL slot (virtualSpaceId) takes priority
    // This ensures People Mode people are saved to their POOL article in AIMS
    const effectiveArticleId = person.virtualSpaceId || person.assignedSpaceId || person.id;

    // Build the data object with all fields
    const data: Record<string, any> = {};

    // First, copy all person data fields
    Object.entries(person.data).forEach(([key, value]) => {
        data[key] = value;
    });

    // Apply global field assignments
    Object.assign(data, globalFields);

    // The article ID field in the data object - use the effective article ID
    const articleIdField = mappingInfo?.articleId;
    if (articleIdField) {
        data[articleIdField] = effectiveArticleId;
    }

    // Construct the root article object
    // AIMS format: root level has mapped fields, data object has all fields
    const aimsArticle: Record<string, any> = {
        articleId: effectiveArticleId,
        data: data,
    };

    // articleName: use the value from data[mappingInfo.articleName]
    if (mappingInfo?.articleName && data[mappingInfo.articleName]) {
        aimsArticle.articleName = String(data[mappingInfo.articleName]);
    } else {
        aimsArticle.articleName = effectiveArticleId;
    }

    // store: use the value from data[mappingInfo.store]
    if (mappingInfo?.store && data[mappingInfo.store]) {
        aimsArticle.store = String(data[mappingInfo.store]);
    }

    // nfcUrl: use the value from data[mappingInfo.nfcUrl]
    if (mappingInfo?.nfcUrl && data[mappingInfo.nfcUrl]) {
        aimsArticle.nfcUrl = String(data[mappingInfo.nfcUrl]);
    }

    // Preserve list memberships if present on person
    // This ensures space assignments don't lose list membership data
    if (person.listMemberships && person.listMemberships.length > 0) {
        aimsArticle.data['_LIST_MEMBERSHIPS_'] = serializeListMemberships(person.listMemberships);
    }

    logger.debug('PeopleService', 'Built AIMS article', {
        personId: person.id,
        virtualSpaceId: person.virtualSpaceId,
        assignedSpaceId: person.assignedSpaceId,
        effectiveArticleId,
        articleId: aimsArticle.articleId,
        articleName: aimsArticle.articleName,
        dataFields: Object.keys(data).length
    });

    return aimsArticle;
}

/**
 * Build article data with cross-device sync metadata
 * Adds __PERSON_UUID__, __VIRTUAL_SPACE__, __LAST_MODIFIED__ to article data
 * Also includes list memberships (_LIST_MEMBERSHIPS_ JSON) if present on person
 * @param person - Person to convert
 * @param mappingConfig - SoluM mapping configuration
 * @returns Article in AIMS format with metadata fields
 */
export function buildArticleDataWithMetadata(
    person: Person,
    mappingConfig?: SolumMappingConfig
): Record<string, any> {
    const article = buildArticleData(person, mappingConfig);
    
    // Add metadata to the data object
    article.data['__PERSON_UUID__'] = person.id;
    article.data['__VIRTUAL_SPACE__'] = getVirtualSpaceId(person);
    article.data['__LAST_MODIFIED__'] = new Date().toISOString();

    // Add list memberships as JSON to the data object
    if (person.listMemberships && person.listMemberships.length > 0) {
        article.data['_LIST_MEMBERSHIPS_'] = serializeListMemberships(person.listMemberships);
    }
    
    return article;
}

/**
 * Build empty article data for AIMS (for unassigning/clearing a space)
 * Keeps ID and global fields, but empties all other fields
 * @param spaceId - The space ID to clear
 * @param person - Person data (used for reference)
 * @param mappingConfig - SoluM mapping configuration
 * @returns Empty article in AIMS format
 */
export function buildEmptyArticleData(
    spaceId: string,
    person: Person,
    mappingConfig?: SolumMappingConfig
): Record<string, any> {
    const globalFields = mappingConfig?.globalFieldAssignments || {};
    const mappingInfo = mappingConfig?.mappingInfo;

    // Build the data object with empty values for non-ID, non-global fields
    const data: Record<string, any> = {};

    // Set all person data fields to empty strings
    Object.keys(person.data).forEach(key => {
        // Keep global fields with their values
        if (globalFields[key] !== undefined) {
            data[key] = globalFields[key];
        } else {
            data[key] = '';
        }
    });

    // The articleId field should still have the space number (to identify which article to update)
    const articleIdField = mappingInfo?.articleId;
    if (articleIdField) {
        data[articleIdField] = spaceId;
    }

    // Construct the root article object
    // AIMS format: root level has mapped fields, data object has all fields
    const aimsArticle: Record<string, any> = {
        articleId: spaceId,
        articleName: '',
        data: data,
    };

    // Set store if configured in global fields
    if (mappingInfo?.store && globalFields[mappingInfo.store]) {
        aimsArticle.store = String(globalFields[mappingInfo.store]);
    }

    logger.debug('PeopleService', 'Built empty AIMS article', {
        spaceId,
        personId: person.id,
        articleId: aimsArticle.articleId,
        dataFields: Object.keys(data).length
    });

    return aimsArticle;
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

    // Push article to AIMS using POST
    await pushArticles(config, config.storeNumber, token, [articleData]);

    logger.info('PeopleService', 'Person assignment posted successfully', { personId: person.id });
}

/**
 * Clear a space in AIMS by posting empty data
 * Used when unassigning a person or when changing their space
 * @param spaceId - The space ID to clear
 * @param person - Person data (for reference fields)
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function clearSpaceInAims(
    spaceId: string,
    person: Person,
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    logger.info('PeopleService', 'Clearing space in AIMS', { spaceId, personId: person.id });

    const emptyArticleData = buildEmptyArticleData(spaceId, person, mappingConfig);

    // Push empty article to AIMS using POST
    await pushArticles(config, config.storeNumber, token, [emptyArticleData]);

    logger.info('PeopleService', 'Space cleared in AIMS successfully', { spaceId });
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

    // Push all articles to AIMS in one batch using POST
    await pushArticles(config, config.storeNumber, token, articles);

    logger.info('PeopleService', 'Bulk assignments posted successfully', { count: people.length });
}

/**
 * Post bulk assignments to AIMS with full metadata (including list info)
 * Use this when you need to persist list data (_LIST_NAME_, _LIST_SPACE_) to AIMS
 * @param people - People to post (should have listName and listSpaceId set)
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function postBulkAssignmentsWithMetadata(
    people: Person[],
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    console.log('[postBulkAssignmentsWithMetadata] Starting with', people.length, 'people');
    
    logger.info('PeopleService', 'Posting bulk assignments with metadata to AIMS', { 
        count: people.length,
        withListData: people.filter(p => p.listMemberships?.length).length 
    });

    // Build article data with metadata (includes __PERSON_UUID__, __VIRTUAL_SPACE__, _LIST_MEMBERSHIPS_)
    const articles = people.map(person => buildArticleDataWithMetadata(person, mappingConfig));
    
    console.log('[postBulkAssignmentsWithMetadata] Built', articles.length, 'articles');
    if (articles.length > 0) {
        console.log('[postBulkAssignmentsWithMetadata] Sample article:', JSON.stringify(articles[0], null, 2));
    }

    // Push all articles to AIMS in one batch using POST
    console.log('[postBulkAssignmentsWithMetadata] Pushing to AIMS...');
    await pushArticles(config, config.storeNumber, token, articles);
    console.log('[postBulkAssignmentsWithMetadata] Push completed');

    logger.info('PeopleService', 'Bulk assignments with metadata posted successfully', { count: people.length });
}

/**
 * Post empty assignments to AIMS (for canceling assignments)
 * Sends empty data for all field values except the article ID
 * @param people - People whose assignments to clear
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function postEmptyAssignments(
    people: Person[],
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    logger.info('PeopleService', 'Posting empty assignments to AIMS', { count: people.length });

    const mappingInfo = mappingConfig?.mappingInfo;

    // Build empty article data for all people in proper AIMS format
    const articles = people.map(person => {
        const emptyData: Record<string, string> = {};
        
        // Set all person data fields to empty strings
        Object.keys(person.data).forEach(key => {
            emptyData[key] = '';
        });
        
        // Also clear any global field assignments (set to empty)
        const globalFields = mappingConfig?.globalFieldAssignments || {};
        Object.keys(globalFields).forEach(key => {
            emptyData[key] = '';
        });

        // The articleId field should still have the space number
        const articleIdField = mappingInfo?.articleId;
        const articleIdValue = person.assignedSpaceId || person.id;
        if (articleIdField) {
            emptyData[articleIdField] = articleIdValue;
        }
        
        // Construct the article in the correct AIMS format
        const aimsArticle: Record<string, any> = {
            data: emptyData
        };

        // Set root-level articleId
        aimsArticle.articleId = articleIdValue;
        
        // Set root-level articleName (empty or use articleId)
        if (mappingInfo?.articleName) {
            aimsArticle.articleName = '';
        } else {
            aimsArticle.articleName = articleIdValue;
        }

        // Set store if configured (keep it for identification)
        if (mappingInfo?.store && emptyData[mappingInfo.store]) {
            aimsArticle.store = String(emptyData[mappingInfo.store]);
        }
        
        return aimsArticle;
    });

    // Push all empty articles to AIMS using POST
    await pushArticles(config, config.storeNumber, token, articles);

    logger.info('PeopleService', 'Empty assignments posted successfully', { count: people.length });
}

/**
 * Clear specific space IDs in AIMS by posting empty articles
 * Used when switching lists to clear spaces that are no longer assigned
 * @param spaceIds - Array of space IDs to clear
 * @param config - SoluM configuration
 * @param token - Access token
 * @param mappingConfig - SoluM mapping configuration
 */
export async function clearSpaceIdsInAims(
    spaceIds: string[],
    config: SolumConfig,
    token: string,
    mappingConfig?: SolumMappingConfig
): Promise<void> {
    if (spaceIds.length === 0) {
        logger.info('PeopleService', 'No space IDs to clear');
        return;
    }

    logger.info('PeopleService', 'Clearing space IDs in AIMS', { count: spaceIds.length, spaceIds });

    const mappingInfo = mappingConfig?.mappingInfo;
    const fields = mappingConfig?.fields || {};
    const globalFields = mappingConfig?.globalFieldAssignments || {};

    // Build empty articles for each space ID
    const articles = spaceIds.map(spaceId => {
        const emptyData: Record<string, string> = {};

        // Set all fields to empty strings
        Object.keys(fields).forEach(key => {
            emptyData[key] = '';
        });

        // Also clear any global field assignments
        Object.keys(globalFields).forEach(key => {
            emptyData[key] = '';
        });

        // The articleId field should have the space number
        const articleIdField = mappingInfo?.articleId;
        if (articleIdField) {
            emptyData[articleIdField] = spaceId;
        }

        // Preserve global fields that should always have values
        Object.entries(globalFields).forEach(([fieldKey, value]) => {
            if (value) {
                emptyData[fieldKey] = value;
            }
        });

        // Also keep ID field with the space ID
        if (articleIdField) {
            emptyData[articleIdField] = spaceId;
        }

        // Construct the article in the correct AIMS format
        const aimsArticle: Record<string, any> = {
            articleId: spaceId,
            articleName: '',
            data: emptyData
        };

        return aimsArticle;
    });

    // Push all empty articles to AIMS
    await pushArticles(config, config.storeNumber, token, articles);

    logger.info('PeopleService', 'Space IDs cleared in AIMS successfully', { count: spaceIds.length });
}
