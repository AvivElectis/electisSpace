# Changelog

All notable changes to electisSpace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2024-12-29

### Added
- **People Manager Mode**: Complete personnel management system
  - CSV import functionality for bulk personnel upload
  - Space assignment workflow with visual tracking
  - Bi-directional AIMS synchronization
  - Bulk assign/unassign operations
- **Sync from AIMS**: Download articles from AIMS to populate People table
- **Lists Management**: Save and load personnel configurations
- **Dashboard Integration**: People Manager statistics when mode is enabled
- **Hebrew Translations**: Complete i18n support for People Manager features
- **Centralized Logging**: Logger service replacing console.log throughout app

### Changed
- Windows installer now defaults to Program Files (`perMachine: true`)
- Navigation dynamically switches between `/spaces` and `/people` routes
- Dashboard shows contextual statistics based on active mode
- API field access updated from `totalLabelCount` to `labelCount`
- Translation key for saved lists count changed to `dashboard.savedLists`

### Fixed
- 404 error when navigating to /people route
- Navigation tab not highlighting when in People Manager section
- Assigned labels count showing 0 on dashboard
- Hebrew locale JSON syntax errors
- Type predicate error in `bulkAssignSpaces` function
- Multiple console.log statements replaced with proper logger calls

### Security
- No security updates in this release

---

## [1.0.1] - 2024-12-15

### Added
- Auto-sync functionality for Spaces
- Configurable sync intervals
- Connection status indicator
- Store summary display on dashboard
- System logs viewer

### Changed
- Improved error handling for API calls
- Enhanced loading states throughout UI
- Better mobile responsiveness

### Fixed
- API connection timeout issues
- Settings not persisting on app restart
- Android back button behavior

---

## [1.0.0] - 2024-12-01

### Added
- Initial release of electisSpace
- Space Management module
  - View, edit, and manage ESL labels
  - Individual and bulk sync operations
  - Search and filter capabilities
- Conference Rooms module
  - Room display configuration
  - Capacity management
- Settings module
  - SoluM API configuration
  - Connection testing
  - Language selection (EN/HE)
- Dashboard with quick statistics
- Electron desktop application (Windows)
- Capacitor mobile application (Android)
- Material-UI v7 interface
- Zustand state management
- i18next internationalization

### Technical
- React 18 with TypeScript
- Vite bundler
- Strict ESLint configuration
- Vitest for unit testing
- Playwright for E2E testing

---

## [0.9.0] - 2024-11-15 (Beta)

### Added
- Beta release for internal testing
- Core Space Management functionality
- Basic AIMS integration
- Preliminary UI design

### Known Issues
- Sync occasionally fails on large datasets
- Mobile layout needs refinement
- Hebrew RTL has minor alignment issues

---

## Unreleased

### Planned Features
- Dark mode theme
- Calendar integration for Conference Rooms
- Export to PDF functionality
- Advanced filtering and sorting
- Role-based access control
- Cloud backup of configurations

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.2 | 2024-12-29 | People Manager, AIMS Bi-directional Sync |
| 1.0.1 | 2024-12-15 | Auto-sync, System Logs |
| 1.0.0 | 2024-12-01 | Initial Release |
| 0.9.0 | 2024-11-15 | Beta Release |

---

## Upgrade Notes

### From 1.0.1 to 1.0.2
- No breaking changes
- Settings are fully compatible
- Enable People Manager in Settings if needed

### From 1.0.0 to 1.0.1
- No breaking changes
- Auto-sync is disabled by default

### From 0.9.0 to 1.0.0
- Full reinstallation recommended
- Settings should be reconfigured

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
