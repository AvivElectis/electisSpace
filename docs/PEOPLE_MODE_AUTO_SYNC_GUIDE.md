# 🎯 Auto-Sync People Mode Implementation Guide

**Date:** 2025-12-30  
**Project:** electisSpace  
**Feature:** Auto-Sync People Mode with Virtual Pool IDs

---

## ⚠️ **Predicted Problems & Solutions**

This section documents issues identified during code analysis that must be addressed during implementation.

### **Problem 1: Person Type Missing `virtualSpaceId`**
- **Current**: `Person` interface in `src/features/people/domain/types.ts` has `id`, `data`, `assignedSpaceId`
- **Required**: Need to add `virtualSpaceId` field
- **Impact**: Breaking change - need to migrate existing stored data

**Solution**: Add `virtualSpaceId` as optional initially, derive from `assignedSpaceId` or generate POOL-ID on load

### **Problem 2: Person ID Generation Collision**
- **Current**: `peopleService.ts` generates IDs as `person-${Date.now()}-${index}` (not UUID)
- **Current**: `convertSpacesToPeople()` generates IDs as `aims-${space.id}-${index}`
- **Impact**: IDs are NOT stable across devices/imports

**Solution**: Use `uuid` (already installed) for all new person IDs, extract `__PERSON_UUID__` from AIMS metadata

### **Problem 3: Module-Level State in virtualPoolService**
- **Issue**: `let poolCounter = 1` is module-level state, not persisted
- **Impact**: Counter resets on page reload, causing duplicate POOL-IDs

**Solution**: Initialize counter from existing pool IDs on every call OR persist in store

### **Problem 4: `useSyncController` Architecture Constraint**
- **Issue**: `useSyncController` is a React hook that takes `onSpaceUpdate` callback
- **Current Flow**: `sync()` → downloads spaces → calls `onSpaceUpdate(spaces)` (parent component handles)
- **Impact**: Cannot directly call `usePeopleStore` inside the hook without breaking React rules

**Solution**: Pass `onPeopleUpdate` callback OR handle people conversion in `onSpaceUpdate` in parent (`MainLayout.tsx`)

### **Problem 5: Circular Import Risk**
- **Issue**: `useSyncController` → `peopleService` → may import from settings/sync
- **Impact**: Potential circular dependency causing runtime errors

**Solution**: Keep `convertSpacesToPeopleWithVirtualPool` in `peopleService.ts`, call from MainLayout's `onSpaceUpdate`

### **Problem 6: People Mode Settings Structure**
- **Current**: `settings.peopleManagerConfig?.enabled` does not exist
- **Exists**: `settings.peopleManagerEnabled` (boolean) and `settings.peopleManagerConfig?.totalSpaces`
- **Impact**: Guide code references wrong property

**Solution**: Use `settings.peopleManagerEnabled` instead

### **Problem 7: Missing `enabled` in `peopleManagerConfig`**
- **Current Type**:
  ```typescript
  peopleManagerConfig?: {
      totalSpaces: number;
  };
  ```
- **Impact**: No `enabled` property in config

**Solution**: Use existing `settings.peopleManagerEnabled` flag

### **Problem 8: UUID Already Installed**
- **Status**: ✅ `uuid` (v13.0.0) and `@types/uuid` (v10.0.0) already in package.json
- **No action needed**

---

## **Problem Statement**

Current issue: People without assigned spaces cannot be synced to SoluM AIMS because:
- SoluM is **space-centric** (articles are identified by article IDs)
- `person.id` is auto-generated locally and not recognized by SoluM
- No way to track people cross-device without a dedicated server

## **Solution: Virtual Pool + Metadata Approach**

### **Core Concepts**

1. **Virtual Pool IDs**: Unassigned people get `POOL-0001`, `POOL-0002`, etc.
2. **Metadata in Articles**: Store `__PERSON_UUID__`, `__VIRTUAL_SPACE__` in article data
3. **Auto-Sync**: Leverage existing `useSyncController` auto-sync (every 5 minutes)
4. **Cross-Device Sync**: SoluM AIMS acts as the sync bridge (no dedicated server)

---

## **Implementation Plan**

### **Total Estimate: 18-24 hours**

