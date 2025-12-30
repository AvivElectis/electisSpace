# Sprint Plans: Conference Manager V2 Rebuild

## Executive Summary

This document outlines a sprint-based implementation plan for rebuilding the Conference Manager application following the **vertical slice architecture** documented in `/docs/new_architecture/`. 

**Project Name:** DentalMedicalCenter v2 (Conference Manager)  
**Approach:** Greenfield implementation in new directory  
**Target Location:** `c:\React\DentalMedicalCenterV2`  
**Total Estimated Time:** 160 hours (20 8-hour days)  
**Suggested Sprint Duration:** 2 weeks per sprint

---

## Sprint Overview

| Sprint | Duration | Focus Area | Hours | Key Deliverables |
|--------|----------|----------|-------|------------------|
| **Sprint 0** | 1 week | Project Setup & Foundation | 24h | Project initialized, core infrastructure |
| **Sprint 1** | 2 weeks | Sync & Personnel Features | 40h | Core business features working |
| **Sprint 2** | 2 weeks | Conference & Settings | 32h | All features complete |
| **Sprint 3** | 2 weeks | Polish & Quality | 32h | Testing, optimization, docs |
| **Sprint 4** | 1 week | App Updates & Release | 16h | Auto-update feature, final release |
| **Maintenance** | Ongoing | Bug fixes & improvements | TBD | Post-release support |

**Total:** ~7-8 weeks for initial release

---

## Sprint 0: Foundation & Project Setup (Week 1)

### Duration: 1 week (24 hours)

### Sprint Goals
- ✅ New project initialized with proper structure
- ✅ All core dependencies installed
- ✅ Shared infrastructure services implemented
- ✅ Build pipeline working

### Tasks

#### Phase 0.1: Project Initialization (4h)
- [ ] Create new Vite + React + TypeScript project
- [ ] Install all required dependencies (see `PACKAGE_USAGE.md`)
- [ ] Configure TypeScript strict mode
- [ ] Configure Vite with path aliases
- [ ] Setup ESLint and Prettier
- [ ] Initialize Git repository
- [ ] Create `.gitignore`
- [ ] Setup Husky pre-commit hooks

#### Phase 0.2: Directory Structure (2h)
- [ ] Create feature-based folder structure:
  ```
  src/
  ├── features/
  │   ├── personnel/
  │   ├── conference/
  │   ├── sync/
  │   └── settings/
  └── shared/
      ├── domain/
      ├── infrastructure/
      ├── presentation/
      └── utils/
  ```
- [ ] Setup path aliases in `tsconfig.json` and `vite.config.ts`

#### Phase 0.3: Shared Infrastructure (16h)
- [ ] **Logger Service** - Structured logging
- [ ] **CSV Service** - Parse/generate with PapaParse
- [ ] **Encryption Service** - AES-256 for credentials
- [ ] **SoluM Service** - Port from V1, clean up
- [ ] **SFTP Service** - Port from V1
- [ ] **Validators** - Email, phone, URL, time validation
- [ ] **Constants** - Default values, API endpoints

#### Phase 0.4: Verification (2h)
- [ ] All services pass unit tests
- [ ] Build succeeds with zero TS errors
- [ ] Dev server runs successfully
- [ ] Hot reload working

### Success Criteria
- Project builds without errors
- All shared services tested and working
- Development environment configured
- Team can start feature development

---

## Sprint 1: Core Features (Weeks 2-3)

### Duration: 2 weeks (40 hours)

### Sprint Goals
- ✅ Sync architecture implemented with adapter pattern
- ✅ Personnel management feature complete
- ✅ Both SFTP and SoluM sync modes working
- ✅ Users can import and manage personnel

### Tasks

#### Phase 1.1: Sync Feature (16h)
**Days 1-2**

##### Domain Layer (2h)
- [ ] Define `SyncAdapter` interface
- [ ] Define sync types (`SyncStatus`, `SyncMode`)
- [ ] Write validation logic

##### Infrastructure Layer (10h)
- [ ] **SFTPSyncAdapter**
  - Connect, disconnect, download, upload
  - CSV parsing integration
  - Error handling
- [ ] **SolumSyncAdapter**
  - Login, token management
  - Article/label fetching
  - Article ↔ Person mapping
  - Auto token refresh
- [ ] **syncStore.ts** - Zustand slice for sync state

##### Application Layer (4h)
- [ ] **useSyncController** hook
  - Dynamic adapter selection
  - Auto-sync with intervals
  - Manual sync trigger
  - Connection status

#### Phase 1.2: Personnel Feature (24h)
**Days 3-6**

##### Domain Layer (4h)
- [ ] Person, ChairList types
- [ ] Validation functions (person, chair list)
- [ ] Business rules (ID generation, defaults merging)

