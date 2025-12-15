# Low-Level Design: API Specifications

## Overview

This document provides detailed API specifications for every function, hook, service, and component in the DentalMedicalCenter v2 application.

---

## Table of Contents

1. [Personnel Feature](#personnel-feature)
2. [Conference Feature](#conference-feature)
3. [Sync Feature](#sync-feature)
4. [Settings Feature](#settings-feature)
5. [Shared Services](#shared-services)
6. [Shared Utilities](#shared-utilities)
7. [Store Interfaces](#store-interfaces)

---

## Personnel Feature

### Domain Layer

#### `features/personnel/domain/types.ts`

```typescript
/**
 * Core person entity
 */
export interface Person {
  id: string;
  roomName: string;
  data: Record<string, string>;  // Dynamic fields
  labelCode?: string;            // SoluM label assignment
  templateName?: string;         // SoluM template
}

/**
 * Chair list entity (saved personnel configurations)
 */
export interface ChairList {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  personnel: Person[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Filter criteria
 */
export interface PersonnelFilters {
  room?: string;
  title?: string;
  specialty?: string;
  searchQuery?: string;
}
```

#### `features/personnel/domain/validation.ts`

```typescript
/**
 * Validate a person entity
 * @param person - Person to validate
 * @param csvConfig - CSV configuration for mandatory field checks
 * @returns ValidationResult
 */
export function validatePerson(
  person: Person, 
  csvConfig: CSVConfig
): ValidationResult;

/**
 * Validate chair list name
 * @param name - Chair list name
 * @returns ValidationResult
 */
export function validateChairListName(name: string): ValidationResult;

/**
 * Check if person ID is unique in list
 * @param id - Person ID to check
 * @param personnel - Current personnel list
 * @param excludeId - ID to exclude from check (for updates)
 * @returns boolean
 */
export function isPersonIdUnique(
  id: string,
  personnel: Person[],
  excludeId?: string
): boolean;
```

#### `features/personnel/domain/businessRules.ts`

```typescript
/**
 * Generate a unique person ID
 * @param roomName - Base room name
 * @param existingIds - Already used IDs
 * @returns string
 */
export function generatePersonId(
  roomName: string, 
  existingIds: string[]
): string;

/**
 * Merge person data with defaults
 * @param person - Partial person data
 * @param csvConfig - CSV configuration
 * @param appConfig - App configuration (for NFC URL, Store ID)
 * @returns Person
 */
export function mergePersonDefaults(
  person: Partial<Person>,
  csvConfig: CSVConfig,
  appConfig: { nfcUrl: string; storeNumber: string }
): Person;
```

---

### Application Layer

#### `features/personnel/application/usePersonnelController.ts`

```typescript
/**
 * Main personnel controller hook
 * Provides CRUD operations and business logic orchestration
 */
export function usePersonnelController() {
  
  /**
   * Add a new person
   * @param person - Person data (partial, will be merged with defaults)
   * @returns Promise<void>
   * @throws Error if validation fails or sync fails
   */
  const addPerson = async (person: Partial<Person>): Promise<void>;

  /**
   * Update existing person
   * @param id - Person ID
   * @param updates - Partial person data to update
   * @returns Promise<void>
   * @throws Error if person not found or validation fails
   */
  const updatePerson = async (
    id: string, 
    updates: Partial<Person>
  ): Promise<void>;

  /**
   * Delete a person
   * @param id - Person ID
   * @returns Promise<void>
   * @throws Error if person not found or sync fails
   */
  const deletePerson = async (id: string): Promise<void>;

  /**
   * Find person by ID
   * @param id - Person ID
   * @returns Person | undefined
   */
  const findPersonById = (id: string): Person | undefined;

  /**
   * Import personnel from external sync source
   * Uses the active sync adapter to download and parse data
   * @returns Promise<void>
   * @throws Error if sync fails or parsing fails
   */
  const importFromSync = async (): Promise<void>;

  /**
   * Export personnel to external sync destination
   * Uses the active sync adapter to upload data
   * @returns Promise<void>
   * @throws Error if sync fails
   */
  const exportToSync = async (): Promise<void>;

  /**
   * Get all personnel
   * @returns Person[]
   */
  const getAllPersonnel = (): Person[];

  /**
   * Loading state
   */
  const isLoading: boolean;

  /**
   * Error state
   */
  const error: string | null;

  return {
    addPerson,
    updatePerson,
    deletePerson,
    findPersonById,
    importFromSync,
    exportToSync,
    getAllPersonnel,
    isLoading,
    error,
  };
}
```

#### `features/personnel/application/usePersonnelFilters.ts`

```typescript
/**
 * Personnel filtering logic
 */
export function usePersonnelFilters() {
  
  /**
   * Current filter state
   */
  const filters: PersonnelFilters;

  /**
   * Set filter criteria
   * @param newFilters - Partial filter updates
   */
  const setFilters = (newFilters: Partial<PersonnelFilters>): void;

  /**
   * Reset all filters
   */
  const resetFilters = (): void;

  /**
   * Get filtered personnel list
   * Applies all active filters
   * @param personnel - Full personnel list
   * @returns Person[] - Filtered list
   */
  const getFilteredPersonnel = (personnel: Person[]): Person[];

  /**
   * Get unique filter options from personnel data
   * Used to populate filter dropdowns
   * @param personnel - Personnel list
   * @returns FilterOptions
   */
  const getFilterOptions = (personnel: Person[]): FilterOptions;

  return {
    filters,
    setFilters,
    resetFilters,
    getFilteredPersonnel,
    getFilterOptions,
  };
}

export interface FilterOptions {
  rooms: string[];
  titles: string[];
  specialties: string[];
}
```

#### `features/personnel/application/useChairLists.ts`

```typescript
/**
 * Chair list management controller
 */
export function useChairLists() {
  
  /**
   * Save current personnel as a chair list
   * @param name - Chair list name
   * @param id - Optional ID for update
   * @returns Promise<string> - ID of saved chair list
   */
  const saveChairList = async (
    name: string, 
    id?: string
  ): Promise<string>;

  /**
   * Load a chair list
   * @param id - Chair list ID
   * @returns Promise<void>
   */
  const loadChairList = async (id: string): Promise<void>;

  /**
   * Delete a chair list
   * @param id - Chair list ID
   * @returns Promise<void>
   */
  const deleteChairList = async (id: string): Promise<void>;

  /**
   * Get all saved chair lists
   * @returns ChairList[]
   */
  const getAllChairLists = (): ChairList[];

  return {
    saveChairList,
    loadChairList,
    deleteChairList,
    getAllChairLists,
  };
}
```

---

### Infrastructure Layer

#### `features/personnel/infrastructure/personnelStore.ts`

```typescript
/**
 * Personnel store slice (Zustand)
 */
export interface PersonnelStore {
  // State
  personnel: Person[];
  chairLists: ChairList[];

  // Actions
  setPersonnel: (personnel: Person[]) => void;
  addPersonToStore: (person: Person) => void;
  updatePersonInStore: (id: string, updates: Partial<Person>) => void;
  removePersonFromStore: (id: string) => void;
  
  saveChairListToStore: (list: ChairList) => void;
  removeChairListFromStore: (id: string) => void;
}

/**
 * Create personnel store slice
 */
export const createPersonnelStore: StateCreator<PersonnelStore>;
```

---

## Conference Feature

### Domain Layer

#### `features/conference/domain/types.ts`

```typescript
export interface ConferenceRoom {
  id: string;              // Format: C{number}
  roomName: string;
  hasMeeting: boolean;
  meetingName: string;
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  participants: string[];
  labelCode?: string;
  data?: Record<string, string>;
}

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface TimeValidationResult {
  valid: boolean;
  error?: string;
}
```

#### `features/conference/domain/validation.ts`

```typescript
/**
 * Validate time range format and logic
 * @param startTime - Start time (HH:mm)
 * @param endTime - End time (HH:mm)
 * @returns TimeValidationResult
 */
export function validateTimeRange(
  startTime: string, 
  endTime: string
): TimeValidationResult;

/**
 * Validate conference room data
 * @param room - Conference room
 * @returns ValidationResult
 */
export function validateConferenceRoom(
  room: ConferenceRoom
): ValidationResult;

/**
 * Check if room ID is valid format (C{number})
 * @param id - Room ID
 * @returns boolean
 */
export function isValidRoomId(id: string): boolean;
```

#### `features/conference/domain/businessRules.ts`

```typescript
/**
 * Generate next available conference room ID
 * @param existingRooms - Current conference rooms
 * @returns string - Next ID (e.g., "C01", "C02")
 */
export function generateNextRoomId(
  existingRooms: ConferenceRoom[]
): string;

/**
 * Check if conference room has active meeting
 * Compares current time with meeting time range
 * @param room - Conference room
 * @param currentTime - Current time (ISO string)
 * @returns boolean
 */
export function isRoomOccupied(
  room: ConferenceRoom, 
  currentTime: string
): boolean;
```

---

### Application Layer

#### `features/conference/application/useConferenceController.ts`

```typescript
/**
 * Conference room controller
 */
export function useConferenceController() {
  
  /**
   * Add a new conference room
   * @param roomName - Room name
   * @returns Promise<string> - New room ID
   */
  const addRoom = async (roomName: string): Promise<string>;

  /**
   * Update conference room
   * @param id - Room ID
   * @param updates - Partial room updates
   * @returns Promise<void>
   */
  const updateRoom = async (
    id: string, 
    updates: Partial<ConferenceRoom>
  ): Promise<void>;

  /**
   * Delete conference room
   * @param id - Room ID
   * @returns Promise<void>
   */
  const deleteRoom = async (id: string): Promise<void>;

  /**
   * Toggle meeting status for a room
   * @param id - Room ID
   * @param hasMeeting - Meeting active state
   * @returns Promise<void>
   */
  const toggleMeeting = async (
    id: string, 
    hasMeeting: boolean
  ): Promise<void>;

  /**
   * Update meeting details
   * @param id - Room ID
   * @param meetingName - Meeting name
   * @param timeRange - Time range
   * @param participants - Participant list
   * @returns Promise<void>
   */
  const updateMeeting = async (
    id: string,
    meetingName: string,
    timeRange: TimeRange,
    participants: string[]
  ): Promise<void>;

  /**
   * Update label page for simple conference mode
   * Toggles between Occupied/Available
   * @param id - Room ID
   * @param page - Page number (0 or 1)
   * @returns Promise<void>
   */
  const updateLabelPage = async (
    id: string, 
    page: number
  ): Promise<void>;

  /**
   * Get all conference rooms
   * @returns ConferenceRoom[]
   */
  const getAllRooms = (): ConferenceRoom[];

  /**
   * Get current room (for single-room view)
   * @returns ConferenceRoom | undefined
   */
  const getCurrentRoom = (): ConferenceRoom | undefined;

  const isLoading: boolean;
  const error: string | null;

  return {
    addRoom,
    updateRoom,
    deleteRoom,
    toggleMeeting,
    updateMeeting,
    updateLabelPage,
    getAllRooms,
    getCurrentRoom,
    isLoading,
    error,
  };
}
```

---

### Infrastructure Layer

#### `features/conference/infrastructure/conferenceStore.ts`

```typescript
export interface ConferenceStore {
  conferenceRooms: ConferenceRoom[];
  currentRoomId: string | null;

  setConferenceRooms: (rooms: ConferenceRoom[]) => void;
  setCurrentRoomId: (id: string | null) => void;
  addRoomToStore: (room: ConferenceRoom) => void;
  updateRoomInStore: (id: string, updates: Partial<ConferenceRoom>) => void;
  removeRoomFromStore: (id: string) => void;
}

export const createConferenceStore: StateCreator<ConferenceStore>;
```

---

## Sync Feature

### Domain Layer

#### `features/sync/domain/types.ts`

```typescript
/**
 * Sync adapter interface
 * All sync implementations must conform to this interface
 */
export interface SyncAdapter {
  /**
   * Connect to external system
   * Validates credentials and establishes connection
   */
  connect(): Promise<void>;

  /**
   * Disconnect from external system
   */
  disconnect(): Promise<void>;

  /**
   * Download data from external system
   * @returns Person[] - Downloaded personnel data
   */
  download(): Promise<Person[]>;

  /**
   * Upload data to external system
   * @param personnel - Personnel data to upload
   */
  upload(personnel: Person[]): Promise<void>;

  /**
   * Bi-directional sync (download + merge logic)
   * Implementation-specific merge strategy
   */
  sync(): Promise<void>;

  /**
   * Get current connection status
   * @returns SyncStatus
   */
  getStatus(): SyncStatus;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync?: Date;
  lastError?: string;
}

export type SyncMode = 'SFTP' | 'SOLUM_API';
```

---

### Infrastructure Layer

#### `features/sync/infrastructure/SFTPSyncAdapter.ts`

```typescript
/**
 * SFTP sync adapter implementation
 */
export class SFTPSyncAdapter implements SyncAdapter {
  
  constructor(
    private sftpClient: SFTPAPIClient,
    private csvService: CSVService,
    private credentials: SFTPCredentials,
    private csvConfig: CSVConfig
  );

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async download(): Promise<Person[]>;
  async upload(personnel: Person[]): Promise<void>;
  async sync(): Promise<void>;
  getStatus(): SyncStatus;
}
```

**Implementation Details:**
- `download()`: Downloads CSV file, parses with `csvService.parseCSV()`
- `upload()`: Generates CSV with `csvService.generateCSV()`, uploads file
- `sync()`: Downloads, no merge (full replace)

#### `features/sync/infrastructure/SolumSyncAdapter.ts`

```typescript
/**
 * SoluM API sync adapter implementation
 */
export class SolumSyncAdapter implements SyncAdapter {
  
  constructor(
    private solumService: SolumService,
    private config: SolumConfig,
    private tokens: SolumTokens | null,
    private csvConfig: CSVConfig,
    private onTokenUpdate: (tokens: SolumTokens) => void
  );

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async download(): Promise<Person[]>;
  async upload(personnel: Person[]): Promise<void>;
  async sync(): Promise<void>;
  getStatus(): SyncStatus;

  /**
   * Get valid access token (refresh if needed)
   * @returns Promise<string>
   */
  private async getValidToken(): Promise<string>;

  /**
   * Map SoluM articles to Person entities
   * @param articles - SoluM articles
   * @param labels - SoluM labels
   * @returns Person[]
   */
  private mapArticlesToPersonnel(
    articles: any[], 
    labels: any[]
  ): Person[];

  /**
   * Map Person entities to SoluM articles
   * @param personnel - Personnel list
   * @returns any[]
   */
  private mapPersonnelToArticles(personnel: Person[]): any[];
}
```

**Implementation Details:**
- `connect()`: Login to SoluM API, store tokens
- `download()`: Fetch articles + labels, map to Person[]
- `upload()`: Map Person[] to articles, push to SoluM
- `getValidToken()`: Auto-refresh if token expires in < 5 minutes

---

### Application Layer

#### `features/sync/application/useSyncController.ts`

```typescript
/**
 * Unified sync controller
 * Dynamically selects adapter based on working mode
 */
export function useSyncController() {
  
  /**
   * Get current sync adapter
   * @returns SyncAdapter
   */
  const getAdapter = (): SyncAdapter;

  /**
   * Trigger manual sync
   * @returns Promise<void>
   */
  const sync = async (): Promise<void>;

  /**
   * Connect to external system
   * @returns Promise<void>
   */
  const connect = async (): Promise<void>;

  /**
   * Disconnect from external system
   */
  const disconnect = (): void;

  /**
   * Get sync status
   * @returns SyncStatus
   */
  const getStatus = (): SyncStatus;

  /**
   * Auto-sync state (enabled/disabled)
   */
  const isAutoSyncEnabled: boolean;

  /**
   * Toggle auto-sync
   * @param enabled - Enable or disable
   */
  const setAutoSync = (enabled: boolean): void;

  const isLoading: boolean;
  const error: string | null;

  return {
    sync,
    connect,
    disconnect,
    getStatus,
    isAutoSyncEnabled,
    setAutoSync,
    isLoading,
    error,
  };
}
```

**Auto-Sync Logic:**
- Runs on interval (configurable per mode)
- SFTP: 60s default
- SoluM: `solumConfig.syncInterval` (default 60s)
- Pauses when user is actively editing

---

## Settings Feature

### Domain Layer

#### `features/settings/domain/types.ts`

```typescript
export interface AppSettings {
  name: string;
  subtitle: string;
  autoSaveEnabled: boolean;
  spaceType: SpaceType;  // 'room' | 'chair'
}

export interface SFTPCredentials {
  username: string;
  password: string;
  remoteFileName: string;
  store: string;
}

export interface SolumConfig {
  baseUrl: string;
  company: string;
  store: string;
  username: string;
  password?: string;
  syncInterval: number;
  simpleConferenceMode: boolean;
  enableConferenceMode: boolean;
}

export interface SettingsFile {
  version: string;
  workingMode: WorkingMode;
  appSettings: AppSettings;
  sftpConfig?: SFTPCredentials;
  solumConfig?: SolumConfig;
  csvConfig: CSVConfig;
  nfcUrl: string;
  language: 'en' | 'he';
  logos: string[];
}
```

---

### Application Layer

#### `features/settings/application/useSettingsController.ts`

```typescript
/**
 * Settings management controller
 */
export function useSettingsController() {
  
  /**
   * Update app settings
   * @param updates - Partial app settings
   */
  const updateAppSettings = (
    updates: Partial<AppSettings>
  ): void;

  /**
   * Update SFTP credentials
   * @param credentials - SFTP credentials
   */
  const updateSFTPCredentials = (
    credentials: SFTPCredentials
  ): void;

  /**
   * Update SoluM configuration
   * @param config - SoluM config
   */
  const updateSolumConfig = (config: SolumConfig): void;

  /**
   * Update CSV configuration
   * @param csvConfig - CSV config
   */
  const updateCSVConfig = (csvConfig: CSVConfig): void;

  /**
   * Update NFC URL
   * @param nfcUrl - NFC URL
   */
  const updateNfcUrl = (nfcUrl: string): void;

  /**
   * Switch working mode
   * @param mode - 'SFTP' | 'SOLUM_API'
   */
  const switchWorkingMode = (mode: WorkingMode): void;

  /**
   * Upload logo
   * @param index - Logo index (0-2)
   * @param dataUrl - Image data URL
   */
  const uploadLogo = (index: number, dataUrl: string): void;

  /**
   * Export settings to file
   * @returns SettingsFile
   */
  const exportSettings = (): SettingsFile;

  /**
   * Import settings from file
   * @param settingsFile - Settings file object
   * @throws Error if validation fails
   */
  const importSettings = (settingsFile: SettingsFile): void;

  /**
   * Validate settings file
   * @param settingsFile - Settings file to validate
   * @returns ValidationResult
   */
  const validateSettingsFile = (
    settingsFile: any
  ): ValidationResult;

  const currentSettings: SettingsFile;
  const hasUnsavedChanges: boolean;

  return {
    updateAppSettings,
    updateSFTPCredentials,
    updateSolumConfig,
    updateCSVConfig,
    updateNfcUrl,
    switchWorkingMode,
    uploadLogo,
    exportSettings,
    importSettings,
    validateSettingsFile,
    currentSettings,
    hasUnsavedChanges,
  };
}
```

---

### Infrastructure Layer

#### `features/settings/infrastructure/settingsStore.ts`

```typescript
export interface SettingsStore {
  appSettings: AppSettings;
  sftpCredentials: SFTPCredentials | null;
  solumConfig: SolumConfig | null;
  csvConfig: CSVConfig;
  nfcUrl: string;
  language: 'en' | 'he';
  logos: string[];
  workingMode: WorkingMode;

  setAppSettings: (settings: AppSettings) => void;
  setSFTPCredentials: (creds: SFTPCredentials) => void;
  setSolumConfig: (config: SolumConfig) => void;
  setCSVConfig: (config: CSVConfig) => void;
  setNfcUrl: (url: string) => void;
  setLanguage: (lang: 'en' | 'he') => void;
  setLogos: (logos: string[]) => void;
  setWorkingMode: (mode: WorkingMode) => void;
}

export const createSettingsStore: StateCreator<SettingsStore>;
```

---

## Shared Services

### CSV Service

#### `shared/infrastructure/services/csvService.ts`

```typescript
/**
 * Parse CSV content to AppData
 * @param csvContent - Raw CSV string
 * @param config - CSV configuration
 * @returns AppData
 * @throws Error if parsing fails
 */
export function parseCSV(
  csvContent: string, 
  config: CSVConfig
): AppData;

/**
 * Generate CSV from AppData
 * @param data - App data (personnel + conference rooms)
 * @param config - CSV configuration
 * @param globalNfcUrl - Global NFC URL to inject
 * @returns string - CSV content
 */
export function generateCSV(
  data: AppData, 
  config: CSVConfig,
  globalNfcUrl?: string
): string;

/**
 * Validate CSV configuration
 * @param config - CSV config
 * @returns boolean
 */
export function validateCSV(config: CSVConfig): boolean;

/**
 * Ensure CSV has proper header
 * Adds header if missing
 * @param csvContent - CSV content
 * @param config - CSV configuration
 * @returns { csv: string, modified: boolean }
 */
export function ensureCSVHeader(
  csvContent: string, 
  config: CSVConfig
): { csv: string; modified: boolean };
```

---

### Logger Service

#### `shared/infrastructure/services/logger.ts`

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log debug message
 * @param category - Log category (e.g., 'SFTP', 'SolumSync')
 * @param message - Log message
 * @param data - Optional data object
 */
export function debug(
  category: string, 
  message: string, 
  data?: any
): void;

/**
 * Log info message
 */
export function info(
  category: string, 
  message: string, 
  data?: any
): void;

/**
 * Log warning message
 */
export function warn(
  category: string, 
  message: string, 
  data?: any
): void;

/**
 * Log error message
 */
export function error(
  category: string, 
  message: string, 
  data?: any
): void;

/**
 * Get all logs
 * @returns LogEntry[]
 */
export function getLogs(): LogEntry[];

/**
 * Clear all logs
 */
export function clearLogs(): void;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}
```

---

### Encryption Service

#### `shared/infrastructure/services/encryptionService.ts`

```typescript
/**
 * Encrypt sensitive data
 * @param plainText - Data to encrypt
 * @param password - Encryption password
 * @returns string - Encrypted data (Base64)
 */
export function encrypt(
  plainText: string, 
  password: string
): string;

/**
 * Decrypt sensitive data
 * @param cipherText - Encrypted data (Base64)
 * @param password - Decryption password
 * @returns string - Decrypted plaintext
 * @throws Error if decryption fails
 */
export function decrypt(
  cipherText: string, 
  password: string
): string;

/**
 * Hash password (for verification)
 * @param password - Password to hash
 * @returns string - Hashed password
 */
export function hashPassword(password: string): string;

/**
 * Verify password against hash
 * @param password - Password to verify
 * @param hash - Hash to compare against
 * @returns boolean
 */
export function verifyPassword(
  password: string, 
  hash: string
): boolean;
```

---

## Shared Utilities

### Validators

#### `shared/utils/validators.ts`

```typescript
/**
 * Validate email format
 * @param email - Email string
 * @returns boolean
 */
export function isValidEmail(email: string): boolean;

/**
 * Validate phone number format
 * @param phone - Phone string
 * @returns boolean
 */
export function isValidPhone(phone: string): boolean;

/**
 * Validate URL format
 * @param url - URL string
 * @returns boolean
 */
export function isValidUrl(url: string): boolean;

/**
 * Validate time format (HH:mm)
 * @param time - Time string
 * @returns boolean
 */
export function isValidTime(time: string): boolean;

/**
 * Create room ID from room number
 * @param roomNumber - Room number
 * @returns string - Format: C{number}
 */
export function createRoomId(roomNumber: number): string;
```

---

### Constants

#### `shared/utils/constants.ts`

```typescript
export const APP_VERSION = '2.0.0';
export const SFTP_API_HOST = 'https://sftp-api.example.com';
export const DEFAULT_SYNC_INTERVAL = 60;  // seconds
export const DEFAULT_CSV_DELIMITER = ',';
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;  // 2MB
export const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg'];

export const DEFAULT_CONFERENCE_ROOM: Partial<ConferenceRoom> = {
  hasMeeting: false,
  meetingName: '',
  startTime: '09:00',
  endTime: '10:00',
  participants: [],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  name: 'Dental Medical Center',
  subtitle: 'Electronic Label Management',
  autoSaveEnabled: true,
  spaceType: 'room',
};
```

---

## Store Interfaces

### Root Store

#### `shared/infrastructure/store/rootStore.ts`

```typescript
/**
 * Combined application store
 * Merges all feature stores
 */
export type RootStore = 
  PersonnelStore & 
  ConferenceStore & 
  SettingsStore & 
  SyncStore;

/**
 * Create root store with persistence
 */
export const useRootStore = create<RootStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createPersonnelStore(...args),
        ...createConferenceStore(...args),
        ...createSettingsStore(...args),
        ...createSyncStore(...args),
      }),
      {
        name: 'dental-app-storage',
        partialize: (state) => ({
          // Only persist these fields
          personnel: state.personnel,
          chairLists: state.chairLists,
          conferenceRooms: state.conferenceRooms,
          appSettings: state.appSettings,
          csvConfig: state.csvConfig,
          workingMode: state.workingMode,
          // ... etc
        }),
      }
    )
  )
);
```

---

## Summary

This low-level design document specifies **50+ functions** across:
- **4 Features:** Personnel, Conference, Sync, Settings
- **3 Service layers:** CSV, Logger, Encryption
- **Utilities:** Validators, Constants
- **State Management:** Zustand store slices

Each function includes:
- TypeScript signature
- Parameter descriptions
- Return types
- Side effects
- Error conditions

This serves as the complete API contract for implementation.