| Phase | Duration | Description |
|-------|----------|-------------|
| 1 | 1h | ~~Remove manual sync buttons~~ → Keep sync button, it triggers fetch from AIMS |
| 2 | 3-4h | Auto-sync on mode activation |
| 3 | 3-4h | Virtual pool ID service |
| 4 | 2-3h | Integrate with existing auto-sync (download) |
| 5 | 2h | Initial sync on mode activation |
| 6 | 2-3h | UI updates & indicators |
| 7 | 1h | Settings & i18n |
| **8** | **3-4h** | **Immediate sync on all people actions (NEW)** |

---

## **Phase 8: Immediate Sync on People Actions (CRITICAL)**

> ⚠️ This is the most important phase for real-time sync. All CRUD operations on people must immediately sync to AIMS.

### **Current Behavior Analysis**

The existing `usePeopleController.ts` already has **immediate sync for most actions**:

| Action | Current Behavior | Needs Change? |
|--------|------------------|---------------|
| `assignSpaceToPerson()` | ✅ Auto-posts to AIMS immediately | No - but needs POOL-ID support |
| `bulkAssignSpaces()` | ✅ Auto-posts to AIMS immediately | No - but needs POOL-ID support |
| `unassignSpaceWithAims()` | ✅ Clears space in AIMS immediately | No |
| `cancelAllAssignments()` | ✅ Posts empty data to AIMS | No |
| `loadList()` | ✅ Clears old spaces, posts new | No |
| `addPerson()` | ❌ Local only (store action) | **YES - needs sync** |
| `updatePerson()` | ❌ Local only (store action) | **YES - needs sync** |
| `deletePerson()` | ❌ Local only (store action) | **YES - needs sync** |
| `loadPeopleFromCSV()` | ❌ Local only | **YES - needs bulk sync** |

### **Manual Sync Button Behavior**

