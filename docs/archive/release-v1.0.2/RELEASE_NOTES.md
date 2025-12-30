# electisSpace v1.0.2 Release Notes

**Release Date:** December 29, 2025  
**Build:** Production  
**Platforms:** Windows (Electron), Android (Capacitor)

---

## 🎉 Release Highlights

electisSpace v1.0.2 introduces the powerful **People Manager** feature, enabling organizations to manage personnel assignments to ESL (Electronic Shelf Label) displays. This release also includes significant improvements to AIMS synchronization, enhanced logging, and numerous bug fixes.

---

## ✨ New Features

### People Manager Mode
A complete personnel management system that transforms space management into a people allocation workflow:

- **CSV Upload**: Import personnel data from CSV files following the SoluM article format
- **Space Assignment**: Assign available spaces to personnel with visual tracking
- **Bulk Operations**: Assign/unassign multiple people simultaneously
- **AIMS Integration**: Full bi-directional sync with SoluM AIMS
  - Push assignments to AIMS
  - Sync data from AIMS to local
  - Real-time sync status indicators
- **Lists Management**: Save, load, and manage multiple personnel configurations
- **Dashboard Integration**: Dedicated People Manager section when mode is enabled

### Bi-Directional AIMS Sync
- **Sync from AIMS**: Download current articles and populate People table
- **Send to AIMS**: Push all assignments to AIMS in batch
- **Auto-sync Support**: Automatic synchronization at configured intervals
- **Status Tracking**: Visual indicators for sync status (synced, pending, error)

### Enhanced Dashboard
- Conditional display based on active mode (Spaces or People Manager)
- Real-time statistics for assigned/unassigned personnel
- Label count from SoluM API store summary
- Quick navigation to relevant sections

---

## 🔧 Improvements

### Logging System
- Replaced all `console.log` statements with proper logger service
- Centralized logging for debugging and troubleshooting
- Log viewer in Settings for reviewing application logs

### Installer Configuration
- Windows installer now defaults to Program Files (per-machine installation)
- Users can still choose custom installation directory

### Navigation
- Dynamic navigation based on People Manager mode
- Proper route highlighting when navigating from dashboard

### Localization
- Complete English and Hebrew translations for People Manager
- Proper RTL support for Hebrew interface

---

## 🐛 Bug Fixes

- Fixed 404 error when navigating to /people route
- Fixed navigation tab not highlighting when in People Manager section
- Fixed assigned labels count showing 0 (now uses correct `labelCount` field from API)
- Fixed `lists.savedLists` translation key (now uses `dashboard.savedLists`)
- Fixed Hebrew locale JSON syntax error
- Fixed type predicate error in `bulkAssignSpaces`

---

## 📋 Technical Details

### Dependencies
- React 18+
- Material-UI v7
- Zustand for state management
- Electron 27+ for desktop
- Capacitor 7+ for mobile

### API Compatibility
- SoluM AIMS API v2
- Full article format support
- Store summary integration

### Build Information
- TypeScript strict mode
- Vite bundler
- ESLint with recommended rules

---

## 🔄 Migration Notes

### From v1.0.1
No data migration required. Settings and stored data are fully compatible.

### Enabling People Manager
1. Go to Settings → SoluM API tab
2. Enable "People Manager Mode" toggle
3. Configure total available spaces
4. The navigation will automatically switch to People mode

---

## 📦 Installation

### Windows
Download and run `electisSpace Setup 1.0.2.exe`. The installer will guide you through the installation process.

### Android
Download the APK from the releases page and install on your device.

---

## 🔗 Resources

- [User Manual](USER_MANUAL.md)
- [Changelog](CHANGELOG.md)
- [API Reference](API_REFERENCE.md)
- [Configuration Guide](CONFIGURATION_GUIDE.md)

---

## 📝 Known Issues

- Auto-sync for People Manager uses the same interval as Spaces sync
- Large CSV files (>10,000 rows) may take longer to process

---

## 🙏 Acknowledgments

Thank you to all contributors and testers who helped make this release possible.

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
