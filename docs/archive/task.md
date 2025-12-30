# Sprint 1: Architecture & Foundation - Task Breakdown

## Overview

Comprehensive checklist for building DentalMedicalCenter v2 from scratch following documented architecture.

**Total Phases:** 12  
**Total Hours:** 160h

---

## Phase 0: Project Initialization (8h)

### Project Setup
- [ ] Create new Vite project: `npm create vite@latest DentalMedicalCenterV2 -- --template react-ts`
- [ ] Install core dependencies (zustand, i18next, react-router, MUI)
- [ ] Install utility dependencies (papaparse, crypto-js, uuid)
- [ ] Install dev dependencies (vitest, testing-library)
- [ ] Configure TypeScript (strict mode, path mappings)
- [ ] Configure Vite (aliases, code splitting)
- [ ] Create directory structure (features/, shared/)
- [ ] Setup ESLint configuration
- [ ] Initialize Git repository
- [ ] Create .gitignore

---

## Phase 1: Shared Infrastructure (16h)

### Shared Domain
- [ ] Create `shared/domain/types.ts`
  - [ ] Define Person, ConferenceRoom, ChairList
  - [ ] Define CSVConfig, CSVColumn, FieldMapping
  - [ ] Define SFTPCredentials, SolumConfig, SolumTokens
  - [ ] Define WorkingMode, SpaceType, ConnectionStatus

### Shared Services
- [ ] **Logger Service** (`shared/infrastructure/services/logger.ts`)
  - [ ] Implement debug(), info(), warn(), error()
  - [ ] Implement getLogs(), clearLogs()
  - [ ] Add in-memory log storage
  - [ ] Test: Logs appear in console with proper formatting

- [ ] **CSV Service** (`shared/infrastructure/services/csvService.ts`)
  - [ ] Implement parseCSV() - PapaParse integration
  - [ ] Implement generateCSV() - dynamic column generation
  - [ ] Implement validateCSV()
  - [ ] Implement ensureCSVHeader()
  - [ ] Test: Parse → Generate roundtrip preserves data

- [ ] **Encryption Service** (`shared/infrastructure/services/encryptionService.ts`)
  - [ ] Implement encrypt() - AES-256 with crypto-js
  - [ ] Implement decrypt()
  - [ ] Implement hashPassword()
  - [ ] Implement verifyPassword()
  - [ ] Test: Encrypt → Decrypt roundtrip
  - [ ] Test: Password hash verification

- [ ] **SoluM Service** (`shared/infrastructure/services/solumService.ts`)
  - [ ] Port from v1: login()
  - [ ] Port from v1: refreshToken()
  - [ ] Port from v1: fetchArticles()
  - [ ] Port from v1: pushArticles()
  - [ ] Port from v1: getLabels()
  - [ ] Port from v1: assignLabel()
  - [ ] Port from v1: updateLabelPage()
  - [ ] Add error handling with logger

- [ ] **SFTP Service** (`shared/infrastructure/services/sftpService.ts`)
  - [ ] Port from v1: testConnection()
  - [ ] Port from v1: downloadFile()
  - [ ] Port from v1: uploadFile()
  - [ ] Add logger integration

### Shared Utilities
- [ ] **Validators** (`shared/utils/validators.ts`)
  - [ ] Implement isValidEmail()
  - [ ] Implement isValidPhone()
  - [ ] Implement isValidUrl()
  - [ ] Implement isValidTime()
  - [ ] Implement createRoomId()
  - [ ] Write unit tests for all validators

- [ ] **Constants** (`shared/utils/constants.ts`)
  - [ ] Define APP_VERSION
  - [ ] Define SFTP_API_HOST
  - [ ] Define default values
  - [ ] Define DEFAULT_CONFERENCE_ROOM
  - [ ] Define DEFAULT_APP_SETTINGS

### Verification
- [ ] All imports resolve correctly
- [ ] No TypeScript errors
- [ ] Logger outputs to console
- [ ] CSV service tests pass
- [ ] Encryption service tests pass
- [ ] All validators tested

---

## Phase 2: Sync Feature (16h)

### Sync Domain
- [ ] Create `features/sync/domain/types.ts`
  - [ ] Define SyncAdapter interface
  - [ ] Define SyncStatus, SyncMode types

