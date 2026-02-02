# People Manager Feature

> **Feature Module**: `src/features/people`
> **Primary View**: `PeopleManagerView.tsx`
> **Status**: Production Ready

## 1. Executive Summary

The **People Manager** allows the system to manage individuals ("People") independently of physical spaces. It enables:
- **Virtual Loading**: Importing thousands of people without physical desk assignments.
- **List Management**: Grouping people into named lists (e.g., "HR Dept", "Sales Team").
- **Dynamic Assignment**: Drag-and-drop assignment of people to physical spaces (ESL tags).
- **AIMS Synchronization**: Keeping the SoluM AIMS server in sync with local changes.

Unlike the simple "Space" feature which maps 1:1 to an ESL tag, a "Person" is a virtual entity that *may or may not* have a physical tag assigned.

---

## 2. Core Concepts

### 2.1 Virtual vs. Physical Spaces
- **Physical Space**: A real location with an ESL tag (e.g., "Desk 101"). Mapped to `Space` entity.
- **Virtual Space (Pool)**: A placeholder ID in SoluM AIMS used to store person data when they aren't assigned a desk.
    - Format: `POOL-XXXX`
    - Purpose: Allows uploading people to AIMS so they exist in the system, even without a label.
- **Assignment**: The act of linking a `Person` to a `Physical Space`.
    - *Action*: Updates `assignedSpaceId` on the Person.
    - *Side Effect*: Clears the `POOL-ID` in AIMS and assigns the Person's data to the `Physical Article ID`.

### 2.2 People Lists
People can be organized into lists.
- **Storage**: Lists are stored in AIMS using a special JSON field `_LIST_MEMBERSHIPS_` on each person article.
- **Logic**: A person can belong to multiple lists. In each list, they can have a *different* space assignment (though currently the UI emphasizes a single active assignment).

---

## 3. Architecture & Code Structure

### 3.1 Domain Layer (`domain/`)
Defines the business objects and rules.

#### `Person` Interface (`domain/types.ts`)
```typescript
interface Person {
  id: string;               // Stability UUID
  data: Record<string, any>;// Dynamic fields (Name, Rank, etc.)
  
  // Assignment State
  virtualSpaceId?: string;  // The POOL-ID (if unassigned)
  assignedSpaceId?: string; // The Physical ID (if assigned)
  
  // Sync Meta
  aimsSyncStatus?: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
  
  // List Logic
  listMemberships?: ListMembership[]; // [{ listName: "HR", spaceId: "Desk-1" }]
}
```

#### `PeopleList` Interface
Derived state helper.
```typescript
interface PeopleList {
  id: string;
  name: string;        // "Human Resources"
  storageName: string; // "Human_Resources" (AIMS compatible)
  isFromAIMS: boolean; // True if derived from person data
}
```

### 3.2 Infrastructure Layer (`infrastructure/`)
Handles data persistence and external communication.

#### `peopleStore.ts` (Zustand + IndexedDB)
- **State**: `people` array, `peopleLists` array.
- **Persistence**: Uses `idb-keyval` to store large datasets (10k+ records).
- **Optimistic Updates**: UI updates immediately; Sync status tracks background work.
- **Key Actions**:
    - `setPeople(people)`: Bulk replace.
    - `assignSpace(personId, spaceId)`: update local state.
    - `extractListsFromPeople()`: Scans all people to rebuild the list of available groups.

#### `peopleService.ts`
- **CSV Parser**: Uses `PapaParse` to convert CSV -> `Person[]`.
- **AIMS Integration**:
    - `postPersonAssignment`: Sends single update.
    - `postBulkAssignments`: Batched updates (chunk size: 10).
    - `convertSpacesToPeopleWithVirtualPool`: Transforms SoluM "Articles" into "People", identifying POOL-IDs.

### 3.3 Application Layer (`application/`)
Orchestrates logic via Custom Hooks.

#### `usePeopleController.ts`
The brain of the feature.
- **`loadPeopleFromCSV(file)`**: Reads CSV, generates UUIDs, assigns available POOL-IDs.
- **`assignSpaceToPerson(personId, spaceId)`**:
    1. Checks if person had old space -> Clears it.
    2. Checks if person had POOL-ID -> Clears it.
    3. Updates local store -> `assignedSpaceId`.
    4. Posts new assignment to AIMS.
- **`syncFromAims()`**: Full download from AIMS.
    - Fetches all articles.
    - Rebuilds local state.
    - extracting Lists via `_LIST_MEMBERSHIPS_`.

---

## 4. User Workflows

### 4.1 Importing People
1.  **Selection**: User selects "Import CSV" in People View.
2.  **Parsing**: App reads file using `Settings.SolumArticleFormat` config.
3.  **Pool Allocation**: App checks AIMS for empty `POOL-XXXX` articles to reuse.
4.  **Creation**: New People are created.
5.  **Sync**: Data is pushed to AIMS immediately.

### 4.2 Creating a List
1.  **Filter**: User filters the "All People" view (e.g., by Department).
2.  **Save**: Clicks "Save as List" -> Enters "Engineering".
3.  **Persist**: The list name "Engineering" is added to `_LIST_MEMBERSHIPS_` for every person in view.
4.  **Sync**: Updated people are pushed to AIMS.

### 4.3 Assigning a Desk
1.  **Drag & Drop**: User drags "John Doe" onto "Desk 101".
2.  **Optimistic UI**: "Desk 101" turns Green/Occupied immediately.
3.  **Background Sync**:
    - `DELETE /articles/POOL-123` (Clear old virtual space)
    - `PUT /articles/Desk-101` (Write John's data)
4.  **Completion**: Sync icon turns checkmark.

---

## 5. Deployment & Configuration Config

### Settings Required (`features/settings`)
For this feature to work, the following **must** be configured:
1.  **SoluM Config**: Valid URL, Company, Store, User/Pass.
2.  **Article Format**: JSON defintion of custom fields (e.g., `N_ITEM_NAME`, `N_RANK`).
3.  **CSV Mapping**: Which CSV column maps to which field.

### Feature Flags
- `peopleManagerConfig.totalSpaces`: Defines the "Universe" size for occupancy stats.
