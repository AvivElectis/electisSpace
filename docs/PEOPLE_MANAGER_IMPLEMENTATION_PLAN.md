# People Manager Feature Implementation Plan

Transform space management into a people manager system that allows uploading people data via CSV, allocating available spaces, assigning people to spaces, and posting assignments to AIMS.

## User Review Required

> [!IMPORTANT]
> **Settings-Based Activation**: This feature will be activated via a toggle in the SoluM API mode settings. When enabled, it completely replaces the existing Spaces feature, transforming the `/spaces` route into a People Manager.

> [!WARNING]
> **Feature Replacement**: When the "People Manager Mode" is enabled in SoluM settings:
> - The `/spaces` route will display the People Manager instead of space management
> - All SoluM API implementations will be preserved and reused
> - Navigation will show "People" instead of "Spaces" when toggled on
> - The feature can be toggled off to restore normal space management

**Confirmed Design Decisions:**

1. **Activation**: Toggle switch in SoluM API configuration settings
2. **Route**: Reuses existing `/spaces` route - shows different content based on toggle
3. **CSV Format**: Uses existing SoluM article format via `solumMappingConfig`
4. **Space Count**: Global setting stored in settings store
5. **Assignment Behavior**: Assigns space ID to person and posts as AIMS article
6. **API Preservation**: All existing SoluM service methods (`pushArticles`, `putArticles`, etc.) will be reused


## Proposed Changes

### 1. Settings Configuration

#### [MODIFY] [types.ts](file:///c:/React/electisSpace/src/features/settings/domain/types.ts)

Add people manager toggle to `SettingsData` interface:

```typescript
export interface SettingsData {
    // ... existing fields ...
    
    // People Manager Mode (SoluM API only)
    peopleManagerEnabled?: boolean;  // Toggle to switch to people management mode
    peopleManagerConfig?: {
        totalSpaces: number;  // Total available spaces for assignment
    };
}
```

---

### 2. Domain Layer

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

**CSV Format Specification:**

1. **Delimiter**: Always `;` (semicolon) - matches `solumArticleFormat.delimiter`
2. **Column Order**: Follows `solumArticleFormat.articleData` array exactly
3. **Global Field Exclusion**: Fields defined in `globalFieldAssignments` are excluded from CSV and auto-added when posting to AIMS

**Example**: Given article format:
```json
{
  "delimiter": ";",
  "mappingInfo": {
    "store": "STORE_ID",
    "articleId": "ARTICLE_ID",
    "articleName": "ITEM_NAME"
  },
  "articleData": ["STORE_ID", "ARTICLE_ID", "ITEM_NAME", "ENGLISH_NAME", "RANK"],
  "globalFieldAssignments": { "STORE_ID": "001" }
}
```

**CSV Structure** (STORE_ID excluded because it's global):
```csv
ARTICLE_ID;ITEM_NAME;ENGLISH_NAME;RANK
EMP001;John Doe;John;Senior
EMP002;Jane Smith;Jane;Manager
```

**When posting to AIMS**, STORE_ID is automatically added:
```json
{
  "STORE_ID": "001",  // From global
  "ARTICLE_ID": "EMP001",
  "ITEM_NAME": "John Doe",
  "ENGLISH_NAME": "John",
  "RANK": "Senior"
}
```

**Functions:**

- `parsePeopleCSV(csvContent: string, articleFormat: ArticleFormat): Person[]`
  - Parse CSV using `;` delimiter
  - Extract columns in `articleData` order, excluding global fields
  - Build Person objects with data from non-global fields
  
- `buildArticleData(person: Person, articleFormat: ArticleFormat): Record<string, string>`
  - Merge person data with global field assignments
  - Return complete article data ready for AIMS
  
- `postPersonAssignment(person: Person, config: SolumConfig, token: string, articleFormat: ArticleFormat): Promise<void>`
  - Build article data with global fields
  - Post single person assignment to AIMS using `pushArticles`
  
- `postBulkAssignments(people: Person[], config: SolumConfig, token: string, articleFormat: ArticleFormat): Promise<void>`
  - Build article data for all people with global fields
  - Post multiple assignments as articles using `pushArticles`

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

#### [MODIFY] [SpacesPage.tsx](file:///c:/React/electisSpace/src/features/space/presentation/SpacesPage.tsx)

**Strategy**: Modify `SpacesPage` to conditionally render People Manager UI when `peopleManagerEnabled` is true.

```typescript
export function SpacesPage() {
    const settings = useSettingsStore((state) => state.settings);
    
    // Conditional rendering based on settings toggle
    if (settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API') {
        return <PeopleManagerView />;
    }
    
    // Default: render normal spaces management
    return <SpacesManagementView />;
}
```

#### [NEW] [PeopleManagerView.tsx](file:///c:/React/electisSpace/src/features/people/presentation/PeopleManagerView.tsx)

People manager UI component (extracted from SpacesPage) with:

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

#### [NEW] [SpacesManagementView.tsx](file:///c:/React/electisSpace/src/features/space/presentation/SpacesManagementView.tsx)

**Preserve existing functionality** by extracting current SpacesPage logic into this component.

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

### 5. Settings UI

#### [MODIFY] SoluM Settings Component

Add toggle to SoluM API configuration settings:

```typescript
<FormControlLabel
    control={
        <Switch
            checked={settings.peopleManagerEnabled || false}
            onChange={(e) => updateSettings({ peopleManagerEnabled: e.target.checked })}
        />
    }
    label={t('settings.peopleManager.enable')}
/>

{settings.peopleManagerEnabled && (
    <TextField
        label={t('settings.peopleManager.totalSpaces')}
        type="number"
        value={settings.peopleManagerConfig?.totalSpaces || 0}
        onChange={(e) => updateSettings({
            peopleManagerConfig: {
                totalSpaces: parseInt(e.target.value, 10)
            }
        })}
    />
)}
```

---

### 6. Navigation Updates

#### [MODIFY] Navigation Component (Dynamic Label)

Update navigation label based on people manager toggle:

```typescript
// In navigation component:
const navigationLabel = settings.peopleManagerEnabled 
    ? t('navigation.people') 
    : t('navigation.spaces');
```

**Note**: The `/spaces` route remains unchanged - only the displayed content and navigation label change based on the toggle.

---

### 7. Localization

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

### 8. Integration with Existing Features

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
