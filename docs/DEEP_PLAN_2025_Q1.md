# electisSpace Deep Implementation Plan - Q1 2025/Q1 2026

> Generated: December 30, 2025
> Last Updated: January 7, 2026 (Session 9)

## Implementation Status

| # | Feature | Status | Started | Completed |
|---|---------|--------|---------|-----------|
| 1 | Conference Room NFC URL Fix | ✅ Completed | Dec 30 | Dec 30 |
| 2 | Dashboard Assigned Labels Display | ✅ Completed | Dec 30 | Dec 31 |
| 3 | File Optimization | ✅ Completed | Dec 30 | Dec 31 |
| 4 | People-List Feature | ✅ Completed | Dec 31 | Jan 5 |
| 5 | Section Loading Indicators | ✅ Completed | Jan 5 | Jan 5 |
| 6 | UI Responsiveness | ✅ Completed | Jan 6 | Jan 6 |
| 7 | Logger Enhancement | ✅ Completed | Jan 6 | Jan 6 |
| 8 | App Manual Feature | ✅ Completed | Jan 6 | Jan 6 |
| 9 | Data Cleanup on Disconnect/Mode Switch | ✅ Completed | Jan 7 | Jan 7 |
| 10 | SFTP Mode Implementation | 🔄 In Progress | Jan 7 | - |

**Legend:** ⬜ Not Started | 🔄 In Progress | ✅ Completed | ⚠️ Blocked

### Recent Updates (January 7, 2026) - Session 9

#### Feature 10 In Progress - SFTP Mode Implementation

SFTP mode infrastructure and core services completed. UI integration and controller routing still pending.

##### Phase 10.1: Encryption Service ✅
- **Created `encryption.ts`**: AES-256-CBC encryption for SFTP credentials
- **Functions**: `encrypt(plainText)`, `decrypt(encryptedText)`
- **Uses environment variable**: `VITE_SFTP_ENCRYPTION_KEY`
- **Random IV per encryption**: Prepended to ciphertext for secure storage

##### Phase 10.2: SFTP API Client ✅
- **Created `sftpApiClient.ts`**: HTTP client for SFTP proxy API
- **Functions**: `testConnection()`, `downloadFile()`, `uploadFile()`, `deleteFile()`, `listFiles()`
- **Encrypted credentials**: Uses encryption service before sending to API
- **Bearer token auth**: Uses `VITE_SFTP_API_TOKEN`
- **Comprehensive logging**: All operations logged with timing

##### Phase 10.3: Vite Proxy Configuration ✅
- **Added server.proxy to vite.config.ts**: `/sftp-api` → `https://solum.co.il/sftp`
- **Configuration**: `changeOrigin: true`, `secure: true`, path rewrite

##### Phase 10.4: CSV Service Enhancement ✅
- **Added `EnhancedCSVConfig` interface**: `hasHeader`, `delimiter`, `columns`, `idColumn`, `conferenceEnabled`
- **Added `CSVColumnMapping` interface**: `fieldName`, `csvColumn`, `friendlyName`, `required`
- **Added `parseCSVEnhanced()`**: Parses CSV with enhanced config, returns spaces and conference rooms
- **Added `generateCSVEnhanced()`**: Generates CSV from spaces and conference rooms
- **Added `validateCSVConfigEnhanced()`**: Validates config with detailed error messages
- **Added `createDefaultEnhancedCSVConfig()`**: Creates default config for new SFTP setups
- **Backward compatible**: Legacy `parseCSV()` and `generateCSV()` still available

##### Phase 10.5: SFTP Sync Adapter ✅
- **Complete rewrite of `SFTPSyncAdapter.ts`**: Now uses new sftpApiClient
- **Retry logic**: Exponential backoff with jitter (3 retries, 1-10s delay)
- **Progress tracking**: Real-time progress updates via callback
- **Methods**: `connect()`, `disconnect()`, `download()`, `downloadWithConference()`, `upload()`, `safeUpload()`, `sync()`
- **Configuration methods**: `setProgressCallback()`, `updateCSVConfig()`, `updateCredentials()`, `isConnected()`

##### Phase 10.6: SFTP Settings Tab Enhancement ✅
- **Enhanced `SFTPSettingsTab.tsx`**: 3 sub-tabs (Connection, CSV Structure, Auto-Sync)
- **Connection tab**: Host, username, password, remote filename fields
- **Test connection button**: Uses real sftpApiClient with success/error feedback
- **Connect/Disconnect buttons**: With loading states and status chip
- **CSV Structure tab**: Delimiter config, header toggle, CSVStructureEditor integration
- **Auto-Sync tab**: Enable toggle, interval selector (30s to 10min)

##### Phase 10.7: CSV Structure Editor ✅
- **Already exists**: `CSVStructureEditor.tsx` with full functionality
- **Features**: Drag-drop reorder, up/down buttons, add/remove columns, field type selection, mandatory checkbox

##### Phase 10.8: Sync Controller SFTP Integration ✅
- **Added `sftpCsvConfig` prop**: Passes enhanced CSV config to adapter
- **Updated `getAdapter()`**: Creates SFTP adapter with enhanced config
- **Updated MainLayout**: Passes `sftpCsvConfig` to sync controller

##### Phase 10.9: Translations ✅
- **Added EN translations**: `sftpServerConfig`, `connected`, `connect`, `disconnect`, `fillCredentials`, `connectionSuccess`, `connectionFailed`, `autoSyncConfig`, `enableAutoSync`, `autoSyncInfo`, `csvHasHeader`, `csvFileStructure`, `remoteFilenameHelp`, `testing`, `connecting`
- **Added HE translations**: Corresponding Hebrew translations for all new keys

##### Files Created
| File | Purpose |
|------|---------|
| `encryption.ts` | AES-256-CBC encryption service |
| `sftpApiClient.ts` | SFTP proxy API HTTP client |

##### Files Modified
| File | Changes |
|------|---------|
| `vite.config.ts` | Added `/sftp-api` proxy configuration |
| `csvService.ts` | Added enhanced CSV parsing/generation functions |
| `SFTPSyncAdapter.ts` | Complete rewrite with retry, progress, new API client |
| `SFTPSettingsTab.tsx` | Enhanced with 3 tabs, real connection testing |
| `useSyncController.ts` | Added `sftpCsvConfig` prop, updated adapter creation |
| `MainLayout.tsx` | Passes `sftpCsvConfig` to sync controller |
| `common.json` (en) | Added SFTP-related translations |
| `common.json` (he) | Added SFTP Hebrew translations |
| `.env.example` | Added `VITE_SFTP_ENCRYPTION_KEY`, `VITE_SFTP_API_TOKEN` |

##### Remaining Phases (Not Started)
| Phase | Description | Estimated |
|-------|-------------|-----------|
| 10.10 | Spaces Management SFTP Support | 3h |
| 10.11 | Conference Management SFTP Support | 3h |
| 10.12 | Enable SFTP Mode in UI | 1h |
| 10.13 | Extended Testing | 4h |

---

#### Feature 9 Completed - Data Cleanup on Disconnect/Mode Switch

Proper data cleanup when disconnecting from a connection or switching between working modes.

##### Phase 9.1: Store Clear Methods
- **Added `clearAllData()` to spacesStore**: Clears spaces, spacesLists, activeListName, activeListId
- **Added `clearAllData()` to peopleStore**: Clears people, peopleLists, activeListName, activeListId, pendingChanges, spaceAllocation
- **Added `clearAllData()` to conferenceStore**: Clears conferenceRooms

##### Phase 9.2: Settings Clear Methods
- **Added `clearModeCredentials(mode)` to settingsStore**: Clears credentials and config for the specified mode (SFTP or SOLUM_API)
- **Added `clearFieldMappings()` to settingsStore**: Clears solumMappingConfig and sftpCsvConfig.mapping

##### Phase 9.3: Disconnect Data Cleanup
- **Updated `disconnectFromSolum()` in useSettingsController**: Now clears all data stores before disconnecting
- **Uses dynamic imports**: Avoids circular dependencies by dynamically importing stores
- **Logs cleanup action**: Added logger entries with category `Settings`

##### Phase 9.4: Mode Switch Confirmation Dialog
- **Created mode switch confirmation in AppSettingsTab**: Shows warning dialog when switching modes
- **Confirmation dialog contents**: Warning icon, title, and message explaining data will be cleared
- **On confirm**: Clears all data stores, clears old mode credentials, then switches mode
- **Loading state**: Shows spinner and disables buttons during mode switch
- **Dynamic imports**: Uses async helper function to avoid circular dependencies

##### Phase 9.5: Translations
- **Added `settings.switchModeTitle`**: "Switch Working Mode" / "החלפת מצב עבודה"
- **Added `settings.switchModeWarning`**: Full warning message in EN and HE
- **Added `settings.switchMode`**: "Switch Mode" / "החלף מצב"

##### Phase 9.6: Security & Environment Variables
- **Moved ADMIN_PASSWORD to .env**: Uses `import.meta.env.VITE_ADMIN_PASSWORD`
- **Updated .env.example**: Added `VITE_ADMIN_PASSWORD` placeholder
- **Created .env file**: With actual admin password value

##### Phase 9.7: Logger Integration
- **Added logging to mode switch**: Logs mode switch request, data clearing, credential clearing, success
- **Updated disconnect logging**: Uses `Settings` category consistently
- **Added clearAllDataStores helper**: Logs when all stores are cleared

##### Phase 9.8: Auto-Sync Disconnect Fix
- **Added `isConnected` prop to useSyncController**: Receives connection status from settings
- **Auto-sync stops on disconnect**: Timer is cleared when `isConnected` is false
- **Added disconnect effect**: Clears adapter and resets sync state when connection is lost
- **Double-check in timer callback**: Skips sync if not connected even if timer fires
- **Enhanced logging**: Logs connection status changes and timer management

##### Phase 9.9: SyncStatusIndicator Dynamic Styling
- **Dynamic background color**: Indicator background now changes based on status (green=connected, red=error, gray=disconnected, blue=syncing)
- **Dynamic border color**: Border matches status color scheme
- **Manual sync disabled when disconnected**: Button is disabled when status is 'disconnected'

##### Files Modified
| File | Changes |
|------|---------|
| `spacesStore.ts` | Added `clearAllData()` method |
| `peopleStore.ts` | Added `clearAllData()` method |
| `conferenceStore.ts` | Added `clearAllData()` method |
| `settingsStore.ts` | Added `clearModeCredentials()`, `clearFieldMappings()` |
| `useSettingsController.ts` | Updated `disconnectFromSolum()` with async/dynamic imports, env var for admin password |
| `AppSettingsTab.tsx` | Added mode switch dialog with async/dynamic imports, loading state, logging |
| `SolumCredentialsSection.tsx` | Updated `handleDisconnect` to be async |
| `useSyncController.ts` | Added `isConnected` prop, auto-sync stop on disconnect, connection change effect |
| `MainLayout.tsx` | Passes `isConnected` to useSyncController |
| `FeatureTestDemo.tsx` | Passes `isConnected` to useSyncController |
| `SyncStatusIndicator.tsx` | Dynamic bgcolor/borderColor based on status, disabled sync button when disconnected |
| `.env.example` | Added `VITE_ADMIN_PASSWORD` |
| `.env` | Created with admin password |
| `common.json` (en) | Added switch mode translations |
| `common.json` (he) | Added switch mode translations |

---

### Recent Updates (January 6, 2026) - Session 8

#### Feature 8 Enhanced - App Manual Improvements

Additional improvements to the manual feature based on user feedback.

##### Phase 8.7: RTL-Aware Mobile Drawer
- **Dynamic drawer anchor**: Changed from fixed `"left"` to `{theme.direction === 'rtl' ? 'right' : 'left'}`
- **Proper RTL behavior**: Mobile navigation drawer now opens from the correct side based on language direction

##### Phase 8.8: Tab Styling Consistency
- **Matched SettingsDialog styling**: Manual tabs now use same design as Settings dialog
- **Border and shadow on selected**: Added `border: '1px solid'`, `borderColor: 'primary.main'`, `boxShadow`
- **Hidden indicator**: Used `TabIndicatorProps={{ sx: { display: 'none' } }}`
- **Removed Paper wrapper**: Simplified tab container structure

##### Phase 8.9: Accurate Manual Content
- **Connection Setup details**: Corrected to show real fields (API Cluster, Base URL, Company Code, Store Number)
- **Real URL examples**: Changed from fake URLs to actual format (e.g., `https://eu.common.solumesl.com`)
- **People Manager specifics**: Added `_LIST_MEMBERSHIPS_` field explanation, Total Spaces config
- **Troubleshooting enhanced**: Added Logs tab reference, browser cache clearing, credential verification steps
- **Security details**: Added password reset information (clear browser data)

##### Files Modified (Session 8)
| File | Changes |
|------|---------|
| `src/shared/presentation/layouts/MainLayout.tsx` | RTL-aware drawer anchor |
| `src/features/manual/presentation/ManualDialog.tsx` | Tabs styled like SettingsDialog, removed Paper |
| `src/locales/en/common.json` | Enhanced manual content with accurate details |
| `src/locales/he/common.json` | Enhanced Hebrew manual content with accurate details |

