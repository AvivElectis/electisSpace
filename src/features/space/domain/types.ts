/**
 * Space Feature Domain Types
 */

export interface SpaceList {
    id: string;
    name: string;
    createdAt: string;
    updatedAt?: string;
    spaces: import('@shared/domain/types').Space[];
}

export interface SpaceFilters {
    searchQuery?: string;
    room?: string;
    // Additional filters based on dynamic CSV fields
    [key: string]: string | undefined;
}

export interface FilterOptions {
    rooms: string[];
    // Dynamic field options based on CSV config
    [key: string]: string[];
}
