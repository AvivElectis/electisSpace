# electisSpace

**ESL Management System** - A comprehensive Electronic Shelf Label management application with SoluM AIMS integration.

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web%20%7C%20Android-green.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

---

## Overview

electisSpace is a multi-platform application for managing Electronic Shelf Labels (ESL) integrated with SoluM AIMS API. It supports multiple working modes including office spaces, conference rooms, chair assignments, and personnel management.

---

## Features

- **Multi-Mode Support**: Office, Room, Chair, and People management modes
- **SoluM AIMS Integration**: Full API integration for ESL synchronization
- **People Manager with Virtual Pool IDs**: Cross-device personnel sync (v1.1.0)
- **CSV Import/Export**: Bulk data management with Hebrew support
- **Auto-Sync**: Automatic 5-minute sync cycles
- **Multi-Platform**: Windows (Electron), Web, and Android (Capacitor)
- **i18n Support**: English and Hebrew localization

---

## Quick Start

### Prerequisites
- Node.js v18+ LTS
- npm v9+

### Installation
```bash
# Clone the repository
git clone https://github.com/AvivElectis/electisSpace.git
cd electisSpace

# Install dependencies
npm install

# Start development server
npm run dev

# Or run with Electron
npm run electron:dev
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| npm run dev | Start Vite development server |
| npm run build | Build for production |
| npm run electron:dev | Run in Electron development mode |
| npm run electron:build | Build Electron installer |
| npm run test | Run unit tests |
| npm run test:e2e | Run E2E tests with Playwright |
| npm run test:coverage | Run tests with coverage report |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Zustand
- **Build**: Vite (Rolldown), Vitest
- **Desktop**: Electron
- **Mobile**: Capacitor (Android)
- **UI**: Material-UI v7
- **Testing**: Vitest, Playwright

---

## Documentation

- [README](docs/1_1_0/README.md) - v1.1.0 Overview
- [CHANGELOG](docs/1_1_0/CHANGELOG.md) - Version history
- [RELEASE_NOTES](docs/1_1_0/RELEASE_NOTES.md) - Release details
- [BUILD_INSTRUCTIONS](docs/1_1_0/BUILD_INSTRUCTIONS.md) - Build guide
- [People Mode Guide](docs/PEOPLE_MODE_AUTO_SYNC_GUIDE.md) - Auto-sync implementation

---

## Testing

```bash
# Run all unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

**Test Status**: 65 tests (53 unit, 12 integration)

---

## Platforms

### Windows (Electron)
```bash
npm run electron:build
# Output: dist-electron/electisSpace.Setup.1.1.0.exe
```

### Web
```bash
npm run build
# Output: dist/
```

### Android (Capacitor)
```bash
npm run android:build
npm run cap:open:android
```

---

## License

Proprietary - 2025 Electis. All rights reserved.

---

## Author

**Aviv Electis**
Email: aviv@electis.co.il

---

## Links

- **Repository**: https://github.com/AvivElectis/electisSpace
- **SoluM AIMS**: https://common.aims-kr.com