---

### Recent Updates (January 6, 2026) - Session 7

#### Feature 8 Completed - App Manual Feature

In-app bilingual user manual with tab-based navigation for all app features.

##### Phase 8.1: Domain Types
- **Created `ManualTab` and `ManualSection` types**: Type-safe structure for manual content
- **Created `MANUAL_TABS` configuration**: 6 tabs with sections for each feature area
- **Tab structure**: Getting Started, Spaces, People, Conference, Sync, Settings

##### Phase 8.2: ManualDialog Component
- **Full-screen on mobile**: Uses `fullScreen={isMobile}` for responsive layout
- **Tab-based navigation**: Scrollable tabs with icons (icons-only on mobile)
- **Lazy loaded**: Uses `React.lazy()` for code splitting
- **RTL support**: Proper Hebrew layout with `insetInlineEnd` positioning

##### Phase 8.3: ManualSection Component
- **Paper-based layout**: Each section displayed in outlined Paper component
- **Multi-paragraph support**: Content split by newlines into separate Typography elements
- **Consistent styling**: Primary color titles, secondary color content

##### Phase 8.4: Translations
- **Comprehensive EN/HE content**: Full manual translations for both languages
- **6 feature areas covered**: Getting Started, Spaces, People Manager, Conference, Sync, Settings
- **Each area has 2-4 sections**: Overview plus detailed topic sections

##### Phase 8.5: Header Integration
- **Help button added**: HelpOutlineIcon with tooltip between LanguageSwitcher and Settings
- **New `onManualClick` prop**: Passed from MainLayout to AppHeader

##### Phase 8.6: MainLayout Integration
- **ManualDialog state**: `manualOpen` state for dialog visibility
- **Lazy loaded dialog**: Suspense wrapper for optimal bundle size
- **Click handler**: Opens manual dialog from header button

##### Files Created
| File | Purpose |
|------|---------|
| `src/features/manual/domain/types.ts` | Manual types and tab configuration |
| `src/features/manual/presentation/ManualDialog.tsx` | Main dialog component |
| `src/features/manual/presentation/ManualSection.tsx` | Section content renderer |
| `src/features/manual/index.ts` | Barrel exports |

##### Files Modified
| File | Changes |
|------|---------|
| `src/shared/presentation/layouts/AppHeader.tsx` | Added HelpOutlineIcon button, `onManualClick` prop |
| `src/shared/presentation/layouts/MainLayout.tsx` | Added ManualDialog lazy import, `manualOpen` state |
| `src/locales/en/common.json` | Added comprehensive `manual` translations |
| `src/locales/he/common.json` | Added comprehensive `manual` translations (Hebrew) |

---

### Recent Updates (January 6, 2026) - Session 6

#### Feature 7 Completed - Logger Enhancement

Comprehensive logging system enhancement with typed categories, performance timing, and error boundary integration.

##### Phase 7.1: Log Categories System
- **Added `LogCategory` type**: 13 predefined categories (`App`, `Auth`, `Sync`, `AIMS`, `People`, `Conference`, `Spaces`, `Settings`, `Navigation`, `Performance`, `Storage`, `CSV`, `Error`)
- **Exported `LOG_CATEGORIES` array**: For UI components to display category filters
- **Added `getCategories()` method**: Returns unique categories from current logs

##### Phase 7.2: Performance Logging
- **Added `startTimer(operationId)`**: Start a performance timer for an operation
- **Added `endTimer(operationId, category, message, data)`**: End timer and log duration with formatted output
- **Added `measureAsync()` helper**: Automatically measures async operations with success/failure tracking
- **Added `formatDuration()` helper**: Human-readable duration formatting (ms, s, min)
- **Added timing to sync operations**: Download and upload operations now log performance data

##### Phase 7.3: Log Export
- **Added `exportLogsAsJson(filter?)`**: Export logs in JSON format with optional filtering
- **Added `exportLogsAsCsv(filter?)`**: Export logs in CSV format with proper escaping
- **Added `exportLogs(format, filter?)`**: Unified export method for JSON or CSV
- **Added `getStats()`**: Get log statistics (total, by level, by category, active timers)

##### Phase 7.4: Strategic Logging Points
- **Sync operations**: Added performance timing to `sync()` and `upload()` functions
- **CSV import**: Added performance timing to `loadPeopleFromCSV()`
- **Updated log categories**: Changed from component names to semantic categories (e.g., `SyncController` → `Sync`)

##### Phase 7.5: Error Boundary Integration
- **Created `ErrorBoundary.tsx` component**: Class component that catches JavaScript errors
- **Logs errors to logger service**: Captures error message, stack trace, and component stack
- **Fallback UI**: Professional error display with "Try Again" and "Reload Page" buttons
- **Dev mode details**: Shows error details in development mode via `showDetails` prop
- **Integrated in App.tsx**: Wraps entire application with ErrorBoundary

##### Phase 7.6: Navigation Logging
- **Added `useNavigationLogger` hook**: Logs route changes with path, search, and hash
- **Integrated in AppRoutes.tsx**: Automatic navigation event logging

##### Phase 7.7: App Initialization Logging
- **Added initialization log**: Logs app version, language, and environment on startup
- **Added language change log**: Logs when language/direction changes

##### Phase 7.8: Responsive LogsViewer
- **Mobile-first toolbar**: Search and filter inputs stack vertically on mobile, full-width controls
- **Adaptive log items**: Card layout on mobile (stacked info), table row layout on desktop
- **Dynamic row height**: 64px for mobile cards, 42px for desktop table rows
- **Full-width on mobile**: Removed horizontal padding from LogsViewerTab and TabPanel on mobile
- **Responsive DialogContent**: Reduced padding on mobile (`px: { xs: 1, sm: 3 }`)
- **Compact action buttons**: Icons-only on mobile for Export/Clear buttons

##### Files Modified
| File | Changes |
|------|---------|
| `logger.ts` | Added LogCategory type, performance timing, export functions, getStats() |
| `useSyncController.ts` | Added startTimer/endTimer to sync and upload operations |
| `usePeopleController.ts` | Added performance timing to CSV file loading |
| `ErrorBoundary.tsx` | NEW - Error boundary component with logger integration |
| `App.tsx` | Wrapped with ErrorBoundary, added initialization logging |
| `AppRoutes.tsx` | Added useNavigationLogger hook for route change logging |
| `LogsViewer.tsx` | Added MobileLogItem/DesktopLogItem, responsive toolbar, isMobile detection |
| `LogsViewerTab.tsx` | Responsive horizontal padding (`px: { xs: 0, sm: 2 }`) |
| `SettingsDialog.tsx` | Added noPadding prop to TabPanel, responsive DialogContent padding |

##### New Logger API Summary
```typescript
// Categories
type LogCategory = 'App' | 'Auth' | 'Sync' | 'AIMS' | 'People' | 'Conference' | 
                   'Spaces' | 'Settings' | 'Navigation' | 'Performance' | 
                   'Storage' | 'CSV' | 'Error';

// Performance timing
logger.startTimer('operation-id');
const durationMs = logger.endTimer('operation-id', 'Category', 'Message', { data });
const result = await logger.measureAsync('op-id', 'Category', 'Message', asyncFn);

// Export
const json = logger.exportLogs('json', { level: 'error', category: 'Sync' });
const csv = logger.exportLogs('csv');

// Statistics
const stats = logger.getStats();
// { totalLogs, byLevel, byCategory, activeTimers }
```

---

### Recent Updates (January 6, 2026) - Session 5

#### Feature 6 Completed - UI Responsiveness

Full responsive design implementation to ensure the app works seamlessly on mobile devices (Capacitor Android) while maintaining backward compatibility with desktop.

##### Phase 1: Critical Layout Fixes
- **SyncStatusIndicator**: Popover minWidth responsive `{ xs: 260, sm: 300 }`
- **MainLayout**: Sync indicator position `{ xs: 16, sm: 24 }`
- **SettingsDialog**: `fullScreen={isMobile}` for mobile, responsive height

##### Phase 2: Table Responsiveness
- **PeopleTable**: Added mobile card view with 2-column grid layout for all visible fields
- **SpacesManagementView**: Added mobile card view with stacked content
- **TableContainer**: maxHeight breakpoints `{ xs: '55vh', sm: '65vh', md: '70vh' }`

##### Phase 3: Form Controls
- **PeopleFiltersBar**: FormControl minWidth responsive `{ xs: '100%', sm: 150 }`
- **PeopleStatsPanel**: TextField and Box minWidth responsive
- **SyncPage**: Button minWidth responsive `{ xs: 'auto', sm: 120 }`

##### Phase 4: Dialog Improvements
- **SpaceDialog**: `fullScreen={isMobile}` with useMediaQuery
- **ConferenceRoomDialog**: `fullScreen={isMobile}` with useMediaQuery

##### Phase 5: Typography & Spacing
- **AppHeader**: Logo heights responsive `{ xs: 40, sm: 60, md: 80 }`, title font sizes reduced
- **ConferencePage**: Search bar responsive, TextField fullWidth on mobile

##### Mobile Card Views (Tables)
To avoid horizontal scrolling on mobile, tables are converted to card-based layouts:

**PeopleTable Mobile Card:**
- Row 1: Checkbox + Index # + Assignment status chip (right-aligned)
- Row 2: All visible fields in 2-column grid with labels
- Row 3: Lists chip + Action buttons (assign/unassign, edit, delete)

**SpacesManagementView Mobile Card:**
- ID prominently displayed
- Visible fields with labels
- Action buttons (edit, delete)

##### Localization Updates
- Added `people.selectAll` translation to EN and HE locales

##### Files Modified
| File | Changes |
|------|---------|
| `SyncStatusIndicator.tsx` | Responsive popover minWidth |
| `MainLayout.tsx` | Responsive sync indicator position |
| `SettingsDialog.tsx` | fullScreen on mobile, useMediaQuery |
| `PeopleTable.tsx` | Mobile card view with all visible fields, lists chip |
| `SpacesManagementView.tsx` | Mobile card view with stacked content |
| `PeopleFiltersBar.tsx` | Responsive FormControl minWidth |
| `PeopleStatsPanel.tsx` | Responsive TextField/Box minWidth |
| `SyncPage.tsx` | Responsive button minWidth |
| `SpaceDialog.tsx` | fullScreen on mobile |
| `ConferenceRoomDialog.tsx` | fullScreen on mobile |
| `AppHeader.tsx` | Responsive logo sizes, title fonts |
| `ConferencePage.tsx` | Responsive search bar |
| `common.json` (en/he) | Added `people.selectAll` |

##### Design Principles Applied
- **Backward Compatible**: Desktop appearance unchanged
- **Progressive Enhancement**: Uses MUI breakpoints (xs, sm, md, lg, xl)
- **RTL Support**: Hebrew layout works correctly on mobile
- **No Horizontal Scroll**: Tables convert to cards on mobile
- **Touch-Friendly**: Larger touch targets on mobile

---

### Recent Updates (January 5, 2026) - Session 4

#### Performance Optimizations (Completed)

##### Debug Logs Cleanup
- **Removed console.log debug statements** from `peopleService.ts` (`[DEBUG convertSpacesToPeopleWithVirtualPool]`)

##### Lazy Loading & Code Splitting
- **SettingsDialog tabs lazy loaded**: All 5 tabs (App, Solum, Logo, Security, Logs) now lazy load with Suspense
- **ArticleFormatEditor lazy loaded**: 1.1MB vanilla-jsoneditor dependency now loads only when needed
- **Chunk size optimized**: Main SettingsDialog reduced from 1.2MB to 4.7KB

##### Route Prefetching
- **Created `routePrefetch.ts` utility**: Preloads route components before navigation
- **Prefetch on hover**: Navigation tabs trigger prefetch on mouse enter
- **Idle prefetch**: After 2 seconds idle, all routes are prefetched automatically

##### Instant Navigation with useTransition
- **Per-route Suspense boundaries**: Each route wrapped in isolated `<SuspenseRoute>` for immediate loader display
- **React useTransition**: Navigation wrapped in `startTransition()` for non-blocking UI updates
- **Visual pending feedback**: Content dims to 70% opacity during route transitions
- **Immediate response**: Tab clicks respond instantly - old content stays visible while new route loads

##### RouteLoadingFallback Improvements
- **Skeleton-based fallback**: Shows page header, filter bar, and spinner immediately
- **No fade delay**: Removed transition delay for instant visibility

##### SyncStatusIndicator Redesign
- **Professional "Status Pill" design**: Replaced basic Chip with floating pill badge
- **Theme-integrated colors**: Uses palette (`success.main`, `error.main`, etc.) instead of hardcoded hex values
- **Enhanced popover**: Colored header, structured details, styled error box
- **Smooth hover transitions**: Lift + shadow effect instead of scale
- **Dark mode compatible**: Automatically adapts to theme

