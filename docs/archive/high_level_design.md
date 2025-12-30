# High-Level Design: Dental Medical Center v2

## Executive Summary

This document outlines the complete high-level design for the refactored Dental Medical Center application. The new architecture adopts a **feature-based vertical slice architecture** with clean separation of concerns, unified sync strategies, and performance-first implementation.

**Project Location:** `c:\React\DentalMedicalCenterV2` (new greenfield project)

---

## System Context

### Purpose
Electronic label management system for dental/medical facilities that:
- Manages personnel/room assignments and information
- Synchronizes data with external systems (SFTP servers or SoluM ESL API)
- Supports conference room management with real-time status updates
- Provides multi-language support (English/Hebrew)
- Runs on multiple platforms (Web, iOS, Android via Capacitor)

### Key Stakeholders
- **End Users:** Dental/medical staff managing room/chair assignments
- **Administrators:** Configure sync settings, manage labels
- **External Systems:** SFTP servers, SoluM ESL API

---

## Architecture Principles

### 1. **Feature-Based Vertical Slices**
Code is organized by **business capability** (feature) rather than technical layer.

Each feature contains four layers:
```
features/{feature-name}/
├── domain/          # Business logic, types, validations
├── application/     # Use cases, controllers, orchestration
├── infrastructure/  # State management, external adapters
└── presentation/    # UI components (React)
```

**Benefits:**
- High cohesion within features
- Easy to understand and maintain
- Clear boundaries and dependencies
- Scalable (add new features without touching existing ones)

### 2. **Dependency Flow**
```
Presentation → Application → Domain
                    ↓
              Infrastructure
```

- **Presentation** depends on Application (controllers)
- **Application** depends on Domain (business logic) and Infrastructure (state, APIs)
- **Domain** depends on nothing (pure business logic)
- **Infrastructure** implements adapters for external systems

### 3. **Adapter Pattern for External Systems**
All external integrations (SFTP, SoluM) implement a common `SyncAdapter` interface, enabling:
- Runtime switching between sync strategies
- Easy testing with mock adapters
- Consistent behavior across sync modes

### 4. **Performance-First**
- Code splitting at feature boundaries
- Lazy loading for routes
- Memoization for expensive computations
- Optimized rendering with React.memo

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (React)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Personnel  │  │ Conference  │  │  Settings   │         │
│  │     UI      │  │     UI      │  │      UI     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────┬───────────────┬───────────────┬───────────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Controllers (Hooks)                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   Personnel    │  │  Conference    │  │   Settings   │  │
│  │  Controller    │  │  Controller    │  │  Controller  │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│              ┌──────────────────┐                            │
│              │ Sync Controller  │                            │
│              └──────────────────┘                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer (Business Logic)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Personnel  │  │Conference  │  │  Settings  │            │
│  │   Domain   │  │   Domain   │  │   Domain   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                            │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   Store    │  │  Services  │  │   Sync Adapters     │   │
│  │  (Zustand) │  │   (CSV,    │  │  ┌───────┐ ┌──────┐ │   │
│  │            │  │   Logger)  │  │  │ SFTP  │ │Solum │ │   │
│  └────────────┘  └────────────┘  │  └───────┘ └──────┘ │   │
│                                   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              External Systems                                │
│         SFTP Server  ◄──►  SoluM ESL API                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

### Feature 1: Personnel Management
**Purpose:** Manage personnel records, import/export data via sync adapters.

**Capabilities:**
- Add, edit, delete personnel records
- Import personnel from external systems (CSV via SFTP or Articles via SoluM)
- Export personnel to external systems
- Filter and search personnel
- Save/load pre-configured chair lists

**Key Components:**
- `PersonnelController` - CRUD operations, import/export orchestration
- `PersonnelFilters` - Filter logic for room/title/specialty
- `PersonnelStore` - State management (Zustand slice)
- `PersonnelManagement.tsx` - Main UI component

---

### Feature 2: Conference Room Management
**Purpose:** Manage conference room availability and meeting schedules.

**Capabilities:**
- Add, edit, delete conference rooms
- Set meeting status (occupied/available)
- Define meeting time ranges
- Manage participant lists
- Sync room status to electronic labels