### Sync Infrastructure - SFTP Adapter
- [ ] Create `features/sync/infrastructure/SFTPSyncAdapter.ts`
  - [ ] Implement connect() - calls sftpService.testConnection()
  - [ ] Implement disconnect()
  - [ ] Implement download() - download CSV → parse → return Person[]
  - [ ] Implement upload() - generate CSV → upload
  - [ ] Implement sync() - download → update store
  - [ ] Implement getStatus()
  - [ ] Add comprehensive error handling
  - [ ] Add logger calls

### Sync Infrastructure - SoluM Adapter
- [ ] Create `features/sync/infrastructure/SolumSyncAdapter.ts`
  - [ ] Implement connect() - login → store tokens
  - [ ] Implement disconnect()
  - [ ] Implement getValidToken() - auto-refresh if < 5min
  - [ ] Implement mapArticlesToPersonnel()
  - [ ] Implement mapPersonnelToArticles()
  - [ ] Implement download() - fetch articles + labels → map
  - [ ] Implement upload() - map → push articles
  - [ ] Implement sync()
  - [ ] Implement getStatus()
  - [ ] Add error handling for token expiry
  - [ ] Add logger calls

### Sync Infrastructure - Store
- [ ] Create `features/sync/infrastructure/syncStore.ts`
  - [ ] Define SyncStore interface
  - [ ] Add isConnected state
  - [ ] Add lastSync timestamp
  - [ ] Add error state
  - [ ] Implement state setters

### Sync Application
- [ ] Create `features/sync/application/useSyncController.ts`
  - [ ] Implement getAdapter() - dynamic based on workingMode
  - [ ] Implement sync() - calls adapter.sync()
  - [ ] Implement connect()
  - [ ] Implement disconnect()
  - [ ] Implement getStatus()
  - [ ] Implement auto-sync with setInterval
  - [ ] Add pause logic (when dialog open)
  - [ ] Add isAutoSyncEnabled state
  - [ ] Add setAutoSync()

### Verification
- [ ] SFTP adapter connects with test credentials
- [ ] SFTP download returns Person[]
- [ ] SFTP upload succeeds
- [ ] SoluM adapter login succeeds
- [ ] SoluM download returns Person[]
- [ ] SoluM upload succeeds
- [ ] Token refresh works automatically
- [ ] Auto-sync interval triggers
- [ ] Switching mode changes adapter

---

## Phase 3: Personnel Feature (24h)

### Personnel Domain
- [ ] Create `features/personnel/domain/types.ts`
  - [ ] Define Person (copy from shared)
  - [ ] Define ChairList
  - [ ] Define ValidationResult, ValidationError
  - [ ] Define PersonnelFilters, FilterOptions

- [ ] Create `features/personnel/domain/validation.ts`
  - [ ] Implement validatePerson()
  - [ ] Implement validateChairListName()
  - [ ] Implement isPersonIdUnique()
  - [ ] Write unit tests

- [ ] Create `features/personnel/domain/businessRules.ts`
  - [ ] Implement generatePersonId()
  - [ ] Implement mergePersonDefaults()
  - [ ] Write unit tests

### Personnel Infrastructure
- [ ] Create `features/personnel/infrastructure/personnelStore.ts`
  - [ ] Define PersonnelStore interface
  - [ ] Add personnel: Person[] state
  - [ ] Add chairLists: ChairList[] state
  - [ ] Implement setPersonnel()
  - [ ] Implement addPersonToStore()
  - [ ] Implement updatePersonInStore()
  - [ ] Implement removePersonFromStore()
  - [ ] Implement saveChairListToStore()
  - [ ] Implement removeChairListFromStore()

### Personnel Application
- [ ] Create `features/personnel/application/usePersonnelController.ts`
  - [ ] Get store and sync controller
  - [ ] Implement addPerson() - validate → merge defaults → store → sync
  - [ ] Implement updatePerson() - validate → store → sync
  - [ ] Implement deletePerson() - store → sync
  - [ ] Implement findPersonById()
  - [ ] Implement importFromSync() - uses sync controller
  - [ ] Implement exportToSync()
  - [ ] Implement getAllPersonnel()
  - [ ] Add isLoading state
  - [ ] Add error state
  - [ ] Write integration tests