##### Files Modified
| File | Changes |
|------|---------|
| `peopleService.ts` | Removed DEBUG console.logs |
| `SettingsDialog.tsx` | Lazy load all tabs with Suspense + TabLoadingFallback |
| `SolumSchemaEditorSection.tsx` | Lazy load ArticleFormatEditor |
| `routePrefetch.ts` | NEW - Route prefetching utility |
| `MainLayout.tsx` | Added useTransition, prefetch on hover, idle prefetch, isPending opacity |
| `AppRoutes.tsx` | Per-route Suspense boundaries with SuspenseRoute wrapper |
| `RouteLoadingFallback.tsx` | Skeleton-based layout, removed Fade delay |
| `SyncStatusIndicator.tsx` | Complete redesign - enterprise-grade status pill |
| `vite.config.ts` | Raised chunkSizeWarningLimit to 1200 |

##### Build Output Improvements
- No build warnings
- ArticleFormatEditor: 1,136 KB (lazy loaded, only when needed)
- SettingsDialog: 4.72 KB (was 1.2MB)
- SolumSettingsTab: 25.19 KB (was 1.16MB)

### Recent Updates (January 5, 2026) - Session 3

#### Feature 5 In Progress - Section Loading Indicators

##### Dashboard Loading
- **Created DashboardSkeleton component**: New skeleton UI displayed while dashboard performs initial sync
- **Added initial loading check**: Dashboard shows skeleton when `syncState.status === 'syncing'` and no `lastSync` exists

##### Conference Page Loading
- **Added isFetching state to useConferenceController**: Tracks when fetching from AIMS
- **Added Skeleton cards**: Conference page shows 6 animated skeleton cards while `isFetching` is true
- **Wrapped fetchFromSolum with try/finally**: Ensures `setIsFetching(false)` is always called

##### Spaces Page Loading  
- **Added isFetching state to useSpaceController**: Tracks when fetching from AIMS
- **Added Skeleton rows**: SpacesManagementView shows 5 animated skeleton table rows while `isFetching` is true
- **Wrapped fetchFromSolum with try/finally**: Ensures loading state is properly managed

##### Files Modified
| File | Changes |
|------|---------|
| `DashboardSkeleton.tsx` | NEW - Skeleton UI for dashboard loading |
| `DashboardPage.tsx` | Added initial loading check with DashboardSkeleton |
| `useConferenceController.ts` | Added `useState`, `isFetching` state, wrapped fetchFromSolum |
| `ConferencePage.tsx` | Added Skeleton import, skeleton cards while fetching |
| `useSpaceController.ts` | Added `useState`, `isFetching` state, wrapped fetchFromSolum |
| `SpacesManagementView.tsx` | Added Skeleton import, skeleton rows while fetching |

##### Remaining Tasks
- [ ] People table (if applicable - currently loads from local store)
- [ ] Settings page (if applicable - loads locally)
- [ ] Update DEEP_PLAN to mark completed when done

### Recent Updates (January 5, 2026) - Session 2

#### Feature 4 Completed - Final Fixes

##### List Loading & Active List Display
- **Fixed loadList not setting activeListName**: Rewrote `loadList()` in `usePeopleController.ts` to properly set `activeListName` and `activeListId`
- **Removed dependency on list.people**: Controller no longer expects `people` array in list - reads from `_LIST_MEMBERSHIPS_` instead
- **Added Chip display for active list**: Toolbar now shows active list name as a colored Chip with ListAltIcon
- **Restored assignments from memberships**: When loading a list, each person's `assignedSpaceId` is restored from their `_LIST_MEMBERSHIPS_`

##### List Deletion with AIMS Sync
- **Added AIMS sync on delete**: `deleteList()` now syncs affected people to AIMS after removing their `_LIST_MEMBERSHIPS_`
- **Made deleteList async**: Now returns `Promise<void>` to support AIMS sync
- **Added loading state**: Dialog shows loading indicator during delete+sync operation
- **Error handling**: If AIMS sync fails, local deletion still succeeds (graceful degradation)

##### UI/UX Improvements
- **Removed confusing autoApply checkbox**: Eliminated `autoApply` state/checkbox from load dialog - assignments now always apply on load
- **Simplified confirmation message**: Changed to single clear message: "לטעון רשימה זו? הקצאות השמורות ברשימה יוחלו."
- **Added row index column**: People table now shows `#` column with row numbers (1, 2, 3...) for easy counting

##### Storage Optimization
- **Switched to IndexedDB**: Migrated from localStorage to IndexedDB via `idb-keyval` for larger storage capacity
- **Removed people array from lists**: Lists no longer store full `people` array - uses `_LIST_MEMBERSHIPS_` on each person instead
- **Made `people` optional in PeopleList type**: Type now reflects that people array is not stored

##### Files Modified in Session 2
| File | Changes |
|------|---------|
| `usePeopleController.ts` | Rewrote `loadList()` and `deleteList()` with AIMS sync, proper activeListName handling |
| `peopleStore.ts` | IndexedDB storage adapter, fixed `loadPeopleList()` to not overwrite people array |
| `PeopleToolbar.tsx` | Added Chip with ListAltIcon for active list display |
| `PeopleListsManagerDialog.tsx` | Removed autoApply checkbox, simplified confirmation, async delete with loading |
| `PeopleTable.tsx` | Added `#` column header, pass index to rows |
| `PeopleTableRow.tsx` | Added `index` prop, display row number |
| `common.json` (en/he) | Simplified loadListConfirm, removed autoApply translations |

### Previous Updates (January 5, 2026) - Session 1
- **Feature 4 Bug Fixes - People-List Feature**:
  
  #### Multi-List Architecture Implementation
  - Migrated from single `listName`/`listSpaceId` fields to multi-list `listMemberships` array
  - Each person can now belong to multiple lists with different assignments per list
  - `_LIST_MEMBERSHIPS_` field stores JSON array: `[{listName, spaceId}, ...]`
  
  #### AIMS Save/Load Fixes
  - **Fixed list save to AIMS**: Lists now properly save `_LIST_MEMBERSHIPS_` to AIMS
  - **Fixed buildArticleData**: Now includes `_LIST_MEMBERSHIPS_` serialization to preserve list data during space assignments
  - **Fixed buildArticleDataWithMetadata**: Full metadata including `_LIST_MEMBERSHIPS_`, `__PERSON_UUID__`, `__VIRTUAL_SPACE__`
  
  #### List Management Dialog Fixes
  - **Fixed lists not appearing in dialog**: `savePeopleList()` now properly adds lists to `peopleLists` array via `addPeopleList()`
  - **Added extractListsFromPeople()**: Extracts unique list names from people's `listMemberships` and populates `peopleLists`
  - **Dialog auto-extracts lists**: When dialog opens with empty `peopleLists`, automatically calls `extractListsFromPeople()`
  
  #### Pending Changes & Save Button Fixes
  - **Added pendingChanges to store**: `pendingChanges: boolean` in peopleStore tracks unsaved list changes
  - **Added markPendingChanges()**: Sets `pendingChanges = true` when active list exists
  - **Added clearPendingChanges()**: Clears pending changes flag after save
  - **Auto-mark pending on assignment**: `assignSpace()` and `unassignSpace()` now set `pendingChanges = true` when `activeListId` exists
  - **Fixed Save button state**: "Save List Changes" button now properly enables when assigning/unassigning spaces
  
  #### List Load State Restoration
  - **Fixed loadList()**: Now restores people's `assignedSpaceId` to their saved state from `listMemberships`
  - **Discard unsaved changes**: When loading a list, unsaved space assignments are reverted to the saved state
  - **AutoApply option**: When `autoApply=true`, assignments are posted to AIMS after load
  
  #### Code Quality Fixes
  - **Fixed syntax error**: Removed async `await` inside non-async `for` loop in SolumSyncAdapter
  - **Added debug logging**: Extensive console logs for troubleshooting AIMS sync issues
  
  #### Files Modified
  | File | Changes |
  |------|---------|
  | `peopleStore.ts` | Added `pendingChanges`, `markPendingChanges()`, `clearPendingChanges()`, `extractListsFromPeople()` |
  | `usePeopleLists.ts` | Fixed `savePeopleList()` to add to `peopleLists`, fixed `loadList()` to restore saved state |
  | `peopleService.ts` | Fixed `buildArticleData()` to include `_LIST_MEMBERSHIPS_` |
  | `PeopleListsManagerDialog.tsx` | Auto-extract lists on open, added `extractListsFromPeople` call |
  | `usePeopleAssignment.ts` | Added debug logging for list memberships |
  | `SolumSyncAdapter.ts` | Fixed syntax error, improved debug logging |

### Previous Updates (Dec 31, 2025)
- **Feature 4 Implementation**: People-List feature with AIMS integration
  - Added `listName`, `listSpaceId` fields to Person type for AIMS list persistence
  - Enhanced `PeopleList` type with `storageName` and `isFromAIMS` fields
  - Added list name validation (max 20 chars, letters/numbers/spaces only)
  - Created `PeopleListPanel` component with Apply Assignments button
  - Updated `usePeopleLists` hook with `saveListToAims()` function
  - Load list now supports "load without auto-apply" behavior
  - Added `postBulkAssignmentsWithMetadata()` for AIMS list sync
  - Added "Sync to AIMS" button for cross-device persistence
  - Added new translations for list management (EN/HE)
  - **Auto-managed list fields**: `_LIST_NAME_`, `_LIST_SPACE_` are now automatically added/removed when People Mode is toggled
  - Enhanced `SolumPeopleManagerSection` to modify article format on toggle
- **Feature 3 Completed**: All file optimization sub-tasks finished
- Extracted `useConferenceAIMS` hook from `useConferenceController.ts`
- Split `solumService.ts` into 4 focused service modules (auth, articles, labels, store)
- **Feature 2 Enhanced**: Now captures `assignedLabels` array from AIMS article fetch response
- Added `assignedLabels?: string[]` to Space, ConferenceRoom, and Person types
- Dashboard counts actual assigned labels from AIMS data (supports multiple labels per article)

---

## Feature 5 Summary - Section Loading Indicators (Completed)

### Key Accomplishments
- ✅ Dashboard skeleton while initial AIMS sync
- ✅ Conference page skeleton cards while fetching from AIMS
- ✅ Spaces page skeleton rows while fetching from AIMS
- ✅ Per-route Suspense boundaries for instant loader display
- ✅ Route prefetching on hover and after idle
- ✅ React useTransition for non-blocking navigation
- ✅ Visual pending state feedback (opacity dim)
- ✅ Lazy loading for SettingsDialog tabs and ArticleFormatEditor
- ✅ Professional SyncStatusIndicator redesign

---

## Feature 4 Summary - People-List Feature (Completed)

### Key Accomplishments
- ✅ Multi-list architecture: People can belong to multiple lists with different space assignments per list
- ✅ `_LIST_MEMBERSHIPS_` stored in AIMS for cross-device persistence
- ✅ Lists persist to IndexedDB for offline/local access
- ✅ Active list displayed as Chip in toolbar
- ✅ Row index column for easy people counting
- ✅ Simplified UX with auto-apply on list load
- ✅ List deletion syncs to AIMS (removes `_LIST_MEMBERSHIPS_` from affected people)
- ✅ 55 tests passing

---

## File Optimization Progress (Feature 3)

| Sub-Task | Status | Details |
|----------|--------|---------|
| 3.1 usePeopleController.ts splitting | ✅ Completed | Split into 4 focused hooks |
| 3.2 PeopleManagerView.tsx extraction | ✅ Completed | Split into 8 focused components |
| 3.3 SolumSettingsTab.tsx extraction | ✅ Completed | Split into 5 focused components |
| 3.4 DashboardPage.tsx extraction | ✅ Completed | Split into 5 focused components |
| 3.5 useConferenceController.ts extraction | ✅ Completed | Extracted AIMS logic to hooks |
| 3.6 solumService.ts grouping | ✅ Completed | Split into 4 focused service modules |

**Files Created (3.1):**
- `src/features/people/application/hooks/usePeopleCSV.ts` - CSV loading operations
- `src/features/people/application/hooks/usePeopleAssignment.ts` - Space assignment logic  
- `src/features/people/application/hooks/usePeopleAIMS.ts` - AIMS sync operations
- `src/features/people/application/hooks/usePeopleLists.ts` - List management
- `src/features/people/application/hooks/index.ts` - Barrel exports

**Files Created (3.2):**
- `src/features/people/presentation/components/PeopleToolbar.tsx` - Header section with title and actions
- `src/features/people/presentation/components/PeopleStatsPanel.tsx` - Space allocation stats and progress
- `src/features/people/presentation/components/PeopleFiltersBar.tsx` - Search and filter controls
- `src/features/people/presentation/components/PeopleBulkActionsBar.tsx` - Bulk selection actions
- `src/features/people/presentation/components/PeopleTable.tsx` - Main data table container
- `src/features/people/presentation/components/PeopleTableRow.tsx` - Individual table row component
- `src/features/people/presentation/components/PeopleAimsActionsBar.tsx` - AIMS sync action buttons
- `src/features/people/presentation/components/PeopleListActionsBar.tsx` - List management actions
- `src/features/people/presentation/components/index.ts` - Barrel exports

