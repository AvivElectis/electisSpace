/**
 * People Feature - Service
 * 
 * @description Business logic for people management.
 */
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
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

        // Queue sync job to clear from AIMS before deleting
        await syncQueueService.queueDelete(
            existing.storeId,
            'person',
            existing.id,
            existing.externalId || existing.virtualSpaceId || undefined
        );

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

        const space = await peopleRepository.findSpace(spaceId, storeIds);
        if (!space) {
            throw new Error('SPACE_NOT_FOUND');
        }

        // Check if space is already assigned
        const alreadyAssigned = await peopleRepository.isSpaceAssigned(spaceId, personId);
        if (alreadyAssigned) {
            throw new Error('SPACE_ALREADY_ASSIGNED');
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

        const updated = await peopleRepository.update(personId, {
            assignedSpaceId: null,
            syncStatus: 'PENDING',
        });

        // Queue sync job to push unassignment to AIMS
        await syncQueueService.queueUpdate(
            updated.storeId,
            'person',
            updated.id,
            { assignedSpaceId: null }
        );

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