- [ ] Create `features/personnel/application/usePersonnelFilters.ts`
  - [ ] Add filters state (room, title, specialty, searchQuery)
  - [ ] Implement setFilters()
  - [ ] Implement resetFilters()
  - [ ] Implement getFilteredPersonnel() - apply all filters
  - [ ] Implement getFilterOptions() - extract unique values
  - [ ] Add useMemo for performance

- [ ] Create `features/personnel/application/useChairLists.ts`
  - [ ] Implement saveChairList() - validation → generate ID → store
  - [ ] Implement loadChairList() - get from store → setPersonnel
  - [ ] Implement deleteChairList()
  - [ ] Implement getAllChairLists()

### Personnel Presentation
- [ ] Create `features/personnel/presentation/PersonnelManagement.tsx`
  - [ ] Use usePersonnelController, usePersonnelFilters
  - [ ] Render toolbar (Add, Import, Export buttons)
  - [ ] Render filter drawer toggle
  - [ ] Render table/card view toggle
  - [ ] Render PersonnelTable or PersonnelCards
  - [ ] Handle dialog open/close
  - [ ] Pure UI only, no business logic
  - [ ] Add React.memo

- [ ] Create `features/personnel/presentation/PersonDialog.tsx`
  - [ ] Props: open, person?, onClose, onSave
  - [ ] Render PersonForm
  - [ ] Handle save button → call onSave(personData)
  - [ ] Handle cancel button → call onClose()
  - [ ] Show validation errors

- [ ] Create `features/personnel/presentation/PersonForm.tsx`
  - [ ] Use React Hook Form
  - [ ] Dynamic field rendering based on csvConfig
  - [ ] Field validation
  - [ ] Error messages
  - [ ] Support for different field types (text, number, email, phone)

- [ ] Create `features/personnel/presentation/PersonnelTable.tsx`
  - [ ] MUI DataGrid
  - [ ] Dynamic columns from csvConfig
  - [ ] Row actions: Edit, Delete
  - [ ] Click row → open edit dialog
  - [ ] Add React.memo
  - [ ] Add useCallback for handlers

- [ ] Create `features/personnel/presentation/PersonnelCards.tsx`
  - [ ] Grid of MUI Cards
  - [ ] Display person data
  - [ ] Card actions: Edit, Delete
  - [ ] Add React.memo

- [ ] Create `features/personnel/presentation/LoadListDialog.tsx`
  - [ ] List all saved chair lists
  - [ ] Click to load → confirm → load
  - [ ] Delete button per list

- [ ] Create `features/personnel/presentation/SaveListDialog.tsx`
  - [ ] Input for chair list name
  - [ ] Save button → validate name → save
  - [ ] Update mode (if editing existing list)

### Verification
- [ ] Add person → validates → saves to store
- [ ] Add person triggers sync (if auto-save)
- [ ] Edit person → updates in store
- [ ] Delete person → removes from store
- [ ] Import from sync → downloads → updates UI
- [ ] Export to sync → uploads successfully
- [ ] Filter by room works
- [ ] Filter by title works
- [ ] Filter by specialty works
- [ ] Search query filters correctly
- [ ] Clear filters resets to all
- [ ] Save chair list → persists
- [ ] Load chair list → replaces personnel
- [ ] Delete chair list → removes from store
- [ ] Validation errors show in UI
- [ ] Table view displays all columns
- [ ] Card view displays correctly
- [ ] Toggle between table/card works

---

## Phase 4: Conference Feature (16h)

### Conference Domain
- [ ] Create `features/conference/domain/types.ts`
  - [ ] Define ConferenceRoom
  - [ ] Define TimeRange
  - [ ] Define TimeValidationResult

- [ ] Create `features/conference/domain/validation.ts`
  - [ ] Implement validateTimeRange()
  - [ ] Implement validateConferenceRoom()
  - [ ] Implement isValidRoomId()
  - [ ] Write unit tests

- [ ] Create `features/conference/domain/businessRules.ts`
  - [ ] Implement generateNextRoomId()
  - [ ] Implement isRoomOccupied()
  - [ ] Write unit tests

### Conference Infrastructure
- [ ] Create `features/conference/infrastructure/conferenceStore.ts`
  - [ ] Define ConferenceStore interface
  - [ ] Add conferenceRooms: ConferenceRoom[] state
  - [ ] Add currentRoomId: string | null state
  - [ ] Implement setConferenceRooms()
  - [ ] Implement setCurrentRoomId()
  - [ ] Implement addRoomToStore()
  - [ ] Implement updateRoomInStore()
  - [ ] Implement removeRoomFromStore()

