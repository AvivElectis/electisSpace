# Changelog

All notable changes to electisSpace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Multiple dithering engines in AssignImageDialog** — users can choose between Floyd-Steinberg, Atkinson, Ordered (Bayer 4x4), Threshold (nearest-color), or AIMS server-side dithering; client engines produce instant previews and push pre-dithered images (`dithering: false`), while AIMS engine fetches a server preview and pushes full-color images (`dithering: true`)

### Fixed
- **BarcodeScanner autofocus on mobile** — removed autofocus from scanner/manual inputs that triggered the virtual keyboard and hid the camera/scanner/manual tabs on mobile devices
- **AssignImageDialog crash on zero-dimension labels (root cause)** — `solumService.fetchLabelTypeInfo()` returned raw AIMS envelope without `extractResponseData()`, so `displayWidth`/`displayHeight` were `undefined`; client guards also hardened (`!targetW || !targetH` catches `undefined`/`NaN`)
- **AssignImageDialog empty chips** — label info chips (dimensions, color type) were blank because the AIMS envelope fields were returned instead of actual data
- **AIMS label type info wrong URL** — `fetchLabelTypeInfo` used `/api/v2/...` instead of `/common/api/v2/...`, hitting wrong AIMS endpoint and returning incorrect data

### Changed
- **AssignImageDialog UX improvements** — disable autofocus (was hiding camera/manual tabs on mobile); 90° rotation (was 180°); loading spinner during image processing; `dir="ltr"` on fit-mode tabs for correct RTL display

---

## [2.8.0] - 2026-02-27

### Added
- **AIMS Labels Overview dashboard** — stats cards (total/online/offline/unassigned), battery distribution (GOOD/LOW/CRITICAL), signal distribution (EXCELLENT/GOOD/NORMAL/BAD) replace bare label search tab
- **Server label listing endpoints** — `GET /aims/labels` and `GET /aims/labels/unassigned` routes
- **Gateway debug report** — collapsible section in Gateway Detail fetches and displays formatted JSON debug report
- **Gateway floating chip selection** — Registration dialog fetches floating gateways on open and shows clickable MAC address chips for auto-fill
- **Product history date filter** — From/To date pickers in batch history header with clear button
- **Product history summary stats** — total batches, total processed, success rate computed from batch data
- **Batch error details** — "View Errors" button on batches with failCount > 0, shows articleId + error table
- **Article history drill-down** — clickable article IDs in batch detail fetch and display per-article update history inline
- **~35 new AIMS translation keys** in both EN and HE locale files

### Changed
- Client version bumped to 2.8.0, server to 2.6.0
- **Gateway Detail fields expanded** — apName, txPower (with dBm suffix), uptime (formatted as Xd Xh Xm)
- **AIMS Management Page** — 4th stats card (Total Labels) added to dashboard header; Label Status tab now shows LabelsOverview instead of bare LabelHistory
- **Zustand store expanded** — labels, unassignedLabels, debugReport, batchErrors state added to aimsManagementStore

### Fixed
- **Auth watchdog restart loop** — `performValidation` had `lastValidation` as a `useCallback` dependency; every `validateSession()` call updated it, recreating the callback and restarting the interval immediately. Fix: read `lastValidation` from `useAuthStore.getState()` inside the callback instead of as a reactive dependency
- **401 console errors on token expiry** — Axios request interceptor now decodes the JWT `exp` claim and proactively refreshes via httpOnly cookie when within 60s of expiry, preventing the browser from logging failed `/auth/me` requests

---

## [2.7.0] - 2026-02-27

### Added
- **Role management system** — DB-backed roles with custom permissions replace hardcoded StoreRole enum
- **Roles tab in Settings** — platform and company admins can create/edit/delete roles with a permission matrix (resources x actions)
- **Custom roles** — system-wide roles (platform admin) and company-specific roles (company admin)
- **Auto-whitelist for AIMS labels** — labels rejected by AIMS for whitelist reasons are auto-whitelisted and retried
- **Migration service in dev docker-compose** — runs `prisma migrate deploy` before server starts
- **Pre-deploy database backup** — automatic `pg_dump` before migrations in production deploy, keeps last 5 backups
- **AIMS Management toggle in Create Company wizard** — optional feature (disabled by default) now available during company creation, not just edit

