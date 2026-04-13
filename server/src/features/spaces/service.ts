/**
 * Spaces Feature - Service
 *
 * @description Business logic for spaces management.
 */
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { prisma } from '../../config/index.js';
import { spacesRepository } from './repository.js';
import type { SpacesUserContext, CreateSpaceInput, UpdateSpaceInput, ListSpacesFilters } from './types.js';
import type { Prisma } from '@prisma/client';

const isPlatformAdmin = (user: SpacesUserContext): boolean => user.globalRole === 'PLATFORM_ADMIN';

const getUserStoreIds = (user: SpacesUserContext): string[] => user.stores?.map(s => s.id) || [];

const getEffectiveStoreIds = (user: SpacesUserContext): string[] | undefined =>
    isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

const validateStoreAccess = (storeId: string, user: SpacesUserContext): void => {
    if (isPlatformAdmin(user)) return;
    const storeIds = getUserStoreIds(user);
    if (!storeIds.includes(storeId)) throw new Error('FORBIDDEN');
};

export const spacesService = {
    async list(filters: ListSpacesFilters, user: SpacesUserContext) {
        if (filters.storeId) validateStoreAccess(filters.storeId, user);
        const storeIds = getEffectiveStoreIds(user);

        const skip = (filters.page - 1) * filters.limit;
        const { spaces, total } = await spacesRepository.list(storeIds, filters, skip, filters.limit);

        return {
            data: spaces,
            pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
        };
    },

    async getById(id: string, user: SpacesUserContext) {
        const storeIds = getEffectiveStoreIds(user);
        const space = await spacesRepository.getById(id, storeIds);
        if (!space) throw new Error('NOT_FOUND');
        return space;
    },

    async create(input: CreateSpaceInput, user: SpacesUserContext) {
        validateStoreAccess(input.storeId, user);

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
        const storeIds = getEffectiveStoreIds(user);
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
        const storeIds = getEffectiveStoreIds(user);
        const existing = await spacesRepository.findByIdWithAccess(id, storeIds);
        if (!existing) throw new Error('NOT_FOUND');

        const linkedLabels = (existing as any).assignedLabels as string[] | undefined;
        if (linkedLabels && linkedLabels.length > 0) {
            appLogger.warn('SpacesService', `Deleting space ${existing.externalId} which has ${linkedLabels.length} linked label(s)`, {
                spaceId: id,
                externalId: existing.externalId,
                storeId: existing.storeId,
                linkedLabels,
                triggeredBy: user.id,
            });
        } else {
            appLogger.info('SpacesService', `Deleting space ${existing.externalId} (no linked labels)`, {
                spaceId: id,
                externalId: existing.externalId,
                storeId: existing.storeId,
                triggeredBy: user.id,
            });
        }

        await syncQueueService.queueDelete(existing.storeId, 'space', existing.id, existing.externalId);
        await spacesRepository.delete(id);

        return {
            linkedLabels: linkedLabels || [],
        };
    },

    async deleteBulk(ids: string[], user: SpacesUserContext) {
        const storeIds = getEffectiveStoreIds(user);

        const found = await prisma.space.findMany({
            where: { id: { in: ids } },
            select: { id: true, storeId: true, externalId: true, assignedLabels: true },
        });

        // Access check: any row outside the user's effective stores → FORBIDDEN.
        if (storeIds !== undefined) {
            const forbidden = found.filter((row) => !storeIds.includes(row.storeId));
            if (forbidden.length > 0) {
                const err = new Error('FORBIDDEN');
                (err as any).forbiddenIds = forbidden.map((f) => f.id);
                throw err;
            }
        }

        const foundIds = new Set(found.map((f) => f.id));
        const alreadyGone = ids.filter((id) => !foundIds.has(id));
        const accessible = found;

        if (accessible.length === 0) {
            appLogger.info('SpacesService', `Bulk delete: nothing to delete`, {
                requested: ids.length,
                alreadyGone: alreadyGone.length,
                triggeredBy: user.id,
            });
            return { deleted: [] as string[], alreadyGone };
        }

        await prisma.$transaction(async (tx) => {
            for (const row of accessible) {
                await syncQueueService.queueDelete(row.storeId, 'space', row.id, row.externalId);
            }
            await tx.space.deleteMany({
                where: { id: { in: accessible.map((a) => a.id) } },
            });
        });

        const linkedLabelRows = accessible.filter((row) => {
            const labels = row.assignedLabels as string[] | undefined;
            return labels && labels.length > 0;
        });

        appLogger.info('SpacesService', `Bulk delete complete`, {
            requested: ids.length,
            deleted: accessible.length,
            alreadyGone: alreadyGone.length,
            withLinkedLabels: linkedLabelRows.length,
            triggeredBy: user.id,
        });

        return { deleted: accessible.map((a) => a.id), alreadyGone };
    },

    async assignLabel(id: string, labelCode: string, user: SpacesUserContext) {
        const storeIds = getEffectiveStoreIds(user);
        const existing = await spacesRepository.findByIdWithAccess(id, storeIds);
        if (!existing) throw new Error('NOT_FOUND');

        const labelInUse = await spacesRepository.findLabelInStore(existing.storeId, labelCode, id);
        if (labelInUse) throw new Error('LABEL_IN_USE');

        const space = await spacesRepository.update(id, { labelCode, syncStatus: 'PENDING' });
        await syncQueueService.queueUpdate(existing.storeId, 'space', space.id, { labelCode });
        return space;
    },

    async forceSync(storeId: string | undefined, user: SpacesUserContext) {
        if (storeId) validateStoreAccess(storeId, user);
        return { message: 'Sync queued - use /sync/stores/:storeId/push to push changes' };
    },
};