The `SyncStatusIndicator` has a manual sync button that calls `sync()`:
- **Location**: [MainLayout.tsx#L220](../src/shared/presentation/layouts/MainLayout.tsx#L220)
- **Current**: `onSyncClick={() => sync().catch(() => {})}` 
- **Behavior**: Downloads data from AIMS → updates spaces store → (NEW) should also update people store

**This is the "fetch from AIMS" behavior you want to keep.**

---

### **File: `src/features/people/application/usePeopleController.ts` (MODIFY)**

Replace the store action pass-throughs with wrapped functions that sync to AIMS:

```typescript
/**
 * Add a new person with immediate AIMS sync
 * Assigns a virtual pool ID and syncs to AIMS
 */
const addPersonWithSync = useCallback(async (personData: Omit<Person, 'id' | 'virtualSpaceId'>): Promise<Person> => {
    try {
        // Generate stable UUID
        const personId = uuidv4();
        
        // Get existing pool IDs from current people
        const existingPoolIds = new Set(
            peopleStore.people
                .filter(p => p.virtualSpaceId && isPoolId(p.virtualSpaceId))
                .map(p => p.virtualSpaceId!)
        );
        
        // Get next pool ID
        const virtualSpaceId = getNextPoolId(existingPoolIds);
        
        const newPerson: Person = {
            id: personId,
            virtualSpaceId,
            ...personData,
            aimsSyncStatus: 'pending',
        };
        
        // Add to local store
        peopleStore.addPerson(newPerson);
        
        logger.info('PeopleController', 'Adding person with AIMS sync', { personId, virtualSpaceId });
        
        // Sync to AIMS immediately
        if (settings.solumConfig?.tokens && settings.peopleManagerEnabled) {
            try {
                const article = buildArticleDataWithMetadata(newPerson, settings.solumMappingConfig);
                await pushArticles(
                    settings.solumConfig,
                    settings.solumConfig.storeNumber,
                    settings.solumConfig.tokens.accessToken,
                    [article]
                );
                peopleStore.updateSyncStatus([personId], 'synced');
                logger.info('PeopleController', 'Person synced to AIMS', { personId });
            } catch (syncError: any) {
                peopleStore.updateSyncStatus([personId], 'error');
                logger.error('PeopleController', 'Failed to sync person to AIMS', { error: syncError.message });
                // Don't throw - person is saved locally, sync can retry later
            }
        }
        
        return newPerson;
    } catch (error: any) {
        logger.error('PeopleController', 'Failed to add person', { error: error.message });
        throw error;
    }
}, [peopleStore, settings.solumConfig, settings.solumMappingConfig, settings.peopleManagerEnabled]);

/**
 * Update person with immediate AIMS sync
 */
const updatePersonWithSync = useCallback(async (
    personId: string, 
    updates: Partial<Person>
): Promise<void> => {
    try {
        // Update local store first
        peopleStore.updatePerson(personId, updates);
        
        const person = peopleStore.people.find(p => p.id === personId);
        if (!person) {
            throw new Error('Person not found after update');
        }
        
        logger.info('PeopleController', 'Updating person with AIMS sync', { personId });
        
        // Sync to AIMS immediately
        if (settings.solumConfig?.tokens && settings.peopleManagerEnabled) {
            peopleStore.updateSyncStatus([personId], 'pending');
            
            try {
                const article = buildArticleDataWithMetadata(person, settings.solumMappingConfig);
                await pushArticles(
                    settings.solumConfig,
                    settings.solumConfig.storeNumber,
                    settings.solumConfig.tokens.accessToken,
                    [article]
                );
                peopleStore.updateSyncStatus([personId], 'synced');
                logger.info('PeopleController', 'Person update synced to AIMS', { personId });
            } catch (syncError: any) {
                peopleStore.updateSyncStatus([personId], 'error');
                logger.error('PeopleController', 'Failed to sync person update to AIMS', { error: syncError.message });
            }
        }
    } catch (error: any) {
        logger.error('PeopleController', 'Failed to update person', { error: error.message });
        throw error;
    }
}, [peopleStore, settings.solumConfig, settings.solumMappingConfig, settings.peopleManagerEnabled]);

/**
 * Delete person with immediate AIMS sync
 * Clears the person's virtual space in AIMS by posting empty data
 */
const deletePersonWithSync = useCallback(async (personId: string): Promise<void> => {
    try {
        const person = peopleStore.people.find(p => p.id === personId);
        if (!person) {
            throw new Error('Person not found');
        }
        
        const virtualSpaceId = person.virtualSpaceId || person.assignedSpaceId;
        
        logger.info('PeopleController', 'Deleting person with AIMS sync', { personId, virtualSpaceId });
        
        // Clear from AIMS first (if connected)
        if (settings.solumConfig?.tokens && settings.peopleManagerEnabled && virtualSpaceId) {
            try {
                await clearSpaceInAims(
                    virtualSpaceId,
                    person,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );
                logger.info('PeopleController', 'Person cleared from AIMS', { personId, virtualSpaceId });
            } catch (syncError: any) {
                logger.error('PeopleController', 'Failed to clear person from AIMS', { error: syncError.message });
                // Continue with local delete even if AIMS fails
            }
        }
        
        // Delete from local store
        peopleStore.deletePerson(personId);
        logger.info('PeopleController', 'Person deleted locally', { personId });
    } catch (error: any) {
        logger.error('PeopleController', 'Failed to delete person', { error: error.message });
        throw error;
    }
}, [peopleStore, settings.solumConfig, settings.solumMappingConfig, settings.peopleManagerEnabled]);

/**
 * Load people from CSV with immediate bulk sync to AIMS
 */
const loadPeopleFromCSVWithSync = useCallback(async (file: File): Promise<void> => {
    try {
        logger.info('PeopleController', 'Loading CSV with AIMS sync', { filename: file.name });
        
        if (!settings.solumArticleFormat) {
            throw new Error('SoluM article format not configured');
        }
        
        // Get existing pool IDs
        const existingPoolIds = new Set(
            peopleStore.people
                .filter(p => p.virtualSpaceId && isPoolId(p.virtualSpaceId))
                .map(p => p.virtualSpaceId!)
        );
        
        const csvContent = await file.text();
        const people = parsePeopleCSV(
            csvContent, 
            settings.solumArticleFormat, 
            settings.solumMappingConfig,
            existingPoolIds  // Pass for collision avoidance
        );
        
        // Set all as pending
        const pendingPeople = people.map(p => ({ ...p, aimsSyncStatus: 'pending' as const }));
        peopleStore.setPeople(pendingPeople);
        
        logger.info('PeopleController', 'CSV loaded, syncing to AIMS', { count: people.length });
        
        // Bulk sync to AIMS
        if (settings.solumConfig?.tokens && settings.peopleManagerEnabled && people.length > 0) {
            try {
                const articles = people.map(p => buildArticleDataWithMetadata(p, settings.solumMappingConfig));
                
                // Batch in chunks of 50 to avoid API limits
                const BATCH_SIZE = 50;
                for (let i = 0; i < articles.length; i += BATCH_SIZE) {
                    const batch = articles.slice(i, i + BATCH_SIZE);
                    await pushArticles(
                        settings.solumConfig,
                        settings.solumConfig.storeNumber,
                        settings.solumConfig.tokens.accessToken,
                        batch
                    );
                    
                    // Update sync status for this batch
                    const batchIds = people.slice(i, i + BATCH_SIZE).map(p => p.id);
                    peopleStore.updateSyncStatus(batchIds, 'synced');
                    
                    logger.info('PeopleController', 'Batch synced to AIMS', { 
                        batch: Math.floor(i / BATCH_SIZE) + 1,
                        total: Math.ceil(articles.length / BATCH_SIZE)
                    });
                }
                
                logger.info('PeopleController', 'CSV sync to AIMS complete', { count: people.length });
            } catch (syncError: any) {
                peopleStore.updateSyncStatus(people.map(p => p.id), 'error');
                logger.error('PeopleController', 'Failed to sync CSV to AIMS', { error: syncError.message });
                // Don't throw - data is saved locally
            }
        }
    } catch (error: any) {
        logger.error('PeopleController', 'Failed to load CSV', { error: error.message });
        throw error;
    }
}, [peopleStore, settings.solumArticleFormat, settings.solumMappingConfig, settings.solumConfig, settings.peopleManagerEnabled]);
```

**Update the return statement:**
```typescript
return {
    // ... existing
    
    // Store actions - REPLACED with sync versions
    addPerson: addPersonWithSync,      // Was: peopleStore.addPerson
    updatePerson: updatePersonWithSync, // Was: peopleStore.updatePerson
    deletePerson: deletePersonWithSync, // Was: peopleStore.deletePerson
    
    // CSV import - REPLACED with sync version
    loadPeopleFromCSV: loadPeopleFromCSVWithSync,  // Was: loadPeopleFromCSV
    
    // ... rest unchanged
};
```

---

### **Required Imports for Phase 8**

Add to `usePeopleController.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { getNextPoolId, isPoolId } from '../infrastructure/virtualPoolService';
import { buildArticleDataWithMetadata } from '../infrastructure/peopleService';
import { pushArticles } from '@shared/infrastructure/services/solumService';
```

---

## **Phase 4 (Updated): Bidirectional Sync - Download & Upload**

The sync system has two directions:

### **Direction 1: UPLOAD (Local → AIMS)**
Happens **immediately** on any people action (Phase 8):
- Add person → POST to AIMS with POOL-ID
- Edit person → POST updated data to AIMS
- Delete person → POST empty data to clear virtual space
- Assign/unassign → Already implemented

### **Direction 2: DOWNLOAD (AIMS → Local)**
Happens on:
1. **Manual sync button click** (SyncStatusIndicator)
2. **Auto-sync timer** (every 5 minutes)
3. **App startup** (if People Mode enabled)

### **File: `src/shared/presentation/layouts/MainLayout.tsx` (MODIFY)**

Update the `onSpaceUpdate` callback to also update people when in People Mode:

**Add imports:**
```typescript
import { convertSpacesToPeopleWithVirtualPool } from '@features/people/infrastructure/peopleService';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import type { Person } from '@features/people/domain/types';
```

**Add people store hooks:**
```typescript
// Inside MainLayout component, near other hooks
const setPeople = usePeopleStore(state => state.setPeople);
const localPeople = usePeopleStore(state => state.people);
```

**Create enhanced space update handler:**
```typescript
// Replace the simple setSpaces with this enhanced handler
const handleSpaceUpdate = useCallback((spaces: Space[]) => {
    // Always update spaces store (existing behavior)
    setSpaces(spaces);
    
    // If People Mode is enabled, also convert and update people store
    if (settings.peopleManagerEnabled) {
        logger.info('MainLayout', 'People Mode active - converting downloaded spaces to people');
        
        const aimsPeople = convertSpacesToPeopleWithVirtualPool(
            spaces,
            settings.solumMappingConfig
        );
        
        // Merge strategy: AIMS wins for synced, local wins for pending
        const mergedPeople = mergeWithConflictResolution(localPeople, aimsPeople);
        setPeople(mergedPeople);
        
        logger.info('MainLayout', 'People store updated from AIMS', {
            downloaded: aimsPeople.length,
            local: localPeople.length,
            merged: mergedPeople.length
        });
    }
}, [setSpaces, setPeople, settings.peopleManagerEnabled, settings.solumMappingConfig, localPeople]);

/**
 * Merge local and remote people with conflict resolution
 */
function mergeWithConflictResolution(local: Person[], aims: Person[]): Person[] {
    const merged = new Map<string, Person>();
    
    // Add AIMS data first (source of truth for synced items)
    aims.forEach(person => merged.set(person.id, person));
    
    // Overlay local pending changes (local wins if not yet synced)
    local.forEach(person => {
        const existing = merged.get(person.id);
        
        if (person.aimsSyncStatus === 'pending') {
            merged.set(person.id, person);  // Keep local pending changes
        } else if (person.aimsSyncStatus === 'error') {
            merged.set(person.id, person);  // Keep errored items for retry
        } else if (!existing) {
            merged.set(person.id, person);  // New local person not in AIMS
        }
        // else: AIMS version is used (already in merged)
    });
    
    return Array.from(merged.values());
}
```

**Update useSyncController call:**
```typescript
const syncController = useSyncController({
    sftpCredentials: settings.sftpCredentials,
    solumConfig: settings.solumConfig,
    csvConfig: settings.sftpCsvConfig as any,
    autoSyncEnabled: settings.autoSyncEnabled,
    onSpaceUpdate: handleSpaceUpdate,  // Changed from setSpaces
    solumMappingConfig: settings.solumMappingConfig,
});
```

---

## **Sync Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYNC FLOWS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UPLOAD (Immediate)                                │   │
│  │                                                                      │   │
│  │  User Action (add/edit/delete/assign)                               │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  usePeopleController                                                 │   │
│  │       │                                                              │   │
│  │       ├──► Update local store                                        │   │
│  │       │                                                              │   │
│  │       └──► POST to AIMS immediately (pushArticles)                   │   │
│  │                  │                                                   │   │
│  │                  ▼                                                   │   │
│  │           Update syncStatus ('synced' or 'error')                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DOWNLOAD (Manual/Auto)                            │   │
│  │                                                                      │   │
│  │  Trigger: Manual Sync Button OR Auto-sync Timer (5 min)             │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  useSyncController.sync()                                            │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  Download articles from AIMS                                         │   │
│  │       │                                                              │   │
│  │       ▼                                                              │   │
│  │  onSpaceUpdate(spaces) callback                                      │   │
│  │       │                                                              │   │
│  │       ├──► Update spaces store                                       │   │
│  │       │                                                              │   │
│  │       └──► If peopleManagerEnabled:                                  │   │
│  │                 │                                                    │   │
│  │                 ├──► Convert spaces to people                        │   │
│  │                 │                                                    │   │
│  │                 └──► Merge with local (preserve pending)             │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │                      Update people store                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## **Phase 3: Virtual Pool Service (START HERE)**

> ⚠️ **FIX**: Changed to NOT use module-level state - counter is derived from existing IDs each time

```typescript
import { logger } from '@shared/infrastructure/services/logger';

const POOL_PREFIX = 'POOL-';

export interface VirtualPoolConfig {
  prefix: string;
  startIndex: number;
  maxPoolSize: number;
}

const defaultConfig: VirtualPoolConfig = {
  prefix: POOL_PREFIX,
  startIndex: 1,
  maxPoolSize: 9999,
};

/**
 * Get next available pool ID
 * NOTE: Counter is derived from existingPoolIds each call to avoid state persistence issues
 */
export function getNextPoolId(
  existingPoolIds: Set<string>, 
  config: VirtualPoolConfig = defaultConfig
): string {
  // Derive counter from existing IDs (no module-level state)
  const poolNumbers = Array.from(existingPoolIds)
    .filter(id => isPoolId(id, config))
    .map(id => parseInt(id.replace(config.prefix, ''), 10))
    .filter(n => !isNaN(n));
  
  let counter = poolNumbers.length > 0 ? Math.max(...poolNumbers) + 1 : config.startIndex;
  let candidate: string;
  
  do {
    candidate = `${config.prefix}${String(counter).padStart(4, '0')}`;
    counter++;
    
    if (counter > config.maxPoolSize) {
      counter = config.startIndex;
    }
  } while (existingPoolIds.has(candidate));
  
  logger.debug('VirtualPoolService', 'Generated pool ID', { candidate, existingCount: existingPoolIds.size });
  
  return candidate;
}

/**
 * Check if article ID is a pool ID
 */
export function isPoolId(
  articleId: string, 
  config: VirtualPoolConfig = defaultConfig
): boolean {
  return articleId.startsWith(config.prefix);
}

/**
 * Generate multiple pool IDs at once (for bulk import)
 */
export function generatePoolIds(
  count: number,
  existingPoolIds: Set<string>,
  config: VirtualPoolConfig = defaultConfig
): string[] {
  const generated: string[] = [];
  const allIds = new Set(existingPoolIds);
  
  for (let i = 0; i < count; i++) {
    const newId = getNextPoolId(allIds, config);
    generated.push(newId);
    allIds.add(newId);
  }
  
  return generated;
}
```

---

## **Phase 3B: Update Person Type**

### **File: `src/features/people/domain/types.ts` (MODIFY)**

> ⚠️ **FIX**: Made `virtualSpaceId` optional for backward compatibility with existing data

```typescript
export interface Person {
  id: string;  // UUID - stable across devices (use uuid v4)
  virtualSpaceId?: string;  // POOL-XXXX or physical space ID (optional for migration)
  assignedSpaceId?: string;  // Physical space ID (undefined if in pool)
  data: Record<string, string>;
  aimsSyncStatus?: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
}

// Helper to get effective virtualSpaceId (for backward compatibility)
export function getVirtualSpaceId(person: Person): string {
  return person.virtualSpaceId || person.assignedSpaceId || person.id;
}
```

---

## **Phase 3C: Update peopleService.ts**

### **File: `src/features/people/infrastructure/peopleService.ts` (MODIFY)**

> ⚠️ **FIX**: Removed `initializePoolCounter()` call - function was removed. Using `v4 as uuidv4` import.

**Add imports:**
```typescript
import { v4 as uuidv4 } from 'uuid';
import { getNextPoolId, isPoolId, generatePoolIds } from './virtualPoolService';
```

**Add new function:**
```typescript
/**
 * Convert spaces to people with virtual pool assignment
 * Used for syncing FROM AIMS with cross-device metadata support
 */
export function convertSpacesToPeopleWithVirtualPool(
  spaces: Array<{ id: string; data: Record<string, string>; labelCode?: string }>,
  mappingConfig?: SolumMappingConfig
): Person[] {
  logger.info('PeopleService', 'Converting spaces with virtual pool', { 
    count: spaces.length 
  });
  
  const people: Person[] = [];
  const existingPoolIds = new Set<string>();
  
  // First pass: identify existing pool IDs
  spaces.forEach(space => {
    if (isPoolId(space.id)) {
      existingPoolIds.add(space.id);
    }
  });
  
  // Second pass: convert to people
  spaces.forEach(space => {
    // Extract metadata from AIMS (if present)
    const personId = space.data['__PERSON_UUID__'] || uuidv4();
    const virtualSpaceId = space.data['__VIRTUAL_SPACE__'] || space.id;
    
    // Clean data (remove metadata fields starting with __)
    const cleanData: Record<string, string> = {};
    Object.entries(space.data).forEach(([key, value]) => {
      if (!key.startsWith('__')) {
        cleanData[key] = value;
      }
    });
    
    // Check if has meaningful data (skip empty articles)
    const articleIdField = mappingConfig?.mappingInfo?.articleId || 'ARTICLE_ID';
    const hasData = Object.entries(cleanData).some(([key, value]) => {
      if (key === articleIdField) return false;
      return value && value.trim().length > 0;
    });
    
    if (!hasData) return; // Skip empty articles
    
    const isPhysicalSpace = !isPoolId(virtualSpaceId);
    
    people.push({
      id: personId,
      virtualSpaceId,
      assignedSpaceId: isPhysicalSpace ? virtualSpaceId : undefined,
      data: cleanData,
      aimsSyncStatus: 'synced',
      lastSyncedAt: space.data['__LAST_MODIFIED__'] || new Date().toISOString(),
    });
  });
  
  logger.info('PeopleService', 'Conversion complete', { 
    peopleCount: people.length 
  });
  
  return people;
}

/**
 * Build article data with metadata for cross-device sync
 * Adds __PERSON_UUID__, __VIRTUAL_SPACE__, __LAST_MODIFIED__ to article data
 */
export function buildArticleDataWithMetadata(
  person: Person, 
  mappingConfig?: SolumMappingConfig
): Record<string, any> {
  // Use existing buildArticleData function, then add metadata
  const article = buildArticleData(person, mappingConfig);
  
  // Add metadata for cross-device sync
  article.data = {
    ...article.data,
    '__PERSON_UUID__': person.id,
    '__VIRTUAL_SPACE__': person.virtualSpaceId || person.assignedSpaceId || person.id,
    '__LAST_MODIFIED__': new Date().toISOString(),
  };
  
  return article;
}
```

---

## **Phase 4: Integrate with Existing Auto-Sync**

> ⚠️ **ARCHITECTURE FIX**: Instead of modifying `useSyncController` directly (which has React hook constraints), we integrate in `MainLayout.tsx` via the existing `onSpaceUpdate` callback pattern.

### **File: `src/shared/presentation/layouts/MainLayout.tsx` (MODIFY)**

**Add imports:**
```typescript
import { convertSpacesToPeopleWithVirtualPool } from '@features/people/infrastructure/peopleService';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
```

**Modify the `onSpaceUpdate` callback (or create new handler):**
```typescript
// Inside MainLayout component
const setPeople = usePeopleStore(state => state.setPeople);
const localPeople = usePeopleStore(state => state.people);

const handleSpaceUpdate = useCallback((spaces: Space[]) => {
  // Existing behavior: update spaces store
  setSpaces(spaces);
  
  // NEW: If People Mode enabled, also update people store
  if (settings.peopleManagerEnabled) {
    logger.info('MainLayout', 'People Mode active, converting spaces to people');
    
    const aimsePeople = convertSpacesToPeopleWithVirtualPool(
      spaces,
      settings.solumMappingConfig
    );
    
    // Merge with local people (preserve pending changes)
    const mergedPeople = mergeWithConflictResolution(localPeople, aimsPeople);
    setPeople(mergedPeople);
    
    logger.info('MainLayout', 'People sync complete', {
      aimsCount: aimsPeople.length,
      localCount: localPeople.length,
      mergedCount: mergedPeople.length
    });
  }
}, [setSpaces, settings.peopleManagerEnabled, settings.solumMappingConfig, localPeople, setPeople]);

/**
 * Merge local and remote people with conflict resolution
 * Strategy: AIMS wins for synced items, local wins for pending items
 */
function mergeWithConflictResolution(local: Person[], aims: Person[]): Person[] {
  const merged = new Map<string, Person>();
  
  // Add AIMS data first (base truth for synced items)
  aims.forEach(person => merged.set(person.id, person));
  
  // Overlay local pending changes (local wins if pending)
  local.forEach(person => {
    const existing = merged.get(person.id);
    
    if (person.aimsSyncStatus === 'pending') {
      // Local change not yet synced - keep local version
      merged.set(person.id, person);
    } else if (!existing) {
      // New local person not in AIMS yet (e.g., just imported CSV)
      merged.set(person.id, person);
    }
    // else: AIMS version wins (already in merged)
  });
  
  return Array.from(merged.values());
}
```

**Note**: Pass `handleSpaceUpdate` to `useSyncController`:
```typescript
useSyncController({
  // ... other props
  onSpaceUpdate: handleSpaceUpdate,  // Use new handler
});
```

---

## **Dependencies to Install**

> ✅ **Already installed** - no action needed:
> - `uuid` (v13.0.0) - in dependencies
> - `@types/uuid` (v10.0.0) - in devDependencies

---

## **Testing Checklist**

### **Immediate Sync Tests (Phase 8)**
- [ ] Add person → Check AIMS immediately → Article created with POOL-ID
- [ ] Edit person → Check AIMS immediately → Article data updated
- [ ] Delete person → Check AIMS immediately → Article cleared (empty data)
- [ ] Import CSV → Check AIMS → All people synced with POOL-IDs
- [ ] Check sync status indicator shows activity during operations

### **Download Sync Tests (Phase 4)**
- [ ] Click manual sync button → People table refreshes from AIMS
- [ ] Wait 5 minutes → Auto-sync triggers → People table updates
- [ ] No app refresh required → Data updates in-place

### **Cross-Device Tests**
- [ ] Device A: Add person → Device B: Click sync → Person appears
- [ ] Device A: Edit person → Device B: Wait for auto-sync → Changes appear
- [ ] Device A: Delete person → Device B: Sync → Person removed

### **Virtual Pool Tests**
- [ ] Enable People Mode → Import CSV → People get POOL-0001, 0002, etc.
- [ ] Assign person to physical space → virtualSpaceId unchanged, assignedSpaceId set
- [ ] Check AIMS → Metadata fields present: `__PERSON_UUID__`, `__VIRTUAL_SPACE__`, `__LAST_MODIFIED__`

### **Conflict Resolution Tests**
- [ ] Make local change (pending) → Sync from AIMS → Local change preserved
- [ ] Sync from AIMS → Local change (synced) → AIMS data wins
- [ ] Add person locally → Sync → New person preserved with pending status

### **Error Handling Tests**
- [ ] Disconnect from AIMS → Add person → Status shows 'error' → Reconnect → Can retry

---

## **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                        electisSpace App                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  People Store   │◄──►│  Virtual Pool    │                   │
│  │  (Zustand)      │    │  Service         │                   │
│  │                 │    │  POOL-0001..9999 │                   │
│  └────────┬────────┘    └──────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MainLayout.tsx                                           │   │
│  │ handleSpaceUpdate() ← Converts spaces to people if      │   │
│  │                       peopleManagerEnabled               │   │
│  └────────┬────────────────────────────────────────────────┘   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ useSyncController│                                          │
│  │ (Auto-sync 5min) │ ← Unchanged, calls onSpaceUpdate         │
│  └────────┬────────┘                                           │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SoluM AIMS Server                           │
├─────────────────────────────────────────────────────────────────┤
│  Articles with Metadata:                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ articleId: "POOL-0001" | "SHELF-A1"                      │  │
│  │ data: {                                                   │  │
│  │   NAME: "John Doe",                                       │  │
│  │   __PERSON_UUID__: "uuid-xxx",                           │  │
│  │   __VIRTUAL_SPACE__: "POOL-0001",                        │  │
│  │   __LAST_MODIFIED__: "2025-12-30T..."                    │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## **Recommended Implementation Order**

Based on code analysis, implement in this order to minimize risk:

1. **Phase 3A**: Create `virtualPoolService.ts` (new file, no dependencies)
2. **Phase 3B**: Update `Person` type in `types.ts` (add optional `virtualSpaceId`)
3. **Phase 3C**: Add `convertSpacesToPeopleWithVirtualPool()` and `buildArticleDataWithMetadata()` to `peopleService.ts`
4. **Phase 3D**: Update `parsePeopleCSV()` to assign POOL-IDs on import
5. **Phase 8**: Update `usePeopleController.ts` - wrap actions with immediate sync
6. **Phase 4**: Update `MainLayout.tsx` - add download sync for people mode

---

## **Phase 3D: Update CSV Import for Virtual Pool**

### **File: `src/features/people/infrastructure/peopleService.ts` (MODIFY)**

Update `parsePeopleCSV` to generate UUIDs and assign virtual pool IDs:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { generatePoolIds } from './virtualPoolService';

export function parsePeopleCSV(
    csvContent: string,
    articleFormat: ArticleFormat,
    mappingConfig?: SolumMappingConfig,
    existingPoolIds?: Set<string>  // NEW: pass existing pool IDs for collision avoidance
): Person[] {
    // ... existing parsing logic ...
    
    // After parsing rows, generate pool IDs for all people
    const poolIds = generatePoolIds(
      rows.length, 
      existingPoolIds || new Set()
    );
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // ... existing row processing ...
        
        const person: Person = {
            id: uuidv4(),  // CHANGED: Use UUID instead of timestamp-based ID
            virtualSpaceId: poolIds[i],  // NEW: Assign virtual pool ID
            data,
            // assignedSpaceId left undefined - person is in pool
        };

        people.push(person);
    }
    
    return people;
}
```

---

## **Notes**

- The empty PR #1 was a documentation study that created analysis documents but didn't change any code files
- This guide should be the starting point for implementation
- Start with Phase 3A (Virtual Pool Service) as it's the core building block with no dependencies

---

## **Key Code References**

| File | Purpose | Key Functions |
|------|---------|---------------|
| [types.ts](../src/features/people/domain/types.ts) | Person interface | `Person` type definition |
| [peopleStore.ts](../src/features/people/infrastructure/peopleStore.ts) | Zustand store | `setPeople`, `updateSyncStatus` |
| [peopleService.ts](../src/features/people/infrastructure/peopleService.ts) | Business logic | `convertSpacesToPeople`, `buildArticleData` |
| [useSyncController.ts](../src/features/sync/application/useSyncController.ts) | Auto-sync hook | `sync()`, auto-sync timer |
| [MainLayout.tsx](../src/shared/presentation/layouts/MainLayout.tsx) | Integration point | `onSpaceUpdate` callback |
| [settingsStore.ts](../src/features/settings/infrastructure/settingsStore.ts) | Settings | `settings.peopleManagerEnabled` |

---

## **Existing Code Patterns to Follow**

1. **Logging**: Always use `logger.info/debug/error` from `@shared/infrastructure/services/logger`
2. **Error handling**: Wrap in try/catch, log errors, re-throw for UI handling
3. **Store updates**: Use store actions, never mutate state directly
4. **Type safety**: Use TypeScript types, avoid `any` where possible