**Files Created (3.3):**
- `src/features/settings/presentation/solum/SolumApiConfigSection.tsx` - API cluster and base URL settings
- `src/features/settings/presentation/solum/SolumCredentialsSection.tsx` - Authentication and connect/disconnect
- `src/features/settings/presentation/solum/SolumSyncSettingsSection.tsx` - Sync configuration settings
- `src/features/settings/presentation/solum/SolumPeopleManagerSection.tsx` - People Manager mode toggle
- `src/features/settings/presentation/solum/SolumSchemaEditorSection.tsx` - Article schema fetch and edit
- `src/features/settings/presentation/solum/index.ts` - Barrel exports

**Files Created (3.4):**
- `src/features/dashboard/components/DashboardStatusChip.tsx` - Reusable status chip component
- `src/features/dashboard/components/DashboardSpacesCard.tsx` - Spaces overview card
- `src/features/dashboard/components/DashboardConferenceCard.tsx` - Conference rooms overview card
- `src/features/dashboard/components/DashboardPeopleCard.tsx` - People Manager overview card
- `src/features/dashboard/components/DashboardAppInfoCard.tsx` - Application info card
- `src/features/dashboard/components/index.ts` - Barrel exports

**Files Created (3.5):**
- `src/features/conference/application/hooks/useConferenceAIMS.ts` - AIMS push/fetch/delete operations
- `src/features/conference/application/hooks/index.ts` - Barrel exports
- `src/features/conference/application/utils/conferenceTransformers.ts` - Article transformation utilities

**Files Created (3.6):**
- `src/shared/infrastructure/services/solum/authService.ts` - Login, token refresh, URL building
- `src/shared/infrastructure/services/solum/articlesService.ts` - Article CRUD operations
- `src/shared/infrastructure/services/solum/labelsService.ts` - Label operations
- `src/shared/infrastructure/services/solum/storeService.ts` - Store summary operations
- `src/shared/infrastructure/services/solum/index.ts` - Barrel exports

### Conference Controller Enhancements (Additional)

| Sub-Task | Status | Details |
|----------|--------|---------|
| Dynamic mappingInfo article building | ✅ Completed | Builds aimsArticle dynamically from all mappingInfo entries |
| Add articleName/nfcUrl selectors to Settings UI | ✅ Completed | SolumMappingSelectors updated |
| articleName populates data object | ✅ Completed | articleId and articleName added to articleData |
| Test file updated | ✅ Completed | useConferenceController.test.ts fixed and aligned |

**Key Changes Made:**
- `useConferenceController.ts`: Dynamic article building from mappingInfo (no hardcoded fields)
- `SolumMappingSelectors.tsx`: Added Article Name and NFC URL field selectors
- `SolumSettingsTab.tsx`: Added onMappingInfoChange handler
- Locales updated with new translations (en/he)

---

## Overview

This document provides a comprehensive implementation plan for the following features and improvements:

1. **Conference Room NFC URL Fix** - Missing nfcUrl in mapped info field
2. **Dashboard Assigned Labels Display** - Labels from SoluM sync not showing
3. **File Optimization** - Splitting large files into smaller functional modules
4. **People-List Feature** - Advanced list management with AIMS integration
5. **Section Loading Indicators** - Visual feedback during slow-loading sections
6. **Logger Enhancement** - App-wide structured logging enhancement
7. **App Manual Feature** - In-app bilingual manual with tab-based navigation *(Built Last)*

---

## 1. Conference Room NFC URL Fix

### Problem Statement
The conference room feature does not save the NFC URL in the mapped info field when posting to AIMS. This should work similarly to the space posting functionality.

### Current Behavior Analysis
- **useSpaceController.ts** (lines 137-138): Correctly maps nfcUrl from mappingInfo
  ```typescript
  if (mappingInfo?.nfcUrl && data[mappingInfo.nfcUrl]) {
      aimsArticle.nfcUrl = String(data[mappingInfo.nfcUrl]);
  }
  ```
- **useConferenceController.ts**: Missing nfcUrl mapping in aimsArticle construction

### Root Cause
The conference controller builds the AIMS article without checking for nfcUrl mapping from the globalFieldAssignments or mappingInfo configuration.

### Implementation Plan

#### Phase 1.1: Add NFC URL Mapping to Conference Room Add (2h)
**File:** `src/features/conference/application/useConferenceController.ts`

**Changes Required:**

1. After applying globalFieldAssignments, add nfcUrl to root aimsArticle object:
```typescript
// Location: Around line 150 (after articleData construction, before aimsArticle creation)

// Get mappingInfo for root field mapping
const mappingInfo = solumMappingConfig.mappingInfo;

const aimsArticle: any = {
    articleId: finalRoom.id,
    articleName: finalRoom.data?.roomName || finalRoom.id,
    data: articleData
};

// Map nfcUrl to root level (same as useSpaceController)
if (mappingInfo?.nfcUrl && articleData[mappingInfo.nfcUrl]) {
    aimsArticle.nfcUrl = String(articleData[mappingInfo.nfcUrl]);
} else if (solumMappingConfig.globalFieldAssignments) {
    // Check if nfcUrl is in global assignments
    const globalNfcField = mappingInfo?.nfcUrl;
    if (globalNfcField && solumMappingConfig.globalFieldAssignments[globalNfcField]) {
        aimsArticle.nfcUrl = String(solumMappingConfig.globalFieldAssignments[globalNfcField]);
    }
}
```

#### Phase 1.2: Add NFC URL Mapping to Conference Room Update (2h)
**File:** `src/features/conference/application/useConferenceController.ts`

**Changes Required:**

1. Apply same nfcUrl mapping logic in the `updateConferenceRoom` function (around line 300)

#### Phase 1.3: Testing (1h)
- Create conference room with NFC URL in global fields
- Verify AIMS receives nfcUrl at root level
- Test update flow preserves nfcUrl

### Files to Modify
| File | Changes |
|------|---------|
| `src/features/conference/application/useConferenceController.ts` | Add nfcUrl mapping in addConferenceRoom and updateConferenceRoom |

---

## 2. Dashboard Assigned Labels Display Fix

### Problem Statement
Assigned labels from SoluM sync are received but the dashboard is not showing them correctly.

### Current Behavior Analysis
- **DashboardPage.tsx** (line 90): Uses `settings.solumConfig?.storeSummary?.labelCount || 0`
- **useSettingsController.ts** (line 281-302): Fetches storeSummary on connect only
- **Problem**: The labelCount is fetched only on initial connection, not updated during sync

### Root Cause
The `storeSummary.labelCount` is only populated when initially connecting to SoluM. During regular sync operations, this value is not refreshed.

### Implementation Plan ✅ COMPLETED

#### Phase 2.1: Capture assignedLabel from AIMS API Response ✅
The AIMS API returns `assignedLabel` array in article fetch response:
```json
{
  "articleList": [{
    "articleId": "B100001",
    "assignedLabel": ["04507B0AC391", "04509452C390"]
  }]
}
```

**Changes Made:**

1. **Added `assignedLabels` field to domain types:**
   - `src/shared/domain/types.ts` - Added to `Space` and `ConferenceRoom` interfaces
   - `src/features/people/domain/types.ts` - Added to `Person` interface

2. **Capture assignedLabels during sync:**
   - `src/features/sync/infrastructure/SolumSyncAdapter.ts` - Extract `article.assignedLabel` when mapping to Space
   - `src/features/conference/application/useConferenceController.ts` - Extract `article.assignedLabel` when mapping to ConferenceRoom

3. **Update Dashboard to count from assignedLabels arrays:**
   - `src/features/dashboard/DashboardPage.tsx` - Sum all `assignedLabels.length` from spaces and conference rooms

#### Phase 2.2: Dashboard Label Count Calculation ✅
```typescript
const assignedLabelsCount = useMemo(() => {
    const spaceLabelsCount = spaceController.spaces.reduce(
        (count, s) => count + (s.assignedLabels?.length || 0), 0
    );
    const conferenceLabelsCount = conferenceController.conferenceRooms.reduce(
        (count, r) => count + (r.assignedLabels?.length || 0), 0
    );
    return spaceLabelsCount + conferenceLabelsCount;
}, [spaceController.spaces, conferenceController.conferenceRooms]);
```

### Files Modified
| File | Changes |
|------|---------|
| `src/shared/domain/types.ts` | Added `assignedLabels?: string[]` to Space and ConferenceRoom |
| `src/features/people/domain/types.ts` | Added `assignedLabels?: string[]` to Person |
| `src/features/sync/infrastructure/SolumSyncAdapter.ts` | Capture `article.assignedLabel` array |
| `src/features/conference/application/useConferenceController.ts` | Capture `article.assignedLabel` array |
| `src/features/dashboard/DashboardPage.tsx` | Count from assignedLabels arrays |

### Benefits
- Accurate label count from actual AIMS data
- Support for multiple labels per article
- Can display label IDs in tables
- Works for spaces, people, and conference rooms

---

## 3. App Manual Feature

### Requirements
- In-app manual accessible via icon button next to settings
- Available in both languages (English and Hebrew)
- Tab-based navigation for each mode
- Consistent design with app theme

### Architecture Design

```
src/features/manual/
├── domain/
│   └── types.ts                    # Manual section types
├── presentation/
│   ├── ManualDialog.tsx            # Main dialog with tabs
│   ├── ManualSection.tsx           # Reusable section component
│   ├── sections/
│   │   ├── GettingStartedSection.tsx
│   │   ├── DashboardSection.tsx
│   │   ├── SpacesSection.tsx
│   │   ├── PeopleSection.tsx
│   │   ├── ConferenceSection.tsx
│   │   ├── SyncSection.tsx
│   │   └── SettingsSection.tsx
│   └── ManualIcon.tsx              # Icon component
└── index.ts
```

### Implementation Plan

#### Phase 3.1: Create Manual Feature Structure (2h)

**File:** `src/features/manual/domain/types.ts`
```typescript
export interface ManualSection {
    id: string;
    titleKey: string;  // i18n key
    content: string;   // i18n key for content
    icon?: React.ReactNode;
}

export interface ManualTab {
    id: string;
    titleKey: string;
    sections: ManualSection[];
}
```

#### Phase 3.2: Create Manual Dialog Component (4h)

**File:** `src/features/manual/presentation/ManualDialog.tsx`

Features:
- Fullscreen or large dialog (like SettingsDialog)
- Tabs: Getting Started, Spaces Mode, People Mode, Conference, Sync, Settings
- RTL support for Hebrew
- Markdown-like formatting for content
- Screenshots/illustrations (optional future enhancement)

```typescript
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function ManualDialog({ open, onClose }: ManualDialogProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);
    const isRTL = i18n.dir() === 'rtl';
    
    // Tab configuration based on mode
    const tabs = [
        { label: t('manual.gettingStarted'), content: <GettingStartedSection /> },
        { label: t('manual.dashboard'), content: <DashboardSection /> },
        // ... more tabs
    ];
    
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            // ... implementation
        </Dialog>
    );
}
```

#### Phase 3.3: Add Translations (3h)

**Files:** 
- `src/locales/en/translation.json`
- `src/locales/he/translation.json`

Add comprehensive manual content in both languages:
```json
{
  "manual": {
    "title": "User Manual",
    "gettingStarted": "Getting Started",
    "dashboard": "Dashboard",
    "spacesMode": "Spaces Mode",
    "peopleMode": "People Mode",
    "conference": "Conference Rooms",
    "sync": "Sync & Integration",
    "settings": "Settings",
    "sections": {
      "overview": "Overview",
      "quickStart": "Quick Start Guide",
      // ... detailed content
    }
  }
}
```

#### Phase 3.4: Add Manual Button to Header (1h)

**File:** `src/shared/presentation/layouts/AppHeader.tsx`

Add HelpIcon button between LanguageSwitcher and Settings:
```typescript
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// In render, before settings icon:
<IconButton color="default" onClick={onManualClick}>
    <HelpOutlineIcon />
</IconButton>
```

#### Phase 3.5: Integration in MainLayout (1h)

**File:** `src/shared/presentation/layouts/MainLayout.tsx`

Add state and handler for manual dialog:
```typescript
const [manualOpen, setManualOpen] = useState(false);

// Pass to AppHeader
<AppHeader onManualClick={() => setManualOpen(true)} />

// Add dialog
<ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} />
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/features/manual/domain/types.ts` | Type definitions |
| `src/features/manual/presentation/ManualDialog.tsx` | Main dialog |
| `src/features/manual/presentation/sections/*.tsx` | Section components |
| `src/features/manual/index.ts` | Exports |

### Files to Modify
| File | Changes |
|------|---------|
| `src/shared/presentation/layouts/AppHeader.tsx` | Add manual button |
| `src/shared/presentation/layouts/MainLayout.tsx` | Add dialog state |
| `src/locales/en/translation.json` | Add manual translations |
| `src/locales/he/translation.json` | Add manual translations |

---

## 4. File Optimization - Splitting Large Files

### Analysis of Large Files