### Conference Application
- [ ] Create `features/conference/application/useConferenceController.ts`
  - [ ] Implement addRoom() - generate ID → validate → store
  - [ ] Implement updateRoom() - validate → store → sync (if SoluM)
  - [ ] Implement deleteRoom() - store → sync
  - [ ] Implement toggleMeeting() - update store → update label page (simple mode)
  - [ ] Implement updateMeeting() - validate time → update store → sync
  - [ ] Implement updateLabelPage() - call solumService directly
  - [ ] Implement getAllRooms()
  - [ ] Implement getCurrentRoom()
  - [ ] Add isLoading, error states
  - [ ] Write integration tests

### Conference Presentation
- [ ] Create `features/conference/presentation/ConferenceRoomList.tsx`
  - [ ] Use useConferenceController
  - [ ] List all conference rooms
  - [ ] Add Room button
  - [ ] Edit/Delete actions per room
  - [ ] Show meeting status badge

- [ ] Create `features/conference/presentation/ConferenceRoomForm.tsx`
  - [ ] Form for room details
  - [ ] Meeting toggle switch
  - [ ] Meeting name input (if hasMeeting)
  - [ ] TimeRangePicker component
  - [ ] ParticipantList component
  - [ ] Validation

- [ ] Create `features/conference/presentation/AddRoomDialog.tsx`
  - [ ] Simple dialog with room name input
  - [ ] Generate ID automatically

- [ ] Create `features/conference/presentation/TimeRangePicker.tsx`
  - [ ] Two time inputs (HH:mm format)
  - [ ] Validation (end > start)
  - [ ] Error messages

- [ ] Create `features/conference/presentation/ParticipantList.tsx`
  - [ ] List of participants
  - [ ] Add participant button
  - [ ] Remove participant button per item

- [ ] Create `features/conference/presentation/ParticipantDialog.tsx`
  - [ ] Input for participant name
  - [ ] Add button

### Verification
- [ ] Add room → generates C## ID correctly
- [ ] Edit room → updates details
- [ ] Delete room → removes from list
- [ ] Toggle meeting (simple mode) → updates label page
- [ ] Update meeting details → validates → saves
- [ ] Time validation prevents end < start
- [ ] Add participant → appears in list
- [ ] Remove participant → removes from list
- [ ] Conference mode toggle works (simple vs full)

---

## Phase 5: Settings Feature (16h)

### Settings Domain
- [ ] Create `features/settings/domain/types.ts`
  - [ ] Define AppSettings
  - [ ] Define SFTPCredentials
  - [ ] Define SolumConfig
  - [ ] Define SettingsFile

### Settings Application
- [ ] Create `features/settings/application/useSettingsController.ts`
  - [ ] Implement updateAppSettings()
  - [ ] Implement updateSFTPCredentials() - encrypt password
  - [ ] Implement updateSolumConfig() - encrypt password
  - [ ] Implement updateCSVConfig()
  - [ ] Implement updateNfcUrl()
  - [ ] Implement switchWorkingMode() - disconnect → update
  - [ ] Implement uploadLogo() - validate size/type
  - [ ] Implement exportSettings() - gather all settings → JSON
  - [ ] Implement importSettings() - validate → decrypt → update all
  - [ ] Implement validateSettingsFile()
  - [ ] Add hasUnsavedChanges state

### Settings Infrastructure
- [ ] Create `features/settings/infrastructure/settingsStore.ts`
  - [ ] Define SettingsStore interface
  - [ ] Add all settings state fields
  - [ ] Implement all setters
  - [ ] Configure persistence (exclude sensitive data or encrypt)

### Settings Presentation
- [ ] Create `features/settings/presentation/SettingsDialog.tsx`
  - [ ] Main dialog with tabs
  - [ ] Tab navigation (App, SFTP, SoluM, Logos, Advanced)
  - [ ] Save button (applies all changes)
  - [ ] Cancel button (reverts changes)
  - [ ] Unsaved changes prompt

- [ ] Create `features/settings/presentation/AppSettings.tsx`
  - [ ] App name input
  - [ ] App subtitle input
  - [ ] Space type toggle (room/chair)
  - [ ] Auto-save toggle
  - [ ] Store number input
  - [ ] NFC URL input

