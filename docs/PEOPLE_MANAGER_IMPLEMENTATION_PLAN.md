# People Manager Feature Implementation Plan

Transform space management into a people manager system that allows uploading people data via CSV, allocating available spaces, assigning people to spaces, and posting assignments to AIMS.

## User Review Required

> [!IMPORTANT]
> **Major Architecture Change**: This feature transforms the space management concept from managing spaces to managing people and their space assignments. The existing `/spaces` route and navigation will be repurposed for people management.

> [!WARNING]
> **Breaking Change**: The current "Spaces" page will be replaced with "People Manager". If you need to preserve existing space management functionality, please specify before proceeding.

**Design Questions for User Review:**

1. **Route & Navigation**: Should the people manager replace the existing `/spaces` route, or should it be a new route (e.g., `/people`)?
2. **Data Separation**: Should people data be stored separately from spaces data, or should we repurpose the existing spaces store?
3. **CSV Format**: Should the CSV format match the existing SoluM article format exactly, or do we need custom field mapping?
4. **Space Count**: Should the space count be a global setting (in settings store) or per-list configuration?
5. **Assignment Behavior**: When assigning a space to a person, should it:
   - Create a new AIMS article for that person?
   - Update an existing article with space assignment?
   - Both (configurable)?

## Proposed Changes

### 1. Domain Layer

#### [NEW] [types.ts](file:///c:/React/electisSpace/src/features/people/domain/types.ts)

New domain types for people management:

```typescript
export interface Person {
    id: string;  // Unique person identifier
    data: Record<string, string>;  // Dynamic fields from CSV (name, department, etc.)
    assignedSpaceId?: string;  // Optional space assignment
}

export interface PeopleList {
    id: string;
    name: string;
    createdAt: string;
    updatedAt?: string;
    people: Person[];
    spaceCount?: number;  // Number of available spaces for this list
}

export interface SpaceAllocation {
    totalSpaces: number;  // Total available spaces
    assignedSpaces: number;  // Number of spaces currently assigned
    availableSpaces: number;  // Calculated: totalSpaces - assignedSpaces
}
```

---

### 2. Infrastructure Layer

#### [NEW] [peopleStore.ts](file:///c:/React/electisSpace/src/features/people/infrastructure/peopleStore.ts)

Zustand store for people management (similar to `spacesStore.ts`):

- State: `people: Person[]`, `peopleLists: PeopleList[]`, `activeListId?: string`, `spaceAllocation: SpaceAllocation`
- Actions:
  - `setPeople(people: Person[])`
  - `addPerson(person: Person)`
  - `updatePerson(id: string, updates: Partial<Person>)`
  - `deletePerson(id: string)`
  - `assignSpace(personId: string, spaceId: string)`
  - `unassignSpace(personId: string)`
  - `addPeopleList(list: PeopleList)`
  - `updatePeopleList(id: string, list: PeopleList)`
  - `deletePeopleList(id: string)`
  - `loadPeopleList(id: string)`
  - `setSpaceAllocation(allocation: SpaceAllocation)`

#### [NEW] [peopleService.ts](file:///c:/React/electisSpace/src/features/people/infrastructure/peopleService.ts)

Service for CSV parsing and AIMS integration:

- `parsePeopleCSV(csvContent: string, config: SolumMappingConfig): Person[]` - Parse CSV using SoluM article format
- `postPersonAssignment(person: Person, config: SolumConfig, token: string): Promise<void>` - Post single person assignment to AIMS
- `postBulkAssignments(people: Person[], config: SolumConfig, token: string): Promise<void>` - Post multiple assignments as articles

---

### 3. Application Layer

#### [NEW] [usePeopleController.ts](file:///c:/React/electisSpace/src/features/people/application/usePeopleController.ts)

Controller hook for people management logic (similar to `useSpaceController.ts`):

- `loadPeopleFromCSV(file: File)` - Handle CSV upload and parsing
- `assignSpaceToPerson(personId: string, spaceId: string)` - Assign space and optionally post to AIMS
- `bulkAssignSpaces(assignments: Array<{personId: string, spaceId: string}>)` - Bulk assign with AIMS posting
- `savePeopleList(name: string)` - Save current people as a list
- `updateCurrentList()` - Update the active list
- `loadList(listId: string)` - Load a saved list
- `deleteList(listId: string)` - Delete a saved list
- `setTotalSpaces(count: number)` - Configure total available spaces

#### [NEW] [usePeopleFilters.ts](file:///c:/React/electisSpace/src/features/people/application/usePeopleFilters.ts)

Filter and search logic for people list:

- Filter by assignment status (assigned/unassigned)
- Search by name or other dynamic fields
- Sort by various criteria

---

### 4. Presentation Layer

#### [NEW] [PeoplePage.tsx](file:///c:/React/electisSpace/src/features/people/presentation/PeoplePage.tsx)

Main people manager page with:

1. **CSV Upload Section**:
   - File upload button
   - Upload progress indicator
   - Validation and error display

