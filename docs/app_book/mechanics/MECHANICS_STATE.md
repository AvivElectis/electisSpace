# Core Mechanics: State & Persistence

> **Libraries**: `zustand`, `idb-keyval`
> **Pattern**: Optimistic UI with Background Sync
> **Status**: Production Stable

## 1. State Management Philosophy

`electisSpace` uses **Zustand** for global state management. We prefer detailed, domain-specific stores over a single monolithic store.

### 1.1 The Store Landscape
| Store | Purpose | Persistence | Location |
| :--- | :--- | :--- | :--- |
| `spacesStore` | Physical Spaces & Layout | IndexedDB | `features/space` |
| `peopleStore` | People, Lists, Assignments | IndexedDB | `features/people` |
| `settingsStore` | App Configuration | LocalStorage | `features/settings` |
| `syncStore` | Connection Status, Mode | Session* | `features/sync` |
| `conferenceStore` | Meeting Room Status | IndexedDB | `features/conference` |

> *`syncStore` persists tokens in LocalStorage but resets connection status on boot.

---

## 2. Persistence Layer (`idb-keyval`)

We use **IndexedDB** for data-heavy stores (`spaces`, `people`) because LocalStorage is synchronous and limited to ~5MB. IndexedDB is asynchronous and can handle 10k+ records easily.

### 2.1 Storage Adapter
We implement a custom `StateStorage` adapter for Zustand that bridges to `idb-keyval`.

```typescript
const indexedDBStorage: StateStorage = {
    getItem: async (name) => await idbGet(name) ?? null,
    setItem: async (name, value) => await idbSet(name, value),
    removeItem: async (name) => await idbDel(name),
};
```

### 2.2 Hydration
Zustand handles hydration automatically. Components can check `_hasHydrated` (if configured) or simply render default state until async hydration completes. The UI is designed to be resilient to empty initial states.

---

## 3. Optimistic UI Pattern

To ensure the app feels instant, we use Optimistic Updates for all user actions.

**Example: Assigning a Person**

1.  **User Action**: Drag "John" to "Desk 1".
2.  **Controller**: `usePeopleController.assignSpace("john", "desk-1")`
3.  **Store (Immediate)**:
    - Updates `people` array: `John.assignedSpaceId = "desk-1"`
    - Updates `spaces` array (derived): "Desk 1" is now Occupied.
    - Sets `syncStatus = "pending"`.
    - **UI Re-renders instantly**.
4.  **Background (Async)**:
    - Service calls AIMS API `PUT /articles`.
    - **Success**: Sets `syncStatus = "synced"` (Green checkmark).
    - **Error**: Sets `syncStatus = "error"` (Red exclamation), logs error.

This decoupling means the user never waits for the server.

---

## 4. Cross-Store Communication

Stores do not directly import each other to avoid circular dependencies. Coordination happens in **Controllers** (Application Layer).

**Example**:
- `useSyncController` imports `useSpaceStore` AND `useConferenceStore` to aggregate data for upload.
- Stores trigger *changes*, Controllers orchestrate *processes*.