- [ ] Create `features/settings/presentation/SFTPSettings.tsx`
  - [ ] Username input
  - [ ] Password input (type="password")
  - [ ] Remote filename input
  - [ ] Store input
  - [ ] Test Connection button

- [ ] Create `features/settings/presentation/SolumSettings.tsx`
  - [ ] Base URL input
  - [ ] Company code input
  - [ ] Store input
  - [ ] Username input
  - [ ] Password input
  - [ ] Sync interval input
  - [ ] Simple conference mode toggle
  - [ ] Enable conference mode toggle
  - [ ] Test Connection button

- [ ] Create `features/settings/presentation/LogoSettings.tsx`
  - [ ] 3 logo upload slots
  - [ ] Image preview
  - [ ] File input validation
  - [ ] Remove logo button

- [ ] Create `features/settings/presentation/SettingsFileManager.tsx`
  - [ ] Export Settings button → download JSON
  - [ ] Import Settings → file input → validate → apply
  - [ ] Show import errors

- [ ] Create `features/settings/presentation/SettingsLoginDialog.tsx`
  - [ ] Password input to unlock settings
  - [ ] Password verification

- [ ] Create `features/settings/presentation/SecuritySettings.tsx`
  - [ ] Set settings password
  - [ ] Security options

- [ ] Create `features/settings/presentation/LogViewer.tsx`
  - [ ] Display logs from logger service
  - [ ] Filter by level
  - [ ] Clear logs button
  - [ ] Export logs button

### Verification
- [ ] App settings update and persist
- [ ] SFTP credentials save (encrypted)
- [ ] SFTP test connection works
- [ ] SoluM config saves (encrypted)
- [ ] SoluM test connection works
- [ ] CSV config updates
- [ ] Logo upload validates size/type
- [ ] Logo preview displays
- [ ] Export settings → valid JSON file
- [ ] Import settings → validates structure
- [ ] Import settings → applies all settings
- [ ] Mode switch → disconnects sync → updates
- [ ] Unsaved changes prompt shows
- [ ] Language switch updates UI
- [ ] Settings password protection works
- [ ] Log viewer displays logs
- [ ] Log filter works

---

## Phase 6: Root Store & Routing (8h)

### Root Store
- [ ] Create `shared/infrastructure/store/rootStore.ts`
  - [ ] Import all feature stores
  - [ ] Combine with Zustand create()
  - [ ] Configure persist middleware
  - [ ] Selective persistence (exclude transient state)
  - [ ] Configure devtools middleware
  - [ ] Add onRehydrateStorage callback for logging

### Routing & Layout
- [ ] Update `App.tsx`
  - [ ] Setup React Router
  - [ ] Define routes: /, /personnel, /conference, /settings
  - [ ] Lazy load feature components with React.lazy
  - [ ] Add Suspense boundaries with LoadingFallback
  - [ ] Wrap with ErrorBoundary

- [ ] Create `shared/presentation/layouts/MainLayout.tsx`
  - [ ] MUI Tabs for navigation
  - [ ] Tab: Personnel
  - [ ] Tab: Conference
  - [ ] Header component
  - [ ] Sync status indicator
  - [ ] Settings button

- [ ] Create `shared/presentation/layouts/Header.tsx`
  - [ ] App title (from settings)
  - [ ] Language switcher (EN/HE)
  - [ ] Sync button
  - [ ] Settings icon button

- [ ] Create `shared/presentation/components/LoadingFallback.tsx`
  - [ ] MUI Skeleton or CircularProgress
  - [ ] Layout matching main app

### Verification
- [ ] Navigation between tabs works
- [ ] URL updates on tab change
- [ ] Lazy loading shows fallback first
- [ ] Refreshing page maintains state (persistence working)
- [ ] DevTools show all store slices

---

## Phase 7: Shared UI Components (8h)

- [ ] Create `shared/presentation/components/ErrorBoundary.tsx`
  - [ ] Catch React errors
  - [ ] Display error UI
  - [ ] Log error to logger service
  - [ ] Reset button

- [ ] Create `shared/presentation/components/NotificationContainer.tsx`
  - [ ] Toast notifications (success, error, warning, info)
  - [ ] Auto-dismiss
  - [ ] Use MUI Snackbar or notistack

