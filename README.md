# electisSpace

**ESL Management System** - A comprehensive Electronic Shelf Label management application with SoluM AIMS integration.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web%20%7C%20Android-green.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

---

## Overview

electisSpace is a multi-platform application for managing Electronic Shelf Labels (ESL) integrated with SoluM AIMS API. Built with React 19, it supports Web, Windows (Electron), and Android (Capacitor) from a single codebase.

### Key Capabilities

- **Space Management**: CRUD for rooms, desks, and offices with ESL label assignment
- **People Management**: Employee directory with space assignments and CSV import
- **Conference Room Management**: Meeting room displays with real-time status
- **Multi-Tenancy**: Company → Store → User hierarchy with role-based access
- **SoluM Integration**: Direct API integration with SoluM AIMS for ESL hardware control

---

## Features

### Core Features
- **Multi-Mode Support**: Office, Room, Chair, and People management modes
- **SoluM AIMS Integration**: Full API integration for ESL synchronization
- **People Manager with Virtual Pool IDs**: Cross-device personnel sync
- **CSV Import/Export**: Bulk data management with Hebrew support

### Sync & Updates
- **Auto-Sync**: Configurable automatic sync (10-3600 seconds interval)
- **Queue-Based Sync**: Reliable synchronization with retry logic
- **Auto-Update**: Built-in update system via GitHub Releases

### Security
- **2FA Authentication**: Email verification codes on login
- **Persistent Sessions**: Users remain logged in until explicit logout
- **Role-Based Access**: Granular permissions per store

### Multi-Platform
- **Windows**: Electron desktop application
- **Web**: Browser-based SPA
- **Android**: Capacitor mobile app
- **i18n Support**: English and Hebrew localization

---

## Quick Start

### Prerequisites
- Node.js v22+ LTS
- npm v10+
- PostgreSQL 16+ (for server)

### Installation
```bash
# Clone the repository
git clone https://github.com/AvivElectis/electisSpace.git
cd electisSpace

# Install dependencies
npm install

# Start development server (frontend)
npm run dev

# Start backend server
cd server && npm run dev

# Or run with Electron
npm run electron:dev
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server (port 5173) |
| `npm run build` | Build for production |
| `npm run electron:dev` | Run in Electron development mode |
| `npm run electron:build` | Build Electron installer |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:coverage` | Run tests with coverage report |

### Server Scripts
```bash
cd server
npm run dev          # Start dev server with hot reload
npm run build        # Build TypeScript
npm run start        # Start production server
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool |
| Material UI | 7.x | Components |
| Zustand | 5.x | State Management |
| i18next | 24.x | Internationalization |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 4.x | Web Framework |
| Prisma | 6.x | ORM |
| PostgreSQL | 16.x | Database |
| Redis | 7.x | Caching |

### Platforms
| Platform | Technology |
|----------|------------|
| Desktop | Electron 33.x |
| Mobile | Capacitor 7.x |
| Web | Vite |

---

## Architecture

The project follows **Feature-Sliced Design** with **Clean Architecture** principles:

```
src/
├── features/           # Feature modules
│   ├── space/         # Spaces/rooms management
│   ├── people/        # People management  
│   ├── conference/    # Conference rooms
│   ├── settings/      # App settings
│   └── sync/          # Synchronization
├── shared/            # Shared code
│   ├── application/   # Shared hooks
│   ├── domain/        # Shared types
│   ├── infrastructure/# Shared services
│   └── presentation/  # Shared components
└── locales/           # i18n translations

server/
├── src/
│   ├── config/        # Environment config
│   ├── features/      # API routes by feature
│   └── shared/        # Middleware & services
└── prisma/            # Database schema
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [HIGH_LEVEL_DESIGN.md](docs/HIGH_LEVEL_DESIGN.md) | System architecture overview |
| [LOW_LEVEL_DESIGN.md](docs/LOW_LEVEL_DESIGN.md) | Component specifications & API |
| [USER_MANUAL.md](docs/USER_MANUAL.md) | End-user documentation |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Complete database schema |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

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

**Test Coverage**: 1000+ tests (unit, integration, E2E)

---

## Platforms

### Windows (Electron)
```bash
npm run electron:build
# Output: dist-electron/electisSpace.Setup.2.0.0.exe
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

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/electisspace

# JWT (Persistent sessions)
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key

# CORS
CORS_ORIGINS=http://localhost:5173
```

---

## License

Proprietary - 2026 Aviv Ben Waiss. All rights reserved.

---

## Author

**Aviv Ben Waiss**  
Email: aviv@electis.co.il

---

## Links

- **Repository**: https://github.com/AvivElectis/electisSpace
- **SoluM AIMS**: https://common.aims-kr.com
