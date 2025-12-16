# electisSpace Consolidated Build Plan

**Last Updated:** 2025-12-16  
**Status:** Build Broken - TypeScript Errors (16)  
**Estimated Remaining Work:** 135-140 hours

---

## 🎯 Current Status Summary

| Phase | Status | Progress | Hours Remaining |
|-------|--------|----------|-----------------|
| **Phase 0:** Project Setup | ⚠️ Partial | 50% | 4h |
| **Phase 1:** Shared Infrastructure | ⚠️ Partial | 30% | 12h |
| **Phase 2:** Sync Feature | ❌ Not Started | 0% | 16h |
| **Phase 3:** Personnel/Spaces Feature | ⚠️ Started | 10% | 22h |
| **Phase 4:** Conference Feature | ⚠️ Started | 5% | 15h |
| **Phase 5:** Settings Feature | ⚠️ Started | 5% | 15h |
| **Phase 6:** Root Store & Routing | ⚠️ Partial | 40% | 5h |
| **Phase 7:** Shared UI Components | ❌ Not Started | 0% | 8h |
| **Phase 8:** i18n & Styling | ⚠️ Started | 20% | 6h |
| **Phase 9:** Testing | ❌ Not Started | 0% | 16h |
| **Phase 10:** Performance | ❌ Not Started | 0% | 8h |
| **Phase 11:** Verification | ❌ Not Started | 0% | 8h |
| **Phase 12:** Documentation | ✅ Complete | 100% | 0h |

**Total Remaining:** ~135h

---

## 🚨 CRITICAL: Immediate Blockers (MUST FIX FIRST)

### Blocker 1: TypeScript Build Errors (2-3 hours)

**Problem:** 16 compilation errors preventing all development work.

**Root Cause:** Legacy naming (`Person`, `ChairList`, `PersonnelStore`) vs. correct naming (`Space`, `SpacesList`, `SpacesStore`).

**Fix Steps:**

#### Step 1: Rename Files
```bash
# In src/features/space/infrastructure/
mv personnelStore.ts spacesStore.ts
```

#### Step 2: Update Type Definition
File: `src/features/space/domain/types.ts`
```typescript
// Change from SpaceList → SpacesList (add 's')
export interface SpacesList {
    id: string;
    name: string;
    createdAt: string;
    updatedAt?: string;
    spaces: import('@shared/domain/types').Space[];  // ✅ Already correct
}
```

#### Step 3: Global Find & Replace
Use IDE global search/replace across `src/`:

| Find | Replace | Files Affected |
|------|---------|----------------|
| `import type { Person }` | `import type { Space }` | ~20 files |
| `import type { ChairList }` | `import type { SpacesList }` | ~10 files |
| `PersonnelStore` (interface name) | `SpacesStore` | 2-3 files |
| `usePersonnelStore` (function name) | `useSpacesStore` | Keep as-is for now* |
| `personnel: Person[]` | `spaces: Space[]` | ~15 files |
| `chairLists: ChairList[]` | `spacesLists: SpacesList[]` | ~5 files |

*Note: Hook names can stay as `usePersonnelStore` for backward compatibility, but the type it returns should be `SpacesStore`.

#### Step 4: Verify Build
```bash
npm run build
# Should complete with 0 errors
```

**Verification Checklist:**
- [ ] `npm run build` succeeds
- [ ] `npm run lint` succeeds
- [ ] `npm run dev` starts without errors
- [ ] No red TypeScript errors in IDE

---

## 📅 Build Phases (After Blocker Fixed)

### Phase 0: Complete Project Setup (4 hours)

**What's Done:**
- ✅ Dependencies installed
- ✅ TypeScript configured
- ✅ Vite configured
- ✅ Directory structure created

**What's Missing:**
- [ ] Fix naming inconsistencies (see above)
- [ ] Verify all path aliases work
- [ ] Test build pipeline end-to-end
- [ ] Update README.md with actual project info

**Deliverables:**
- Working build with 0 errors
- Proper README
- Clean git history

---

### Phase 1: Shared Infrastructure (12 hours remaining)

