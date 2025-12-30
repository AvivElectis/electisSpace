# electisSpace v1.1.0

**Release Date:** December 30, 2025  
**Build:** Electron Desktop Application

---

## 🎯 Overview

electisSpace is a comprehensive ESL (Electronic Shelf Label) Management System designed to integrate with SoluM AIMS API. This release introduces the **People Manager with Virtual Pool IDs** feature, enabling cross-device synchronization for people/personnel management.

---

## ✨ What's New in v1.1.0

### 🆕 People Manager with Virtual Pool IDs

The flagship feature of this release provides a complete solution for managing people/personnel using ESL tags with full SoluM AIMS integration.

#### Key Features:
- **Virtual Pool IDs**: Unassigned people receive `POOL-0001` to `POOL-9999` identifiers
- **AIMS Article Reuse**: Automatically discovers and reuses empty POOL articles from AIMS
- **Cross-Device Sync**: Synchronize people data across multiple devices via SoluM AIMS
- **CSV Import with Hebrew Support**: Import personnel data from semicolon-delimited CSV files
- **Auto-Sync Integration**: Leverages existing 5-minute auto-sync mechanism

#### Technical Details:
- UUID-based person identification stored in AIMS article metadata
- `__PERSON_UUID__` and `__VIRTUAL_SPACE__` metadata fields for cross-device tracking
- Intelligent pool ID generation with preferred ID support from AIMS

---

## 🛠️ System Requirements

### Desktop (Electron)
- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 200MB for installation
- **Network:** Internet connection required for AIMS integration

### Development
- **Node.js:** v18+ LTS
- **npm:** v9+

---

## 📦 Installation

### Windows Desktop
1. Download `electisSpace.Setup.1.1.0.exe`
2. Run the installer
3. Choose installation directory (per-machine installation)
4. Launch from Desktop or Start Menu shortcut

### Auto-Update
The application supports automatic updates via GitHub releases. When a new version is available, you'll be prompted to update.

---

## 🔧 Configuration

### AIMS Integration
Configure your SoluM AIMS connection in Settings:
- **Cluster:** Your AIMS cluster (e.g., `common`)
- **Company:** Company code (e.g., `TST`)
- **Store:** Store code (e.g., `01`)
- **Email:** AIMS account email
- **Password:** AIMS account password

### People Manager
Enable People Manager mode in Settings to activate:
- Virtual Pool ID generation
- Auto-sync for personnel data
- CSV import functionality

---

## 🧪 Testing

This release includes comprehensive test coverage:

| Category | Tests | Status |
|----------|-------|--------|
| Unit Tests | 53 | ✅ Passing |
| Integration Tests | 12 | ✅ Skipped (require AIMS credentials) |
| **Total** | **65** | ✅ |

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📁 Project Structure

```
electisSpace/
├── src/
│   ├── features/
│   │   ├── people/          # People Manager feature
│   │   ├── settings/        # App configuration
│   │   ├── dashboard/       # Main dashboard
│   │   └── sync/            # AIMS sync controllers
│   ├── components/          # Shared UI components
│   └── shared/              # Shared utilities
├── electron/                # Electron main/preload
├── docs/                    # Documentation
└── scripts/                 # Build & utility scripts
```

---

## 🔗 Links

- **GitHub:** https://github.com/AvivElectis/electisSpace
- **SoluM AIMS:** https://common.aims-kr.com

---

## 📝 License

Proprietary - © 2025 Electis. All rights reserved.

---

## 👤 Author

**Aviv Electis**  
Contact: aviv@electis.co.il
