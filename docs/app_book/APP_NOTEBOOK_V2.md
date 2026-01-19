# electisSpace Engineer's Notebook (V2)

> **Version**: 2.0 (The "Deep Dive" Edition)
> **Status**: Comprehensive
> **Last Updated**: Jan 2026

This notebook is the authoritative guide to the `electisSpace` internal architecture. It goes beyond "what" the app does and explains "how" and "why" it works.

---

## 🏗️ Architecture & Patterns
*The blueprint of the system.*

- **[Architecture & Patterns](architecture/ARCH_PATTERNS.md)**: The rules of the codebase.
    - Vertical Slice Architecture
    - The Controller Pattern
    - Adapter Pattern & Dependency Injection
- **[High Level Design](HIGH_LEVEL_DESIGN.md)**: Component hierarchy and data flow diagrams.
- **[Data Flow](DATA_FLOW.md)**: How data moves from UI to AIMS and back.

---

## ⚙️ Core Mechanics (The Engine)
*Detailed documentation of the complex machinery powering the features.*

- **[Synchronization Engine](mechanics/MECHANICS_SYNC.md)**:
    - The "Safe Upload" Protocol (Fetch-Merge-Push)
    - SoluM Token Lifecycle
    - Auto-Sync & Mode Switching
- **[CSV Engine](mechanics/MECHANICS_CSV.md)**:
    - Polymorphic Parsing (Spaces vs Conference Rooms)
    - Enhanced Configuration & Mapping
- **[State & Persistence](mechanics/MECHANICS_STATE.md)**:
    - Zustand Store Topology
    - `idb-keyval` Async Hydration
    - Optimistic UI Patterns

---

## 🔍 Feature Deep Dives
*White-box documentation of specific features.*

- **[People Manager (Deep Dive)](features/PEOPLE_MANAGER.md)**:
    - Virtual Pools Algorithm
    - Cross-Device Metadata (`__PERSON_UUID__`)
    - List Membership Logic
- **[Conference Rooms (Deep Dive)](features/CONFERENCE.md)**:
    - ID Prefixes (`C` vs `c`)
    - "Upload on Change" Pattern (SFTP)
    - Meeting Status Logic
- **[Settings & Configuration](features/SETTINGS.md)**:
    - Security Model (Hash, Admin Override)
    - Destructive Mode Switching (Data Wipe)
- **[Spaces](features/SPACES.md)**: Standard Space Management.
- **[Dashboard](features/DASHBOARD.md)**: Stats Aggregation & Landing Page.
- **[Sync System](features/SYNC_SYSTEM.md)**: UI for the Sync Engine.
- **[Auto-Update](features/AUTO_UPDATE.md)**: Electron & Android Update Logic.

---

## 📚 Reference API
*Contracts and standards.*

- **[Internal API](INTERNAL_API.md)**: Controller Hooks & Utilities.
- **[External API](EXTERNAL_API.md)**: SoluM REST API & SFTP Spec.
- **[App Setup](SETUP.md)**: Getting started.

---

> *This documentation supersedes the previous `APP_NOTEBOOK.md`.*