| File | Size (bytes) | Lines | Recommendation |
|------|--------------|-------|----------------|
| `peopleFeatures.test.ts` | 68,039 | ~1500 | Split by feature area |
| `usePeopleController.ts` | 50,666 | ~1200 | Split into multiple hooks |
| `PeopleManagerView.tsx` | 38,176 | ~850 | Extract sub-components |
| `SolumSettingsTab.tsx` | 30,522 | ~550 | Extract field components |
| `useConferenceController.ts` | 29,238 | ~640 | Extract AIMS logic |
| `DashboardPage.tsx` | 27,784 | ~500 | Extract card components |
| `ConferencePage.tsx` | 24,951 | ~550 | Extract sub-components |
| `peopleService.ts` | 23,384 | ~500 | Split by responsibility |
| `LogsViewer.tsx` | 22,203 | ~450 | Extract filter/table components |
| `solumService.ts` | 22,039 | ~650 | Group by API endpoint |

### Detailed Splitting Plan

#### 4.1: usePeopleController.ts → Split into Focused Hooks (6h)

**New Structure:**
```
src/features/people/application/
├── usePeopleController.ts         # Main orchestrator (reduced)
├── hooks/
│   ├── usePeopleCSV.ts           # CSV parsing & upload
│   ├── usePeopleAssignment.ts    # Space assignment logic
│   ├── usePeopleBulkActions.ts   # Bulk operations
│   ├── usePeopleAIMS.ts          # AIMS sync operations
│   └── usePeopleLists.ts         # List management
└── utils/
    └── peopleTransformers.ts      # Data transformation utilities
```

**Splitting Strategy:**
1. Extract CSV upload logic → `usePeopleCSV.ts` (~200 lines)
2. Extract single/bulk assignment → `usePeopleAssignment.ts` (~300 lines)
3. Extract AIMS operations → `usePeopleAIMS.ts` (~250 lines)
4. Extract list management → `usePeopleLists.ts` (~200 lines)
5. Keep main hook as orchestrator (~250 lines)

#### 4.2: PeopleManagerView.tsx → Extract Components (4h)

**New Structure:**
```
src/features/people/presentation/
├── PeopleManagerView.tsx          # Main view (reduced)
├── components/
│   ├── PeopleToolbar.tsx         # Filters & actions toolbar
│   ├── PeopleTable.tsx           # Table with columns
│   ├── PeopleTableRow.tsx        # Single row component
│   ├── PeopleBulkActions.tsx     # Bulk action bar
│   └── PeopleStatsBar.tsx        # Statistics display
└── dialogs/
    └── (existing dialogs)
```

#### 4.3: SolumSettingsTab.tsx → Extract Field Components (3h)

**New Structure:**
```
src/features/settings/presentation/
├── SolumSettingsTab.tsx           # Main tab (reduced)
├── solum/
│   ├── SolumConnectionForm.tsx   # Connection config
│   ├── SolumSyncSettings.tsx     # Sync interval settings
│   ├── SolumModeSelector.tsx     # Working mode selector
│   └── SolumFieldMappingSection.tsx # Field mapping area
```

#### 4.4: DashboardPage.tsx → Extract Card Components (3h)

**New Structure:**
```
src/features/dashboard/
├── DashboardPage.tsx              # Main page (reduced)
├── components/
│   ├── SpacesCard.tsx            # Spaces overview card
│   ├── ConferenceCard.tsx        # Conference overview card
│   ├── PeopleCard.tsx            # People manager card
│   ├── ConnectionCard.tsx        # SoluM connection card
│   └── DashboardStatusChip.tsx   # Reusable status chip
```

#### 4.5: useConferenceController.ts → Extract AIMS Logic (4h)

**New Structure:**
```
src/features/conference/application/
├── useConferenceController.ts     # Main controller (reduced)
├── hooks/
│   ├── useConferenceAIMS.ts      # AIMS push/fetch operations
│   └── useConferenceCRUD.ts      # CRUD operations
└── utils/
    └── conferenceTransformers.ts  # Article transformation
```

#### 4.6: solumService.ts → Group by Endpoint (3h)

**New Structure:**
```
src/shared/infrastructure/services/
├── solumService.ts                # Re-export & types
├── solum/
│   ├── authService.ts            # login, refreshToken
│   ├── articlesService.ts        # fetchArticles, pushArticles, putArticles
│   ├── labelsService.ts          # getLabels, assignLabel, getLabelDetail
│   └── storeService.ts           # getStoreSummary
```

### Implementation Priority

| Priority | Files | Estimated Time |
|----------|-------|----------------|
| High | usePeopleController.ts | 6h |
| High | PeopleManagerView.tsx | 4h |
| Medium | DashboardPage.tsx | 3h |
| Medium | SolumSettingsTab.tsx | 3h |
| Medium | useConferenceController.ts | 4h |
| Low | solumService.ts | 3h |
| Low | Tests splitting | 4h |

**Total Estimated Time: 27h**

---

## 5. People-List Feature (Major Feature)

### Requirements Summary

1. **Article Format Integration**: When enabling People mode, update article format with 2 hidden fields (`list` and `space`)
2. **List Persistence**: Lists stored in AIMS via hidden fields, synced cross-platform
3. **Assignment Behavior**: 
   - Loading a list does NOT auto-assign spaces
   - Separate "Apply Assignments" button required
   - Building and saving a list preserves space assignments
4. **List Naming**: 
   - Letters, numbers, spaces only
   - Max 20 characters
   - Spaces saved as underscores in AIMS

### Architecture Design

#### 5.1: Domain Types

**File:** `src/features/people/domain/types.ts` (Extended)

```typescript
export interface Person {
    id: string;
    virtualSpaceId?: string;
    data: Record<string, string>;
    assignedSpaceId?: string;
    aimsSyncStatus?: 'pending' | 'synced' | 'error';
    lastSyncedAt?: string;
    
    // NEW: List-related fields (hidden in AIMS)
    listName?: string;      // Current list assignment (with underscores)
    listSpaceId?: string;   // Space ID from list (not active assignment)
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

// Validation constants
export const LIST_NAME_MAX_LENGTH = 20;
export const LIST_NAME_PATTERN = /^[a-zA-Z0-9\s]+$/;

// Helpers
export function toStorageName(name: string): string {
    return name.replace(/\s+/g, '_');
}

export function toDisplayName(storageName: string): string {
    return storageName.replace(/_/g, ' ');
}

export function validateListName(name: string): { valid: boolean; error?: string } {
    if (!name.trim()) return { valid: false, error: 'List name is required' };
    if (name.length > LIST_NAME_MAX_LENGTH) {
        return { valid: false, error: `Max ${LIST_NAME_MAX_LENGTH} characters` };
    }
    if (!LIST_NAME_PATTERN.test(name)) {
        return { valid: false, error: 'Only letters, numbers, and spaces allowed' };
    }
    return { valid: true };
}
```

#### 5.2: Article Format Modification

**File:** `src/features/settings/application/useSettingsController.ts`

When enabling People Manager mode, auto-add hidden fields:

```typescript
const enablePeopleManagerMode = useCallback(async () => {
    // Add hidden fields to article format if not present
    const currentFormat = settings.solumMappingConfig?.fields || {};
    
    const updatedFields = {
        ...currentFormat,
        _list_name: { visible: false, friendlyName: 'List Name' },
        _list_space: { visible: false, friendlyName: 'List Space' },
    };
    
    updateSettings({
        peopleManagerEnabled: true,
        solumMappingConfig: {
            ...settings.solumMappingConfig,
            fields: updatedFields,
        }
    });
}, [settings, updateSettings]);
```

#### 5.3: Store Updates

**File:** `src/features/people/infrastructure/peopleStore.ts`

Add list-related state:

```typescript
interface PeopleStore {
    // Existing state...
    
    // List feature state
    pendingChanges: boolean;        // True when local changes not saved
    isListLoaded: boolean;          // True when a list is actively loaded
    loadedListMetadata?: {
        name: string;
        storageName: string;
        loadedAt: string;
    };
    
    // Actions
    markPendingChanges: () => void;
    clearPendingChanges: () => void;
    applyListAssignments: () => void;  // Apply listSpaceId to assignedSpaceId
}
```

#### 5.4: Controller Logic

**New File:** `src/features/people/application/hooks/usePeopleListManager.ts`

```typescript
export function usePeopleListManager() {
    const peopleStore = usePeopleStore();
    const { settings } = useSettingsStore();
    
    /**
     * Save current state as a new list
     * - Validates name (letters, numbers, spaces, max 20 chars)
     * - Converts spaces to underscores for storage
     * - Posts to AIMS with hidden fields
     */
    const saveNewList = useCallback(async (name: string): Promise<boolean> => {
        const validation = validateListName(name);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        const storageName = toStorageName(name);
        
        // Update all people with list metadata
        const peopleWithList = peopleStore.people.map(p => ({
            ...p,
            data: {
                ...p.data,
                _list_name: storageName,
                _list_space: p.assignedSpaceId || '',
            }
        }));
        
        // Push to AIMS
        await postPeopleToAIMS(peopleWithList, settings.solumConfig);
        
        // Save locally
        peopleStore.addPeopleList({
            id: uuidv4(),
            name,
            storageName,
            createdAt: new Date().toISOString(),
            people: peopleWithList,
        });
        
        return true;
    }, [peopleStore, settings]);
    
    /**
     * Load list from AIMS
     * - Fetches articles with matching _list_name
     * - Sets listSpaceId but NOT assignedSpaceId
     * - User must press "Apply Assignments" to activate
     */
    const loadList = useCallback(async (storageName: string): Promise<void> => {
        // Fetch from AIMS
        const articles = await fetchArticlesWithList(storageName, settings.solumConfig);
        
        // Map to people with listSpaceId (not assigned)
        const people = articles.map(a => ({
            id: a.articleId,
            data: a.data,
            listSpaceId: a.data._list_space || undefined,
            assignedSpaceId: undefined,  // NOT auto-assigned
        }));
        
        peopleStore.setPeople(people);
        peopleStore.setLoadedListMetadata({
            name: toDisplayName(storageName),
            storageName,
            loadedAt: new Date().toISOString(),
        });
    }, [peopleStore, settings]);
    
    /**
     * Apply list assignments
     * - Copies listSpaceId to assignedSpaceId for all people
     * - Posts assignments to AIMS
     */
    const applyListAssignments = useCallback(async (): Promise<void> => {
        const assignments = peopleStore.people
            .filter(p => p.listSpaceId)
            .map(p => ({ personId: p.id, spaceId: p.listSpaceId! }));
        
        await bulkAssignSpaces(assignments, true);
    }, [peopleStore]);
    
    /**
     * Update existing list (save changes)
     */
    const updateCurrentList = useCallback(async (): Promise<boolean> => {
        if (!peopleStore.loadedListMetadata) {
            throw new Error('No list loaded');
        }
        
        // Same as saveNewList but updates existing
        // ... implementation
        
        peopleStore.clearPendingChanges();
        return true;
    }, [peopleStore]);
    
    return {
        saveNewList,
        loadList,
        applyListAssignments,
        updateCurrentList,
        pendingChanges: peopleStore.pendingChanges,
        loadedListMetadata: peopleStore.loadedListMetadata,
    };
}
```

#### 5.5: UI Components

**New File:** `src/features/people/presentation/PeopleListPanel.tsx`

```typescript
export function PeopleListPanel() {
    const { t } = useTranslation();
    const {
        saveNewList,
        loadList,
        applyListAssignments,
        updateCurrentList,
        pendingChanges,
        loadedListMetadata,
    } = usePeopleListManager();
    
    // Character counter for list name
    const [listName, setListName] = useState('');
    const charCount = listName.length;
    const isValidName = validateListName(listName).valid;
    
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Stack gap={2}>
                <Typography variant="subtitle2">
                    {t('people.listManagement')}
                </Typography>
                
                {/* Current List Status */}
                {loadedListMetadata && (
                    <Alert severity="info">
                        {t('people.loadedList', { name: loadedListMetadata.name })}
                        {pendingChanges && (
                            <Chip label={t('people.unsavedChanges')} color="warning" />
                        )}
                    </Alert>
                )}
                
                {/* List Name Input */}
                <TextField
                    label={t('people.listName')}
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    inputProps={{ maxLength: LIST_NAME_MAX_LENGTH }}
                    helperText={`${charCount}/${LIST_NAME_MAX_LENGTH} ${t('people.charsRemaining')}`}
                    error={listName.length > 0 && !isValidName}
                />
                
                {/* Actions */}
                <Stack direction="row" gap={1}>
                    <Button
                        onClick={() => saveNewList(listName)}
                        disabled={!isValidName}
                    >
                        {t('people.saveNewList')}
                    </Button>
                    
                    <Button onClick={loadList}>
                        {t('people.loadList')}
                    </Button>
                    
                    {loadedListMetadata && (
                        <>
                            <Button
                                onClick={applyListAssignments}
                                color="success"
                            >
                                {t('people.applyAssignments')}
                            </Button>
                            
                            <Button
                                onClick={updateCurrentList}
                                disabled={!pendingChanges}
                            >
                                {t('people.saveChanges')}
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}
```

### Implementation Phases