- [ ] Create `shared/presentation/components/FilterDrawer.tsx`
  - [ ] Drawer component (left or right)
  - [ ] Filter inputs (dynamic based on FilterOptions)
  - [ ] Apply button
  - [ ] Reset button
  - [ ] Close button

- [ ] Create `shared/presentation/components/TableToolbar.tsx`
  - [ ] Add button
  - [ ] Import/Export buttons
  - [ ] Search input
  - [ ] Filter toggle button
  - [ ] View toggle (table/card)

- [ ] Create `shared/presentation/components/SyncStatusIndicator.tsx`
  - [ ] Badge showing connection status
  - [ ] Green = connected
  - [ ] Red = disconnected
  - [ ] Yellow = syncing
  - [ ] Tooltip with last sync time

- [ ] Create `shared/presentation/components/JsonEditor.tsx`
  - [ ] Textarea with JSON syntax
  - [ ] Validation
  - [ ] Format button

### Verification
- [ ] ErrorBoundary catches errors
- [ ] Notifications appear and dismiss
- [ ] FilterDrawer opens/closes smoothly
- [ ] TableToolbar buttons work
- [ ] SyncStatusIndicator reflects state accurately

---

## Phase 8: Internationalization & Styling (8h)

### i18n Setup
- [ ] Create `i18n.ts`
  - [ ] Initialize i18next
  - [ ] Configure language detection
  - [ ] Load namespaces (common, personnel, conference, settings)
  - [ ] Set fallback language (en)

- [ ] Copy locales from v1
  - [ ] Copy `locales/en/common.json`
  - [ ] Copy `locales/he/common.json`
  - [ ] Copy other namespace files
  - [ ] Update with new keys for v2

- [ ] Update components to use useTranslation hook
  - [ ] Personnel components
  - [ ] Conference components
  - [ ] Settings components
  - [ ] Shared components

### Theming
- [ ] Create `shared/styles/theme.ts`
  - [ ] Define MUI theme
  - [ ] Color palette (primary, secondary, error, etc.)
  - [ ] Typography
  - [ ] RTL support configuration
  - [ ] Dark mode support (optional)

- [ ] Update `main.tsx`
  - [ ] Wrap app with ThemeProvider
  - [ ] Support direction toggle (LTR/RTL)

- [ ] Test RTL layout
  - [ ] Switch to Hebrew
  - [ ] Verify layout flips correctly
  - [ ] Verify text alignment

### Assets
- [ ] Copy assets from v1
  - [ ] Default logos
  - [ ] Icons
  - [ ] Images

### Verification
- [ ] Language switch works (EN ↔ HE)
- [ ] All UI text translates
- [ ] No missing translation keys
- [ ] RTL layout works correctly
- [ ] Theme colors applied consistently

---

## Phase 9: Testing (16h)

### Unit Tests - Domain Layer
- [ ] Test `validatePerson()`
- [ ] Test `validateChairListName()`
- [ ] Test `isPersonIdUnique()`
- [ ] Test `generatePersonId()`
- [ ] Test `mergePersonDefaults()`
- [ ] Test `validateTimeRange()`
- [ ] Test `validateConferenceRoom()`
- [ ] Test `generateNextRoomId()`
- [ ] Test all validators (email, phone, URL, time)

### Unit Tests - Services
- [ ] Test CSV parseCSV() with various inputs
- [ ] Test CSV generateCSV() output format
- [ ] Test encryption/decryption roundtrip
- [ ] Test password hash verification
- [ ] Test logger (logs stored correctly)

### Integration Tests - Hooks
- [ ] Test usePersonnelController
  - [ ] addPerson flow
  - [ ] updatePerson flow
  - [ ] deletePerson flow
  - [ ] importFromSync with mock adapter
  - [ ] exportToSync with mock adapter
- [ ] Test useConferenceController
  - [ ] addRoom flow
  - [ ] toggleMeeting flow
- [ ] Test useSyncController
  - [ ] Adapter selection based on mode
  - [ ] sync() triggers adapter.sync()
  - [ ] Auto-sync interval

### Integration Tests - Adapters
- [ ] Test SFTPSyncAdapter with mock sftpService
  - [ ] download() returns Person[]
  - [ ] upload() calls sftpService correctly
