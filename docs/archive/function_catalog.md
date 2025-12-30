# Function Catalog & API Reference

## Overview

Complete index of all functions, hooks, components, and services in DentalMedicalCenter v2.

**Total Count:**
- **Functions:** 65+
- **React Hooks:** 8
- **React Components:** 31
- **Services:** 4
- **Utilities:** 12

---

## Table of Contents

1. [Personnel Feature Functions](#personnel-feature-functions)
2. [Conference Feature Functions](#conference-feature-functions)
3. [Sync Feature Functions](#sync-feature-functions)
4. [Settings Feature Functions](#settings-feature-functions)
5. [Shared Services](#shared-services)
6. [Shared Utilities](#shared-utilities)
7. [React Components](#react-components)
8. [React Hooks](#react-hooks)
9. [Quick Reference Index](#quick-reference-index)

---

## Personnel Feature Functions

### Domain Functions (`features/personnel/domain/`)

#### validation.ts

**1. validatePerson**
```typescript
Location: features/personnel/domain/validation.ts
Signature: (person: Person, csvConfig: CSVConfig) => ValidationResult
Purpose: Validate person entity against CSV configuration rules
Dependencies: CSVConfig type
Example:
  const result = validatePerson(newPerson, csvConfig);
  if (!result.valid) {
    console.error(result.errors);
  }
```

**2. validateChairListName**
```typescript
Location: features/personnel/domain/validation.ts
Signature: (name: string) => ValidationResult
Purpose: Validate chair list name (non-empty, max length 100)
Dependencies: None
Example:
  const result = validateChairListName("Main List");
  // { valid: true, errors: [] }
```

**3. isPersonIdUnique**
```typescript
Location: features/personnel/domain/validation.ts
Signature: (id: string, personnel: Person[], excludeId?: string) => boolean
Purpose: Check if person ID is unique in the list
Dependencies: Person type
Example:
  const isUnique = isPersonIdUnique("P001", allPersonnel);
  // true or false
```

#### businessRules.ts

**4. generatePersonId**
```typescript
Location: features/personnel/domain/businessRules.ts
Signature: (roomName: string, existingIds: string[]) => string
Purpose: Generate unique person ID from room name
Dependencies: None
Example:
  const id = generatePersonId("Room 101", ["R101-1", "R101-2"]);
  // Returns: "R101-3"
```

**5. mergePersonDefaults**
```typescript
Location: features/personnel/domain/businessRules.ts
Signature: (person: Partial<Person>, csvConfig: CSVConfig, appConfig: { nfcUrl: string; storeNumber: string }) => Person
Purpose: Merge partial person data with defaults (NFC URL, Store ID)
Dependencies: CSVConfig, Person types
Example:
  const fullPerson = mergePersonDefaults(
    { roomName: "Room 1" },
    csvConfig,
    { nfcUrl: "https://...", storeNumber: "STORE01" }
  );
```

---

### Application Functions (`features/personnel/application/`)

#### usePersonnelController Hook

**6. usePersonnelController.addPerson**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: (person: Partial<Person>) => Promise<void>
Purpose: Add new person with validation and sync
Dependencies: PersonnelStore, SyncController
Throws: Error on validation failure or sync failure
Example:
  const { addPerson } = usePersonnelController();
  await addPerson({ roomName: "Room 1", data: { ... } });
```

**7. usePersonnelController.updatePerson**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: (id: string, updates: Partial<Person>) => Promise<void>
Purpose: Update existing person
Throws: Error if person not found
Example:
  await updatePerson("P001", { roomName: "New Room" });
```

**8. usePersonnelController.deletePerson**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: (id: string) => Promise<void>
Purpose: Delete person and sync
Example:
  await deletePerson("P001");
```

**9. usePersonnelController.findPersonById**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: (id: string) => Person | undefined
Purpose: Find person by ID
Example:
  const person = findPersonById("P001");
```

**10. usePersonnelController.importFromSync**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: () => Promise<void>
Purpose: Import personnel from external system via sync adapter
Example:
  await importFromSync();  // Downloads from SFTP or SoluM
```

**11. usePersonnelController.exportToSync**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: () => Promise<void>
Purpose: Export personnel to external system
Example:
  await exportToSync();
```

**12. usePersonnelController.getAllPersonnel**
```typescript
Location: features/personnel/application/usePersonnelController.ts
Signature: () => Person[]
Purpose: Get all personnel from store
Example:
  const personnel = getAllPersonnel();
```

#### usePersonnelFilters Hook

**13. usePersonnelFilters.getFilteredPersonnel**
```typescript
Location: features/personnel/application/usePersonnelFilters.ts
Signature: (personnel: Person[]) => Person[]
Purpose: Apply active filters to personnel list
Example:
  const filtered = getFilteredPersonnel(allPersonnel);
```

**14. usePersonnelFilters.getFilterOptions**
```typescript
Location: features/personnel/application/usePersonnelFilters.ts
Signature: (personnel: Person[]) => FilterOptions
Purpose: Extract unique filter values for dropdowns
Returns: { rooms: string[], titles: string[], specialties: string[] }
Example:
  const options = getFilterOptions(personnel);
```

**15. usePersonnelFilters.setFilters**
```typescript
Location: features/personnel/application/usePersonnelFilters.ts
Signature: (filters: Partial<PersonnelFilters>) => void
Purpose: Update filter criteria
Example:
  setFilters({ room: "Room 1", title: "Dentist" });
```

---

## Conference Feature Functions

### Domain Functions (`features/conference/domain/`)

**16. validateTimeRange**
```typescript
Location: features/conference/domain/validation.ts
Signature: (startTime: string, endTime: string) => TimeValidationResult
Purpose: Validate time format (HH:mm) and logic (end > start)
Example:
  const result = validateTimeRange("09:00", "17:00");
  // { valid: true }
```

**17. validateConferenceRoom**
```typescript
Location: features/conference/domain/validation.ts
Signature: (room: ConferenceRoom) => ValidationResult
Purpose: Validate conference room entity
Example:
  const result = validateConferenceRoom(room);
```

**18. isValidRoomId**
```typescript
Location: features/conference/domain/validation.ts
Signature: (id: string) => boolean
Purpose: Check if room ID matches format C{number}
Example:
  isValidRoomId("C01");  // true
  isValidRoomId("R01");  // false
```

**19. generateNextRoomId**
```typescript
Location: features/conference/domain/businessRules.ts
Signature: (existingRooms: ConferenceRoom[]) => string
Purpose: Generate next sequential conference room ID
Example:
  const nextId = generateNextRoomId(rooms);  // "C03" if C01, C02 exist
```

**20. isRoomOccupied**
```typescript
Location: features/conference/domain/businessRules.ts
Signature: (room: ConferenceRoom, currentTime: string) => boolean
Purpose: Check if room has active meeting based on time
Example:
  const busy = isRoomOccupied(room, new Date().toISOString());
```

---

### Application Functions (`features/conference/application/`)

#### useConferenceController Hook

**21. useConferenceController.addRoom**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (roomName: string) => Promise<string>
Purpose: Add new conference room
Returns: New room ID
Example:
  const id = await addRoom("Meeting Room A");
```

**22. useConferenceController.updateRoom**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (id: string, updates: Partial<ConferenceRoom>) => Promise<void>
Purpose: Update conference room
Example:
  await updateRoom("C01", { meetingName: "Board Meeting" });
```

**23. useConferenceController.deleteRoom**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (id: string) => Promise<void>
Purpose: Delete conference room
Example:
  await deleteRoom("C01");
```

**24. useConferenceController.toggleMeeting**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (id: string, hasMeeting: boolean) => Promise<void>
Purpose: Toggle meeting status and update label page (simple mode)
Example:
  await toggleMeeting("C01", true);  // Mark as occupied
```

**25. useConferenceController.updateMeeting**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (id: string, meetingName: string, timeRange: TimeRange, participants: string[]) => Promise<void>
Purpose: Update full meeting details
Example:
  await updateMeeting("C01", "Sprint Planning", 
    { startTime: "09:00", endTime: "11:00" }, 
    ["Alice", "Bob"]
  );
```

**26. useConferenceController.updateLabelPage**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: (id: string, page: number) => Promise<void>
Purpose: Directly update SoluM label page (0 or 1)
Example:
  await updateLabelPage("C01", 1);  // Show "Occupied"
```

**27. useConferenceController.getAllRooms**
```typescript
Location: features/conference/application/useConferenceController.ts
Signature: () => ConferenceRoom[]
Purpose: Get all conference rooms
Example:
  const rooms = getAllRooms();
```

---

## Sync Feature Functions

### Domain Interface (`features/sync/domain/types.ts`)

**SyncAdapter Interface** (implemented by SFTP and SoluM adapters)

**28. SyncAdapter.connect**
```typescript
Signature: () => Promise<void>
Purpose: Establish connection to external system
Throws: Error on connection failure
```

**29. SyncAdapter.disconnect**
```typescript
Signature: () => Promise<void>
Purpose: Disconnect from external system
```

**30. SyncAdapter.download**
```typescript
Signature: () => Promise<Person[]>
Purpose: Download personnel data from external system
Returns: Person[] array
```

**31. SyncAdapter.upload**
```typescript
Signature: (personnel: Person[]) => Promise<void>
Purpose: Upload personnel data to external system
```

**32. SyncAdapter.sync**
```typescript
Signature: () => Promise<void>
Purpose: Bi-directional sync (download + update store)
```

**33. SyncAdapter.getStatus**
```typescript
Signature: () => SyncStatus
Purpose: Get current sync status
Returns: { isConnected: boolean, lastSync?: Date, lastError?: string }
```

---

### Infrastructure - SFTP Adapter (`features/sync/infrastructure/SFTPSyncAdapter.ts`)

**34. SFTPSyncAdapter.connect**
```typescript
Implementation: Calls sftpService.testConnection()
Purpose: Test SFTP connection via API
```

**35. SFTPSyncAdapter.download**
```typescript
Implementation:
  1. sftpService.downloadFile()
  2. csvService.parseCSV()
  3. Return Person[]
Purpose: Download and parse CSV file
```

**36. SFTPSyncAdapter.upload**
```typescript
Implementation:
  1. csvService.generateCSV()
  2. sftpService.uploadFile()
Purpose: Generate and upload CSV file
```

---

### Infrastructure - SoluM Adapter (`features/sync/infrastructure/SolumSyncAdapter.ts`)

**37. SolumSyncAdapter.connect**
```typescript
Implementation: solumService.login() → store tokens
Purpose: Authenticate with SoluM API
```

**38. SolumSyncAdapter.getValidToken**
```typescript
Location: features/sync/infrastructure/SolumSyncAdapter.ts (private)
Signature: () => Promise<string>
Purpose: Get access token, refresh if needed
Logic:
  if (expiresAt - now < 5min) {
    refresh token
  }
  return accessToken
```

**39. SolumSyncAdapter.mapArticlesToPersonnel**
```typescript
Location: features/sync/infrastructure/SolumSyncAdapter.ts (private)
Signature: (articles: any[], labels: any[]) => Person[]
Purpose: Map SoluM articles to Person entities using CSV config
```

**40. SolumSyncAdapter.mapPersonnelToArticles**
```typescript
Location: features/sync/infrastructure/SolumSyncAdapter.ts (private)
Signature: (personnel: Person[]) => any[]
Purpose: Map Person entities to SoluM articles
```

**41. SolumSyncAdapter.download**
```typescript
Implementation:
  1. getValidToken()
  2. solumService.fetchArticles()
  3. solumService.getLabels()
  4. mapArticlesToPersonnel()
Purpose: Fetch and map SoluM data
```

**42. SolumSyncAdapter.upload**
```typescript
Implementation:
  1. mapPersonnelToArticles()
  2. solumService.pushArticles()
  3. Update label assignments if changed
Purpose: Push personnel data to SoluM
```

---

### Application - Sync Controller (`features/sync/application/useSyncController.ts`)

**43. useSyncController.getAdapter**
```typescript
Signature: () => SyncAdapter
Purpose: Get current sync adapter based on workingMode
Returns: SFTPSyncAdapter | SolumSyncAdapter
```

**44. useSyncController.sync**
```typescript
Signature: () => Promise<void>
Purpose: Trigger manual sync
Example:
  const { sync } = useSyncController();
  await sync();
```

**45. useSyncController.connect**
```typescript
Signature: () => Promise<void>
Purpose: Connect to external system
```

**46. useSyncController.setAutoSync**
```typescript
Signature: (enabled: boolean) => void
Purpose: Enable/disable auto-sync
Example:
  setAutoSync(true);  // Start periodic sync
```

---

## Settings Feature Functions

### Application - Settings Controller (`features/settings/application/useSettingsController.ts`)

**47. useSettingsController.updateAppSettings**
```typescript
Signature: (updates: Partial<AppSettings>) => void
Purpose: Update app settings (name, subtitle, space type)
Example:
  updateAppSettings({ name: "My Clinic", spaceType: "chair" });
```

**48. useSettingsController.updateSFTPCredentials**
```typescript
Signature: (credentials: SFTPCredentials) => void
Purpose: Update SFTP connection settings
```

**49. useSettingsController.updateSolumConfig**
```typescript
Signature: (config: SolumConfig) => void
Purpose: Update SoluM API configuration
```

**50. useSettingsController.updateCSVConfig**
```typescript
Signature: (csvConfig: CSVConfig) => void
Purpose: Update CSV column mappings
```

**51. useSettingsController.switchWorkingMode**
```typescript
Signature: (mode: WorkingMode) => void
Purpose: Switch between SFTP and SoluM modes
Side Effect: Disconnects current adapter, clears sync status
```

**52. useSettingsController.uploadLogo**
```typescript
Signature: (index: number, dataUrl: string) => void
Purpose: Upload logo image (0-2 slots)
Validation: Max size 2MB, PNG/JPEG only
```

**53. useSettingsController.exportSettings**
```typescript
Signature: () => SettingsFile
Purpose: Export all settings to JSON object
Returns: Complete settings file
```

**54. useSettingsController.importSettings**
```typescript
Signature: (settingsFile: SettingsFile) => void
Purpose: Import settings from file
Throws: Error if validation fails
```

**55. useSettingsController.validateSettingsFile**
```typescript
Signature: (settingsFile: any) => ValidationResult
Purpose: Validate settings file structure and data
```

---

## Shared Services

### CSV Service (`shared/infrastructure/services/csvService.ts`)

**56. parseCSV**
```typescript
Signature: (csvContent: string, config: CSVConfig) => AppData
Purpose: Parse CSV string to AppData object
Returns: { personnel: Person[], conferenceRooms?: ConferenceRoom[], store: string }
Throws: Error on parse failure
Example:
  const data = parseCSV(csvString, csvConfig);
```

**57. generateCSV**
```typescript
Signature: (data: AppData, config: CSVConfig, globalNfcUrl?: string) => string
Purpose: Generate CSV string from AppData
Returns: CSV content string
Example:
  const csv = generateCSV(appData, csvConfig, nfcUrl);
```

**58. validateCSV**
```typescript
Signature: (config: CSVConfig) => boolean
Purpose: Validate CSV configuration
Returns: true if valid
```

**59. ensureCSVHeader**
```typescript
Signature: (csvContent: string, config: CSVConfig) => { csv: string, modified: boolean }
Purpose: Add header row if missing
Returns: Corrected CSV and modification flag
```

---

### Logger Service (`shared/infrastructure/services/logger.ts`)

**60. logger.debug**
```typescript
Signature: (category: string, message: string, data?: any) => void
Purpose: Log debug-level message
Example:
  logger.debug('SFTP', 'Connection test started', { host });
```

**61. logger.info**
```typescript
Signature: (category: string, message: string, data?: any) => void
Purpose: Log info-level message
```

**62. logger.warn**
```typescript
Signature: (category: string, message: string, data?: any) => void
Purpose: Log warning message
```

**63. logger.error**
```typescript
Signature: (category: string, message: string, data?: any) => void
Purpose: Log error message
```

**64. logger.getLogs**
```typescript
Signature: () => LogEntry[]
Purpose: Retrieve all log entries
Returns: Array of log entries with timestamps
```

**65. logger.clearLogs**
```typescript
Signature: () => void
Purpose: Clear all logs
```

---

### Encryption Service (`shared/infrastructure/services/encryptionService.ts`)

**66. encrypt**
```typescript
Signature: (plainText: string, password: string) => string
Purpose: Encrypt sensitive data using AES-256
Returns: Base64 encrypted string
```

**67. decrypt**
```typescript
Signature: (cipherText: string, password: string) => string
Purpose: Decrypt encrypted data
Throws: Error if decryption fails (wrong password)
```

**68. hashPassword**
```typescript
Signature: (password: string) => string
Purpose: Hash password for verification
Returns: Hashed password string
```

**69. verifyPassword**
```typescript
Signature: (password: string, hash: string) => boolean
Purpose: Verify password against hash
Returns: true if match
```

---

### SoluM Service (`shared/infrastructure/services/solumService.ts`)

**70. solumService.login**
```typescript
Signature: (config: SolumConfig) => Promise<SolumTokens>
Purpose: Authenticate and get access tokens
Returns: { accessToken, refreshToken, expiresAt }
```

**71. solumService.refreshToken**
```typescript
Signature: (config: SolumConfig, refreshToken: string) => Promise<SolumTokens>
Purpose: Refresh access token
```

**72. solumService.fetchArticles**
```typescript
Signature: (config: SolumConfig, storeId: string, token: string) => Promise<any[]>
Purpose: Fetch all articles for a store
```

**73. solumService.pushArticles**
```typescript
Signature: (config: SolumConfig, storeId: string, token: string, articles: any[]) => Promise<void>
Purpose: Push article updates
```

**74. solumService.getLabels**
```typescript
Signature: (config: SolumConfig, storeId: string, token: string) => Promise<any[]>
Purpose: Get all labels and assignments
```

**75. solumService.assignLabel**
```typescript
Signature: (config: SolumConfig, storeId: string, token: string, labelCode: string, articleId: string, templateName?: string) => Promise<void>
Purpose: Assign label to article
```

**76. solumService.updateLabelPage**
```typescript
Signature: (config: SolumConfig, storeId: string, token: string, labelCode: string, page: number) => Promise<void>
Purpose: Update label page (simple conference mode)
```

---

## Shared Utilities

### Validators (`shared/utils/validators.ts`)

**77. isValidEmail**
```typescript
Signature: (email: string) => boolean
Purpose: Validate email format
Example:
  isValidEmail("user@example.com");  // true
```

**78. isValidPhone**
```typescript
Signature: (phone: string) => boolean
Purpose: Validate phone number format
```

**79. isValidUrl**
```typescript
Signature: (url: string) => boolean
Purpose: Validate URL format
```

**80. isValidTime**
```typescript
Signature: (time: string) => boolean
Purpose: Validate time format (HH:mm)
Example:
  isValidTime("09:30");  // true
  isValidTime("9:30");   // false
```

**81. createRoomId**
```typescript
Signature: (roomNumber: number) => string
Purpose: Create conference room ID
Example:
  createRoomId(1);   // "C01"
  createRoomId(10);  // "C10"
```

---

## React Components

### Personnel Components (`features/personnel/presentation/`)

**82. PersonnelManagement** - Main personnel management container
**83. PersonDialog** - Add/Edit person dialog
**84. PersonForm** - Person form (inside dialog)
**85. PersonnelTable** - Table view of personnel
**86. PersonnelCards** - Card view of personnel
**87. LoadListDialog** - Load chair list dialog
**88. SaveListDialog** - Save chair list dialog

### Conference Components (`features/conference/presentation/`)

**89. ConferenceRoomList** - List of conference rooms
**90. ConferenceRoomForm** - Edit conference room form
**91. AddRoomDialog** - Add new room dialog
**92. TimeRangePicker** - Time range selector component
**93. ParticipantList** - List of meeting participants
**94. ParticipantDialog** - Add participant dialog

### Settings Components (`features/settings/presentation/`)

**95. SettingsDialog** - Main settings dialog container
**96. AppSettings** - App settings tab
**97. SFTPSettings** - SFTP configuration tab
**98. SolumSettings** - SoluM API configuration tab
**99. LogoSettings** - Logo upload interface
**100. SettingsFileManager** - Import/Export settings
**101. SettingsLoginDialog** - Password protection for settings
**102. SecuritySettings** - Security configuration
**103. LogViewer** - View application logs

### Shared Components (`shared/presentation/components/`)

**104. ErrorBoundary** - Error boundary wrapper
**105. NotificationContainer** - Toast notifications
**106. FilterDrawer** - Advanced filter sidebar
**107. TableToolbar** - Table action toolbar
**108. SyncStatusIndicator** - Sync status badge
**109. JsonEditor** - JSON editor component
**110. LoadingFallback** - Loading placeholder for code splitting

### Layout Components (`shared/presentation/layouts/`)

**111. MainLayout** - Main app layout with tabs
**112. Header** - App header with title and actions

---

## React Hooks

**113. usePersonnelController** - Personnel CRUD operations
**114. usePersonnelFilters** - Personnel filtering logic
**115. useChairLists** - Chair list management
**116. useConferenceController** - Conference room operations
**117. useSyncController** - Sync operations
**118. useSettingsController** - Settings management
**119. usePlatform** - Platform detection (web/iOS/Android)
**120. useSpaceLabels** - Dynamic room/chair label generation

---

## Quick Reference Index

### By Category

**Validation Functions:**
- validatePerson (#1)
- validateChairListName (#2)
- validateTimeRange (#16)
- validateConferenceRoom (#17)
- isValidRoomId (#18)
- isValidEmail (#77)
- isValidPhone (#78)
- isValidUrl (#79)
- isValidTime (#80)

**Business Logic Functions:**
- generatePersonId (#4)
- mergePersonDefaults (#5)
- generateNextRoomId (#19)
- isRoomOccupied (#20)

**CRUD Operations:**
- addPerson (#6)
- updatePerson (#7)
- deletePerson (#8)
- addRoom (#21)
- updateRoom (#22)
- deleteRoom (#23)

**Sync Operations:**
- SyncAdapter.connect (#28)
- SyncAdapter.download (#30)
- SyncAdapter.upload (#31)
- SyncAdapter.sync (#32)
- useSyncController.sync (#44)

**Settings Operations:**
- exportSettings (#53)
- importSettings (#54)
- switchWorkingMode (#51)

**Data Transformation:**
- parseCSV (#56)
- generateCSV (#57)
- mapArticlesToPersonnel (#39)
- mapPersonnelToArticles (#40)

**Logging:**
- logger.debug (#60)
- logger.info (#61)
- logger.warn (#62)
- logger.error (#63)

---

## Summary

This catalog documents **120+ entities** including:
- 80+ Functions and methods
- 8 Custom React hooks
- 31 React components
- Complete API surface for all features

Each function includes location, signature, purpose, and usage examples for implementation reference.
