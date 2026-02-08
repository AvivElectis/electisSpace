/**
 * Spaces Lists Feature - Service
 */
import { spacesListsRepository } from './repository.js';
import type { ListsUserContext, CreateSpacesListInput, UpdateSpacesListInput } from './types.js';

const getUserStoreIds = (user: ListsUserContext): string[] => {
    return user.stores?.map(s => s.id) || [];
};

const validateStoreAccess = (storeId: string, storeIds: string[]): void => {
    if (!storeIds.includes(storeId)) {
        throw new Error('FORBIDDEN');
    }
};

export const spacesListsService = {
    async list(user: ListsUserContext, storeId?: string) {
        const storeIds = getUserStoreIds(user);
        if (storeId) {
            validateStoreAccess(storeId, storeIds);
        }
        const lists = await spacesListsRepository.list(storeIds, storeId);
        return lists.map(l => ({
            ...l,
            itemCount: Array.isArray(l.content) ? (l.content as any[]).length : 0,
            content: undefined,
        }));
    },

    async getById(user: ListsUserContext, id: string) {
        const list = await spacesListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);
        return list;
    },

    async create(user: ListsUserContext, input: CreateSpacesListInput) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(input.storeId, storeIds);

        // Enforce unique name per store
        const existing = await spacesListsRepository.findByStoreAndName(input.storeId, input.name.trim());
        if (existing) {
            throw new Error('LIST_NAME_EXISTS');
        }

        return spacesListsRepository.create({
            storeId: input.storeId,
            name: input.name.trim(),
            content: input.content,
            createdById: user.id,
        });
    },

    async update(user: ListsUserContext, id: string, input: UpdateSpacesListInput) {
        const list = await spacesListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);

        if (input.name && input.name.trim() !== list.name) {
            const existing = await spacesListsRepository.findByStoreAndName(list.storeId, input.name.trim());
            if (existing && existing.id !== id) {
                throw new Error('LIST_NAME_EXISTS');
            }
        }

        const updateData: { name?: string; content?: unknown } = {};
        if (input.name) {
            updateData.name = input.name.trim();
        }
        if (input.content !== undefined) {
            updateData.content = input.content;
        }

        return spacesListsRepository.update(id, updateData);
    },

    async delete(user: ListsUserContext, id: string) {
        const list = await spacesListsRepository.getById(id);
        if (!list) {
            throw new Error('NOT_FOUND');
        }
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(list.storeId, storeIds);

        return spacesListsRepository.delete(id);
    },
};
