# Shared Infrastructure Layer

> **Documentation for `src/shared/infrastructure` - The Backbone of the App.**

## Services

### 1. **SoluM Service** (`services/solumService.ts`)
The unified interface for interacting with the SoluM ESL API.
- **Modules**:
  - `authService`: Login, Token Refresh (`login`, `refreshToken`).
  - `articlesService`: CRUD for Articles (`fetchArticles`, `pushArticles`, `deleteArticles`).
  - `labelsService`: Tag assignments (`getLabels`, `assignLabel`, `uassignLabel`).
- **Usage**: Used primarily by `SolumSyncAdapter` to perform sync operations.

### 2. **CSV Service** (`services/csvService.ts`)
Handles parsing and generation of CSV files.
- **Legacy Mode**: Simple key-value mapping based on `CSVConfig`.
- **Enhanced Mode** (SFTP): Supports complex column mapping, conference room detection (ID prefix 'C'), and global field assignments.
- **Key Functions**:
  - `parseCSVEnhanced(content, config)`: Returns `{ spaces, conferenceRooms }`.
  - `generateCSVEnhanced(spaces, rooms, config)`: Returns CSV string.
  - `extractHeadersFromCSV(content)`: Auto-detects headers for configuration UI.

### 3. **Logger Service** (`services/logger.ts`)
A singleton semantic logger with in-memory storage and persistence integration.
- **Features**:
  - **Categories**: Typed categories (e.g., 'Auth', 'Sync', 'AIMS').
  - **Performance**: `startTimer`, `endTimer`, `measureAsync` for profiling.
  - **Persistence**: Automatically pushes critical logs to `logsStore` (IndexedDB).
  - **Export**: JSON/CSV export for debugging.
- **Usage**: `logger.info('Category', 'Message', { data })`.

## Stores (Global State)

Shared stores provide cross-feature state management.

### **Logs Store** (`store/logsStore.ts`)
- Persists application logs to IndexedDB.
- Used by the System Logs viewer feature.

### Base Persistence Types
- `SyncState`: Tracks status (`idle`, `syncing`, `success`, `error`) and progress.
- `AppData`: Legacy contract for export/import.

## Sync Adapters

Infrastructure defines the `SyncAdapter` interface used by features to communicate with backends.

```typescript
interface SyncAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    sync(): Promise<void>;
    upload(items: any[]): Promise<void>;
    download(): Promise<any[]>;
    getStatus(): SyncState;
}
```
- **Implementations**:
  - `SolumSyncAdapter`: Talk to AIMS API.
  - `SFTPSyncAdapter`: Talk to SFTP Server (via CSV generation).
