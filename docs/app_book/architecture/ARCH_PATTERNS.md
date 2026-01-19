# Architecture & Patterns

> **Status**: Living Document
> **Audience**: Developers
> **Focus**: Code Organization & Standards

## 1. Vertical Slice Architecture

We organize code by **Feature**, not by Type.

```text
src/
  features/
    space/           <-- Feature Slice
      application/   <-- Controllers, Use Cases
      domain/        <-- Types, Pure Functions, Validation
      infrastructure/<-- Stores, API Adapters
      presentation/  <-- React Components
    people/
    settings/
  shared/            <-- Cross-Cutting Concerns
```

### 1.1 The Golden Rule of Slices
**A feature must not import from another feature's Infrastructure or Presentation layer.**
- ❌ `import { SpacesTable } from '@features/space/presentation/SpacesTable'` (in People feature)
- ✅ `import { Space } from '@shared/domain/types'`

**Exception**: Controllers may import **Stores** from other features to orchestrate complex flows (e.g., `useSyncController` accesses `spaceStore` and `conferenceStore`), but UI components should remain ignorant.

---

## 2. The Controller Pattern

We strictly separate **View** (UI) from **Model** (Logic) using React Hooks as Controllers.

### 2.1 Anatomy of a Controller
A Controller (`useFeatureController`) is a Hook that returns:
1.  **State**: Derived from Stores (not raw Store state).
2.  **Actions**: Functions that encapsulate business logic.

```typescript
// GOOD Controller
export function useSpaceController() {
    const spaces = useSpacesStore(s => s.spaces); // Select state
    
    // Action encapsulates validation + store update + logging + sync
    const updateSpace = async (id: string, data: any) => {
         logger.info('Updating space', { id });
         if (!validate(data)) throw new Error('Invalid');
         
         updateStore(id, data); // Optimistic
         await syncAdapter.upload(); // Side Effect
    };

    return { spaces, updateSpace };
}
```

### 2.2 View Rules
- Views should **never** import Stores directly.
- Views should **never** contain `fetch` calls or complex logic.
- Views only call functions exposed by the Controller.

---

## 3. The Adapter Pattern (Sync)

We use Adapters to abstract the backend implementation.

- **Interface**: `SyncAdapter` (defined in domain).
- **Implementations**: `SolumSyncAdapter`, `SFTPSyncAdapter`.
- **Consumption**: The Controller requests an adapter (Factory) and calls generic methods (`upload`, `download`).

This allows us to swap the backend (SoluM <-> SFTP) without changing a single line of UI code.

---

## 4. State Management (Zustand)

### 4.1 Granular Stores
Avoid a single "Root Store". Create one store per feature (`spacesStore`, `peopleStore`).

### 4.2 Actions inside Store
Put simple atomic updates inside the store.
Put complex orchestration (calling API + updating Store) in the **Controller**.

---

## 5. Error Handling

- **UI**: Uses Error Boundaries to catch render crashes.
- **Logic**: Controllers should `try/catch` async operations.
    - Log error to `logger`.
    - Notify user via Toast/Alert.
    - Throw error if it blocks critical flow.
