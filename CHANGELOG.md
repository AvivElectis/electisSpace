# Changelog

All notable changes to electisSpace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