##### Infrastructure Layer (4h)
- [ ] **personnelStore.ts** - Zustand slice
  - Personnel array state
  - Chair lists state
  - CRUD actions

##### Application Layer (8h)
- [ ] **usePersonnelController**
  - Add/update/delete person
  - Import/export via sync
  - Validation orchestration
- [ ] **usePersonnelFilters**
  - Filter state management
  - Filtered data computation
- [ ] **useChairLists**
  - Save/load/delete chair lists

##### Presentation Layer (8h)
- [ ] **PersonnelManagement** - Main container
- [ ] **PersonDialog** - Add/Edit dialog
- [ ] **PersonForm** - Dynamic form based on CSV config
- [ ] **PersonnelTable** - MUI DataGrid
- [ ] **PersonnelCards** - Card view
- [ ] **LoadListDialog** - Chair list loader
- [ ] **SaveListDialog** - Chair list saver

### Verification
- [ ] Add person → validates → syncs to SFTP
- [ ] Add person → validates → syncs to SoluM
- [ ] Import from SFTP → downloads → displays
- [ ] Import from SoluM → fetches → displays
- [ ] Filters work (room, title, specialty)
- [ ] Save/load chair lists work
- [ ] Token refresh works in SoluM mode

### Success Criteria
- Personnel feature fully functional
- Both sync modes working end-to-end
- Unit tests passing for domain logic
- Integration tests passing for controllers

---

## Sprint 2: Conference & Settings (Weeks 4-5)

### Duration: 2 weeks (32 hours)

### Sprint Goals
- ✅ Conference room management complete
- ✅ Settings management complete
- ✅ App fully functional (feature-complete)
- ✅ Basic UI/UX polish

### Tasks

#### Phase 2.1: Conference Feature (16h)
**Days 1-2**

##### Domain Layer (3h)
- [ ] ConferenceRoom types
- [ ] Time validation logic
- [ ] Room ID generation
- [ ] Meeting status logic

##### Infrastructure Layer (2h)
- [ ] **conferenceStore.ts** - Zustand slice

##### Application Layer (6h)
- [ ] **useConferenceController**
  - Room CRUD operations
  - Meeting toggle (simple mode)
  - Meeting details update
  - Label page update for SoluM

##### Presentation Layer (5h)
- [ ] **ConferenceRoomList** - List of rooms
- [ ] **ConferenceRoomForm** - Edit room details
- [ ] **AddRoomDialog** - Add new room
- [ ] **TimeRangePicker** - Time selection
- [ ] **ParticipantList** - Manage participants

#### Phase 2.2: Settings Feature (16h)
**Days 3-4**

##### Domain Layer (2h)
- [ ] Settings types
- [ ] Validation functions

##### Infrastructure Layer (2h)
- [ ] **settingsStore.ts** - All settings state
- [ ] Persistence configuration

##### Application Layer (6h)
- [ ] **useSettingsController**
  - App settings updates
  - SFTP credentials (encrypted)
  - SoluM config (encrypted)
  - CSV config management
  - Logo upload
  - Import/export settings file
  - Mode switching logic

##### Presentation Layer (6h)
- [ ] **SettingsDialog** - Main dialog with tabs
- [ ] **AppSettings** - App configuration tab
- [ ] **SFTPSettings** - SFTP credentials tab
- [ ] **SolumSettings** - SoluM config tab
- [ ] **LogoSettings** - Logo upload
- [ ] **SettingsFileManager** - Import/export
- [ ] **LogViewer** - View application logs

### Verification
- [ ] Add conference room → generates ID
- [ ] Toggle meeting → updates label (SoluM)
- [ ] Update meeting details → syncs
- [ ] Settings export → valid JSON
- [ ] Settings import → applies all settings
- [ ] Mode switch → disconnects → changes adapter
- [ ] Logos upload and display correctly

### Success Criteria
- All features implemented
- Settings persist correctly
- Conference rooms sync properly
- Export/import working

---

## Sprint 3: Quality & Polish (Weeks 6-7)

### Duration: 2 weeks (32 hours)

### Sprint Goals
- ✅ Comprehensive test coverage
- ✅ Performance optimized
- ✅ UI/UX polished
- ✅ Documentation complete
- ✅ Production-ready

### Tasks

#### Phase 3.1: Root Store & Routing (8h)
**Day 1**
- [ ] **rootStore.ts** - Combine all feature slices
- [ ] Configure persistence middleware
- [ ] Setup Redux DevTools
- [ ] **App.tsx** - React Router setup
- [ ] Lazy loading for all features
- [ ] **MainLayout** - Tab navigation
- [ ] **Header** - App title, language, sync button
- [ ] **LoadingFallback** - Loading skeleton

