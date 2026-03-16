# electisSpace v1.3.0

## 🎉 What's New

### Deep Testing System
- **1000+ unit and integration tests** with comprehensive coverage
- MSW (Mock Service Worker) for API mocking
- Test utilities with `@test/*` import alias

### E2E Testing with Playwright
- **345 end-to-end tests** with Page Object pattern
- Page Objects: Dashboard, Spaces, People, Conference, Settings

### Comprehensive Documentation
- Full **App Book** documentation (`docs/app_book/`)
- Feature deep-dives: Dashboard, Spaces, People, Conference, Settings, Sync
- [Electron Installation Guide](docs/ELECTRON_INSTALLATION_GUIDE.md)

### Auto-Update System
- Built-in update checking via GitHub Releases
- User-controlled download and install

## 🔧 Improvements

- Enhanced Settings Management with validation
- Optimized bundle with code splitting
- Fixed Vite dynamic import warnings
- Fixed react-router CSRF vulnerability

## 🛠 Technical Changes

- Split `usePeopleLists.ts` into modular hooks (Core, Sync, Orchestrator)
- Reorganized test files into focused modules
- Updated electron-builder to v26.0.12
- Added copyright: "Copyright © 2026 Aviv Ben Waiss"

## 📦 Downloads

| Platform | File |
|----------|------|
| Windows Installer | `electisSpace.Setup.1.3.0.exe` |
| Portable | `win-unpacked/` folder |

## 📊 Test Coverage

| Category | Count |
|----------|-------|
| Unit Tests | 700+ |
| Integration Tests | 28 |
| Component Tests | 200+ |
| E2E Tests | 345 |
| **Total** | **1000+** |

---

**Full Changelog**: https://github.com/AvivElectis/electisSpace/compare/v1.1.0...v1.3.0
