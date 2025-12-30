# electisSpace - Remaining Features Implementation Plan

## Status Overview

### ✅ Complete (Phases 0-3)
- Build system (0 errors)
- Shared services (logger, CSV, encryption, SFTP, SoluM)
- Sync adapters (SFTP & SoluM with full implementation)
- Spaces domain + controller + UI

### 🔧 Exists But Needs Review
- Conference feature components
- Settings infrastructure (stores/controllers)
- Root store integration

### ❌ Missing Critical Features
- Settings UI (9 components)
- Dashboard page
- Sync page/UI
- i18n configuration
- Testing infrastructure

---

## Priority 1: Settings Feature (HIGH - 12h)

**Why:** Critical for app configuration, mode switching, credentials

### 5.1 Settings Dialog & Container (2h)
**File:** `src/features/settings/presentation/SettingsDialog.tsx`

**Features:**
- Modal dialog with tabs
- Tabs: App, SFTP, SoluM, Logo, Security, Logs
- Save/Cancel actions
- Dirty state tracking

### 5.2 App Settings Tab (2h)
**File:** `src/features/settings/presentation/AppSettings.tsx`

**Fields:**
- App name, subtitle
- Working mode selector (SFTP/SoluM)
- Space type (Office/Room/Chair/Person Tag)
- Store number  
- NFC URL
- Auto-save toggle

### 5.3 SFTP Settings Tab (2h)
**File:** `src/features/settings/presentation/SFTPSettings.tsx`

**Features:**
- Connection sub-tab: username, password, filename, store
- CSV Structure sub-tab: delimiter, column mappings
- Test connection button
- Field validation

### 5.4 SoluM Settings Tab (3h)
**File:** `src/features/settings/presentation/SolumSettings.tsx`

**Features:**
- Cluster/environment selector
- API base URL
- Company code, store, username, password
- Sync interval slider
- Simple conference mode toggle
- Fetch schema button
- Show field mappings

### 5.5 Logo Settings Tab (1h)
**File:** `src/features/settings/presentation/LogoSettings.tsx`

**Features:**
- Upload up to 3 logos
- Preview images
- Delete uploaded logos
- Validation (size, format)

### 5.6 Security Settings Tab (1h)
**File:** `src/features/settings/presentation/SecuritySettings.tsx`

**Features:**
- Password protection toggle
- Set/change password
- Lock/unlock app
- Password strength indicator

### 5.7 Logs Viewer (1h)
**File:** `src/features/settings/presentation/LogViewer.tsx`

**Features:**
- Display logs from logger service
- Filter by level (debug/info/warn/error)
- Filter by category
- Clear logs button
- Auto-scroll latest

---

## Priority 2: Dashboard Page (MEDIUM - 4h)

**File:** `src/features/dashboard/DashboardPage.tsx`

### Features
- Overview stats cards (total spaces, conference rooms, sync status)
- Recent activity timeline
- Quick actions (Add Space, Start Sync, Settings)
- Mode indicator (SFTP/SoluM)
- Connection status badge
- Last sync time

### Components
- `StatsCard.tsx` - Reusable stat display
- `QuickActions.tsx` - Action buttons
- `ActivityTimeline.tsx` - Recent changes
- `ConnectionStatus.tsx` - Sync status indicator

---

## Priority 3: Sync Page/UI (MEDIUM - 6h)

**File:** `src/features/sync/presentation/SyncPage.tsx`

### Features
- Manual sync trigger button
- Sync status display (idle/connecting/syncing/success/error)
- Progress indicator during sync
- Last sync timestamp
- Sync history/log
- Mode switcher (SFTP ↔ SoluM)
- Connection status

### Integration
- Connect to `useSyncController`
- Use sync adapters (SFTP/SoluM)
- Error handling with user feedback
- Loading states

---

## Priority 4: Conference Feature Verification (LOW - 3h)

**Files exist:** `ConferencePage.tsx`, `ConferenceRoomDialog.tsx`

### Tasks
- Review existing components
- Verify integration with controller
- Test CRUD operations
- Verify simple mode (page flip)
- Verify full mode (meeting details)
- Fix any TypeScript errors
- Add empty states

---

## Priority 5: i18n Setup (MEDIUM - 4h)

### 5.1 i18next Configuration (1h)
**File:** `src/i18n/config.ts`

**Setup:**
- Initialize i18next
- Configure language detection
- Set fallback language
- RTL support for Hebrew

### 5.2 Translation Files (2h)
**Files:**
- `src/locales/en/common.json`
- `src/locales/he/common.json`

**Sections:**
- Navigation
- Spaces feature
- Conference feature
- Settings feature
- Sync feature
- Validation messages
- Error messages

### 5.3 Integration (1h)
- Add `useTranslation` hook usage
- Wrap app in `I18nextProvider`
- Add language switcher component
- Test RTL layout for Hebrew

---

## Priority 6: Shared UI Components (MEDIUM - 4h)

### Components to Create

**ErrorBoundary.tsx** (1h)
- Catch React errors
- Display fallback UI
- Log errors
- Reset button

**NotificationContainer.tsx** (1h)
- Toast notifications
- Success/error/info/warning types
- Auto-dismiss
- Stack multiple

**ConfirmDialog.tsx** (1h)
- Confirmation dialogs
- Dangerous actions warning
- Custom messages

**LoadingSpinner.tsx** (0.5h)
- Loading states
- Full-screen overlay option
- Inline spinner option

**SyncStatusIndicator.tsx** (0.5h)
- Badge with sync status
- Colored by state
- Click to show details

---

## Priority 7: Testing Infrastructure (LOW - 8h)

### 7.1 Unit Tests (4h)
- Domain layer tests (validation, business rules)
- Service tests (CSV, encryption)
- Utility function tests

### 7.2 Integration Tests (3h)
- Hook tests (controllers with mock stores)
- Adapter tests (mock services)
- Store tests

### 7.3 Component Tests (1h)
- Critical dialog tests
- Form validation tests

**Target:** >50% code coverage

---

## Implementation Schedule

### Week 1: Core UI (20h)
- **Days 1-2:** Settings Feature (12h)
- **Day 3:** Dashboard (4h)
- **Day 4:** Sync Page (4h)

### Week 2: Polish & Test (16h)
- **Day 1:** Conference Verification (3h)
- **Day 2:** i18n Setup (4h)
- **Day 3:** Shared Components (4h)
- **Day 4-5:** Testing (5h - reduced scope)

---

## Success Criteria

- [ ] Can configure all app settings via UI
- [ ] Can switch between SFTP/SoluM modes
- [ ] Can manually trigger sync
- [ ] Dashboard shows app overview
- [ ] Conference rooms work in both modes
- [ ] App supports EN/HE languages
- [ ] Error boundaries catch crashes
- [ ] Notifications show user feedback
- [ ] Build succeeds with 0 errors
- [ ] Core features have tests

---

## Next Steps (IMMEDIATE)

1. **Settings Dialog** - Start with container & tab structure
2. **App Settings Tab** - First tab to enable basic config
3. **Test Settings** - Verify save/load works
4. **Continue** - Build remaining tabs one by one