**Key Components:**
- `ConferenceController` - Room CRUD, meeting management, time validation
- `ConferenceStore` - State management
- `ConferenceRoomList.tsx` - Main UI component

**Special Mode:** "Simple Conference Mode" - Toggle between Occupied/Available on SoluM labels by switching page.

---

### Feature 3: Sync Management
**Purpose:** Unified abstraction for synchronizing data with external systems.

**Capabilities:**
- Auto-sync on interval (configurable)
- Manual sync trigger
- Mode switching (SFTP ↔ SoluM)
- Connection status monitoring
- Error handling and retry logic

**Sync Strategies:**
1. **SFTP Mode:** Upload/download CSV files
2. **SoluM Mode:** Push/pull articles via REST API with token management

**Key Components:**
- `SyncController` - Orchestrates sync operations
- `SyncAdapter` interface - Common contract for sync implementations
- `SFTPSyncAdapter` - SFTP-specific sync logic
- `SolumSyncAdapter` - SoluM API-specific sync logic

---

### Feature 4: Settings Management
**Purpose:** Configure application settings, sync credentials, CSV structure, and localization.

**Capabilities:**
- App settings (name, subtitle, space type)
- SFTP connection configuration
- SoluM API configuration
- CSV column mapping
- Logo upload/management
- Import/export settings file
- Security (password protection for settings)

**Key Components:**
- `SettingsController` - Settings validation, persistence, import/export
- `SettingsStore` - State management
- `SettingsDialog.tsx` - Main settings UI

---

### Shared Infrastructure

#### State Management (Zustand)
- **Single global store** combining all feature slices
- **Persistence** to localStorage with selective serialization
- **Devtools** integration for debugging

#### Services
- **CSV Service:** Parse/generate CSV with configurable delimiters and mappings
- **Logger:** Structured logging with levels (debug, info, warn, error)
- **Encryption Service:** Secure credential storage
- **Backup Service:** Settings backup/restore

#### Platform Abstraction (Capacitor)
- File system access (iOS/Android native)
- Platform detection
- Native integrations

---

## Data Model

### Core Entities

#### Person
```typescript
{
  id: string;              // Unique identifier
  roomName: string;        // Room/Chair name
  data: Record<string, string>;  // Dynamic fields from CSV
  labelCode?: string;      // Linked SoluM ESL label
  templateName?: string;   // SoluM template for rendering
}
```

#### ConferenceRoom
```typescript
{
  id: string;              // Format: C{number} (e.g., C01)
  roomName: string;
  hasMeeting: boolean;
  meetingName: string;
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  participants: string[];
  labelCode?: string;      // Linked SoluM ESL label
  data?: Record<string, string>;  // Additional article data
}
```

#### CSVConfig
```typescript
{
  delimiter: string;
  columns: CSVColumn[];    // Column definitions
  mapping: FieldMapping;   // Field to column index mapping
  conferenceEnabled: boolean;
}
```

---

## Sync Architecture

### Adapter Interface

```typescript
interface SyncAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  download(): Promise<Person[]>;
  upload(data: Person[]): Promise<void>;
  sync(): Promise<void>;  // Bi-directional sync
  getStatus(): SyncStatus;
}
```

### SFTP Sync Workflow

```
1. Connect to SFTP server (API client)
2. Download CSV file
3. Parse CSV using CSVService (with configured mappings)
4. Update local store with parsed personnel
5. (On save) Generate CSV from local store
6. Upload CSV to SFTP server
```

### SoluM Sync Workflow

```
1. Login to SoluM API (get access token)
2. Fetch articles for store
3. Fetch label assignments
4. Map articles → Person[] using configured mappings
5. Update local store
6. (On save) Map Person[] → articles
7. Push articles to SoluM API
8. Update label assignments if needed
9. (Token refresh) Auto-refresh token before expiry
```

---

## Performance Strategy

### Code Splitting
- **Route-level splitting:** Each main feature lazy-loaded
- **Vendor splitting:** React, MUI separately bundled
- **Dynamic imports:** Heavy components loaded on-demand

### Render Optimization
- **React.memo:** Memoize expensive list components
- **useMemo:** Cache filtered/sorted data
- **useCallback:** Stabilize event handlers
- **Virtualization:** For large lists (100+ items)

