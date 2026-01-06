# electisSpace Deep Implementation Plan - Q1 2025

> Generated: December 30, 2025
> Last Updated: January 6, 2026

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
| 8 | App Manual Feature | ⬜ Not Started | - | - |

**Legend:** ⬜ Not Started | 🔄 In Progress | ✅ Completed | ⚠️ Blocked

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

##### Files Modified
| File | Changes |
|------|---------|
| `logger.ts` | Added LogCategory type, performance timing, export functions, getStats() |
| `useSyncController.ts` | Added startTimer/endTimer to sync and upload operations |
| `usePeopleController.ts` | Added performance timing to CSV file loading |
| `ErrorBoundary.tsx` | NEW - Error boundary component with logger integration |
| `App.tsx` | Wrapped with ErrorBoundary, added initialization logging |
| `AppRoutes.tsx` | Added useNavigationLogger hook for route change logging |

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
| **Total** | **91h** |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| File splitting breaks imports | High | Incremental approach, run tests after each split |
| People-List feature complexity | High | Thorough testing, phased rollout |
| Translation coverage | Medium | Review with native speakers |
| AIMS API changes | Medium | Version check, error handling |

---

## Success Criteria

1. ✅ Conference rooms post nfcUrl to AIMS correctly
2. ✅ Dashboard shows accurate label counts from current data
3. ✅ Manual accessible in both languages with complete content
4. ✅ No file exceeds 500 lines (except tests)
5. ✅ People lists sync cross-platform via AIMS
6. ✅ Comprehensive logging with export capability

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