2. **Space Allocation Panel**:
   - Input field for total spaces count
   - Display: "X of Y spaces assigned"
   - Visual progress bar

3. **People List Table**:
   - Dynamic columns based on SoluM mapping config
   - Assignment status column
   - Assigned space ID column
   - Actions: Edit, Assign/Unassign space, Delete

4. **List Management Toolbar**:
   - Save current list button
   - Load list dropdown
   - Update current list button
   - Delete list button

5. **Bulk Actions Toolbar**:
   - Select all/none
   - Bulk assign spaces (auto-increment IDs)
   - Bulk post to AIMS

#### [NEW] [PersonDialog.tsx](file:///c:/React/electisSpace/src/features/people/presentation/PersonDialog.tsx)

Dialog for editing person details and space assignment:

- Dynamic form fields based on SoluM mapping
- Space assignment selector
- Post to AIMS checkbox
- Save/Cancel actions

#### [NEW] [CSVUploadDialog.tsx](file:///c:/React/electisSpace/src/features/people/presentation/CSVUploadDialog.tsx)

CSV upload dialog:

- Drag-and-drop file upload
- File validation
- Preview of parsed data
- Import confirmation

---

### 5. Routing & Navigation

#### [MODIFY] [AppRoutes.tsx](file:///c:/React/electisSpace/src/AppRoutes.tsx)

Add new people manager route:

```typescript
const PeoplePage = lazy(() =>
    import('@features/people/presentation/PeoplePage').then(m => ({ default: m.PeoplePage }))
);

// In Routes:
<Route path="/people" element={<PeoplePage />} />
```

#### [MODIFY] Navigation/Menu Components

Update navigation to include "People Manager" link (exact component TBD based on current nav implementation).

---

### 6. Localization

#### [MODIFY] [en.json](file:///c:/React/electisSpace/src/locales/en/en.json)
#### [MODIFY] [he.json](file:///c:/React/electisSpace/src/locales/he/he.json)

Add translations for:
- People manager page title and descriptions
- CSV upload instructions
- Space allocation labels
- Assignment status labels
- List management actions
- Error messages and validation

---

### 7. Integration with Existing Features

#### Settings Integration

Use existing `solumMappingConfig` from settings for CSV parsing - no changes needed to settings structure.

#### SoluM Service Integration

Leverage existing `pushArticles` and `putArticles` methods in `solumService.ts` for posting assignments to AIMS.

---

## Verification Plan

### Automated Tests

1. **Domain Types Test**:
   ```bash
   # Create: src/features/people/domain/types.test.ts
   npm test -- people/domain/types.test.ts
   ```
   - Verify Person and PeopleList type structure

2. **People Store Test**:
   ```bash
   # Create: src/features/people/infrastructure/peopleStore.test.ts
   npm test -- people/infrastructure/peopleStore.test.ts
   ```
   - Test store actions (add, update, delete, assign space)
   - Test list management (save, load, update, delete)
   - Test space allocation calculations

3. **People Service Test**:
   ```bash
   # Create: src/features/people/infrastructure/peopleService.test.ts
   npm test -- people/infrastructure/peopleService.test.ts
   ```
   - Test CSV parsing with mock SoluM format data
   - Mock AIMS API calls for posting assignments

### Manual Verification

1. **CSV Upload Flow**:
   - Navigate to `/people` page
   - Upload a CSV file with people data in SoluM article format
   - Verify people are parsed and displayed in table
   - Verify dynamic columns match SoluM mapping config

2. **Space Allocation**:
   - Set total spaces to 10
   - Verify "0 of 10 spaces assigned" is displayed
   - Assign spaces to 5 people
   - Verify "5 of 10 spaces assigned" is displayed

3. **Person Assignment**:
   - Click "Assign Space" on a person row
   - Enter a space ID (e.g., "101")
   - Enable "Post to AIMS" checkbox
   - Save and verify:
     - Person row shows assigned space
     - AIMS receives article with person data (check AIMS dashboard)

4. **Bulk Assignment**:
   - Select multiple unassigned people
   - Click "Bulk Assign" with starting space ID "201"
   - Verify each person gets sequential space ID (201, 202, 203, etc.)
   - Verify all assignments posted to AIMS

5. **List Management**:
   - After uploading and assigning spaces, click "Save List"
   - Enter list name "Team A Assignments"
   - Click "Load List" and select "Team A Assignments"
   - Verify people data is restored
   - Modify assignments and click "Update List"
   - Reload list and verify updates persisted

6. **Filter & Search**:
   - Use search bar to filter people by name
   - Filter by assignment status (assigned/unassigned)
   - Verify table updates correctly

### Browser Testing

The application is already running (`npm run dev`), so verification can be done by:

1. Opening browser to `http://localhost:5173` (or configured port)
2. Following manual verification steps above
3. Checking browser console for errors
4. Verifying AIMS API calls in Network tab

### Integration with AIMS

Verify AIMS articles are created correctly by:

1. Logging into AIMS web interface
2. Navigate to articles for the configured store
3. Verify article data matches person data from CSV
4. Verify space assignments are reflected in article fields
