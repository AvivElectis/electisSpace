/**
 * People Feature - Service
 * 
 * @description Business logic for people management.
 */
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { buildPersonArticle, buildEmptySlotArticle } from '../../shared/infrastructure/services/articleBuilder.js';
import { peopleRepository } from './repository.js';
import type {
    PeopleUserContext,
    CreatePersonInput,
    UpdatePersonInput,
    ListPeopleFilters,
} from './types.js';
import type { Prisma } from '@prisma/client';

// ======================
// Helpers
// ======================

const getUserStoreIds = (user: PeopleUserContext): string[] => {
    return user.stores?.map(s => s.id) || [];
};

const validateStoreAccess = (storeId: string, storeIds: string[]): void => {
    if (!storeIds.includes(storeId)) {
        throw new Error('FORBIDDEN');
    }
};

// ======================
// Service
// ======================

export const peopleService = {
    /**
     * List people
     */
    async list(filters: ListPeopleFilters, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        // Validate store access if specific store requested
        if (filters.storeId) {
            validateStoreAccess(filters.storeId, storeIds);
        }

        const skip = (filters.page - 1) * filters.limit;
        const { people, total } = await peopleRepository.list(
            storeIds,
            {
                storeId: filters.storeId,
                search: filters.search,
                assigned: filters.assigned,
                listId: filters.listId,
            },
            skip,
            filters.limit
        );

        return {
            data: people,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    },

    /**
     * Get person by ID
     */
    async getById(id: string, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        const person = await peopleRepository.getById(id, storeIds);
        if (!person) {
            throw new Error('NOT_FOUND');
        }

        return person;
    },

    /**
     * Create person
     */
    async create(input: CreatePersonInput, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(input.storeId, storeIds);

        // Generate virtual space ID (POOL-XXXX)
        const count = await peopleRepository.countInStore(input.storeId);
        const virtualSpaceId = `POOL-${String(count + 1).padStart(4, '0')}`;

        const person = await peopleRepository.create({
            externalId: input.externalId,
            data: input.data as Prisma.InputJsonValue,
            virtualSpaceId,
            storeId: input.storeId,
            syncStatus: 'PENDING',
        });

        // Queue sync job
        await syncQueueService.queueCreate(input.storeId, 'person', person.id, input.data);

        return person;
    },

    /**
     * Update person
     */
    async update(id: string, input: UpdatePersonInput, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        const existing = await peopleRepository.findByIdWithAccess(id, storeIds);
        if (!existing) {
            throw new Error('NOT_FOUND');
        }

        const mergedData = input.data
            ? { ...(existing.data as object), ...input.data }
            : existing.data;

        const person = await peopleRepository.update(id, {
            data: mergedData as Prisma.InputJsonValue,
            syncStatus: 'PENDING',
        });

        // Queue sync job
        await syncQueueService.queueUpdate(existing.storeId, 'person', person.id, input);

        return person;
    },

    /**
     * Delete person
     */
    async delete(id: string, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        const existing = await peopleRepository.findByIdWithAccess(id, storeIds);
        if (!existing) {
            throw new Error('NOT_FOUND');
        }

        // Push empty slot article for the freed space (keeps the slot in AIMS with empty fields)
        if (existing.assignedSpaceId) {
            await syncQueueService.queueUpdate(
                existing.storeId,
                'empty_slot',
                existing.assignedSpaceId,  // entityId = slotId for empty_slot type
                { slotId: existing.assignedSpaceId }
            );
        }

        await peopleRepository.delete(id);
    },

    /**
     * Assign person to space
     */
    async assignToSpace(personId: string, spaceId: string, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        const person = await peopleRepository.findByIdWithAccess(personId, storeIds);
        if (!person) {
            throw new Error('PERSON_NOT_FOUND');
        }

        // Check if this slot is already assigned to a different person
        const alreadyAssigned = await peopleRepository.isSpaceAssigned(spaceId, personId);
        if (alreadyAssigned) {
            throw new Error('SPACE_ALREADY_ASSIGNED');
        }

        // If person had a previous space, push an empty slot article for the old space
        // (keeps the slot visible in AIMS with empty fields instead of deleting it)
        console.log(`[PeopleService] assignToSpace: personId=${personId}, newSpaceId=${spaceId}, oldSpaceId=${person.assignedSpaceId ?? 'null'}`);
        if (person.assignedSpaceId && person.assignedSpaceId !== spaceId) {
            console.log(`[PeopleService] Queuing empty slot for old space ${person.assignedSpaceId} before assigning to ${spaceId}`);
            await syncQueueService.queueUpdate(
                person.storeId,
                'empty_slot',
                person.assignedSpaceId,  // entityId = slotId for empty_slot type
                { slotId: person.assignedSpaceId }
            );
        } else if (!person.assignedSpaceId) {
            console.log(`[PeopleService] No previous space (person was unassigned)`);
        }

        const updated = await peopleRepository.update(personId, {
            assignedSpaceId: spaceId,
            syncStatus: 'PENDING',
        });

        // Queue sync job to push assignment to AIMS
        await syncQueueService.queueUpdate(
            updated.storeId,
            'person',
            updated.id,
            { assignedSpaceId: spaceId }
        );

        return updated;
    },

    /**
     * Unassign person from space
     */
    async unassignFromSpace(personId: string, user: PeopleUserContext) {
        const storeIds = getUserStoreIds(user);
        
        const person = await peopleRepository.findByIdWithAccess(personId, storeIds);
        if (!person) {
            throw new Error('NOT_FOUND');
        }

        // Push an empty slot article instead of deleting (keeps the slot in AIMS with empty fields)
        console.log(`[PeopleService] unassignFromSpace: personId=${personId}, currentSpaceId=${person.assignedSpaceId ?? 'null'}`);
        if (person.assignedSpaceId) {
            console.log(`[PeopleService] Queuing empty slot for space ${person.assignedSpaceId} (unassign)`);
            await syncQueueService.queueUpdate(
                person.storeId,
                'empty_slot',
                person.assignedSpaceId,  // entityId = slotId for empty_slot type
                { slotId: person.assignedSpaceId }
            );
        } else {
            console.log(`[PeopleService] Person already has no space, skipping`);
        }

        const updated = await peopleRepository.update(personId, {
            assignedSpaceId: null,
            syncStatus: 'PENDING',
        });

        return updated;
    },

    /**
     * List people lists
     */
    async listPeopleLists(user: PeopleUserContext, storeId?: string) {
        const storeIds = getUserStoreIds(user);
        
        if (storeId) {
            validateStoreAccess(storeId, storeIds);
        }

        return peopleRepository.listPeopleLists(storeIds, storeId);
    },

    /**
     * Provision all space slots in AIMS for people mode.
     * Creates articles for slots 1..totalSpaces:
     *   - Assigned slots get full person articles
     *   - Unassigned slots get empty articles (just the ID)
     * If previousTotal > totalSpaces, excess slots are deleted from AIMS.
     */
    async provisionSlots(
        storeId: string,
        totalSpaces: number,
        previousTotal: number,
        user: PeopleUserContext
    ) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(storeId, storeIds);

        console.log(`[PeopleService] provisionSlots: storeId=${storeId}, total=${totalSpaces}, previous=${previousTotal}`);

        // Fetch article format for this store
        let format = null;
        try {
            format = await aimsGateway.fetchArticleFormat(storeId);
        } catch (error: any) {
            console.warn(`[PeopleService] Could not fetch article format: ${error.message}`);
        }

        // Fetch global field assignments
        let globalFields: Record<string, string> | undefined;
        try {
            const { prisma } = await import('../../config/index.js');
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: { company: { select: { settings: true } } },
            });
            const settings = (store?.company?.settings as Record<string, any>) || {};
            const fields = settings.solumMappingConfig?.globalFieldAssignments;
            if (fields && Object.keys(fields).length > 0) {
                globalFields = fields as Record<string, string>;
            }
        } catch { /* ignore */ }

        // Fetch all assigned people for this store
        const { people } = await peopleRepository.list(
            [storeId],
            { storeId },
            0,
            10000  // Get all people
        );

        // Build a map of slotId → person for assigned slots
        const assignedSlots = new Map<string, typeof people[0]>();
        for (const person of people) {
            if (person.assignedSpaceId) {
                assignedSlots.set(person.assignedSpaceId, person);
            }
        }

        // Build articles for all slots 1..totalSpaces
        const articles: any[] = [];
        for (let i = 1; i <= totalSpaces; i++) {
            const slotId = String(i);
            const person = assignedSlots.get(slotId);

            if (person) {
                // Assigned slot — full person article
                const article = buildPersonArticle(
                    { assignedSpaceId: slotId, data: person.data },
                    format,
                    globalFields,
                );
                if (article) articles.push(article);
            } else {
                // Unassigned slot — empty article with just the ID
                articles.push(buildEmptySlotArticle(slotId, format));
            }
        }

        // Push all articles to AIMS
        if (articles.length > 0) {
            await aimsGateway.pushArticles(storeId, articles);
            console.log(`[PeopleService] Pushed ${articles.length} slot articles to AIMS`);
        }

        // If totalSpaces decreased, delete excess slot articles from AIMS
        if (previousTotal > totalSpaces) {
            const excessIds: string[] = [];
            for (let i = totalSpaces + 1; i <= previousTotal; i++) {
                excessIds.push(String(i));
            }
            if (excessIds.length > 0) {
                await aimsGateway.deleteArticles(storeId, excessIds);
                console.log(`[PeopleService] Deleted ${excessIds.length} excess slot articles from AIMS`);
            }
        }

        return {
            provisioned: articles.length,
            deleted: previousTotal > totalSpaces ? previousTotal - totalSpaces : 0,
        };
    },

    /**
     * Bulk import from CSV (TODO)
     */
    async importFromCsv(_data: any, _user: PeopleUserContext) {
        // TODO: Implement CSV parsing and bulk import
        return {
            message: 'Import started',
            jobId: 'import-' + Date.now(),
        };
    },
};