- [ ] Test SolumSyncAdapter with mock solumService
  - [ ] login() stores tokens
  - [ ] download() maps articles correctly
  - [ ] upload() pushes articles
  - [ ] Token refresh triggers when needed

### Component Tests
- [ ] Test PersonDialog
  - [ ] Opens with empty form (add mode)
  - [ ] Opens with pre-filled form (edit mode)
  - [ ] Validation errors display
  - [ ] Save button calls onSave
- [ ] Test PersonnelTable
  - [ ] Renders rows correctly
  - [ ] Edit action opens dialog
  - [ ] Delete action confirms
- [ ] Test ConferenceRoomForm
  - [ ] Meeting toggle shows/hides fields
  - [ ] Time validation works
- [ ] Test SettingsDialog
  - [ ] Tabs switch correctly
  - [ ] Unsaved changes prompt shows

### Test Coverage
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Verify > 70% coverage for business logic
- [ ] Identify gaps and add tests

---

## Phase 10: Performance Optimization (8h)

### Code Splitting Analysis
- [ ] Build production bundle: `npm run build`
- [ ] Analyze bundle sizes
- [ ] Identify large chunks

### Optimization Implementation
- [ ] Add React.memo to PersonnelTable
- [ ] Add React.memo to PersonnelCards
- [ ] Add React.memo to ConferenceRoomList
- [ ] Add useMemo for getFilteredPersonnel()
- [ ] Add useMemo for getFilterOptions()
- [ ] Add useCallback for event handlers in lists
- [ ] Implement virtualization for large lists (React Window)
  - [ ] VirtualizedPersonnelTable for 100+ items

### Bundle Optimization
- [ ] Configure Vite chunk splitting
  - [ ] Separate vendor chunk (React, MUI)
  - [ ] Feature chunks (personnel, conference, settings)
- [ ] Lazy load heavy components (JsonEditor, LogViewer)
- [ ] Tree-shake unused imports

### Performance Testing
- [ ] Test initial load time (target < 2s)
- [ ] Test table render with 100 items (target < 100ms)
- [ ] Test sync operation (target < 5s)
- [ ] Chrome DevTools Lighthouse audit (target > 90)

### Verification
- [ ] Initial bundle < 200 KB (gzipped)
- [ ] Main chunk < 100 KB (gzipped)
- [ ] Total bundle < 500 KB (gzipped)
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Large lists render smoothly

---

## Phase 11: Final Verification (8h)

### Personnel Management End-to-End
- [ ] **SFTP Mode**
  - [ ] Add person → saves → exports to SFTP
  - [ ] Edit person → updates → exports
  - [ ] Delete person → removes → exports
  - [ ] Import from SFTP → downloads → parses → updates UI
  - [ ] Filter by room → shows correct subset
  - [ ] Search → filters results
  - [ ] Save chair list → persists
  - [ ] Load chair list → replaces personnel

- [ ] **SoluM Mode**
  - [ ] Add person → saves → pushes to SoluM
  - [ ] Edit person → updates → pushes
  - [ ] Delete person → removes → pushes
  - [ ] Import from SoluM → fetches articles → updates UI
  - [ ] Token refresh works automatically

### Conference Rooms End-to-End
- [ ] Add room → generates C01, C02, etc.
- [ ] Edit room details → saves
- [ ] Delete room → removes
- [ ] **Simple Conference Mode**
  - [ ] Toggle meeting → updates label page (0 or 1)
- [ ] **Full Conference Mode**
  - [ ] Update meeting name, time, participants → pushes to SoluM
- [ ] Time validation prevents bad ranges

### Sync Workflows
- [ ] SFTP: connect → download → upload
- [ ] SoluM: login → fetch → push
- [ ] Auto-sync triggers every N seconds
- [ ] Manual sync button works
- [ ] Mode switch → disconnects → changes adapter
- [ ] Sync status indicator reflects state

### Settings Workflows
- [ ] Update app settings → persists
- [ ] Update SFTP credentials → encrypts → saves
- [ ] Test SFTP connection → success/failure message
- [ ] Update SoluM config → encrypts → saves
- [ ] Test SoluM connection → success/failure
- [ ] Upload logo → validates → displays preview
- [ ] Export settings → downloads valid JSON
- [ ] Import settings → validates → applies all
- [ ] Language switch → UI updates
- [ ] Settings password protection → locks/unlocks