| Phase | Description | Time |
|-------|-------------|------|
| 5.1 | Domain types & validation | 2h |
| 5.2 | Article format auto-update | 2h |
| 5.3 | Store updates | 3h |
| 5.4 | List manager hook | 6h |
| 5.5 | AIMS integration for lists | 4h |
| 5.6 | UI components | 4h |
| 5.7 | Translations | 2h |
| 5.8 | Testing | 4h |

**Total: 27h**

### Files to Create
| File | Purpose |
|------|---------|
| `src/features/people/application/hooks/usePeopleListManager.ts` | List management logic |
| `src/features/people/presentation/PeopleListPanel.tsx` | List UI panel |
| `src/features/people/presentation/ListSelectionDialog.tsx` | List selection dialog |

### Files to Modify
| File | Changes |
|------|---------|
| `src/features/people/domain/types.ts` | Add list-related types |
| `src/features/people/infrastructure/peopleStore.ts` | Add list state |
| `src/features/people/infrastructure/peopleService.ts` | Add AIMS list operations |
| `src/features/people/presentation/PeopleManagerView.tsx` | Integrate list panel |
| `src/features/settings/application/useSettingsController.ts` | Auto-add hidden fields |

---

## 6. Section Loading Indicators

### Problem Statement
Sections like People Manager can take significant time to load (fetching from AIMS, parsing CSV, etc.). Users may think the app is stuck when no visual feedback is provided during these loading operations.

### Requirements
- Display loading spinner/skeleton when sections are loading data
- Provide feedback during AIMS sync operations
- Show progress for bulk operations where applicable
- Consistent loading UI across all sections

### Implementation Plan

#### 6.1: Create Loading Component Library (2h)

**Files to Create:**
```
src/shared/presentation/components/
├── LoadingSpinner.tsx        # Centered spinning indicator
├── LoadingOverlay.tsx        # Full-section overlay with spinner
├── LoadingSkeleton.tsx       # Skeleton placeholder for tables/cards
└── index.ts                  # Barrel exports
```

**LoadingSpinner.tsx:**
```typescript
import { CircularProgress, Box } from '@mui/material';

interface LoadingSpinnerProps {
    size?: number;
    message?: string;
}

export function LoadingSpinner({ size = 40, message }: LoadingSpinnerProps) {
    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
            <CircularProgress size={size} />
            {message && <Box mt={2} color="text.secondary">{message}</Box>}
        </Box>
    );
}
```

**LoadingOverlay.tsx:**
```typescript
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

interface LoadingOverlayProps {
    loading: boolean;
    message?: string;
    children: React.ReactNode;
}

export function LoadingOverlay({ loading, message, children }: LoadingOverlayProps) {
    return (
        <Box position="relative">
            {children}
            <Fade in={loading}>
                <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="rgba(255,255,255,0.8)"
                    zIndex={10}
                >
                    <CircularProgress />
                    {message && <Typography mt={2} color="text.secondary">{message}</Typography>}
                </Box>
            </Fade>
        </Box>
    );
}
```

#### 6.2: Add Loading States to Controllers (3h)

**Files to Modify:**
- `src/features/people/application/usePeopleController.ts` - Add `isLoading` state
- `src/features/conference/application/useConferenceController.ts` - Add `isLoading` state
- `src/features/sync/application/useSyncController.ts` - Add `isSyncing` state
- `src/features/settings/application/useSettingsController.ts` - Add `isConnecting` state

**Example (usePeopleController.ts):**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState<string | undefined>();

const loadPeopleFromCSV = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage(t('people.loadingCSV'));
    try {
        // ... existing logic
    } finally {
        setIsLoading(false);
        setLoadingMessage(undefined);
    }
};

return {
    // ... existing returns
    isLoading,
    loadingMessage,
};
```

#### 6.3: Integrate Loading UI in Views (3h)

**Files to Modify:**
- `src/features/people/presentation/PeopleManagerView.tsx`
- `src/features/conference/presentation/ConferencePage.tsx`
- `src/features/spaces/presentation/SpacesPage.tsx`
- `src/features/dashboard/DashboardPage.tsx`

**Example (PeopleManagerView.tsx):**
```typescript
import { LoadingOverlay } from '@shared/presentation/components';

export function PeopleManagerView() {
    const { isLoading, loadingMessage, ... } = usePeopleController();
    
    return (
        <LoadingOverlay loading={isLoading} message={loadingMessage}>
            {/* Existing content */}
        </LoadingOverlay>
    );
}
```

#### 6.4: Add Translations (1h)

**Files to Modify:**
- `src/locales/en/translation.json`
- `src/locales/he/translation.json`

```json
{
  "loading": {
    "default": "Loading...",
    "syncing": "Syncing with AIMS...",
    "loadingCSV": "Loading CSV file...",
    "fetchingPeople": "Fetching people data...",
    "savingChanges": "Saving changes...",
    "connecting": "Connecting to SoluM..."
  }
}
```

### Files Summary

| Action | File | Purpose |
|--------|------|--------|
| Create | `src/shared/presentation/components/LoadingSpinner.tsx` | Centered spinner |
| Create | `src/shared/presentation/components/LoadingOverlay.tsx` | Overlay with spinner |
| Create | `src/shared/presentation/components/LoadingSkeleton.tsx` | Table/card skeletons |
| Modify | `src/features/people/application/usePeopleController.ts` | Add loading state |
| Modify | `src/features/people/presentation/PeopleManagerView.tsx` | Integrate overlay |
| Modify | `src/features/conference/application/useConferenceController.ts` | Add loading state |
| Modify | `src/features/conference/presentation/ConferencePage.tsx` | Integrate overlay |
| Modify | `src/locales/en/translation.json` | Loading messages |
| Modify | `src/locales/he/translation.json` | Loading messages (Hebrew) |

### Estimated Time: 9h

---

## 7. Logger Implementation - App-Wide Enhancement

### Current State
The logger already exists at `src/shared/infrastructure/services/logger.ts` with:
- In-memory storage (max 1000 logs)
- Log levels: debug, info, warn, error
- Integration with logsStore for persistence
- LogsViewer UI component

### Enhancement Plan

#### 7.1: Add Log Categories (2h)

**File:** `src/shared/infrastructure/services/logger.ts`

```typescript
export type LogCategory = 
    | 'App'           // General app lifecycle
    | 'Auth'          // Authentication
    | 'Sync'          // Sync operations
    | 'AIMS'          // AIMS API calls
    | 'People'        // People management
    | 'Conference'    // Conference rooms
    | 'Settings'      // Settings changes
    | 'Navigation'    // Route changes
    | 'Performance'   // Performance metrics
    | 'Error';        // Error tracking

// Add category filtering
getLogsByCategory(category: LogCategory): LogEntry[]
```

#### 7.2: Add Performance Logging (2h)

```typescript
class Logger {
    // Performance tracking
    private timers: Map<string, number> = new Map();
    
    startTimer(operationId: string): void {
        this.timers.set(operationId, performance.now());
    }
    
    endTimer(operationId: string, category: string, message: string): void {
        const start = this.timers.get(operationId);
        if (start) {
            const duration = performance.now() - start;
            this.info(category, message, { duration: `${duration.toFixed(2)}ms` });
            this.timers.delete(operationId);
        }
    }
}
```

#### 7.3: Add Log Export (2h)

```typescript
exportLogs(format: 'json' | 'csv'): string {
    if (format === 'json') {
        return JSON.stringify(this.logs, null, 2);
    }
    // CSV format
    return this.logs.map(l => 
        `${l.timestamp.toISOString()},${l.level},${l.category},"${l.message}"`
    ).join('\n');
}
```

#### 7.4: Add Strategic Logging Points (4h)

Add logging to key operations:

| Area | Operations to Log |
|------|-------------------|
| Authentication | Login, logout, token refresh |
| Sync | Start, complete, errors, article counts |
| AIMS | All API calls with timing |
| People | CSV upload, assignment changes, list operations |
| Conference | Room CRUD, meeting toggles |
| Settings | Changes to critical settings |

Example additions:
```typescript
// In useSettingsController.ts
logger.info('Settings', 'Settings updated', { 
    changedFields: Object.keys(updates),
    timestamp: new Date().toISOString()
});

// In SolumSyncAdapter.ts
logger.startTimer('sync-download');
// ... sync operation
logger.endTimer('sync-download', 'Sync', 'Download completed', { 
    articles: articles.length 
});
```

#### 7.5: Error Boundary Integration (2h)

**File:** `src/shared/presentation/components/ErrorBoundary.tsx`

```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('App', 'React Error Boundary caught error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
    });
}
```

### Implementation Timeline

| Phase | Description | Time |
|-------|-------------|------|
| 7.1 | Log categories | 2h |
| 7.2 | Performance logging | 2h |
| 7.3 | Log export | 2h |
| 7.4 | Strategic logging points | 4h |
| 7.5 | Error boundary integration | 2h |

**Total: 12h**

---

## Implementation Schedule

### Week 1: Critical Fixes
| Day | Task | Hours |
|-----|------|-------|
| 1 | Conference NFC URL fix | 5h |
| 2 | Dashboard labels fix | 5h |

### Week 2: Manual Feature
| Day | Task | Hours |
|-----|------|-------|
| 1-2 | Manual structure & components | 6h |
| 3 | Translations (EN) | 3h |
| 4 | Translations (HE) | 3h |
| 5 | Integration & testing | 3h |

### Week 3-4: File Optimization
| Days | Task | Hours |
|------|------|-------|
| 1-2 | usePeopleController splitting | 6h |
| 3 | PeopleManagerView splitting | 4h |
| 4 | DashboardPage splitting | 3h |
| 5 | SolumSettingsTab splitting | 3h |
| 6 | useConferenceController splitting | 4h |
| 7 | solumService splitting | 3h |
| 8 | Testing all changes | 4h |

### Week 5-6: People-List Feature
| Days | Task | Hours |
|------|------|-------|
| 1 | Domain types & validation | 2h |
| 2 | Article format integration | 2h |
| 3 | Store updates | 3h |
| 4-5 | List manager hook | 6h |
| 6-7 | AIMS integration | 4h |
| 8 | UI components | 4h |
| 9 | Translations | 2h |
| 10 | Testing | 4h |

### Week 7: Logger Enhancement
| Day | Task | Hours |
|-----|------|-------|
| 1 | Categories & performance logging | 4h |
| 2 | Export & strategic logging | 6h |
| 3 | Error boundary & testing | 2h |

---

## Total Estimated Time

| Feature | Hours |
|---------|-------|
| Conference NFC URL | 5h |
| Dashboard Labels | 5h |
| App Manual | 15h |
| File Optimization | 27h |
| People-List Feature | 27h |
| Logger Enhancement | 12h |
| Data Cleanup | 4h |
| SFTP Mode | 37h |
| **Total** | **132h** |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| File splitting breaks imports | High | Incremental approach, run tests after each split |
| People-List feature complexity | High | Thorough testing, phased rollout |
| Translation coverage | Medium | Review with native speakers |
| AIMS API changes | Medium | Version check, error handling |
| SFTP API availability | Medium | Retry logic, offline mode fallback |
| Mode switch data loss | High | Confirmation dialog, clear user messaging |

---

## Success Criteria

1. ✅ Conference rooms post nfcUrl to AIMS correctly
2. ✅ Dashboard shows accurate label counts from current data
3. ✅ Manual accessible in both languages with complete content
4. ✅ No file exceeds 500 lines (except tests)
5. ✅ People lists sync cross-platform via AIMS
6. ✅ Comprehensive logging with export capability
7. ⬜ Data properly cleared on disconnect and mode switch
8. ⬜ SFTP mode fully functional with CSV sync

---

## Feature 9: Data Cleanup on Disconnect/Mode Switch

### Problem Statement

When disconnecting from a connection or switching between working modes (SFTP ↔ SoluM API), the application does NOT properly clean up data:
- Spaces, People, Conference rooms remain in stores
- Saved lists persist
- When switching modes: old credentials and field mappings remain

### Required Behavior

| Action | Data to Clear | Settings to Clear |
|--------|---------------|-------------------|
| **Disconnect (same mode)** | Spaces, People, Conference rooms, Lists | ❌ Keep credentials |
| **Switch to different mode** | All above + | ✅ Clear old mode credentials, field mappings |

### Implementation Plan

#### Phase 9.1: Add Store Clear Methods (2h)

**Files to Modify:**

| File | Changes |
|------|---------|
| `spacesStore.ts` | Add `clearAllData()` method |
| `peopleStore.ts` | Add `clearAllData()` method |
| `conferenceStore.ts` | Add `clearAllData()` method |

```typescript
// spacesStore.ts
clearAllData: () => set({
    spaces: [],
    spacesLists: [],
    activeListName: undefined,
    activeListId: undefined
}, false, 'clearAllData'),

// peopleStore.ts
clearAllData: () => set({
    people: [],
    peopleLists: [],
    activeListName: undefined,
    activeListId: undefined,
    pendingChanges: false,
    spaceAllocation: { total: 0, assigned: 0, unassigned: 0 }
}, false, 'clearAllData'),

