# Changelog

All notable changes to electisSpace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