### Bundle Size Targets
- **Initial bundle:** < 200 KB (gzipped)
- **Main chunk:** < 100 KB (gzipped)
- **Total bundle:** < 500 KB (gzipped)

---

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** Material-UI (MUI) v5
- **State Management:** Zustand with persist middleware
- **Routing:** React Router v6
- **Forms:** React Hook Form
- **Build Tool:** Vite

### Backend Integration
- **SFTP:** Custom API client (REST to SFTP bridge)
- **SoluM:** Direct REST API integration
- **CSV:** PapaParse library

### Platform
- **Web:** Standard React app
- **Mobile:** Capacitor for iOS/Android

### Development
- **TypeScript:** Strict mode
- **ESLint:** Standard rules
- **Testing:** Vitest + React Testing Library
- **DevTools:** Redux DevTools (Zustand integration)

---

## Security Considerations

### Credential Storage
- **Encryption:** AES-256 for stored credentials
- **Storage:** Encrypted localStorage
- **Settings:** Password-protected settings access

### API Security
- **HTTPS Only:** All external communications
- **Token Management:** Auto-refresh before expiry (SoluM)
- **Sanitization:** Input sanitization for CSV imports

### CSP (Content Security Policy)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

---

## Internationalization (i18n)

### Supported Languages
- English (en)
- Hebrew (he) - RTL support

### Translation Strategy
- **i18next:** Translation library
- **Namespace organization:** By feature
- **Dynamic loading:** Load only active language

### RTL Support
- **MUI theming:** Direction toggle
- **CSS:** Logical properties (margin-inline-start, etc.)

---

## File Structure Overview

```
src/
├── features/
│   ├── personnel/
│   │   ├── domain/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── businessRules.ts
│   │   ├── application/
│   │   │   ├── usePersonnelController.ts
│   │   │   ├── usePersonnelFilters.ts
│   │   │   └── __tests__/
│   │   ├── infrastructure/
│   │   │   ├── personnelStore.ts
│   │   │   └── personnelRepository.ts
│   │   ├── presentation/
│   │   │   ├── PersonnelManagement.tsx
│   │   │   ├── PersonDialog.tsx
│   │   │   ├── PersonnelTable.tsx
│   │   │   └── PersonnelCards.tsx
│   │   └── index.ts
│   ├── conference/
│   │   └── [same structure]
│   ├── sync/
│   │   └── [same structure]
│   └── settings/
│       └── [same structure]
├── shared/
│   ├── domain/
│   │   └── types.ts          # Cross-cutting types
│   ├── infrastructure/
│   │   ├── services/
│   │   │   ├── csvService.ts
│   │   │   ├── logger.ts
│   │   │   └── encryptionService.ts
│   │   └── store/
│   │       └── rootStore.ts  # Combines all feature stores
│   ├── presentation/
│   │   ├── components/       # Shared UI components
│   │   └── layouts/
│   └── utils/
│       ├── validators.ts
│       └── constants.ts
├── App.tsx                   # Root component with routing
├── main.tsx                  # Entry point
└── i18n.ts                   # i18n configuration
```

---

## Migration from v1 to v2

### Strategy: Greenfield Implementation
- **New project directory:** `c:\React\DentalMedicalCenterV2`
- **Copy over:** Existing locales, assets, styles
- **Rewrite:** All business logic in new architecture
- **Port:** UI components to new structure
- **Migrate:** Store → new feature slices

### Data Migration
- **Settings:** Export from v1, import to v2
- **State:** No direct migration (users will re-sync)

---

## Success Metrics

### Performance
- Initial load time < 2 seconds
- Table render (100 items) < 100ms
- Sync operation < 5 seconds
- Bundle size reduction: 20-30%

### Code Quality
- TypeScript strict mode: 0 errors
- Test coverage: > 70% for business logic
- No console errors in production build

### Maintainability
- Clear feature boundaries
- Documented public APIs
- Consistent patterns across features

---

## Next Steps

1. ✅ **High-Level Design** (this document)
2. → **Low-Level Design** (detailed API specifications)
3. → **Workflow Documentation** (user flows, data flows)
4. → **Function Catalog** (complete function index)
5. → **Implementation** (build the system)