#### Phase 3.2: Shared UI Components (8h)
**Day 2**
- [ ] **ErrorBoundary** - Error catching
- [ ] **NotificationContainer** - Toast notifications
- [ ] **FilterDrawer** - Filter sidebar
- [ ] **TableToolbar** - Table actions
- [ ] **SyncStatusIndicator** - Connection badge
- [ ] **JsonEditor** - Advanced JSON editing

#### Phase 3.3: Internationalization & Theming (8h)
**Day 3**
- [ ] Setup i18next configuration
- [ ] Copy locale files from V1
- [ ] Add new translation keys for V2
- [ ] Update all components with useTranslation
- [ ] Create MUI theme
- [ ] RTL support configuration
- [ ] Test language switching (EN ↔ HE)
- [ ] Copy assets from V1

#### Phase 3.4: Testing (16h)
**Days 4-5**

##### Unit Tests (6h)
- [ ] Domain validation functions
- [ ] Business rule functions
- [ ] CSV service (parse/generate)
- [ ] Encryption service
- [ ] All validators

##### Integration Tests (6h)
- [ ] usePersonnelController
- [ ] useConferenceController
- [ ] useSyncController
- [ ] Sync adapters (mocked)

##### Component Tests (4h)
- [ ] PersonDialog render/validation
- [ ] PersonnelTable actions
- [ ] ConferenceRoomForm
- [ ] SettingsDialog tabs

#### Phase 3.5: Performance Optimization (8h)
**Day 6**
- [ ] Add React.memo to list components
- [ ] Add useMemo for filtered data
- [ ] Add useCallback for event handlers
- [ ] Implement virtualization for large lists
- [ ] Configure code splitting
- [ ] Analyze bundle size
- [ ] Lazy load heavy components
- [ ] Performance testing

### Verification
- [ ] Test coverage > 70% for business logic
- [ ] Initial bundle < 200 KB (gzipped)
- [ ] Main chunk < 100 KB (gzipped)
- [ ] All UI text translates correctly
- [ ] RTL layout works
- [ ] Navigation works smoothly
- [ ] Performance metrics met

### Success Criteria
- High test coverage
- Performance targets met
- Clean, polished UI
- All languages working
- Zero TypeScript errors
- Zero runtime errors

---

## Sprint 4: Auto-Update & Release (Week 8)

### Duration: 1 week (16 hours)

### Sprint Goals
- ✅ Auto-update feature implemented
- ✅ GitHub release workflow configured
- ✅ Production builds tested
- ✅ Ready for deployment

### Tasks

#### Phase 4.1: Update Feature Implementation (10h)
**Days 1-2**

Following the App Update Feature Plan:

##### Domain Layer (2h)
- [ ] Version types and interfaces
- [ ] Version comparison logic
- [ ] Update policy rules

##### Infrastructure Layer (4h)
- [ ] **GitHubUpdateAdapter** - Fetch releases from GitHub
- [ ] **ElectronUpdateAdapter** - electron-updater integration
- [ ] **AndroidUpdateAdapter** - Capacitor browser download
- [ ] **updateStore.ts** - Update state management

##### Application Layer (2h)
- [ ] **useUpdateController** - Check, download, install
- [ ] Auto-check on startup
- [ ] Periodic update checks

##### Presentation Layer (2h)
- [ ] **UpdateNotification** - Toast notification
- [ ] **UpdateDialog** - Update details & actions
- [ ] **UpdateProgress** - Download progress
- [ ] **ReleaseNotes** - Display markdown notes
- [ ] **UpdateSettings** - Configuration in Settings

#### Phase 4.2: GitHub Release Workflow (3h)
**Day 3**
- [ ] Create `.github/workflows/release.yml`
- [ ] Configure Windows build job
- [ ] Configure Android build job
- [ ] Setup automatic release creation
- [ ] Test workflow with staging release

#### Phase 4.3: Production Builds (2h)
**Day 3**
- [ ] Build Windows installer (.exe)
- [ ] Build Android APK
- [ ] Test installers on clean systems
- [ ] Verify update mechanism works

#### Phase 4.4: Documentation (1h)
**Day 4**
- [ ] Update README with setup instructions
- [ ] Create DEVELOPER_GUIDE.md
- [ ] Document feature APIs
- [ ] Create user manual (basic)

### Verification
- [ ] Electron app checks for updates on startup
- [ ] Windows installer downloads and installs
- [ ] Android APK download works
- [ ] Version comparison logic correct
- [ ] Release notes display properly
- [ ] GitHub workflow builds successfully

### Success Criteria
- Auto-update working for both platforms
- GitHub release workflow automated
- Production builds functional
- Documentation complete

---

## Post-Sprint: Deployment & Maintenance

