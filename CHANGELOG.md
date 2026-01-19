# Changelog

All notable changes to electisSpace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