// conferenceStore.ts
clearAllData: () => set({
    conferenceRooms: []
}, false, 'clearAllData'),
```

#### Phase 9.2: Add Settings Clear Methods (1h)

**File:** `settingsStore.ts`

```typescript
// Clear credentials for a specific mode
clearModeCredentials: (mode: WorkingMode) => set((state) => ({
    settings: {
        ...state.settings,
        ...(mode === 'SFTP' ? { sftpCredentials: undefined } : {}),
        ...(mode === 'SOLUM_API' ? {
            solumConfig: undefined,
            solumMappingConfig: undefined
        } : {})
    }
}), false, 'clearModeCredentials'),

// Clear all field mappings
clearFieldMappings: () => set((state) => ({
    settings: {
        ...state.settings,
        solumMappingConfig: undefined
    }
}), false, 'clearFieldMappings'),
```

#### Phase 9.3: Disconnect Button Behavior (1h)

**Files to Modify:**

| File | Changes |
|------|---------|
| `SolumSettingsTab.tsx` | Call data cleanup on disconnect |
| `SFTPSettingsTab.tsx` | Call data cleanup on disconnect |
| `useSyncController.ts` | Expose `clearAllData()` helper |

```typescript
// In disconnect handler
const handleDisconnect = async () => {
    // Clear sync state
    await adapter.disconnect();
    
    // Clear all data stores
    useSpacesStore.getState().clearAllData();
    usePeopleStore.getState().clearAllData();
    useConferenceStore.getState().clearAllData();
    
    // Reset sync state
    useSyncStore.getState().resetSyncState();
};
```

#### Phase 9.4: Mode Switch Confirmation (1h)

**File:** `SettingsDialog.tsx` or new `ModeSwitch` component

```typescript
const handleModeSwitch = async (newMode: WorkingMode) => {
    const currentMode = syncStore.workingMode;
    
    if (currentMode !== newMode) {
        // Show confirmation dialog
        const confirmed = await showConfirmDialog({
            title: t('settings.switchModeTitle'),
            message: t('settings.switchModeWarning'),
            confirmText: t('common.switch'),
            cancelText: t('common.cancel')
        });
        
        if (confirmed) {
            // Clear ALL data
            useSpacesStore.getState().clearAllData();
            usePeopleStore.getState().clearAllData();
            useConferenceStore.getState().clearAllData();
            
            // Clear OLD mode credentials and mappings
            settingsStore.clearModeCredentials(currentMode);
            
            // Switch mode
            syncStore.setWorkingMode(newMode);
        }
    }
};
```

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `spacesStore.ts` | Modify | Add `clearAllData()` |
| `peopleStore.ts` | Modify | Add `clearAllData()` |
| `conferenceStore.ts` | Modify | Add `clearAllData()` |
| `settingsStore.ts` | Modify | Add `clearModeCredentials()`, `clearFieldMappings()` |
| `SolumSettingsTab.tsx` | Modify | Call cleanup on disconnect |
| `SFTPSettingsTab.tsx` | Modify | Call cleanup on disconnect |
| `SettingsDialog.tsx` | Modify | Mode switch confirmation |
| `common.json` (en/he) | Modify | Add switch mode translations |

### Estimated Time: 4h

---

## Feature 10: SFTP Mode Implementation

### Overview

Full implementation of SFTP working mode using the existing SFTP API at `https://solum.co.il/sftp`.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SFTP Working Mode                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  SFTPSettings   │───▶│   sftpService    │                   │
│  │   (Component)   │    │   (Singleton)    │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│  ┌─────────────────┐    ┌────────▼─────────┐                   │
│  │  SFTPSyncAdapter│───▶│  sftpApiClient   │                   │
│  │                 │    │                  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│  ┌─────────────────┐    ┌────────▼─────────┐                   │
│  │  csvService     │    │   encryption.ts  │                   │
│  │  (parse/gen)    │    │  (AES-256-CBC)   │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│                         ┌────────▼─────────┐                   │
│                         │   SFTP API       │                   │
│                         │ solum.co.il/sftp │                   │
│                         └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sftp/fetch` | POST | Test connection (fetch directory tree) |
| `/sftp/file` | GET | Download file |
| `/sftp/file` | POST | Upload file |
| `/sftp/file` | DELETE | Delete file |
| `/sftp/users` | POST | Create user |
| `/sftp/users` | GET | Get all users |
| `/sftp/users` | DELETE | Delete user |
| `/sftp/password` | POST | Reset password |

**Base URL:** `https://solum.co.il/sftp`
**Auth:** Bearer token (permanent)
**Encryption:** AES-256-CBC for username, password, filename

### Implementation Plan

#### Phase 10.1: Encryption Service (2h)

**File:** `src/shared/infrastructure/services/encryption.ts`

```typescript
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'gBfdx3Mkyi8IVAH6OQBcV4VtGRgf5XJV';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
    });
    
    const ivHex = iv.toString(CryptoJS.enc.Hex);
    const encryptedText = encrypted.toString();
    
    return `${ivHex}:${encryptedText}`;
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = CryptoJS.enc.Hex.parse(textParts[0]);
    const encryptedText = textParts[1];
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
}
```

#### Phase 10.2: SFTP API Client (4h)

**File:** `src/shared/infrastructure/services/sftpApiClient.ts`

```typescript
import axios from 'axios';
import { encrypt } from './encryption';
import { logger } from './logger';

const API_BASE_URL = import.meta.env.DEV 
    ? '/api' 
    : 'https://solum.co.il/sftp';
    
const API_TOKEN = 'SFTP_APi_T0k3n_2025_c0mpl3x_S3cur3_P3rm4n3nt_K3y_X9zQ7mN5bR8wF2vH4pL';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
    }
});

export interface SFTPCredentials {
    username: string;
    password: string;
    remoteFileName: string;  // default: "esl.csv"
    store: string;           // default: "01"
}

export async function testConnection(creds: SFTPCredentials): Promise<boolean> {
    logger.startTimer('sftp-test-connection');
    try {
        const response = await apiClient.post('/sftp/fetch', {
            username: encrypt(creds.username),
            password: encrypt(creds.password)
        });
        logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test successful');
        return response.status === 200;
    } catch (error) {
        logger.endTimer('sftp-test-connection', 'SFTP', 'Connection test failed', { error });
        throw error;
    }
}

export async function downloadFile(creds: SFTPCredentials): Promise<string> {
    logger.startTimer('sftp-download');
    try {
        const response = await apiClient.get('/sftp/file', {
            params: {
                username: encrypt(creds.username),
                password: encrypt(creds.password),
                filename: encrypt(creds.remoteFileName)
            }
        });
        logger.endTimer('sftp-download', 'SFTP', 'File downloaded', { 
            size: response.data?.length 
        });
        return response.data;
    } catch (error) {
        logger.endTimer('sftp-download', 'SFTP', 'Download failed', { error });
        throw error;
    }
}

export async function uploadFile(creds: SFTPCredentials, content: string): Promise<void> {
    logger.startTimer('sftp-upload');
    try {
        const formData = new FormData();
        const blob = new Blob([content], { type: 'text/csv' });
        formData.append('file', blob, creds.remoteFileName);
        formData.append('username', encrypt(creds.username));
        formData.append('password', encrypt(creds.password));
        formData.append('filename', encrypt(creds.remoteFileName));
        
        await apiClient.post('/sftp/file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        logger.endTimer('sftp-upload', 'SFTP', 'File uploaded');
    } catch (error) {
        logger.endTimer('sftp-upload', 'SFTP', 'Upload failed', { error });
        throw error;
    }
}

export async function deleteFile(creds: SFTPCredentials): Promise<void> {
    await apiClient.delete('/sftp/file', {
        params: {
            username: encrypt(creds.username),
            password: encrypt(creds.password),
            filename: encrypt(creds.remoteFileName)
        }
    });
}
```

#### Phase 10.3: Vite Proxy Configuration (1h)

**File:** `vite.config.ts`

```typescript
server: {
    proxy: {
        '/api': {
            target: 'https://solum.co.il/sftp',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            secure: true
        }
    }
}
```

#### Phase 10.4: CSV Service Enhancement (4h)

**File:** `src/shared/infrastructure/services/csvService.ts`

```typescript
import Papa from 'papaparse';
import type { Space, ConferenceRoom, CSVConfig } from '@shared/domain/types';

export interface CSVConfig {
    hasHeader: boolean;
    delimiter: ',' | ';' | '\t';
    columns: CSVColumnMapping[];
    idColumn: string;
}

export interface CSVColumnMapping {
    fieldName: string;     // Field name in app
    csvColumn: number;     // Column index in CSV (0-based)
    friendlyName: string;  // Display name
    required: boolean;
}

export function parseCSV(content: string, config: CSVConfig): Space[] {
    const parsed = Papa.parse(content, {
        delimiter: config.delimiter,
        header: config.hasHeader,
        skipEmptyLines: true
    });
    
    return parsed.data.map((row: any, index: number) => {
        const data: Record<string, string> = {};
        
        config.columns.forEach(col => {
            const value = config.hasHeader 
                ? row[col.fieldName] 
                : row[col.csvColumn];
            data[col.fieldName] = value || '';
        });
        
        return {
            id: data[config.idColumn] || `row-${index}`,
            data
        };
    });
}

export function generateCSV(spaces: Space[], config: CSVConfig): string {
    const rows = spaces.map(space => {
        const row: string[] = [];
        config.columns.forEach(col => {
            row[col.csvColumn] = space.data[col.fieldName] || '';
        });
        return row;
    });
    
    if (config.hasHeader) {
        const header = config.columns.map(col => col.fieldName);
        rows.unshift(header);
    }
    
    return Papa.unparse(rows, { delimiter: config.delimiter });
}
```

#### Phase 10.5: SFTP Sync Adapter Completion (4h)

**File:** `src/features/sync/infrastructure/SFTPSyncAdapter.ts`

Complete implementation with:
- Proper error handling
- Retry logic with exponential backoff
- Progress tracking
- Logger integration

#### Phase 10.6: SFTP Settings Tab Enhancement (6h)

**File:** `src/features/settings/presentation/SFTPSettingsTab.tsx`

Features:
- Connection form (username, password, remote filename)
- Test connection button with feedback
- Connect/Disconnect toggle
- CSV structure editor integration
- Auto-sync toggle and interval selector (30s, 1min, 2min, 5min, 10min)
- "Sync when idle" checkbox with explanation tooltip
- Status display with countdown to next auto-sync

#### Phase 10.7: CSV Structure Editor (4h)

**File:** `src/features/configuration/presentation/CSVStructureEditor.tsx`

Features:
- Add/remove column mappings
- Set column index for each field
- Set ID column
- Set delimiter
- Toggle header row
- Preview parsed data

#### Phase 10.8: Sync Controller SFTP Integration (4h)

**File:** `src/features/sync/application/useSyncController.ts`

- Proper SFTP adapter initialization
- Auto-sync support for SFTP mode
- Status synced with UI

**Periodic Auto-Sync Feature:**
- When idle (no user interaction), automatically sync from CSV at configurable interval
- Default interval: 30 seconds (minimum)
- User-configurable: 30s, 1min, 2min, 5min, 10min options
- Idle detection: no mouse/keyboard activity for 10 seconds
- Sync skipped if user is actively editing
- Visual indicator showing "Auto-sync in Xs" countdown
- Manual sync button to force immediate sync

```typescript
interface AutoSyncConfig {
    enabled: boolean;
    intervalSeconds: 30 | 60 | 120 | 300 | 600;
    idleThresholdMs: 10000;
}

// Idle detection using activity listeners
useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let syncInterval: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            // User is idle, start auto-sync interval
            syncInterval = setInterval(syncFromCSV, config.intervalSeconds * 1000);
        }, config.idleThresholdMs);
    };
    
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    
    return () => {
        clearTimeout(idleTimer);
        clearInterval(syncInterval);
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('keydown', resetIdleTimer);
    };
}, [config]);
```

**Settings stored in:** `settingsStore.ts` → `sftpAutoSyncConfig`

#### Phase 10.9: Translations (2h)

**Files:** `src/locales/en/common.json`, `src/locales/he/common.json`

Add all SFTP-related translations:
- Connection labels
- Status messages
- Error messages
- CSV structure labels

#### Phase 10.10: Spaces Management SFTP Support (3h)

**Key Difference:** In SFTP mode, Spaces do NOT sync with AIMS. Instead, they are managed entirely via CSV file on the SFTP server.

**Behavior in SFTP Mode:**
- **Add Space:** Creates row in local store → triggers CSV regeneration → uploads to SFTP
- **Edit Space:** Updates row in local store → triggers CSV regeneration → uploads to SFTP
- **Delete Space:** Removes row from local store → triggers CSV regeneration → uploads to SFTP
- **No label assignment:** Labels are not available in SFTP mode (no AIMS connection)
- **Sync:** Downloads CSV → parses with field mapping → updates spacesStore

**Files to Modify:**

1. **`src/features/space/application/useSpaceController.ts`**
   - Add working mode check at start of each operation
   - Route add/edit/delete to SFTP sync adapter instead of AIMS API
   - Skip label-related operations in SFTP mode

