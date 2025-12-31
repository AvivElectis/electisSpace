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
    assignedLabels?: string[];  // Array of label IDs assigned to this person's article from AIMS
    
    // List-related fields (stored in AIMS hidden fields)
    listName?: string;      // Current list assignment (stored with underscores in AIMS)
    listSpaceId?: string;   // Space ID from loaded list (not active assignment until applied)
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
    name: string;           // Display name (with spaces)
    storageName: string;    // AIMS storage name (with underscores)
    createdAt: string;
    updatedAt?: string;
    people: Person[];
    isFromAIMS?: boolean;   // True if fetched from AIMS
}

// List name validation constants
export const LIST_NAME_MAX_LENGTH = 20;
// Pattern includes: English letters, Hebrew letters (\u0590-\u05FF), numbers, and spaces
export const LIST_NAME_PATTERN = /^[a-zA-Z0-9\u0590-\u05FF\s]+$/;

/**
 * Convert display name to AIMS storage name (spaces → underscores)
 */
export function toStorageName(name: string): string {
    return name.trim().replace(/\s+/g, '_');
}

/**
 * Convert AIMS storage name to display name (underscores → spaces)
 */
export function toDisplayName(storageName: string): string {
    return storageName.replace(/_/g, ' ');
}

/**
 * Validate list name according to rules:
 * - Required (non-empty after trim)
 * - Max 20 characters
 * - Only letters (English/Hebrew), numbers, and spaces allowed
 */
export function validateListName(name: string): { valid: boolean; error?: string } {
    const trimmed = name.trim();
    if (!trimmed) {
        return { valid: false, error: 'List name is required' };
    }
    if (trimmed.length > LIST_NAME_MAX_LENGTH) {
        return { valid: false, error: `Max ${LIST_NAME_MAX_LENGTH} characters allowed` };
    }
    if (!LIST_NAME_PATTERN.test(trimmed)) {
        return { valid: false, error: 'Only letters, numbers, and spaces allowed' };
    }
    return { valid: true };
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
