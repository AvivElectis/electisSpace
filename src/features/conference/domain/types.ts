/**
 * Conference Feature Domain Types
 * ConferenceRoom type is defined in shared/domain/types.ts
 */

export interface ConferenceFilters {
    searchQuery?: string;
    hasMeeting?: boolean;
    [key: string]: string | boolean | undefined;
}

export interface ConferenceStats {
    total: number;
    occupied: number;
    available: number;
}
