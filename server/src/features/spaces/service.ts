/**
 * Spaces Feature - Service
 * 
 * @description Business logic for spaces management.
 */
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { spacesRepository } from './repository.js';
import type { SpacesUserContext, CreateSpaceInput, UpdateSpaceInput, ListSpacesFilters } from './types.js';
import type { Prisma } from '@prisma/client';

const isPlatformAdmin = (user: SpacesUserContext): boolean => user.globalRole === 'PLATFORM_ADMIN';

const getUserStoreIds = (user: SpacesUserContext): string[] => user.stores?.map(s => s.id) || [];

const validateStoreAccess = (storeId: string, storeIds: string[], user: SpacesUserContext): void => {
    if (isPlatformAdmin(user)) return;
    if (!storeIds.includes(storeId)) throw new Error('FORBIDDEN');
};

export const spacesService = {
    async list(filters: ListSpacesFilters, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        if (filters.storeId) validateStoreAccess(filters.storeId, storeIds, user);

        const skip = (filters.page - 1) * filters.limit;
        const { spaces, total } = await spacesRepository.list(storeIds, filters, skip, filters.limit);

        return {
            data: spaces,
            pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
        };
    },

    async getById(id: string, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        const space = await spacesRepository.getById(id, storeIds);
        if (!space) throw new Error('NOT_FOUND');
        return space;
    },

    async create(input: CreateSpaceInput, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        validateStoreAccess(input.storeId, storeIds, user);

        const existing = await spacesRepository.findByExternalId(input.storeId, input.externalId);
        if (existing) throw new Error('CONFLICT');

        const space = await spacesRepository.create({
            storeId: input.storeId,
            externalId: input.externalId,
            labelCode: input.labelCode,
            templateName: input.templateName,
            data: input.data as Prisma.InputJsonValue,
            createdById: user.id,
            updatedById: user.id,
            syncStatus: 'PENDING',
        });

        await syncQueueService.queueCreate(input.storeId, 'space', space.id, input.data);
        return space;
    },

    async update(id: string, input: UpdateSpaceInput, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        const existing = await spacesRepository.findByIdWithAccess(id, storeIds);
        if (!existing) throw new Error('NOT_FOUND');

        const mergedData = input.data ? { ...(existing.data as object), ...input.data } : existing.data;

        const space = await spacesRepository.update(id, {
            labelCode: input.labelCode,
            templateName: input.templateName,
            data: mergedData as Prisma.InputJsonValue,
            updatedById: user.id,
            syncStatus: 'PENDING',
        });

        await syncQueueService.queueUpdate(existing.storeId, 'space', space.id, input);
        return space;
    },

    async delete(id: string, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        const existing = await spacesRepository.findByIdWithAccess(id, storeIds);
        if (!existing) throw new Error('NOT_FOUND');

        await syncQueueService.queueDelete(existing.storeId, 'space', existing.id, existing.externalId);
        await spacesRepository.delete(id);
    },

    async assignLabel(id: string, labelCode: string, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        const existing = await spacesRepository.findByIdWithAccess(id, storeIds);
        if (!existing) throw new Error('NOT_FOUND');

        const labelInUse = await spacesRepository.findLabelInStore(existing.storeId, labelCode, id);
        if (labelInUse) throw new Error('LABEL_IN_USE');

        const space = await spacesRepository.update(id, { labelCode, syncStatus: 'PENDING' });
        await syncQueueService.queueUpdate(existing.storeId, 'space', space.id, { labelCode });
        return space;
    },

    async forceSync(storeId: string | undefined, user: SpacesUserContext) {
        const storeIds = getUserStoreIds(user);
        if (storeId && !isPlatformAdmin(user) && !storeIds.includes(storeId)) throw new Error('FORBIDDEN');
        return { message: 'Sync queued - use /sync/stores/:storeId/push to push changes' };
    },
};
