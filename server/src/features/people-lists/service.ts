/**
 * People Lists Feature - Service
 */
import { peopleListsRepository } from './repository.js';
import type { ListsUserContext, CreatePeopleListInput, UpdatePeopleListInput } from './types.js';

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
};
