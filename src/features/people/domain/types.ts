/**
 * People Management Feature Domain Types
 */

/**
 * List membership entry - allows a person to be in multiple lists with different assignments per list
 */
export interface ListMembership {
    listName: string;           // List storage name (underscores)
    spaceId?: string;           // Space assignment for this list (null/undefined = unassigned in this list)
}

export interface Person {
    id: string;  // UUID - stable across devices
    virtualSpaceId?: string;  // POOL-XXXX or physical space ID (for AIMS sync)
    data: Record<string, string>;  // Dynamic fields from CSV (name, department, etc.)
    assignedSpaceId?: string;  // Physical space assignment (undefined if in pool)
    aimsSyncStatus?: 'pending' | 'synced' | 'error';  // AIMS sync status
    lastSyncedAt?: string;  // ISO timestamp of last successful sync
    assignedLabels?: string[];  // Array of label IDs assigned to this person's article from AIMS
    
    // Multi-list support (stored in AIMS as _LIST_MEMBERSHIPS_ JSON)
    listMemberships?: ListMembership[];  // Array of lists this person belongs to, each with its own assignment
    
    // Legacy fields (deprecated - kept for backward compatibility during migration)
    /** @deprecated Use listMemberships instead */
    listName?: string;
    /** @deprecated Use listMemberships instead */
    listSpaceId?: string;
}

/**
 * Helper to get all list names a person belongs to
 */
export function getPersonListNames(person: Person): string[] {
    if (person.listMemberships && person.listMemberships.length > 0) {
        return person.listMemberships.map(m => m.listName);
    }
    // Backward compatibility
    if (person.listName) {
        return [person.listName];
    }
    return [];
}

/**
 * Helper to get a person's space assignment for a specific list
 */
export function getPersonListSpaceId(person: Person, listName: string): string | undefined {
    const membership = person.listMemberships?.find(m => m.listName === listName);
    if (membership) {
        return membership.spaceId;
    }
    // Backward compatibility
    if (person.listName === listName) {
        return person.listSpaceId;
    }
    return undefined;
}

/**
 * Helper to check if person is in a specific list
 */
export function isPersonInList(person: Person, listName: string): boolean {
    if (person.listMemberships?.some(m => m.listName === listName)) {
        return true;
    }
    // Backward compatibility
    return person.listName === listName;
}

/**
 * Helper to add or update a person's membership in a list
 */
export function setPersonListMembership(person: Person, listName: string, spaceId?: string): Person {
    const memberships = [...(person.listMemberships || [])];
    const existingIndex = memberships.findIndex(m => m.listName === listName);
    
    if (existingIndex >= 0) {
        memberships[existingIndex] = { listName, spaceId };
    } else {
        memberships.push({ listName, spaceId });
    }
    
    return {
        ...person,
        listMemberships: memberships,
        // Clear legacy fields
        listName: undefined,
        listSpaceId: undefined,
    };
}

/**
 * Helper to remove a person from a specific list
 */
export function removePersonFromList(person: Person, listName: string): Person {
    const memberships = (person.listMemberships || []).filter(m => m.listName !== listName);
    
    return {
        ...person,
        listMemberships: memberships.length > 0 ? memberships : undefined,
        // Clear legacy fields if they match
        listName: person.listName === listName ? undefined : person.listName,
        listSpaceId: person.listName === listName ? undefined : person.listSpaceId,
    };
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
