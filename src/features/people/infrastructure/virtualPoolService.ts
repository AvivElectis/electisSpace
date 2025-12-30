/**
 * Virtual Pool Service
 * Manages virtual pool IDs for people without assigned physical spaces.
 * Pool IDs allow syncing people to SoluM AIMS even without physical ESL assignments.
 */

import { logger } from '@shared/infrastructure/services/logger';

const POOL_PREFIX = 'POOL-';

export interface VirtualPoolConfig {
    prefix: string;
    startIndex: number;
    maxPoolSize: number;
}

const defaultConfig: VirtualPoolConfig = {
    prefix: POOL_PREFIX,
    startIndex: 1,
    maxPoolSize: 9999,
};

/**
 * Get next available pool ID
 * Reuses freed pool IDs by finding the lowest available number
 * 
 * @param existingPoolIds - Set of already used pool IDs (only active ones, not cleared/freed)
 * @param config - Optional configuration for pool ID generation
 * @returns Next available pool ID (e.g., "POOL-0001")
 */
export function getNextPoolId(
    existingPoolIds: Set<string>,
    config: VirtualPoolConfig = defaultConfig
): string {
    // Collect all pool numbers currently in use
    const usedNumbers = new Set(
        Array.from(existingPoolIds)
            .filter(id => isPoolId(id, config))
            .map(id => parseInt(id.replace(config.prefix, ''), 10))
            .filter(n => !isNaN(n))
    );

    // Find the lowest available number (reuse freed numbers)
    let counter = config.startIndex;
    while (usedNumbers.has(counter) && counter <= config.maxPoolSize) {
        counter++;
    }

    if (counter > config.maxPoolSize) {
        // If all numbers are used, wrap around and find any gap
        for (let i = config.startIndex; i <= config.maxPoolSize; i++) {
            if (!usedNumbers.has(i)) {
                counter = i;
                break;
            }
        }
    }

    const candidate = `${config.prefix}${String(counter).padStart(4, '0')}`;

    logger.debug('VirtualPoolService', 'Generated pool ID (with reuse)', { 
        candidate, 
        existingCount: existingPoolIds.size,
        usedCount: usedNumbers.size
    });

    return candidate;
}

/**
 * Check if article ID is a pool ID
 * 
 * @param articleId - The article ID to check
 * @param config - Optional configuration
 * @returns True if the ID is a pool ID
 */
export function isPoolId(
    articleId: string,
    config: VirtualPoolConfig = defaultConfig
): boolean {
    return articleId.startsWith(config.prefix);
}

/**
 * Generate multiple pool IDs at once (for bulk import)
 * If preferredPoolIds are provided, reuses those first (lowest numbers first)
 * 
 * @param count - Number of pool IDs to generate
 * @param existingPoolIds - Set of already used pool IDs (active in local store)
 * @param config - Optional configuration
 * @param preferredPoolIds - Optional set of pool IDs to reuse first (e.g., empty POOL articles from AIMS)
 * @returns Array of generated pool IDs
 */
export function generatePoolIds(
    count: number,
    existingPoolIds: Set<string>,
    config: VirtualPoolConfig = defaultConfig,
    preferredPoolIds?: Set<string>
): string[] {
    const generated: string[] = [];
    const allIds = new Set(existingPoolIds);

    // If we have preferred pool IDs (empty articles in AIMS), use those first
    if (preferredPoolIds && preferredPoolIds.size > 0) {
        // Filter out any that are already in use locally, and sort by number (lowest first)
        const availablePreferred = Array.from(preferredPoolIds)
            .filter(id => !allIds.has(id))
            .sort((a, b) => {
                const numA = extractPoolNumber(a, config) || 0;
                const numB = extractPoolNumber(b, config) || 0;
                return numA - numB;
            });
        
        logger.info('VirtualPoolService', 'Reusing empty POOL articles from AIMS', { 
            availableCount: availablePreferred.length,
            needed: count 
        });
        
        // Use preferred IDs first
        for (let i = 0; i < count && availablePreferred.length > 0; i++) {
            const preferred = availablePreferred.shift()!;
            generated.push(preferred);
            allIds.add(preferred);
        }
    }

    // Generate remaining pool IDs if needed
    const remaining = count - generated.length;
    for (let i = 0; i < remaining; i++) {
        const newId = getNextPoolId(allIds, config);
        generated.push(newId);
        allIds.add(newId);
    }

    logger.info('VirtualPoolService', 'Generated pool IDs', { 
        count: generated.length,
        reusedFromAims: count - remaining,
        newlyGenerated: remaining
    });

    return generated;
}

/**
 * Extract pool ID number from a pool ID string
 * 
 * @param poolId - The pool ID (e.g., "POOL-0042")
 * @param config - Optional configuration
 * @returns The numeric part (e.g., 42) or null if not a valid pool ID
 */
export function extractPoolNumber(
    poolId: string,
    config: VirtualPoolConfig = defaultConfig
): number | null {
    if (!isPoolId(poolId, config)) {
        return null;
    }

    const numStr = poolId.replace(config.prefix, '');
    const num = parseInt(numStr, 10);

    return isNaN(num) ? null : num;
}