### Changed
- Client version bumped to 2.7.0, server to 2.5.0
- **Settings dialog UI overhaul** — vertical sidebar navigation on desktop/tablet with categorized sections (General, Administration, System), horizontal scrollable tabs with icons on mobile, improved visual hierarchy and spacing
- **UI polish across settings dialogs** — standardized section headers (`fontWeight: 600`), Paper styling for sections, consistent button variants and DialogActions padding
- **People mode totalSpaces is now per-store** — each store has its own space count instead of company-wide
- **Device auth handles network reconnection gracefully** — distinguishes network errors from auth failures, attempts device token re-auth before redirecting
- **AIMS Management disabled by default** — companies must explicitly enable it in settings
- **Role permissions are database-backed** — auth middleware uses cached DB lookups instead of hardcoded permission matrix
- **StoreAssignment uses role dropdown** — shows DB-backed role names instead of hardcoded enum values
- **Console.error replaced with structured logger** — migrated 10+ `console.error` calls across settings components to use `appLogger`

### Fixed
- **CI/CD orphan container warnings** — removed observability step, added `--remove-orphans` flag
- **CI/CD deploy health check** — health check now fails the pipeline on error instead of silently continuing
- **App header/subheader not persisting** — debounced saves were cancelled on dialog unmount; now flushed
- **Link label 500 error** — structured AIMS error handling with descriptive messages instead of generic 500
- **Store assignment 400 error** — replaced StoreRole enum validation with roleId-based system
- **Role display in user management** — users now show correct DB-backed role name instead of blank/fallback
- **Hebrew translations for roles** — distinct Hebrew names for Admin (מנהל ראשי) vs Manager (מנהל), permission matrix resources and actions translated
- **Zod roleId validation** — changed from `.uuid()` to `.min(1)` since default role IDs are deterministic strings
- **Settings dialog admin check** — fixed `s.role === 'STORE_ADMIN'` (deprecated field) to use `s.roleId === 'role-admin'`
- **Hebrew AIMS Management translations** — added missing `settings.companies.aimsManagement` and section header translations to both locale files
- **Build errors from stricter tsc -b** — removed unused imports/variables in GatewayList, RoleDialog, SolumSettingsTab, StoreAssignment, permissionHelpers
- **Migration safety-net** — added fallback for unmapped `role_id` rows before `SET NOT NULL` constraint

### Removed
- **DevicesTab.tsx** — unused component (functionality was merged into SecuritySettingsTab)
- **Unnecessary npm global update** — removed `npm install -g npm@latest` from CI/CD deploy workflow

---

## [2.6.0] - 2026-02-25