**Reference:** [low_level_design.md](file:///c:/React/electisSpace/docs/low_level_design.md) - Shared Layer

**What Exists:**
- ⚠️ `shared/domain/types.ts` (incomplete)
- ⚠️ Basic service structure

**Implementation Tasks:**

#### 1.1 Complete Domain Types (1h)
File: `src/shared/domain/types.ts`
- [ ] Review all types against documentation
- [ ] Add any missing helper types
- [ ] Export all necessary types

#### 1.2 Logger Service (2h)
File: `src/shared/infrastructure/services/logger.ts`
- [ ] Implement log levels (debug, info, warn, error)
- [ ] In-memory log storage (last 1000 entries)
- [ ] `getLogs()`, `clearLogs()` methods
- [ ] Console output with formatting
- [ ] Test: Logs appear and persist

#### 1.3 CSV Service (3h)
File: `src/shared/infrastructure/services/csvService.ts`
- [ ] `parseCSV(csvString, config)` using PapaParse
- [ ] `generateCSV(data, config)` with dynamic columns
- [ ] `validateCSV(csvString, config)`
- [ ] `ensureCSVHeader(config)` helper
- [ ] Test: Parse → Generate roundtrip

#### 1.4 Encryption Service (2h)
File: `src/shared/infrastructure/services/encryptionService.ts`
- [ ] `encrypt(text, key)` using crypto-js AES-256
- [ ] `decrypt(encrypted, key)`
- [ ] `hashPassword(password)`
- [ ] `verifyPassword(password, hash)`
- [ ] Test: Encrypt → Decrypt roundtrip

#### 1.5 SFTP Service (2h)
File: `src/shared/infrastructure/services/sftpService.ts`
- [ ] Port from v1 or create new API client wrapper
- [ ] `testConnection(credentials)`
- [ ] `downloadFile(credentials, filename)`
- [ ] `uploadFile(credentials, filename, content)`
- [ ] Error handling with logger

#### 1.6 SoluM Service (2h)
File: `src/shared/infrastructure/services/solumService.ts`
- [ ] Port from v1 implementation
- [ ] `login(config)` → tokens
- [ ] `refreshToken(refreshToken)` → new tokens
- [ ] `fetchArticles(tokens, storeNumber)`
- [ ] `pushArticles(tokens, articles)`
- [ ] `getLabels(tokens)`, `assignLabel()`, `updateLabelPage()`
- [ ] Token auto-refresh logic

**Verification:**
- [ ] All services have unit tests
- [ ] Logger outputs to console
- [ ] CSV roundtrip works
- [ ] Encryption roundtrip works
- [ ] SFTP test connection works
- [ ] SoluM login works

---

### Phase 2: Sync Feature (16 hours)

**Reference:** [WORKING_MODES_GUIDE.md](file:///c:/React/electisSpace/docs/WORKING_MODES_GUIDE.md), [workflows.md](file:///c:/React/electisSpace/docs/workflows.md)

**Architecture:** Adapter pattern for unified sync interface

#### 2.1 Sync Domain (2h)
- [ ] Define `SyncAdapter` interface
- [ ] Define `SyncStatus`, `SyncMode` types
- [ ] Define error types

#### 2.2 SFTP Sync Adapter (4h)
File: `src/features/sync/infrastructure/SFTPSyncAdapter.ts`
- [ ] Implement `connect()` using sftpService
- [ ] Implement `download()`: download CSV → parse → return Space[]
- [ ] Implement `upload()`: generate CSV → upload
- [ ] Implement `sync()`: bi-directional sync
- [ ] Implement `getStatus()`
- [ ] Error handling and logging

#### 2.3 SoluM Sync Adapter (6h)
File: `src/features/sync/infrastructure/SolumSyncAdapter.ts`
- [ ] Implement `connect()`: login → store tokens
- [ ] Implement `getValidToken()`: auto-refresh if < 5min
- [ ] Implement `mapArticlesToSpaces()`: Article[] → Space[]
- [ ] Implement `mapSpacesToArticles()`: Space[] → Article[]
- [ ] Implement `download()`: fetch articles + labels → map
- [ ] Implement `upload()`: map → push articles
- [ ] Implement `sync()`
- [ ] Token expiry handling

#### 2.4 Sync Store & Controller (4h)
Files: `syncStore.ts`, `useSyncController.ts`
- [ ] Create sync state (connected, lastSync, error)
- [ ] Implement `getAdapter()` based on workingMode
- [ ] Implement `connect()`, `disconnect()`, `sync()`
- [ ] Implement auto-sync with interval
- [ ] Pause logic when dialogs open
- [ ] Error state management

**Verification:**
- [ ] SFTP adapter connects and syncs
- [ ] SoluM adapter connects and syncs
- [ ] Token refresh works automatically
- [ ] Auto-sync triggers on interval
- [ ] Mode switching changes adapter

---

### Phase 3: Spaces Feature (22 hours)

**Reference:** [low_level_design.md](file:///c:/React/electisSpace/docs/low_level_design.md) - Personnel/Spaces section

**Current State:** Basic structure exists, types need renaming, UI incomplete

#### 3.1 Domain Layer (4h)
- [ ] Complete `validation.ts`: `validateSpace()`, `validateSpacesList()`
- [ ] Complete `businessRules.ts`: `generateSpaceId()`, `mergeSpaceDefaults()`, `filterSpaces()`
- [ ] Write unit tests for all domain logic

#### 3.2 Infrastructure (2h)
- [ ] Review `spacesStore.ts` (after rename)
- [ ] Verify all state actions work correctly
- [ ] Test persistence with Zustand middleware

#### 3.3 Application Layer (6h)
Files: `useSpaceController.ts`, `useSpaceFilters.ts`
- [ ] `addSpace()`: validate → defaults → store → sync
- [ ] `updateSpace()`: validate → store → sync
- [ ] `deleteSpace()`: store → sync
- [ ] `importFromSync()`: download → update store
- [ ] `exportToSync()`: upload from store
- [ ] Filter logic: search, room, custom fields
- [ ] `saveSpacesList()`, `loadSpacesList()`, `deleteSpacesList()`

#### 3.4 Presentation Layer (10h)
Components to create/complete:
- [ ] `SpacesManagement.tsx` - Main page with toolbar
- [ ] `SpaceDialog.tsx` - Add/Edit modal
- [ ] `SpaceForm.tsx` - Dynamic form based on CSV config
- [ ] `SpacesTable.tsx` - MUI DataGrid with actions
- [ ] `SpacesCards.tsx` - Card view alternative
- [ ] `FilterDrawer.tsx` - Filter UI
- [ ] `LoadSpacesListDialog.tsx` - Load saved lists
- [ ] `SaveSpacesListDialog.tsx` - Save current list

**Verification:**
- [ ] Add space → validates → saves → syncs
- [ ] Edit space → updates → syncs
- [ ] Delete space → removes → syncs
- [ ] Import → downloads → updates UI
- [ ] Filters work correctly
- [ ] Save/load lists persists

---

### Phase 4: Conference Feature (15 hours)

**Reference:** [low_level_design.md](file:///c:/React/electisSpace/docs/low_level_design.md) - Conference section

Follow same pattern as Spaces feature:

#### 4.1 Domain Layer (3h)
- [ ] Validation: time ranges, room data
- [ ] Business rules: generate room IDs (C01, C02...)

#### 4.2 Application Layer (4h)
- [ ] CRUD operations
- [ ] Meeting toggle (simple mode)
- [ ] Meeting update (full mode)
- [ ] Label page updates for SoluM

#### 4.3 Presentation Layer (8h)
- [ ] `ConferenceRoomList.tsx`
- [ ] `ConferenceRoomForm.tsx`
- [ ] `TimeRangePicker.tsx`
- [ ] `ParticipantList.tsx`
- [ ] `ParticipantDialog.tsx`

---

### Phase 5: Settings Feature (15 hours)

**Reference:** [low_level_design.md](file:///c:/React/electisSpace/docs/low_level_design.md) - Settings section

#### 5.1 Application Layer (4h)
- [ ] Settings validation
- [ ] Credential encryption before save
- [ ] Import/export settings file
- [ ] Logo upload with validation

#### 5.2 Presentation Layer (11h)
9 components for settings tabs:
- [ ] `SettingsDialog.tsx` - Main container with tabs
- [ ] `AppSettings.tsx` - App configuration
- [ ] `SFTPSettings.tsx` - SFTP credentials
- [ ] `SolumSettings.tsx` - SoluM configuration
- [ ] `LogoSettings.tsx` - Logo uploads
- [ ] `CSVConfigEditor.tsx` - CSV column mapping
- [ ] `SettingsFileManager.tsx` - Import/export
- [ ] `SecuritySettings.tsx` - Password protection
- [ ] `LogViewer.tsx` - View application logs

---

### Phase 6: Complete Root Store & Routing (5 hours)

**What Exists:** Basic routing with AppRoutes.tsx

**Remaining Work:**
- [ ] Finalize root store composition
- [ ] Configure persistence middleware properly
- [ ] Add DevTools integration
- [ ] Complete MainLayout with navigation
- [ ] Add Header with language switcher
- [ ] Add LoadingFallback component
- [ ] Lazy load all feature routes

---

### Phase 7: Shared UI Components (8 hours)

**Components to create:**
- [ ] `ErrorBoundary.tsx` - Catch React errors
- [ ] `NotificationContainer.tsx` - Toast notifications
- [ ] `FilterDrawer.tsx` - Reusable filter sidebar
- [ ] `TableToolbar.tsx` - Reusable table toolbar
- [ ] `SyncStatusIndicator.tsx` - Connection status badge
- [ ] `ConfirmDialog.tsx` - Confirmation dialogs
- [ ] `LoadingSpinner.tsx` - Loading states

---

### Phase 8: Complete i18n & Styling (6 hours)

**What Exists:** `theme.ts` with MUI configuration

**Remaining Work:**
- [ ] Setup i18next configuration
- [ ] Copy/create locale files (en, he)
- [ ] Add translation keys for all new components
- [ ] Test RTL layout for Hebrew
- [ ] Apply theme consistently
- [ ] Add dark mode support (optional)

---

### Phase 9: Testing (16 hours)

**Reference:** [implementation_plan.md](file:///c:/React/electisSpace/docs/implementation_plan.md) - Phase 9

#### 9.1 Unit Tests (6h)
- [ ] Domain layer tests (validation, business rules)
- [ ] Service tests (CSV, encryption, logger)
- [ ] Utility tests

#### 9.2 Integration Tests (6h)
- [ ] Hook tests (controllers with mocked stores)
- [ ] Adapter tests (mocked services)
- [ ] Store tests

#### 9.3 Component Tests (4h)
- [ ] Critical component tests (dialogs, forms)
- [ ] User interaction tests

**Target:** >70% code coverage for business logic

---

### Phase 10: Performance Optimization (8 hours)

**Tasks:**
- [ ] Add React.memo to all list components
- [ ] Add useMemo for filtered/sorted data
- [ ] Add useCallback for stable handlers
- [ ] Implement virtualization for large tables
- [ ] Bundle analysis and code splitting
- [ ] Lazy load heavy components

**Targets:**
- Initial bundle < 200 KB gzipped
- Table render (100 items) < 100ms
- Lighthouse score > 90

---

### Phase 11: Final Verification (8 hours)

**End-to-end testing:**
- [ ] SFTP mode: full workflow
- [ ] SoluM mode: full workflow
- [ ] Conference rooms: all features
- [ ] Settings: import/export
- [ ] Language switching
- [ ] All error scenarios

---

### Phase 12: Documentation ✅

**Status:** Complete - 14 comprehensive documents

**Optional updates:**
- [ ] Update README.md as implementation evolves
- [ ] Add inline code comments
- [ ] Create API documentation

---

## 🗓️ Recommended Schedule

### Week 1: Fix & Foundation (24h)
- **Day 1-2:** Fix TypeScript errors (3h) + Complete Phase 1 (12h)
- **Day 3-4:** Phase 2 - Sync Feature (16h)

### Week 2-3: Core Features (56h)
- **Week 2:** Phase 3 - Spaces Feature (22h) + Phase 4 Start (10h)
- **Week 3:** Phase 4 Complete (5h) + Phase 5 - Settings (15h) + Phase 6 (5h)

### Week 4: UI & Testing (32h)
- **Day 1-2:** Phase 7 - Shared Components (8h) + Phase 8 - i18n (6h)
- **Day 3-5:** Phase 9 - Testing (16h)

### Week 5: Polish & Ship (16h)
- **Day 1-2:** Phase 10 - Performance (8h)
- **Day 3-4:** Phase 11 - Verification (8h)
- **Day 5:** Buffer for unexpected issues

**Total:** 5 weeks = 128 hours (accounting for ~10h buffer)

---

## 📦 Build Commands Reference

```bash
# Development
npm run dev              # Start dev server (Vite)

# Build
npm run build           # TypeScript compile + Vite build
npm run preview         # Preview production build

# Quality
npm run lint            # ESLint check
npm run test            # Run tests (Vitest)
npm run test:coverage   # Coverage report

# Platform-specific (future)
npx cap sync            # Sync Capacitor platforms
npx cap open android    # Open in Android Studio
```

---

## 🔗 Related Documentation

- [project_assessment_2025-12-16.md](file:///c:/React/electisSpace/docs/project_assessment_2025-12-16.md) - Current status assessment
- [high_level_design.md](file:///c:/React/electisSpace/docs/high_level_design.md) - Architecture overview
- [low_level_design.md](file:///c:/React/electisSpace/docs/low_level_design.md) - Detailed API specs
- [task.md](file:///c:/React/electisSpace/docs/task.md) - Detailed phase checklist
- [WORKING_MODES_GUIDE.md](file:///c:/React/electisSpace/docs/WORKING_MODES_GUIDE.md) - SFTP & SoluM setup
- [workflows.md](file:///c:/React/electisSpace/docs/workflows.md) - User flows & diagrams

---

## ✅ Success Criteria

### Build Success
- ✅ `npm run build` completes with 0 errors
- ✅ `npm run lint` passes
- ✅ No console errors in production build

### Feature Completeness
- ✅ All CRUD operations work for Spaces
- ✅ All CRUD operations work for Conference Rooms
- ✅ SFTP sync works end-to-end
- ✅ SoluM sync works end-to-end
- ✅ Settings import/export works
- ✅ Both languages (EN/HE) work

### Quality
- ✅ >70% test coverage for business logic
- ✅ Bundle size < 500 KB total
- ✅ Initial load < 2 seconds
- ✅ Lighthouse score > 90

---

**Next Step:** Fix the TypeScript errors (see Critical Blocker above) ⬆️