```typescript
const workingMode = useSettingsStore.getState().workingMode;

if (workingMode === 'SFTP') {
    // Update local store
    spacesStore.addSpace(spaceData);
    // Regenerate CSV and upload
    await sftpSyncAdapter.uploadSpaces();
} else {
    // Existing SOLUM_API flow
    await aimsApi.createSpace(spaceData);
}
```

2. **`src/features/space/presentation/SpacesManagementView.tsx`**
   - Hide label assignment UI when in SFTP mode
   - Show "SFTP Mode" indicator
   - Disable real-time sync status (batch sync only)

3. **`src/features/sync/infrastructure/SFTPSyncAdapter.ts`**
   - Add `uploadSpaces()` method
   - Add `downloadSpaces()` method
   - Integrate with csvService for parsing/generation

**CSV Structure for Spaces:**
```csv
id,name,location,floor,capacity,status
SP001,Meeting Room A,Building 1,3,10,active
SP002,Conference Hall,Building 2,1,50,active
```

#### Phase 10.11: Conference Management SFTP Support (3h)

**Key Difference:** In SFTP mode, Conference rooms sync via CSV, not AIMS. NFC URL generation still works locally.

**Behavior in SFTP Mode:**
- **Add Room:** Creates row in local store → triggers CSV regeneration → uploads to SFTP
- **Edit Room:** Updates row in local store → triggers CSV regeneration → uploads to SFTP
- **Delete Room:** Removes row from local store → triggers CSV regeneration → uploads to SFTP
- **NFC URL:** Generated locally using room ID (no server dependency)
- **Sync:** Downloads CSV → parses with field mapping → updates conferenceStore

**Files to Modify:**

1. **`src/features/conference/application/useConferenceController.ts`**
   - Add working mode check at start of each operation
   - Route add/edit/delete to SFTP sync adapter instead of AIMS API
   - NFC URL generation remains unchanged (local operation)

```typescript
const workingMode = useSettingsStore.getState().workingMode;

if (workingMode === 'SFTP') {
    // Update local store
    conferenceStore.addRoom(roomData);
    // Regenerate CSV and upload
    await sftpSyncAdapter.uploadConferenceRooms();
} else {
    // Existing SOLUM_API flow
    await aimsApi.createConferenceRoom(roomData);
}
```

2. **`src/features/conference/presentation/ConferencePage.tsx`**
   - Show "SFTP Mode" indicator
   - Adjust sync button behavior for batch sync

3. **`src/features/sync/infrastructure/SFTPSyncAdapter.ts`**
   - Add `uploadConferenceRooms()` method
   - Add `downloadConferenceRooms()` method
   - Support separate CSV file for conference rooms (configurable)

**CSV Structure for Conference Rooms:**
```csv
room_id,room_name,building,floor,capacity,nfc_enabled
CR001,Board Room,HQ,5,20,true
CR002,Training Room,HQ,2,30,true
```

**Note:** Conference rooms may share the same CSV file as Spaces (configurable) or use a separate file based on user preference in SFTP settings.

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `encryption.ts` | Create | AES-256-CBC encryption |
| `sftpApiClient.ts` | Create | SFTP API HTTP client |
| `csvService.ts` | Modify | CSV parse/generate with config |
| `SFTPSyncAdapter.ts` | Modify | Complete sync implementation |
| `SFTPSettingsTab.tsx` | Modify | Full settings UI |
| `CSVStructureEditor.tsx` | Modify | Column mapping UI |
| `useSyncController.ts` | Modify | SFTP adapter support |
| `useSpaceController.ts` | Modify | SFTP mode routing |
| `SpacesManagementView.tsx` | Modify | SFTP mode UI adjustments |
| `useConferenceController.ts` | Modify | SFTP mode routing |
| `ConferencePage.tsx` | Modify | SFTP mode UI adjustments |
| `vite.config.ts` | Modify | Add proxy for dev |
| `common.json` (en/he) | Modify | SFTP translations |
| Domain types | Modify | Add CSVConfig interface |

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     SFTP Sync Flow                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DOWNLOAD (Server → App):                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ SFTP API   │─▶│ CSV String │─▶│ parseCSV() │─▶ Stores    │
│  │ GET /file  │  │            │  │            │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  UPLOAD (App → Server):                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │  Stores    │─▶│generateCSV │─▶│ SFTP API   │             │
│  │            │  │            │  │ POST /file │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Estimated Time: 37h

| Phase | Description | Hours |
|-------|-------------|-------|
| 10.1 | Encryption service | 2h |
| 10.2 | SFTP API client | 4h |
| 10.3 | Vite proxy config | 1h |
| 10.4 | CSV service enhancement | 4h |
| 10.5 | SFTP sync adapter | 4h |
| 10.6 | SFTP settings tab | 6h |
| 10.7 | CSV structure editor | 4h |
| 10.8 | Sync controller + auto-sync | 4h |
| 10.9 | Translations | 2h |
| 10.10 | Spaces Management SFTP Support | 3h |
| 10.11 | Conference Management SFTP Support | 3h |
| 10.12 | Enable SFTP Mode in UI | 1h |
| 10.13 | Extended Testing | 4h |
| **Total** | | **42h** |

---

### Phase 10.12: Enable SFTP Mode in UI (1h)

**Goal:** Remove the force migration and enable SFTP mode selection in the UI.

**Files to Modify:**

1. **`MainLayout.tsx`**: Remove the force migration effect
2. **`SettingsDialog.tsx`**: Enable SFTP settings panel
3. **`AppSettingsTab.tsx`**: Enable working mode toggle

**Changes:**
```typescript
// Remove from MainLayout.tsx:
useEffect(() => {
    if (workingMode === 'SFTP') {
        setWorkingMode('SOLUM_API');
    }
}, [workingMode, setWorkingMode]);

// Enable in SettingsDialog.tsx:
// Uncomment SFTP Panel
```

---

### Phase 10.13: SFTP Mode Extended Testing Plan (4h)

**Goal:** Comprehensive testing of SFTP mode functionality across all features.

#### Test Categories

##### 1. Connection Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| C1 | Valid connection | Enter valid SFTP credentials → Click Test Connection | Success alert, green status chip |
| C2 | Invalid credentials | Enter wrong password → Click Test Connection | Error alert with message |
| C3 | Invalid host | Enter non-existent host → Click Test Connection | Connection timeout error |
| C4 | Empty fields | Leave username empty → Click Test/Connect | Disabled button or validation error |
| C5 | Connect then disconnect | Connect → Verify chip → Disconnect | Status changes, data cleared |
| C6 | Reconnect after disconnect | Disconnect → Re-enter credentials → Connect | Successful reconnection |

##### 2. CSV Download Tests (45min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| D1 | Download valid CSV | Connect → Sync | Spaces appear in list |
| D2 | Download with header | CSV has header row → Download | Fields mapped correctly |
| D3 | Download without header | Configure no-header → Download | Uses column indices |
| D4 | Download empty CSV | Empty file on server → Download | Empty spaces list, no error |
| D5 | Download malformed CSV | Invalid CSV syntax → Download | Error message, previous data preserved |
| D6 | Download missing file | Non-existent filename → Download | Clear error message |
| D7 | Large file download | 1000+ rows → Download | Progress updates, successful completion |
| D8 | Download with conference | CSV has conference rows → Download | Spaces and conference rooms parsed |

##### 3. CSV Upload Tests (45min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| U1 | Upload spaces | Add/edit space → Sync | CSV updated on server |
| U2 | Upload conference rooms | Add conference room → Sync | CSV includes conference data |
| U3 | Upload empty list | Delete all spaces → Sync | Empty CSV (header only) uploaded |
| U4 | Upload after edit | Edit space → Sync | Changes reflected in CSV |
| U5 | Upload after delete | Delete space → Sync | Row removed from CSV |
| U6 | Concurrent upload | Rapid add/edit → Sync | Last state uploaded correctly |
| U7 | Upload failure recovery | Disconnect during upload → Reconnect | No data loss, can retry |

##### 4. CSV Structure Configuration Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| S1 | Add column | Click Add Column → Configure → Save | Column appears in editor |
| S2 | Remove column | Select column → Delete | Column removed, reindexed |
| S3 | Reorder columns | Drag column to new position | Order updated, indices recalculated |
| S4 | Change delimiter | Set to semicolon → Sync | CSV uses semicolon delimiter |
| S5 | Toggle header row | Disable header → Sync | CSV generated without header |
| S6 | Field type validation | Set type to number, enter text | Validation warning |
| S7 | Required field missing | Make field required, CSV missing it | Parse warning logged |

##### 5. Auto-Sync Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| A1 | Enable auto-sync | Toggle on, set 30s → Wait | Sync triggers at interval |
| A2 | Disable auto-sync | Toggle off → Wait | No sync after interval |
| A3 | Change interval | Set to 1min → Verify | Interval changes |
| A4 | Auto-sync during edit | Editing form → Auto-sync triggers | Sync delayed or skipped |
| A5 | Auto-sync on disconnect | Disconnect → Wait interval | No sync attempts |
| A6 | Auto-sync reconnect | Disconnect → Reconnect → Wait | Auto-sync resumes |

##### 6. Mode Switch Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| M1 | Switch SFTP → SoluM | Confirm switch dialog | SFTP credentials cleared, data cleared |
| M2 | Switch SoluM → SFTP | Confirm switch dialog | SoluM credentials cleared, data cleared |
| M3 | Cancel mode switch | Click Cancel in dialog | No changes, stays in current mode |
| M4 | Switch with pending changes | Unsaved edits → Switch | Warning dialog, data cleared on confirm |
| M5 | Settings preserved | Switch modes → Check app settings | Name, subtitle, space type preserved |

##### 7. Error Handling & Recovery Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| E1 | Network timeout | Slow connection → Sync | Retry with backoff, eventual error |
| E2 | Server 500 error | API returns error → Sync | Error displayed, retry option |
| E3 | Encryption failure | Invalid encryption key → Connect | Graceful error handling |
| E4 | Parse error recovery | Corrupt CSV → Sync → Fix CSV → Sync | Recovery after fix |
| E5 | Token expiry | Invalid API token → Sync | Clear error message |

##### 8. UI State Tests (30min)
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| UI1 | Status indicator | Connect/Disconnect | Color changes (green/gray) |
| UI2 | Loading states | During sync | Spinner, disabled buttons |
| UI3 | SFTP mode indicator | Enter SFTP mode | "SFTP Mode" visible in header/settings |
| UI4 | Disabled label assignment | In SFTP mode → Try assign label | Option hidden or disabled |
| UI5 | Responsive layout | Mobile view → SFTP settings | Proper layout, scrollable |
| UI6 | RTL support | Switch to Hebrew → SFTP settings | Correct RTL layout |

#### Test Environment Setup

```bash
# 1. Start dev server
npm run dev

# 2. Ensure SFTP proxy is running (or mock server)
# The vite proxy forwards /sftp-api to production

# 3. Prepare test CSV files on SFTP server:
# - valid.csv (standard format)
# - empty.csv (header only)
# - large.csv (1000+ rows)
# - malformed.csv (syntax errors)
# - no-header.csv (no header row)
```

#### Test Data Files

**valid.csv:**
```csv
ID,NAME,RANK,TITLE
001,John Doe,Major,Commander
002,Jane Smith,Captain,Deputy
003,Bob Wilson,Lieutenant,Officer
```

**conference.csv:**
```csv
ID,NAME,RANK,TITLE,MEETING,START,END
001,Office A,Floor 1,Building A,,,
002,Office B,Floor 2,Building A,,,
C01,Board Room,Floor 3,Building A,Weekly Standup,09:00,10:00
C02,Training Room,Floor 1,Building B,,,
```

#### Acceptance Criteria

- [ ] All connection tests pass (C1-C6)
- [ ] All download tests pass (D1-D8)
- [ ] All upload tests pass (U1-U7)
- [ ] All structure tests pass (S1-S7)
- [ ] All auto-sync tests pass (A1-A6)
- [ ] All mode switch tests pass (M1-M5)
- [ ] All error handling tests pass (E1-E5)
- [ ] All UI state tests pass (UI1-UI6)
- [ ] No TypeScript errors
- [ ] No console errors during normal operation
- [ ] Hebrew translations complete and correct
- [ ] Mobile layout works correctly

---

## Appendix: File Dependency Map

```
App.tsx
└── MainLayout.tsx
    ├── AppHeader.tsx
    │   └── ManualDialog.tsx (NEW)
    └── Routes
        ├── DashboardPage.tsx
        │   ├── SpacesCard.tsx (NEW)
        │   ├── ConferenceCard.tsx (NEW)
        │   └── PeopleCard.tsx (NEW)
        ├── PeopleManagerView.tsx
        │   ├── PeopleToolbar.tsx (NEW)
        │   ├── PeopleTable.tsx (NEW)
        │   └── PeopleListPanel.tsx (NEW)
        └── ...
```

## Appendix: SFTP API Reference

See [SFTP_WORKING_MODE_DOCUMENTATION.md](./SFTP_WORKING_MODE_DOCUMENTATION.md) for complete API documentation including:
- All endpoint specifications
- Authentication details
- Encryption specification
- Error handling
- Test commands
