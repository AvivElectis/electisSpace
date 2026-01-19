# Internal API Reference

> **Guide to the internal hooks and services used within `electisSpace`.**

## Controller Hooks
The primary interface for features to interact with business logic.

### `useSpaceController`
Manages space entities.
- **`addSpace(space: Partial<Space>): Promise<void>`**
  Adds a new space and triggers sync.
- **`updateSpace(id: string, updates: Partial<Space>): Promise<void>`**
  Updates an existing space. Validates ID uniqueness.
- **`deleteSpace(id: string): Promise<void>`**
  Deletes a space.
- **`fetchFromSolum(): Promise<void>`**
  Manually triggers a download from SoluM AIMS.

### `usePeopleController`
Manages people entities and assignments.
- **`importPeople(people: Person[]): Promise<void>`**
  Bulk imports people (usually from CSV).
- **`assignPerson(personId: string, spaceId: string): Promise<void>`**
  Assigns a person to a physical space.
- **`unassignPerson(personId: string): Promise<void>`**
  Removes assignment.

### `useSyncController`
Orchestrates background synchronization.
- **`triggerSync(): Promise<void>`**
  Manual trigger.
- **`status: SyncState`**
  Current status (idle/syncing/error).

## Shared Services

### `SolumService`
Low-level wrapper for SoluM AIMS API calls.
- `login(config)`
- `refreshToken(refreshToken)`
- `fetchArticles(page, size)`
- `pushArticles(articles)`

### `CSVService`
- `parseCSVEnhanced(content, config)`
- `generateCSVEnhanced(spaces, config)`
- `extractHeadersFromCSV(content)`
