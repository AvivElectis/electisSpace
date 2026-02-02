# Deep Documentation Plan: The "White Box" Guide

> **Goal**: Create a "Real Comprehensive Guide" that explains *how* `electisSpace` works internally, going beyond surface-level feature descriptions to document architectural decisions, data flows, state machines, and edge case handling.

## 1. Documentation Philosophy
- **White Box vs Black Box**: Documentation must explain internal mechanics (state, data flow, error handling), not just external behavior.
- **Architectural Traceability**: Every feature doc must trace from UI -> Controller -> Store -> Service -> API.
- **Diagrams First**: Complex flows (Sync, Assign) must have Mermaid sequence diagrams.
- **Edge Case Explicit**: Explicitly document "What happens if..." scenarios (Network fail, Token expiry, Concurrency).

## 2. Documentation Structure

### Part 1: Core Mechanics (The "Engine")
These documents cover the shared machinery that powers the app.

- **`MECHANICS_SYNC.md`**
    - **SolumSyncAdapter**: The "Safe Upload" pattern (Fetch-Merge-Push), logic for preserving remote data.
    - **SFTPSyncAdapter**: Comparison logic, Conference room detection via ID prefixes.
    - **Controller Logic**: `useSyncController` state machine, dynamic adapter switching, auto-sync timers.
    - **Token Management**: Refresh loops, expiry handling.

- **`MECHANICS_CSV.md`**
    - **Enhanced Config**: How `CSVConfig` drives parsing dynamically.
    - **Polymorphism**: How the same parser handles Spaces and Conference Rooms.
    - **Validation**: Error reporting structures for CSV import.

- **`MECHANICS_STATE.md`**
    - **Zustand Persistence**: `idb-keyval` integration, hydration sequence.
    - **Optimistic Updates**: How the UI updates before the API confirms (and rollback strategies).

### Part 2: Feature Deep Dives (The "Use Cases")
Rewriting feature docs to "White Box" standard.

- **`FEATURE_PEOPLE_DEEP_DIVE.md`** (Prototype: `PEOPLE_MANAGER.md`)
    - **Virtual Pools**: The `POOL-XXXX` allocation algorithm.
    - **Cross-Device Sync**: The Logic of `__PERSON_UUID__` metadata fields.
    - **List Membership**: How `_LIST_MEMBERSHIPS_` JSON allows multi-list assignments.
    - **Assignment Flow**: Sequence diagram of "Assign Space" (Clear Old -> Clear Pool -> Assign New).

- **`FEATURE_CONFERENCE_DEEP_DIVE.md`**
    - **Meeting Logic**: How `ConferenceRoom` derives status from `startTime`/`endTime`.
    - **SFTP Extraction**: How rooms are "discovered" in the main CSV via 'C' prefix.

- **`FEATURE_SETTINGS_DEEP_DIVE.md`**
    - **Security**: How credentials are stored (or not stored) in LocalStorage.
    - **Mode Switching**: The architectural impact of switching `SoluM API` <-> `SFTP`.

### Part 3: Architecture & Patterns
- **`ARCH_PATTERNS.md`**
    - **Controller Pattern**: Why we separate `useFeatureController` from UI components.
    - **Vertical Slices**: How `src/features` is organized and rules for cross-slice communication.
    - **Service Abstraction**: The `SyncAdapter` interface pattern.

## 3. Plan of Execution

1.  **Phase 1: Validation (Current)**
    - Validate the standard with the rewritten `PEOPLE_MANAGER.md`.
    - Get user sign-off on depth.

2.  **Phase 2: Core Mechanics**
    - Document `Sync` and `CSV` mechanics first, as they underpin everything.

3.  **Phase 3: Deep Dives**
    - Rewrite `CONFERENCE`, `DASHBOARD`, `SPACES` docs.

4.  **Phase 4: Assembly**
    - Update `APP_NOTEBOOK.md` to reference these new "Deep Dives" instead of the old high-level docs.

## 4. Definition of Done
A document is "Done" when a senior engineer new to the project can read it and:
1.  Understand exactly where to fix a bug in that feature.
2.  Understand the side effects of changing the data model.
3.  Implement a similar feature without violating architectural patterns.