### Initial Deployment
1. **Create GitHub Release**
   - Tag version (e.g., `v2.0.0`)
   - Upload Windows installer
   - Upload Android APK
   - Write release notes

2. **Distribute to Users**
   - Windows: Direct download or Microsoft Store
   - Android: APK sideload or Google Play Store

3. **Monitor Initial Usage**
   - Collect error logs
   - Monitor update adoption
   - Gather user feedback

### Ongoing Maintenance
- **Bug Fixes:** Address issues as reported
- **Feature Requests:** Evaluate and prioritize
- **Security Updates:** Keep dependencies updated
- **Performance Monitoring:** Track metrics

---

## Migration from V1 to V2

### User Migration Path

**Step 1: Export from V1**
- Open V1 application
- Go to Settings → Export Settings
- Save settings JSON file

**Step 2: Install V2**
- Download and install V2 from GitHub release
- First launch

**Step 3: Import to V2**
- Open Settings in V2
- Import Settings → Select V1 export file
- Re-enter credentials (encryption keys differ)
- Trigger sync to pull data

**Step 4: Verify**
- Check that personnel data loaded
- Check that conference rooms loaded
- Verify sync works

### No Direct Database Migration
- Users rely on external system as source of truth
- Re-sync from SFTP or SoluM after migration
- No data loss as long as external system is intact

---

## Risk Management

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Sync adapter bugs | High | Medium | Comprehensive testing, phased rollout |
| Performance issues | Medium | Low | Early optimization, monitoring |
| Token refresh failure | High | Medium | Retry logic, error handling |
| Breaking API changes | High | Low | Pin dependency versions, version checks |
| Build failures | Medium | Low | CI/CD testing, rollback capability |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Add planned features only after release |
| Underestimated effort | Buffer time in each sprint |
| Dependency delays | Use proven packages, avoid experimental |
| Testing gaps | Write tests alongside features |

---

## Success Metrics

### Technical
- [ ] Zero TypeScript errors in strict mode
- [ ] Test coverage > 70%
- [ ] Bundle size < 500 KB (gzipped)
- [ ] Initial load time < 2 seconds
- [ ] Sync operation < 5 seconds

### Functional
- [ ] All V1 features working in V2
- [ ] Both sync modes functional
- [ ] Settings import/export working
- [ ] Multi-language support (EN/HE)
- [ ] Auto-update working

### User Experience
- [ ] No data loss during migration
- [ ] Smooth update process
- [ ] Intuitive UI
- [ ] Fast and responsive

---

## Appendix: Sprint Planning Template

### Sprint Planning Meeting Template

**Duration:** 2 hours at sprint start

**Attendees:** Development team, stakeholders

**Agenda:**
1. Review previous sprint (30min)
   - What was completed
   - What was carried over
   - Lessons learned

2. Review sprint goals (15min)
   - Sprint objectives
   - Key deliverables

3. Task breakdown (45min)
   - Break down epics into tasks
   - Estimate effort
   - Assign tasks

4. Sprint commitment (15min)
   - Confirm sprint scope
   - Identify dependencies
   - Set success criteria

5. Risks and blockers (15min)
   - Identify potential issues
   - Plan mitigations

### Daily Standup Template

**Duration:** 15 minutes daily

**Format:**
- What I did yesterday
- What I'm doing today
- Any blockers

### Sprint Review Template

**Duration:** 1 hour at sprint end

**Attendees:** Development team, stakeholders, users (optional)

**Agenda:**
1. Demo completed features (30min)
2. Review sprint metrics (15min)
3. Gather feedback (15min)

### Sprint Retrospective Template

**Duration:** 1 hour after review

**Attendees:** Development team only

**Agenda:**
1. What went well (20min)
2. What could be improved (20min)
3. Action items (20min)

---

## References

- [High-Level Design](../docs/new_architecture/high_level_design.md)
- [Low-Level Design](../docs/new_architecture/low_level_design.md)
- [Implementation Plan](../docs/new_architecture/implementation_plan.md)
- [Task Breakdown](../docs/new_architecture/task.md)
- [Workflow Documentation](../docs/new_architecture/workflows.md)
- [Package Usage](../docs/new_architecture/PACKAGE_USAGE.md)
- [App Update Feature Plan](./app_update_feature_plan.md)

---

## Conclusion

This sprint plan provides a structured, phase-based approach to rebuilding the Conference Manager application with modern architecture. By following this plan:

- **Week 1:** Foundation ready
- **Weeks 2-3:** Core features working
- **Weeks 4-5:** Feature complete
- **Weeks 6-7:** Production ready
- **Week 8:** Released with auto-update

Total timeline: **~8 weeks** from kickoff to first release.

The vertical slice architecture ensures that each feature is independently testable and deployable, reducing risk and enabling faster iteration.
