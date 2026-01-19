# Core Mechanics: CSV Engine

> **Module**: `src/shared/infrastructure/services/csvService.ts`
> **Primary Consumer**: `Data Import` (People/Spaces) and `SFTPSyncAdapter`
> **Status**: Stable

## 1. Overview

The CSV Engine is a flexible, configuration-driven parser that converts raw CSV text into domain entities (`Space`, `ConferenceRoom`, `Person`). Unlike a rigid parser, it uses a **Mapping Configuration** that allows the system to adapt to different customer CSV layouts without code changes.

## 2. Configuration (`EnhancedCSVConfig`)

The engine relies on a strictly typed configuration object:

```typescript
interface EnhancedCSVConfig {
    hasHeader: boolean;           // Usually true
    delimiter: ',' | ';' | '\t';  // Supported delimiters
    idColumn: string;             // Which column contains the unique ID
    
    // Column Definitions
    columns: CSVColumnMapping[];  
    
    // Conference Room Logic
    conferenceEnabled: boolean;   
    conferencePrefix?: string;    // Defaults to 'C'
    conferenceMapping?: ConferenceFieldMapping;
}
```

### 2.1 Column Mapping
Each column in the CSV is mapped to an internal field name.

```typescript
interface CSVColumnMapping {
    fieldName: string;    // App internal name (e.g. "name", "rank")
    csvColumn: number;    // 0-based index
    friendlyName: string; // UI Label "Employee Name"
    required: boolean;    // Validation rule
}
```

---

## 3. Parsing Logic (`parseCSVEnhanced`)

The parser performs a single pass over the file but produces polymorphic output (Spaces + Conference Rooms).

### 3.1 ID Detection
The detected ID determines the entity type:
1.  **Conference Room**: If ID starts with `C` or `c` (configurable prefix).
2.  **Space**: All other IDs.

### 3.2 Conference Room Extraction
When a row is identified as a Conference Room (e.g., ID `C101`):
- **Prefix Reversal**: The prefix `C` is *stripped* internally (`101`) for cleaner UI display.
- **Meeting Detection**: `hasMeeting` is derived from the presence of data in the mapped `meetingName` column.
- **Mapping**: Specific columns (Start Time, End Time, Participants) are extracted based on `conferenceMapping`.

### 3.3 Space Extraction
- **Prefix**: None.
- **Data Bag**: All other columns are stored in the `data` record.
- **Label Code**: If a `labelCode` column exists, it is extracted to top-level property.

---

## 4. Generation Logic (`generateCSVEnhanced`)

Writes domain entities back to CSV format.

### 4.1 Re-Prefixing
- **Spaces**: Written as-is.
- **Conference Rooms**: The ID is *prefixed* again with `C` (e.g., `101` -> `C101`) to ensure the external system recognizes it as a room.

### 4.2 Polymorphic Writing
The generator iterates through `spaces` AND `conferenceRooms` arrays, serializing both into a single unified CSV file, preserving the original column layout defined in the config.

---

## 5. Legacy vs Enhanced
The system supports two parsers:
1.  **Legacy (`parseCSV`)**: Uses simple key-value `mapping: { [key]: index }`. Being phased out.
2.  **Enhanced (`parseCSVEnhanced`)**: The robust engine described above. Used for SFTP and People Manager.
