/**
 * People Management Feature Domain Types
 */

export interface Person {
    id: string;  // Unique person identifier (from ARTICLE_ID)
    data: Record<string, string>;  // Dynamic fields from CSV (name, department, etc.)
    assignedSpaceId?: string;  // Optional space assignment
    aimsSyncStatus?: 'pending' | 'synced' | 'error';  // AIMS sync status
    lastSyncedAt?: string;  // ISO timestamp of last successful sync
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
