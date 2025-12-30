# Changelog - electisSpace v1.1.0

**Release Date:** December 30, 2025

---

## [1.1.0] - 2025-12-30

### ✨ Added

#### People Manager with Virtual Pool IDs
- **Virtual Pool ID System**: Unassigned people now receive unique identifiers (`POOL-0001` through `POOL-9999`)
- **AIMS Article Reuse**: New `fetchEmptyPoolArticlesFromAims()` function automatically discovers and reuses empty POOL articles
- **Cross-Device Synchronization**: People data syncs across devices via SoluM AIMS metadata
- **Preferred Pool ID Support**: Enhanced `generatePoolIds()` with `preferredPoolIds` parameter for AIMS consistency
- **CSV Import Integration**: `parsePeopleCSV()` now supports preferred pool IDs from AIMS

#### New Components & Services
- `virtualPoolService.ts` - Centralized pool ID generation and management
- `usePeopleController.ts` - Enhanced with AIMS pool article fetching helper
- Full CSV Upload Integration Tests with real Hebrew data support

#### Testing Infrastructure
- Added 12 new integration tests for Full CSV Upload scenarios
- Comprehensive test coverage for Virtual Pool ID functionality
- Real Hebrew data testing with 106 names

### 🔄 Changed

- **peopleService.ts**: Updated `parsePeopleCSV()` to accept `preferredPoolIds` parameter
- **virtualPoolService.ts**: Enhanced `generatePoolIds()` with preferred ID allocation
- **Test Configuration**: Added `runIntegrationTests` flag for controlled AIMS testing

### 🐛 Fixed

- Fixed TypeScript type errors in test configurations:
  - Added missing `store` property to `MappingInfo`
  - Added missing `fileExtension` and `articleBasicInfo` to `ArticleFormat`
  - Added missing `conferenceMapping` to `SolumMappingConfig`

### 📚 Documentation

- Created `PEOPLE_MODE_AUTO_SYNC_GUIDE.md` with comprehensive implementation guide
- Added predicted problems and solutions documentation
- Created release documentation structure (`docs/1_1_0/`)

### 🧪 Tests

| Test Suite | Count | Status |
|------------|-------|--------|
| Unit Tests | 53 | ✅ Pass |
| Integration Tests | 12 | ⏭️ Skip |
| **Total** | **65** | ✅ |

---

## [1.0.3] - Previous Release

See previous release notes for earlier changes.

---

## Migration Notes

### From v1.0.x to v1.1.0

1. **No Breaking Changes**: This release is backward compatible
2. **New Feature Activation**: Enable People Manager in Settings to use Virtual Pool IDs
3. **AIMS Configuration**: Ensure AIMS credentials are configured for sync functionality

### Data Migration

- Existing people data is preserved
- Virtual Pool IDs are automatically assigned to unassigned people
- AIMS articles with existing POOL-XXXX format are automatically reused

---

## Known Issues

- Integration tests are skipped by default (require valid AIMS credentials)
- Set `runIntegrationTests = true` in test file to run AIMS integration tests

---

## Contributors

- **Aviv Ben Waiss** - Lead Developer
