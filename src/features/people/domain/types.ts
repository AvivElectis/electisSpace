/**
 * People Management Feature Domain Types
 */

export interface Person {
    id: string;  // UUID - stable across devices
    virtualSpaceId?: string;  // POOL-XXXX or physical space ID (for AIMS sync)
    data: Record<string, string>;  // Dynamic fields from CSV (name, department, etc.)
    assignedSpaceId?: string;  // Physical space assignment (undefined if in pool)
    aimsSyncStatus?: 'pending' | 'synced' | 'error';  // AIMS sync status
    lastSyncedAt?: string;  // ISO timestamp of last successful sync
}

/**
 * Helper to get the effective virtual space ID for a person
 * Falls back to assignedSpaceId or person id if virtualSpaceId not set
 */
export function getVirtualSpaceId(person: Person): string {
    return person.virtualSpaceId || person.assignedSpaceId || person.id;
}

export interface PeopleList {
    id: string;
    name: string;
    createdAt: string;
    updatedAt?: string;
    people: Person[];
}

export interface SpaceAllocation {
    totalSpaces: number;  // Total available spaces
    assignedSpaces: number;  // Number of spaces currently assigned
    availableSpaces: number;  // Calculated: totalSpaces - assignedSpaces
}

export interface PeopleFilters {
    searchQuery?: string;
    assignmentStatus?: 'all' | 'assigned' | 'unassigned';
    // Additional filters based on dynamic CSV fields
    [key: string]: string | undefined;
}
