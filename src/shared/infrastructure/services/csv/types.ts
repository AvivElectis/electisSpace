/**
 * CSV Service Type Definitions
 */

/**
 * Enhanced CSV column mapping
 */
export interface CSVColumnMapping {
    fieldName: string;       // Field name in app (e.g., 'id', 'name', 'rank')
    csvColumn: number;       // Column index in CSV (0-based)
    friendlyName: string;    // Display name for UI (English)
    friendlyNameHe?: string; // Display name for UI (Hebrew)
    required: boolean;       // Whether this column is required/visible
}

/**
 * Conference field mapping
 */
export interface ConferenceFieldMapping {
    roomName?: string;       // Field name for conference room name
    meetingName: string;     // Field name for meeting name
    meetingTime: string;     // Field name for meeting time (or startTime)
    endTime?: string;        // Field name for meeting end time
    participants?: string;   // Field name for participants (semicolon-separated)
}

/**
 * Enhanced CSV configuration
 */
export interface EnhancedCSVConfig {
    hasHeader: boolean;           // Whether CSV has a header row
    delimiter: ',' | ';' | '\t';  // Column delimiter
    columns: CSVColumnMapping[];  // Column mappings
    idColumn: string;             // Field name to use as unique ID
    conferenceEnabled: boolean;   // Whether to parse conference rooms
    conferencePrefix?: string;    // Prefix for conference room IDs (default: 'C')
    conferenceMapping?: ConferenceFieldMapping;  // Field mappings for conference rooms
    globalFieldAssignments?: { [fieldKey: string]: string };  // Global field values applied to all records
}
