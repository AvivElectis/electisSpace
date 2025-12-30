# Sprint 1: Architecture & Foundation - Implementation Plan (UPDATED)

## Executive Summary

This implementation plan reflects the **greenfield approach** for building DentalMedicalCenter v2 from scratch in a new project directory. All architecture documentation has been completed prior to implementation.

**Project Location:** `c:\React\DentalMedicalCenterV2`

**Documentation Completed:**
- ✅ High-Level Design (system architecture, features, tech stack)
- ✅ Low-Level Design (complete API specifications for 80+ functions)
- ✅ Workflow Documentation (10 major workflows with diagrams)
- ✅ Function Catalog (complete index of all 120+ entities)

---

## Overview

**Approach:** Build new application from ground up following documented architecture.

**Key Principles:**
1. **Documentation First** - All design artifacts completed before coding
2. **Feature-Based from Day 1** - Start with proper vertical slice structure
3. **Sync Abstraction Built-In** - Adapter pattern from the beginning
4. **Performance Optimized** - Code splitting and optimization baked into architecture
5. **Test-Driven** - Write tests alongside implementation

---

## Project Setup

### Phase 0: Project Initialization (8h)

#### New Project Creation

**Goal:** Create new Vite + React + TypeScript project with proper configuration.

##### [NEW] Project Directory
```bash
# Create new project
cd c:\React
npm create vite@latest DentalMedicalCenterV2 -- --template react-ts

# Install dependencies
cd DentalMedicalCenterV2
npm install

# Install core dependencies
npm install zustand i18next react-i18next react-router-dom @mui/material @emotion/react @emotion/styled
npm install papaparse crypto-js uuid
npm install -D @types/papaparse @types/crypto-js @types/uuid

# Install dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

##### [NEW] Directory Structure Setup
```
src/
├── features/
│   ├── personnel/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── index.ts
│   ├── conference/
│   ├── sync/
│   └── settings/
├── shared/
│   ├── domain/
│   ├── infrastructure/
│   │   ├── services/
│   │   └── store/
│   ├── presentation/
│   │   ├── components/
│   │   └── layouts/
│   └── utils/
├── assets/
├── locales/
│   ├── en/
│   └── he/
├── App.tsx
├── main.tsx
└── i18n.ts
```

##### [MODIFY] vite.config.ts
- Configure path aliases (@features, @shared)
- Setup code splitting configuration
- Configure build optimizations

##### [MODIFY] tsconfig.json
- Enable strict mode
- Configure path mappings
- Set target ES2020+

---

## Implementation Phases

### Phase 1: Shared Infrastructure (16h)

**Goal:** Build foundational services and utilities that all features depend on.

#### Shared Domain Layer

##### [NEW] [shared/domain/types.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/domain/types.ts)
- Copy type definitions from v1
- Add new types from low-level design
- WorkingMode, Platform, ConnectionStatus, etc.

#### Shared Services

##### [NEW] [shared/infrastructure/services/logger.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/services/logger.ts)
- Implement logger service (functions #60-#65)
- In-memory log storage
- Console output with formatting
- Log levels: debug, info, warn, error

##### [NEW] [shared/infrastructure/services/csvService.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/services/csvService.ts)
- Port from v1 with improvements
- Implement functions #56-#59
- Use PapaParse for parsing/generation
- Support dynamic column mapping

##### [NEW] [shared/infrastructure/services/encryptionService.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/services/encryptionService.ts)
- Implement functions #66-#69
- AES-256 encryption using crypto-js
- Password hashing for settings protection

##### [NEW] [shared/infrastructure/services/solumService.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/services/solumService.ts)
- Port from v1
- Implement functions #70-#76
- All SoluM API interactions
- Token management

##### [NEW] [shared/infrastructure/services/sftpService.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/services/sftpService.ts)
- Port from v1
- SFTP API client wrapper
- File upload/download operations

#### Shared Utilities

##### [NEW] [shared/utils/validators.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/utils/validators.ts)
- Implement functions #77-#81
- Email, phone, URL, time validators
- Room ID generator

##### [NEW] [shared/utils/constants.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/utils/constants.ts)
- Application constants
- Default values
- API endpoints

#### Verification
- [ ] All services export correct interfaces
- [ ] Logger works in browser console
- [ ] CSV parse/generate roundtrip test passes
- [ ] Encryption/decryption roundtrip test passes
- [ ] Validators return expected results

---

### Phase 2: Sync Feature (16h)

**Goal:** Implement sync abstraction with adapter pattern (most isolated feature).

#### Sync Domain Layer

##### [NEW] [features/sync/domain/types.ts](file:///c:/React/DentalMedicalCenterV2/src/features/sync/domain/types.ts)
- Define `SyncAdapter` interface (functions #28-#33)
- Define `SyncStatus`, `SyncMode` types

#### Sync Infrastructure Layer

##### [NEW] [features/sync/infrastructure/SFTPSyncAdapter.ts](file:///c:/React/DentalMedicalCenterV2/src/features/sync/infrastructure/SFTPSyncAdapter.ts)
- Implement `SyncAdapter` interface
- Functions #34-#36
- Wraps sftpService + csvService
- SFTP-specific sync logic

##### [NEW] [features/sync/infrastructure/SolumSyncAdapter.ts](file:///c:/React/DentalMedicalCenterV2/src/features/sync/infrastructure/SolumSyncAdapter.ts)
- Implement `SyncAdapter` interface
- Functions #37-#42
- Wraps solumService
- Token management
- Article ↔ Person mapping

##### [NEW] [features/sync/infrastructure/syncStore.ts](file:///c:/React/DentalMedicalCenterV2/src/features/sync/infrastructure/syncStore.ts)
- Zustand slice for sync state
- Connection status
- Last sync timestamp
- Errors

#### Sync Application Layer

##### [NEW] [features/sync/application/useSyncController.ts](file:///c:/React/DentalMedicalCenterV2/src/features/sync/application/useSyncController.ts)
- Implement hook (functions #43-#46)
- Dynamic adapter selection based on workingMode
- Auto-sync interval management
- Manual sync trigger

#### Verification
- [ ] SFTP adapter can connect (test credentials required)
- [ ] SoluM adapter can login (test credentials required)
- [ ] Download operation returns Person[]
- [ ] Upload operation succeeds
- [ ] Auto-sync interval works
- [ ] Mode switching changes adapter

---

### Phase 3: Personnel Feature (24h)

**Goal:** Complete vertical slice for personnel management (highest value feature).

#### Personnel Domain Layer

##### [NEW] [features/personnel/domain/types.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/domain/types.ts)
- Person, ChairList, ValidationResult types
- PersonnelFilters, FilterOptions types

##### [NEW] [features/personnel/domain/validation.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/domain/validation.ts)
- Implement functions #1-#3
- validatePerson
- validateChairListName
- isPersonIdUnique

##### [NEW] [features/personnel/domain/businessRules.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/domain/businessRules.ts)
- Implement functions #4-#5
- generatePersonId
- mergePersonDefaults (inject NFC URL, Store ID)

#### Personnel Application Layer

##### [NEW] [features/personnel/application/usePersonnelController.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/application/usePersonnelController.ts)
- Implement hook (functions #6-#12)
- CRUD operations
- Import/Export via sync controller
- Error handling and loading states

##### [NEW] [features/personnel/application/usePersonnelFilters.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/application/usePersonnelFilters.ts)
- Implement hook (functions #13-#15)
- Filter state management
- Filter application logic
- Filter options extraction

##### [NEW] [features/personnel/application/useChairLists.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/application/useChairLists.ts)
- Chair list save/load/delete
- Integration with personnel store

#### Personnel Infrastructure Layer

##### [NEW] [features/personnel/infrastructure/personnelStore.ts](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/infrastructure/personnelStore.ts)
- Zustand slice
- State: personnel, chairLists
- Actions: CRUD operations (pure state updates only)

#### Personnel Presentation Layer

##### [NEW] [features/personnel/presentation/PersonnelManagement.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/PersonnelManagement.tsx)
- Component #82
- Main container
- Uses usePersonnelController + usePersonnelFilters
- Pure UI, no business logic

##### [NEW] [features/personnel/presentation/PersonDialog.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/PersonDialog.tsx)
- Component #83
- Add/Edit dialog
- React Hook Form integration

##### [NEW] [features/personnel/presentation/PersonForm.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/PersonForm.tsx)
- Component #84
- Form fields based on CSV config
- Dynamic field rendering

##### [NEW] [features/personnel/presentation/PersonnelTable.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/PersonnelTable.tsx)
- Component #85
- MUI DataGrid
- Row actions (edit, delete)

##### [NEW] [features/personnel/presentation/PersonnelCards.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/PersonnelCards.tsx)
- Component #86
- Card view alternative

##### [NEW] [features/personnel/presentation/LoadListDialog.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/LoadListDialog.tsx)
- Component #87
- Load saved chair list

##### [NEW] [features/personnel/presentation/SaveListDialog.tsx](file:///c:/React/DentalMedicalCenterV2/src/features/personnel/presentation/SaveListDialog.tsx)
- Component #88
- Save current personnel as list

#### Verification
- [ ] Add person → validates → saves → syncs
- [ ] Edit person → updates → syncs
- [ ] Delete person → confirms → removes → syncs
- [ ] Import from sync → downloads → updates UI
- [ ] Export to sync → uploads
- [ ] Filters work (room, title, specialty)
- [ ] Search works
- [ ] Save chair list → persists
- [ ] Load chair list → replaces personnel

---

### Phase 4: Conference Feature (16h)

**Goal:** Complete vertical slice for conference room management.

#### Conference Domain Layer

##### [NEW] [features/conference/domain/types.ts](file:///c:/React/DentalMedicalCenterV2/src/features/conference/domain/types.ts)
- ConferenceRoom, TimeRange, TimeValidationResult

##### [NEW] [features/conference/domain/validation.ts](file:///c:/React/DentalMedicalCenterV2/src/features/conference/domain/validation.ts)
- Functions #16-#18
- validateTimeRange, validateConferenceRoom, isValidRoomId

##### [NEW] [features/conference/domain/businessRules.ts](file:///c:/React/DentalMedicalCenterV2/src/features/conference/domain/businessRules.ts)
- Functions #19-#20
- generateNextRoomId, isRoomOccupied

#### Conference Application Layer

##### [NEW] [features/conference/application/useConferenceController.ts](file:///c:/React/DentalMedicalCenterV2/src/features/conference/application/useConferenceController.ts)
- Functions #21-#27
- Room CRUD operations
- Meeting management
- Label page updates (simple mode)

#### Conference Infrastructure Layer

##### [NEW] [features/conference/infrastructure/conferenceStore.ts](file:///c:/React/DentalMedicalCenterV2/src/features/conference/infrastructure/conferenceStore.ts)
- Zustand slice
- conferenceRooms state
- currentRoomId state

#### Conference Presentation Layer

##### [NEW] All Conference Components (#89-#94)
- ConferenceRoomList.tsx
- ConferenceRoomForm.tsx
- AddRoomDialog.tsx
- TimeRangePicker.tsx
- ParticipantList.tsx
- ParticipantDialog.tsx

#### Verification
- [ ] Add room → creates with C## ID
- [ ] Edit room → updates
- [ ] Delete room → removes
- [ ] Toggle meeting → updates label page (SoluM mode)
- [ ] Update meeting details → validates time → saves
- [ ] Participant add/remove works
- [ ] Time validation prevents invalid ranges

---

### Phase 5: Settings Feature (16h)

**Goal:** Complete vertical slice for settings management.

#### Settings Domain Layer

##### [NEW] [features/settings/domain/types.ts](file:///c:/React/DentalMedicalCenterV2/src/features/settings/domain/types.ts)
- AppSettings, SFTPCredentials, SolumConfig, SettingsFile

#### Settings Application Layer

##### [NEW] [features/settings/application/useSettingsController.ts](file:///c:/React/DentalMedicalCenterV2/src/features/settings/application/useSettingsController.ts)
- Functions #47-#55
- All settings update operations
- Import/Export settings
- Validation

#### Settings Infrastructure Layer

##### [NEW] [features/settings/infrastructure/settingsStore.ts](file:///c:/React/DentalMedicalCenterV2/src/features/settings/infrastructure/settingsStore.ts)
- Zustand slice for all settings
- Persistence configuration

#### Settings Presentation Layer

##### [NEW] All Settings Components (#95-#103)
- SettingsDialog.tsx - Main container with tabs
- AppSettings.tsx - App configuration tab
- SFTPSettings.tsx - SFTP credentials tab
- SolumSettings.tsx - SoluM config tab
- LogoSettings.tsx - Logo upload
- SettingsFileManager.tsx - Import/Export
- SettingsLoginDialog.tsx - Password protection
- SecuritySettings.tsx - Security options
- LogViewer.tsx - View logs

#### Verification
- [ ] App settings update and persist
- [ ] SFTP credentials save (encrypted)
- [ ] SoluM config saves (encrypted)
- [ ] CSV config updates
- [ ] Logo upload (validate size/type)
- [ ] Export settings → downloads JSON
- [ ] Import settings → validates → applies
- [ ] Mode switch → disconnects → updates

---

### Phase 6: Root Store & Routing (8h)

**Goal:** Combine all feature stores and setup application routing.

##### [NEW] [shared/infrastructure/store/rootStore.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/infrastructure/store/rootStore.ts)
- Combine all feature slices
- Configure persistence (selective fields)
- Setup devtools

##### [NEW] [App.tsx](file:///c:/React/DentalMedicalCenterV2/src/App.tsx)
- React Router setup
- Lazy load feature components
- Suspense boundaries with loading fallback

##### [NEW] [shared/presentation/layouts/MainLayout.tsx](file:///c:/React/DentalMedicalCenterV2/src/shared/presentation/layouts/MainLayout.tsx)
- Component #111
- Tab navigation (Personnel, Conference, Settings)
- Header with sync status

##### [NEW] [shared/presentation/layouts/Header.tsx](file:///c:/React/DentalMedicalCenterV2/src/shared/presentation/layouts/Header.tsx)
- Component #112
- App title, language switcher
- Sync button

##### [NEW] [shared/presentation/components/LoadingFallback.tsx](file:///c:/React/DentalMedicalCenterV2/src/shared/presentation/components/LoadingFallback.tsx)
- Component #110
- Loading skeleton for code splitting

---

### Phase 7: Shared UI Components (8h)

**Goal:** Build reusable UI components.

##### [NEW] Shared Components (#104-#109)
- ErrorBoundary.tsx - Error catching
- NotificationContainer.tsx - Toast notifications
- FilterDrawer.tsx - Advanced filter sidebar
- TableToolbar.tsx - Table actions
- SyncStatusIndicator.tsx - Connection badge
- JsonEditor.tsx - JSON editing (for advanced users)

---

### Phase 8: Internationalization & Styling (8h)

**Goal:** Setup i18n and theming.

##### [NEW] [i18n.ts](file:///c:/React/DentalMedicalCenterV2/src/i18n.ts)
- i18next configuration
- Language detection
- Namespace loading

##### [COPY] Locales from v1
- Copy `locales/en/` and `locales/he/` from v1
- Update with new keys for v2

##### [NEW] [shared/styles/theme.ts](file:///c:/React/DentalMedicalCenterV2/src/shared/styles/theme.ts)
- MUI theme configuration
- RTL support
- Color palette
- Typography

##### [COPY] Assets
- Copy logos, images from v1

---

### Phase 9: Testing (16h)

**Goal:** Add test coverage for critical paths.

##### [NEW] Unit Tests
- Domain validation functions (all validators)
- Business rule functions
- CSV service (parse/generate)
- Encryption service

##### [NEW] Integration Tests
- usePersonnelController hook tests
- useSyncController hook tests
- Sync adapter tests (with mocks)

##### [NEW] Component Tests
- PersonDialog render and validation
- PersonnelTable actions
- SettingsDialog tabs

**Target Coverage:** 70%+ for business logic

---

### Phase 10: Performance Optimization (8h)

**Goal:** Optimize bundle size and runtime performance.

##### Code Splitting
- Lazy load routes (already in Phase 6)
- Dynamic imports for heavy components
- Vendor chunk optimization

##### Render Optimization
- Add React.memo to list components
- useMemo for filtered/sorted data
- useCallback for event handlers
- Implement virtualization for large lists (React Window)

##### Bundle Analysis
```bash
npm run build
npm run preview
# Measure bundle sizes
```

**Target:** 
- Initial bundle < 200 KB (gzipped)
- Main chunk < 100 KB (gzipped)

---

### Phase 11: Final Verification (8h)

**Goal:** End-to-end testing of all workflows.

#### Complete Feature Testing

##### Personnel Management
- [ ] Add person → validates → saves → syncs (SFTP mode)
- [ ] Add person → validates → saves → syncs (SoluM mode)
- [ ] Edit person → updates all fields
- [ ] Delete person → confirms → removes
- [ ] Import CSV → parses → updates UI
- [ ] Export CSV → generates → uploads
- [ ] Filters: room, title, specialty all work
- [ ] Search works
- [ ] Chair lists: save, load, delete

##### Conference Rooms
- [ ] Add room → generates C## ID
- [ ] Edit room → meeting details
- [ ] Delete room → removes
- [ ] Toggle meeting (simple mode) → updates label page
- [ ] Add/remove participants
- [ ] Time validation prevents bad ranges

##### Sync
- [ ] SFTP: connect → download → upload
- [ ] SoluM: login → fetch → push
- [ ] Token refresh works (SoluM)
- [ ] Auto-sync interval triggers
- [ ] Manual sync button works
- [ ] Mode switch → adapter changes

##### Settings
- [ ] All app settings persist
- [ ] SFTP credentials encrypted
- [ ] SoluM credentials encrypted
- [ ] CSV config updates
- [ ] Logo upload works (3 slots)
- [ ] Export settings → valid JSON
- [ ] Import settings → validates → applies
- [ ] Language switch works (EN ↔ HE)

#### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

#### Mobile Testing (if Capacitor integrated)
- [ ] iOS simulator
- [ ] Android emulator

---

## Documentation Updates

### Phase 12: Final Documentation (8h)

##### [NEW] [README.md](file:///c:/React/DentalMedicalCenterV2/README.md)
- Project overview
- Setup instructions
- Development guide
- Deployment guide

##### [NEW] [docs/ARCHITECTURE.md](file:///c:/React/DentalMedicalCenterV2/docs/ARCHITECTURE.md)
- Link to planning artifacts
- Architecture diagrams
- Feature boundaries
- Dependency flow

##### [NEW] [docs/DEVELOPER_GUIDE.md](file:///c:/React/DentalMedicalCenterV2/docs/DEVELOPER_GUIDE.md)
- How to add new feature
- Controller pattern guidelines
- Testing guidelines
- Code style guide

##### [NEW] Feature README files
- README.md in each feature directory
- Document feature purpose
- Public API of controllers

---

## Migration from v1

### Data Migration Strategy

**User Action Required:**
1. Export settings from v1 (SettingsFileManager)
2. Save settings JSON file
3. Open v2 application
4. Import settings JSON via SettingsFileManager
5. Credentials will need re-entry (encrypted with new keys)
6. Trigger sync to pull data from external system

**No Direct Database Migration:** Users re-sync from SFTP or SoluM source of truth.

---

## Effort Breakdown

| Phase | Task | Hours |
|-------|------|-------|
| 0 | Project Setup | 8 |
| 1 | Shared Infrastructure | 16 |
| 2 | Sync Feature | 16 |
| 3 | Personnel Feature | 24 |
| 4 | Conference Feature | 16 |
| 5 | Settings Feature | 16 |
| 6 | Root Store & Routing | 8 |
| 7 | Shared UI Components | 8 |
| 8 | i18n & Styling | 8 |
| 9 | Testing | 16 |
| 10 | Performance Optimization | 8 |
| 11 | Final Verification | 8 |
| 12 | Documentation | 8 |
| **Total** | | **160h** |

---

## Success Criteria

### Functional
- ✅ All v1 features working in v2
- ✅ SFTP mode fully functional
- ✅ SoluM mode fully functional
- ✅ Settings import/export works
- ✅ Multi-language support (EN/HE)

### Technical
- ✅ Feature-based architecture implemented
- ✅ Sync adapter pattern working
- ✅ Code splitting reduces bundle size by 20-30%
- ✅ Test coverage > 70% for business logic
- ✅ Zero TypeScript errors
- ✅ Zero runtime console errors

### Performance
- ✅ Initial load < 2 seconds
- ✅ Large list render (100+ items) < 100ms
- ✅ Sync operation < 5 seconds
- ✅ UI responsive on mobile devices

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict adherence to documented features only |
| Integration issues | Test sync adapters early with real credentials |
| Performance problems | Monitor bundle size throughout, optimize early |
| Migration friction | Provide clear migration guide and support |
| Testing gaps | Write tests alongside implementation, not after |

---

## Next Steps

1. ✅ **Documentation Complete** (high-level, low-level, workflows, catalog)
2. → **Get User Approval** for architecture and plan
3. → **Begin Phase 0** (project setup)
4. → **Implement Phase by Phase** following this plan
5. → **Continuous Testing** and verification
6. → **Final Deployment** to production

---

## Summary

This plan provides a **complete roadmap** for building DentalMedicalCenter v2 as a greenfield project with:
- **Documented architecture** (4 comprehensive documents)
- **Clear phases** (12 phases, 160 hours)
- **Feature-based structure** from day one
- **Sync abstraction** built properly from the start
- **Performance optimization** baked into architecture
- **Comprehensive testing** throughout
- **Clear migration path** from v1

All design decisions have been documented. Implementation can now proceed with confidence.