### Cross-Browser Testing
- [ ] **Chrome**
  - [ ] All features work
  - [ ] No console errors
- [ ] **Firefox**
  - [ ] All features work
  - [ ] No console errors
- [ ] **Safari** (if available)
  - [ ] All features work
- [ ] **Edge**
  - [ ] All features work

### Mobile/Responsive Testing
- [ ] Test on mobile screen size (360x640)
- [ ] Test on tablet screen size (768x1024)
- [ ] Navigation works on touch
- [ ] Dialogs fit screen
- [ ] Tables scroll horizontally if needed

### Error Handling
- [ ] Network error during sync → error message
- [ ] Invalid CSV import → error message with details
- [ ] Invalid settings file → error message
- [ ] SFTP connection failure → error message
- [ ] SoluM auth failure → error message

### Performance Validation
- [ ] Initial load < 2 seconds (measured)
- [ ] Table with 100 items renders < 100ms
- [ ] Sync operation < 5 seconds
- [ ] No memory leaks (test with prolonged use)
- [ ] No excessive re-renders

---

## Phase 12: Documentation (8h)

### Project Documentation
- [ ] Create `README.md`
  - [ ] Project overview
  - [ ] Features list
  - [ ] Technology stack
  - [ ] Prerequisites
  - [ ] Installation instructions
  - [ ] Development server: `npm run dev`
  - [ ] Build: `npm run build`
  - [ ] Test: `npm run test`
  - [ ] Project structure overview

- [ ] Create `docs/ARCHITECTURE.md`
  - [ ] Reference to planning artifacts (high-level, low-level design)
  - [ ] Feature-based structure explanation
  - [ ] Sync adapter pattern diagram
  - [ ] Dependency flow
  - [ ] State management overview

- [ ] Create `docs/DEVELOPER_GUIDE.md`
  - [ ] How to add a new feature (step-by-step)
  - [ ] Controller pattern guidelines
  - [ ] Naming conventions
  - [ ] Testing guidelines
  - [ ] Code review checklist
  - [ ] Performance best practices

### Feature Documentation
- [ ] Create `features/personnel/README.md`
  - [ ] Feature purpose
  - [ ] Public API (usePersonnelController, usePersonnelFilters)
  - [ ] Components list
  - [ ] Domain types

- [ ] Create `features/conference/README.md`
  - [ ] Feature purpose
  - [ ] Public API
  - [ ] Components list

- [ ] Create `features/sync/README.md`
  - [ ] Adapter pattern explanation
  - [ ] How to add new sync adapter
  - [ ] Workflow diagrams

- [ ] Create `features/settings/README.md`
  - [ ] Settings structure
  - [ ] Import/Export format
  - [ ] Security considerations

### User Documentation
- [ ] Create `docs/USER_GUIDE.md`
  - [ ] Getting started
  - [ ] Personnel management tutorial
  - [ ] Conference room management tutorial
  - [ ] Settings configuration
  - [ ] Import/Export data
  - [ ] Troubleshooting

### Migration Documentation
- [ ] Create `docs/MIGRATION_FROM_V1.md`
  - [ ] Export settings from v1
  - [ ] Import settings to v2
  - [ ] Re-sync data
  - [ ] What's new in v2
  - [ ] Breaking changes (if any)

### Verification
- [ ] All README files have proper markdown formatting
- [ ] All links in docs work
- [ ] Code examples in docs are accurate
- [ ] Architecture diagrams are clear

---

## Definition of Done

**Sprint 1 is complete when:**
- [ ] All 12 phases completed
- [ ] All verification checkpoints passed
- [ ] All tests passing (>70% coverage)
- [ ] No TypeScript errors
- [ ] No console errors in production build
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] User can export from v1 and import to v2
- [ ] SFTP mode fully functional
- [ ] SoluM mode fully functional
- [ ] Code reviewed and approved
- [ ] Deployed to staging environment (if applicable)

---

## Summary

**Total Tasks:** 160+ checklist items  
**Estimated Duration:** 160 hours (4 weeks at 40h/week)  
**Team Size:** 1 developer (adjust timeline if more)

This comprehensive task breakdown ensures nothing is missed during implementation. Each phase builds on the previous, following the documented architecture exactly.
