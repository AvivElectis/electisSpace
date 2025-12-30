import type { Space, CSVConfig } from '@shared/domain/types';

/**
 * Space Domain Business Rules
 */

/**
 * Generate unique space ID
 * @param name - Descriptive name to derive ID from
 * @param existingIds - List of existing IDs
 * @returns Unique ID
 */
export function generateSpaceId(name: string, existingIds: string[]): string {
    // Extract room number from name if possible
    const match = name.match(/\d+/);
    const roomNumber = match ? match[0] : '1';

    // Generate base ID
    let id = roomNumber;
    let counter = 1;

    // Ensure uniqueness
    while (existingIds.includes(id)) {
        id = `${roomNumber}-${counter}`;
        counter++;
    }

    return id;
}

/**
 * Merge space with default values from configuration
 * @param space - Partial space data
 * @param csvConfig - CSV configuration
 * @returns Complete space with defaults
 */
export function mergeSpaceDefaults(
    space: Partial<Space>,
    csvConfig: CSVConfig
): Space {
    const data: Record<string, string> = { ...space.data };

    // Ensure all CSV columns have values (empty string if not provided)
    for (const column of csvConfig.columns) {
        if (!(column.name in data)) {
            data[column.name] = '';
        }
    }

    // Build complete space
    const completeSpace: Space = {
        id: space.id || '',
        data,
        labelCode: space.labelCode,
        templateName: space.templateName,
    };

    return completeSpace;
}

/**
 * Filter spaces by search query and filters
 * @param spaces - Spaces list
 * @param searchQuery - Search text
 * @param filters - Additional filters
 * @returns Filtered spaces
 */
export function filterSpaces(
    spaces: Space[],
    searchQuery?: string,
    filters?: Record<string, string>
): Space[] {
    let filtered = [...spaces];

    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(space => {
            // Search in ID
            if (space.id.toLowerCase().includes(query)) return true;

            // Search in data fields
            for (const value of Object.values(space.data)) {
                if (value.toLowerCase().includes(query)) return true;
            }

            return false;
        });
    }

    // Apply field filters
    if (filters) {
        for (const [field, value] of Object.entries(filters)) {
            if (value && value !== '') {
                filtered = filtered.filter(space => {
                    return space.data[field] === value;
                });
            }
        }
    }

    return filtered;
}

/**
 * Get unique values for a field across spaces
 * @param spaces - Spaces list
 * @param fieldName - Field name to extract values from
 * @returns Sorted unique values
 */
export function getUniqueFieldValues(spaces: Space[], fieldName: string): string[] {
    const values = new Set<string>();

    for (const space of spaces) {
        if (space.data[fieldName]) {
            values.add(space.data[fieldName]);
        }
    }

    return Array.from(values).sort();
}
