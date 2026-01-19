# Shared Domain Layer

> **Documentation for `src/shared/domain` - The Business Rules.**

## Core Models

### **Space**
Represents a physical entity that can be assigned an ESL tag.
- `id`: Unique identifier (String).
- `data`: A key-value map for dynamic fields (Name, Price, SKU, etc.).
- `labelCode`: The MAC address of the assigned ESL label.
- `templateName`: The visual template to use on the ESL.

### **ConferenceRoom**
Represents a meeting space with schedule capabilities.
- `id`: Unique identifier (starts with 'C').
- `hasMeeting`: Boolean status (Occupied/Free).
- `meetingName`, `startTime`, `endTime`, `participants`: Schedule data.

### **AppData**
The structure used for full Data Export/Import.
```typescript
interface AppData {
    spaces: Space[];
    conferenceRooms?: ConferenceRoom[];
    store: string;
}
```

## Configuration Types

### **WorkingMode**
The operational mode of the application.
- `SOLUM_API`: Direct integration with SoluM AIMS via HTTP API.
- `SFTP`: File-based integration via CSV upload to an SFTP server.

### **SolumConfig**
Configuration for connecting to AIMS server.
- `companyName`, `username`, `password`: Auth credentials.
- `baseUrl`: API endpoint.
- `storeNumber`: Target store ID.
- `cluster`: API cluster ('common' vs 'c1').

### **CSVConfig**
Configuration for parsing CSV files.
- `delimiter`: (e.g., ';', ',').
- `columns`: Mapping of CSV columns to internal fields.
- `mapping`: Legacy field mapping object.

## Validation Strategy
Validation logic is centralized in `domain/validation.ts`.
- Pure functions that take data and configuration, and return `ValidationResult`.
- Ensures data integrity before it enters the application state.
