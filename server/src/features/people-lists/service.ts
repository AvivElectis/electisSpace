/**
 * People Lists Feature - Service
 */
import { prisma } from '../../config/index.js';
import { peopleListsRepository } from './repository.js';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { sseManager } from '../../shared/infrastructure/sse/SseManager.js';
import type { ListsUserContext, CreatePeopleListInput, UpdatePeopleListInput } from './types.js';
import type { Prisma, SyncStatus } from '@prisma/client';

const getUserStoreIds = (user: ListsUserContext): string[] => {
    return user.stores?.map(s => s.id) || [];
};

const validateStoreAccess = (storeId: string, storeIds: string[]): void => {
    if (!storeIds.includes(storeId)) {
        throw new Error('FORBIDDEN');
    }
};

export const peopleListsService = {
    /**
     * List all people lists for accessible stores
     */
    async list(user: ListsUserContext, storeId?: string) {
        const storeIds = getUserStoreIds(user);
        if (storeId) {
            validateStoreAccess(storeId, storeIds);
        }
        const lists = await peopleListsRepository.list(storeIds, storeId);
        return lists.map(l => {
            const contentArr = l.content;
            const count = Array.isArray(contentArr) ? contentArr.length : 0;
            const { content, ...rest } = l;
            return { ...rest, itemCount: count };
        });
    },

    /**
     * Get a single people list by ID (with content)
     */
    async getById(user: ListsUserContext, id: string) {
        const list = await peopleListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);
        return list;
    },

    /**
     * Create a new people list
     * Enforces unique name per store
     */
    async create(user: ListsUserContext, input: CreatePeopleListInput) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(input.storeId, storeIds);

        // Enforce unique name per store
        const existing = await peopleListsRepository.findByStoreAndName(input.storeId, input.name);
        if (existing) {
            throw new Error('LIST_NAME_EXISTS');
        }

        const storageName = input.name.trim().replace(/\s+/g, '_');

        return peopleListsRepository.create({
            storeId: input.storeId,
            name: input.name.trim(),
            storageName,
            content: input.content,
            createdById: user.id,
        });
    },

    /**
     * Update a people list (name and/or content)
     * Enforces unique name per store on rename
     */
    async update(user: ListsUserContext, id: string, input: UpdatePeopleListInput) {
        const list = await peopleListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);

        // If renaming, check uniqueness
        if (input.name && input.name.trim() !== list.name) {
            const existing = await peopleListsRepository.findByStoreAndName(list.storeId, input.name.trim());
            if (existing && existing.id !== id) {
                throw new Error('LIST_NAME_EXISTS');
            }
        }

        const updateData: { name?: string; storageName?: string; content?: unknown } = {};
        if (input.name) {
            updateData.name = input.name.trim();
            updateData.storageName = input.name.trim().replace(/\s+/g, '_');
        }
        if (input.content !== undefined) {
            updateData.content = input.content;
        }

        return peopleListsRepository.update(id, updateData);
    },

    /**
     * Delete a people list
     */
    async delete(user: ListsUserContext, id: string) {
        const list = await peopleListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);

        return peopleListsRepository.delete(id);
    },

    /**
     * Load a people list — atomically replaces all people in the store
     * with the list's snapshot and queues AIMS sync for all changes.
     * 
     * This is the core of the "current running table" architecture:
     * - People in the DB == the current working set == what AIMS shows
     * - Loading a list replaces the entire working set
     * - All connected clients are notified via SSE
     * 
     * @param user - Authenticated user context
     * @param listId - ID of the list to load
     * @param sseClientId - Optional SSE client ID of the originator (excluded from broadcast)
     * @returns The loaded list data + new people array
     */
    async loadList(user: ListsUserContext, listId: string, sseClientId?: string) {
        const list = await peopleListsRepository.getById(listId);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);

        const storeId = list.storeId;
        const snapshotContent = Array.isArray(list.content) ? (list.content as any[]) : [];

        // 0. Fetch company settings to get global field assignments (STORE_ID, NFC_URL, etc.)
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { company: { select: { settings: true } } },
        });
        const companySettings = (store?.company?.settings as Record<string, any>) || {};
        const globalFieldAssignments = companySettings.solumMappingConfig?.globalFieldAssignments || {};

        // 1. Get all current people in the store (to diff for AIMS sync)
        const currentPeople = await prisma.person.findMany({
            where: { storeId },
            select: { id: true, assignedSpaceId: true },
        });
        const currentAssignedSpaces = new Set(
            currentPeople.filter(p => p.assignedSpaceId).map(p => p.assignedSpaceId!)
        );

        // 2. Build the new people set from snapshot
        const snapshotSpaces = new Set<string>();
        const newPeopleData: Array<{
            virtualSpaceId: string;
            data: Record<string, unknown>;
            assignedSpaceId: string | null;
        }> = [];

        // Internal fields that may be present in snapshot data from addPersonWithSync
        // These are DB columns, not data fields — strip them to avoid polluting the JSON
        const internalDataFields = ['aimsSyncStatus', 'virtualSpaceId', 'assignedSpaceId'];

        for (const item of snapshotContent) {
            const vsId = item.virtualSpaceId || `POOL-${String(newPeopleData.length + 1).padStart(4, '0')}`;
            const assignedSpaceId = item.assignedSpaceId || null;

            // Strip internal fields from snapshot data before merging
            const cleanData: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(item.data || {})) {
                if (!internalDataFields.includes(key)) {
                    cleanData[key] = value;
                }
            }

            newPeopleData.push({
                virtualSpaceId: vsId,
                data: { ...cleanData, ...globalFieldAssignments },
                assignedSpaceId,
            });
            if (assignedSpaceId) {
                snapshotSpaces.add(assignedSpaceId);
            }
        }

        // 3. Determine AIMS sync: spaces that need DELETE (were assigned, now gone)
        //    and spaces that need UPDATE (newly assigned or data changed)
        const spacesToDelete = [...currentAssignedSpaces].filter(s => !snapshotSpaces.has(s));

        // 4. Run the replacement in a transaction
        const createdPeople = await prisma.$transaction(async (tx) => {
            // Delete all current people for this store
            await tx.person.deleteMany({ where: { storeId } });

            // Also clear any list memberships for the store's people (cascade should handle this
            // but let's be safe)
            // PeopleListMembership has personId FK with cascade, so deleteMany on person handles it

            // Create new people from snapshot
            const created: Array<{
                id: string;
                virtualSpaceId: string | null;
                assignedSpaceId: string | null;
                data: Prisma.JsonValue;
                syncStatus: SyncStatus;
            }> = [];

            for (const p of newPeopleData) {
                const person = await tx.person.create({
                    data: {
                        storeId,
                        virtualSpaceId: p.virtualSpaceId,
                        data: p.data as Prisma.InputJsonValue,
                        assignedSpaceId: p.assignedSpaceId,
                        syncStatus: 'SYNCED',
                    },
                });
                created.push(person);
            }

            return created;
        });

        // 5. Queue AIMS sync: DELETE for spaces that no longer have people
        for (const spaceId of spacesToDelete) {
            await syncQueueService.queueDelete(storeId, 'person', 'list-load-cleanup', spaceId);
        }

        // 6. Queue AIMS sync: UPDATE for all newly assigned people
        //    Use queue() directly instead of queueUpdate() to avoid setting
        //    person syncStatus back to PENDING (they were just created as SYNCED).
        //    The background processor will push to AIMS without affecting the visible status.
        for (const person of createdPeople) {
            if (person.assignedSpaceId) {
                await syncQueueService.queue(storeId, 'person', person.id, 'UPDATE', {
                    payload: { changes: { assignedSpaceId: person.assignedSpaceId } },
                });
            }
        }

        // 7. Broadcast to all SSE clients for this store
        sseManager.broadcastToStore(storeId, {
            type: 'list:loaded',
            payload: {
                listId,
                listName: list.name,
                loadedBy: user.id,
                loadedByName: (user as any).name || (user as any).email || 'Unknown',
                peopleCount: createdPeople.length,
            },
            excludeClientId: sseClientId,
        });

        console.log(`[PeopleListsService] List loaded: ${list.name} (${createdPeople.length} people) for store ${storeId}`);

        return {
            list: {
                id: list.id,
                name: list.name,
                storageName: list.storageName,
            },
            people: createdPeople,
        };
    },

    /**
     * Free (unload) the current list — broadcasts to SSE clients.
     * People remain in the DB as-is (current table continues without list tracking).
     */
    async freeList(user: ListsUserContext, storeId: string, sseClientId?: string) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(storeId, storeIds);

        // Broadcast to all SSE clients for this store
        sseManager.broadcastToStore(storeId, {
            type: 'list:freed',
            payload: {
                freedBy: user.id,
                freedByName: (user as any).name || (user as any).email || 'Unknown',
            },
            excludeClientId: sseClientId,
        });

        console.log(`[PeopleListsService] List freed for store ${storeId}`);
        return { success: true };
    },
};