### Added
- **Device-based auth tokens** — persistent authentication tokens per device, eliminating forced re-login on mobile browsers
- **"Trust this device" checkbox** on login form — opt-in device trust with two-line label (EN + HE)
- **Trusted Devices management** in Security & Devices settings tab — view, revoke individual, or revoke all devices
- **Device cards (MUI)** — redesigned with platform icons, OS chip, detail rows (IP address, connected date, last active, expiry), RTL support
- **Client-side device naming** — uses UA-based OS + browser names for web clients, Electron IPC hostname for desktop
- **Electron hostname support** — `os.hostname()` exposed via IPC for desktop app real machine names
- **Device auth API** — `POST /auth/device-auth`, `GET /auth/devices`, `DELETE /auth/devices/:id`, `DELETE /auth/devices`
- **Rate limiter** on device-auth endpoint (10 req/15min per IP+device)
- **Prisma migration** `20260224000002_add_device_tokens` for device token storage
- **Comprehensive E2E test suite** — 120 Playwright tests covering auth, dashboard, spaces, people, conference rooms, settings, navigation, responsive design, and RTL layout (#75)
- **E2E test infrastructure** — page object model (BasePage, DashboardPage, SpacesPage, ConferencePage, PeoplePage, SettingsDialog), auth bypass for parallel workers, shared helpers and test fixtures
- **Auth setup project** — Playwright setup project that authenticates once and shares state across all test workers

### Changed
- Client version bumped to 2.6.0, server to 2.4.0
- "Security Settings" tab renamed to **"Security & Devices"** / **"אבטחה ומכשירים"**
- DevicesTab removed as separate tab — functionality merged into SecuritySettingsTab
- `verify2FA` now accepts optional `trustDevice` parameter — device info only sent when user opts in
- `deviceTokenStorage` now uses IndexedDB with localStorage fallback for reliability
- Revoking current device or all devices triggers automatic logout

### Fixed
- **Session persistence** — 401 interceptor incorrectly treated `/auth/me` as an auth-flow endpoint, skipping token refresh after the 15-min access token expired and forcing logout; changed to explicit allowlist of auth-flow paths
- **Device name display** — removed server-side reverse DNS lookup that resolved to proxy/container hostnames (e.g. "global-npm") instead of client device names; now uses client-provided names directly (Electron hostname via IPC, or UA-based "Windows PC — Chrome")
- Device token storage reliability — localStorage fallback prevents lost device IDs when IndexedDB unavailable
- Silent error swallowing in device token creation — server now logs errors properly
- "Invalid Date" in device cards when `expiresAt` is null/undefined
- **E2E HashRouter compatibility** — all navigation uses `/#/` prefix matching the app's HashRouter
- **E2E mobile viewport handling** — `waitForAppReady()` detects both desktop tablist and mobile hamburger menu via `Promise.race`
- **E2E auth stability** — replaced `networkidle` with `domcontentloaded` + explicit waits; reduced workers to 4 to avoid server overload
- **GitGuardian false positive** — extracted inline test passwords in `auth.types.test.ts` into named constants with `pragma: allowlist`

---

## [2.5.0] - 2026-02-22

### Added
- **Mobile dashboard UX overhaul** — mobile-first redesign with tighter spacing, large hero numbers (h2/700wt), LinearProgress coverage bars, and colored stat tiles with accent borders
- **MobileStatTile component** — new shared reusable component for colored stat tiles with tinted background and left-border accent
- **Tappable card headers on mobile** — each dashboard card header is now tappable and navigates to the corresponding page (spaces, people, conference)
- **Progress bars per card** — People card shows assignment ratio, Spaces card shows label coverage, Conference card shows room availability
- **Mobile-specific skeleton** — loading skeleton matches the new mobile layout with hero placeholder, progress bar, and 3-col tile row

### Changed
- Client version bumped to 2.5.0
- Dashboard grid spacing reduced on mobile (`xs: 1.5` vs `md: 3`) for tighter layout
- "Manage People" button and add buttons hidden on mobile (redundant with QuickActionsPanel FAB)
- Desktop layout remains completely unchanged

---

## [2.4.1] - 2026-02-22

### Fixed
- **People with no name show empty string in AIMS** — `buildPersonArticle()` now uses `''` instead of `'Person'` as the fallback articleName, consistent with empty slot behavior
- **Auth session persistence when localStorage is cleared** — `useSessionRestore` now always attempts cookie-based token refresh regardless of localStorage state; added explicit `path: '/'` to refresh token cookies
- **Dashboard People card label count** — People card now shows only `spacesAssignedLabelsCount` instead of the combined spaces+conference total

### Changed
- **Removed app-specific observability stack** — Loki, Promtail, and Grafana services removed from `docker-compose.infra.yml`; observability now handled by the global-infra grafana-agent which auto-discovers all Docker container logs

### Removed
- `infra/loki-config.yml`, `infra/promtail-config.yml`, `infra/grafana-datasources.yml` — replaced by global-infra stack

---

## [2.4.0] - 2026-02-22

### Added
- **People-specific assigned label counts** — dashboard People card now shows labels assigned to person articles from AIMS instead of combined spaces+conference count
- **Server-side structured logger (appLogger)** — JSON-structured logging service with in-memory ring buffer, context-aware child loggers, and performance timing helpers
- **Logs API endpoint** — `GET/DELETE /api/v1/logs` and `GET /api/v1/logs/stats` for platform admins to query server logs
- **Grafana + Loki observability stack** — Loki for log aggregation, Promtail for Docker log scraping, Grafana dashboards with auto-provisioned Loki datasource
- **Architecture Book** — comprehensive 7-chapter production-grade architecture documentation with Mermaid.js diagrams covering HLD, LLD, data management, system flows, infrastructure, and security

### Changed
- Client version bumped to 2.4.0, server to 2.3.0
- **Store settings now deep-merge** — `updateStoreSettings` repository method now merges with existing settings instead of replacing, preventing accidental data loss (fixes logo override issue)
- HTTP request logging now uses structured JSON format via appLogger instead of plain-text Morgan output
- Docker infrastructure expanded with Loki, Promtail, and Grafana services in `docker-compose.infra.yml`

### Fixed
- **Dashboard People label count showing 2 instead of 25** — people feature now tracks `assignedLabels` per person via AIMS article info sync; dashboard computes people-specific count
- **Logos not saved at company level** — `uploadLogo` and `removeLogo` controller methods now trigger debounced server save; store settings merge prevents overwriting `storeLogoOverride`
- **Person model missing assignedLabels** — added `labelCode` and `assignedLabels` columns to Person model; AIMS sync job now writes labels to Person records matching `assignedSpaceId`
- **Store logo override lost on auto-save** — store settings repository changed from replace to merge behavior, preserving `storeLogoOverride` across concurrent saves

### Infrastructure
- Added `infra/` directory with Loki, Promtail, and Grafana configuration files
- SQL migration for Person table (`label_code`, `assigned_labels` columns)

---

## [2.3.0] - 2026-02-19

### Added
- **Granular store roles** — expanded CompanyRole enum with `STORE_ADMIN` and `STORE_VIEWER` for fine-grained per-store access control
- **PWA install support** — browser password manager compatibility and installable Progressive Web App
- **Direct AIMS label fetching** — labels page fetches directly from AIMS for faster, more reliable data
- **Label status colors** — status column in labels table now displays colored chips (NORMAL, UPDATED, PROCESSING, ERROR)
- **Dashboard per-feature label counts** — Spaces and Conference cards show assigned labels count individually
- **Native barcode scanner** — support for hardware barcode scanners in label management

### Changed
- Client version bumped to 2.3.0, server to 2.2.0
- **STORE_ADMIN is now per-store only** — Store Manager no longer receives automatic access to all stores; explicit store assignments are required. Company Admin retains all-stores access
- Renamed "Platform Admin" → "App Admin" and "Store Admin" → "Store Manager" in UI
- Simplified store role selector to Store Manager / Store Viewer only
- Labels enabled by default for all stores with viewer read-only enforcement
- Split client and server into separate Docker containers for independent scaling
- Renamed "Conference Rooms" to "Conference" in navigation
- Label size column now correctly displays AIMS label type (e.g., "2.9 inch")
- Improved labels UX — larger previews, chip padding, mobile layout, smart background refresh

### Fixed
- **Dashboard counts showing 0** — dashboard now fetches spaces, conference rooms, and people from server on mount instead of relying on navigation to other pages first
- **Label size column empty** — fixed AIMS field mapping (`type` → `labelType`)
- **Company admin allStoresAccess** — fixed bug where company admins couldn't see company-level data
- Conference rooms and spaces now correctly scoped to active store
- Space assignment check scoped to person's store
- Conference rooms no longer persisted to localStorage (always fresh from server)
- Role display priority corrected for company admins in users table
- User dialog crash on edit, SW CSP font blocking
- Health endpoint 401, stale chunk recovery, SW cache versioning
- Token/cookie expiry alignment (refresh token extended to 180 days)
- Store switching no longer logs out user; shows loading screen during transition
- Platform admin access to all feature services and sync endpoints

### Infrastructure
- Split Docker Compose into infra + app, removed nginx container
- Ubuntu server deployment with external PostgreSQL
- Removed hardcoded passwords and tracked secrets from repository
- Consolidated environment files and deploy scripts

---

## [2.2.0] - 2026-02-17

### Added
- **Live store switching** — switching stores now re-fetches all page data (spaces, people, conference, labels) without requiring re-login
- **Auto-sync on store switch** — MainLayout triggers a fresh AIMS sync when the active store changes
- **Mobile-friendly action buttons** — enlarged touch targets for edit, delete, link/unlink, and filter buttons across all mobile card views
- **Speed dial click-away** — dashboard quick-actions panel closes when tapping outside on mobile

### Changed
- Client version bumped to 2.2.0, server to 2.1.0
- Removed Image Labels navigation entry from sidebar (feature is not user-facing)
- Removed Labels toggle from company and store feature selection UI
- Upgraded mobile IconButtons from `small` to `medium` size across Spaces, Conference, Labels, and People pages
- Increased spacing between mobile action buttons to prevent accidental taps

### Fixed
- **Store switching UI stale data** — pages only re-fetched on initial login (`isAppReady`), not on store change; now `activeStoreId` is in all effect dependency arrays
- **MainLayout sync flag** — replaced one-time `hasSyncedOnLoad` boolean with `lastSyncedStoreId` ref so sync fires per-store
- Removed unused imports (`DEFAULT_COMPANY_FEATURES`, `isFeatureEnabled`, `ImageIcon`) that caused build errors

---

## [2.1.0] - 2026-02-01

### Added
- **Server-backed lists** — People and Spaces lists stored in DB, shared across all store users
- **Conference rooms via server API** with automatic AIMS sync queue
- **Image Labels feature** — assign images to ESL labels with dithering preview and push-to-label
- **Real-time SSE notifications** when other users modify lists or conference rooms
- **Unsaved changes guard** — prompts before navigating away with unsaved data
- **Enhanced People & Spaces Management UI** — virtualized table, bulk actions, mobile cards
- **Labels management page** — link/unlink labels to articles, battery/signal status, image preview

### Changed
- Mobile-optimized UI — collapsible list panel, compact cards, inline action buttons
- Status filter placed alongside cancel assignments for faster mobile workflows
- Enhanced authentication with server-side validation
- Comprehensive test suite — 1250+ tests covering all features

### Fixed
- Store isolation and all-stores-access for multi-tenant environments
- Dark theme consistency across all dialogs and pages
- Labels count accuracy on dashboard

---

## [2.0.0] - 2026-01-25

### Added
- **Full server architecture** — Node.js/Express backend with PostgreSQL (Prisma ORM)
- **Multi-tenant auth system** — JWT-based with platform admin, company admin, and store-level roles
- **Company & Store management** — create, edit, delete companies and stores with feature toggles
- **User management** — invite users, assign roles per company/store, elevate permissions
- **Server-side settings** — per-store settings with company defaults and store overrides
- **Security settings** — password policies, session management, audit logging
- **AIMS credential encryption** — server-side AES-256 encryption for stored credentials

### Changed
- Deep optimization pass — performance, type safety, and full manual rewrite
- Migrated from client-only to client-server architecture
- All CRUD operations now go through server API instead of direct AIMS calls

### Technical
- Prisma schema with Company, Store, User, Space, Person, ConferenceRoom models
- Feature resolution system (company defaults → store overrides → effective features)
- Backend sync controller replaces direct AIMS communication

---

## [1.3.0] - 2026-01-19

### Added
- **Deep Testing System**: 1000+ unit and integration tests with comprehensive coverage
- **E2E Tests**: 345 Playwright tests with Page Object pattern for UI testing
- **Comprehensive Documentation**: Full `app_book/` documentation covering architecture, features, and mechanics
- **Electron Installation Guide**: Detailed guide for development and production builds
- **Auto-Update System**: Built-in update checking and installation via GitHub Releases
- **Enhanced Settings Management**: Improved settings controller with working mode validation

### Changed
- Updated version to 1.3.0
- Added copyright and trademark info for installer: "Aviv Ben Waiss"
- Improved settings validation and error handling
- Optimized bundle size with code splitting

### Fixed
- Fixed Vite import warnings for dynamic imports
- Resolved react-router CSRF vulnerability
- Fixed TypeScript strict mode compliance issues

### Technical
- Split `usePeopleLists.ts` into modular hooks (Core, Sync, Orchestrator)
- Reorganized test files into focused modules
- Added MSW for API mocking in tests
- Configured `@test/*` import alias for test utilities

---

## [1.2.0] - 2025-12-22

### Added
- Auto-update infrastructure with electron-updater
- SoluM cluster URL support (common/c1)
- Hebrew translations for all UI components
- Configuration management with JSON editor

### Changed
- Improved SoluM API integration
- Enhanced conference room management

---

## [1.1.0] - 2025-12-15

### Added
- **People Manager Feature**: Virtual Pool IDs for cross-device sync
- CSV import with list management
- AIMS article synchronization
- People-specific allocation tracking

### Changed
- Dashboard redesign with feature cards
- Improved space allocation UI

---

## [1.0.3] - 2025-12-01

### Added
- Initial Electron packaging with NSIS installer
- Conference room NFC URL generation
- Multi-platform support (Windows, Web, Android)

### Fixed
- Dashboard assigned labels display
- File optimization for large CSV imports

---

## [1.0.0] - 2025-11-15

### Added
- Initial release
- Space management with SoluM AIMS integration
- Conference room management
- CSV import/export functionality
- SFTP working mode support
- English/Hebrew localization
