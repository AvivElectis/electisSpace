/**
 * People Feature - Service
 * 
 * @description Business logic for people management.
 */
import { randomUUID } from 'crypto';
import { syncQueueService } from '../../shared/infrastructure/services/syncQueueService.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { buildPersonArticle, buildEmptySlotArticle } from '../../shared/infrastructure/services/articleBuilder.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { peopleRepository } from './repository.js';
import type {
    PeopleUserContext,
    CreatePersonInput,
    UpdatePersonInput,
    ListPeopleFilters,
} from './types.js';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/index.js';

// ======================
// Helpers
// ======================

const isPlatformAdmin = (user: PeopleUserContext): boolean =>
    user.globalRole === 'PLATFORM_ADMIN';

const getUserStoreIds = (user: PeopleUserContext): string[] => {
    return user.stores?.map(s => s.id) || [];
};

const validateStoreAccess = (storeId: string, user: PeopleUserContext): void => {
    if (isPlatformAdmin(user)) return;
    const storeIds = getUserStoreIds(user);
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
        // Validate store access if specific store requested
        if (filters.storeId) {
            validateStoreAccess(filters.storeId, user);
        }
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

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
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

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
        validateStoreAccess(input.storeId, user);

        // Generate unique virtual space ID using UUID suffix to avoid TOCTOU race
        const virtualSpaceId = `POOL-${randomUUID().slice(0, 8).toUpperCase()}`;

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
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

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
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

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
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

        const person = await peopleRepository.findByIdWithAccess(personId, storeIds);
        if (!person) {
            throw new Error('PERSON_NOT_FOUND');
        }

        // Atomic check-then-update to prevent double-assigning the same space
        appLogger.info('PeopleService', `assignToSpace: personId=${personId}, newSpaceId=${spaceId}, oldSpaceId=${person.assignedSpaceId ?? 'null'}`);

        const oldSpaceId = person.assignedSpaceId;

        const updated = await prisma.$transaction(async (tx) => {
            // Check inside transaction to prevent race condition
            const alreadyAssigned = await tx.person.findFirst({
                where: {
                    assignedSpaceId: spaceId,
                    id: { not: personId },
                    storeId: person.storeId,
                },
            });
            if (alreadyAssigned) {
                throw new Error('SPACE_ALREADY_ASSIGNED');
            }

            return tx.person.update({
                where: { id: personId },
                data: {
                    assignedSpaceId: spaceId,
                    syncStatus: 'PENDING',
                },
            });
        });

        // Queue side-effect sync jobs AFTER transaction commits successfully
        if (oldSpaceId && oldSpaceId !== spaceId) {
            appLogger.info('PeopleService', `Queuing empty slot for old space ${oldSpaceId} after assigning to ${spaceId}`);
            await syncQueueService.queueUpdate(
                person.storeId,
                'empty_slot',
                oldSpaceId,
                { slotId: oldSpaceId }
            );
        } else if (!oldSpaceId) {
            appLogger.debug('PeopleService', 'No previous space (person was unassigned)');
        }

        // Queue sync job to push assignment to AIMS
        await syncQueueService.queueUpdate(
            updated.storeId,
            'person',
            updated.id,
            { assignedSpaceId: spaceId }
        );

        // Safety net: ensure the store has peopleManagerConfig with totalSpaces
        // so the client SpaceSelector/validation works correctly
        try {
            const store = await prisma.store.findUnique({ where: { id: person.storeId } });
            const storeSettings = (store?.settings as Record<string, any>) || {};
            if (!storeSettings.peopleManagerConfig?.totalSpaces) {
                // Count current max assigned space to set a sensible default
                const maxSpace = await prisma.person.aggregate({
                    where: { storeId: person.storeId, assignedSpaceId: { not: null } },
                    _max: { assignedSpaceId: true },
                });
                const maxNum = parseInt(maxSpace._max.assignedSpaceId || '0', 10) || 0;
                const totalSpaces = Math.max(maxNum, parseInt(spaceId, 10), 1);

                await prisma.store.update({
                    where: { id: person.storeId },
                    data: {
                        settings: {
                            ...storeSettings,
                            peopleManagerConfig: { totalSpaces },
                        },
                    },
                });
                appLogger.info('PeopleService', `Auto-initialized peopleManagerConfig for store ${person.storeId}`, { totalSpaces });
            }
        } catch (err: any) {
            // Non-critical — log and continue
            appLogger.warn('PeopleService', `Failed to auto-initialize peopleManagerConfig: ${err.message}`);
        }

        return updated;
    },

    /**
     * Unassign person from space
     */
    async unassignFromSpace(personId: string, user: PeopleUserContext) {
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

        const person = await peopleRepository.findByIdWithAccess(personId, storeIds);
        if (!person) {
            throw new Error('NOT_FOUND');
        }

        appLogger.info('PeopleService', `unassignFromSpace: personId=${personId}, currentSpaceId=${person.assignedSpaceId ?? 'null'}`);
        const oldSpaceId = person.assignedSpaceId;

        const updated = await peopleRepository.update(personId, {
            assignedSpaceId: null,
            syncStatus: 'PENDING',
        });

        // Queue side-effect sync jobs AFTER DB update succeeds
        if (oldSpaceId) {
            appLogger.info('PeopleService', `Queuing empty slot for space ${oldSpaceId} (unassign)`);
            await syncQueueService.queueUpdate(
                person.storeId,
                'empty_slot',
                oldSpaceId,
                { slotId: oldSpaceId }
            );
        } else {
            appLogger.debug('PeopleService', 'Person already had no space, skipping');
        }

        return updated;
    },

    /**
     * List people lists
     */
    async listPeopleLists(user: PeopleUserContext, storeId?: string) {
        if (storeId) {
            validateStoreAccess(storeId, user);
        }
        const storeIds = isPlatformAdmin(user) ? undefined : getUserStoreIds(user);

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
        user: PeopleUserContext,
        force: boolean = false,
    ) {
        validateStoreAccess(storeId, user);

        appLogger.info('PeopleService', `provisionSlots: storeId=${storeId}, total=${totalSpaces}, previous=${previousTotal}`);

        // Fetch article format for this store
        let format = null;
        try {
            format = await aimsGateway.fetchArticleFormat(storeId);
        } catch (error: any) {
            appLogger.warn('PeopleService', `Could not fetch article format: ${error.message}`);
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
            appLogger.info('PeopleService', `Pushed ${articles.length} slot articles to AIMS`);
        }

        // If totalSpaces decreased, check for labels before deleting excess slot articles
        if (previousTotal > totalSpaces) {
            const excessIds: string[] = [];
            for (let i = totalSpaces + 1; i <= previousTotal; i++) {
                excessIds.push(String(i));
            }

            if (excessIds.length > 0) {
                // Check if any excess slots have labels assigned via AIMS article info
                const affectedLabels: { articleId: string; labelCode: string }[] = [];
                try {
                    const articleInfos = await aimsGateway.pullArticleInfo(storeId);
                    for (const excessId of excessIds) {
                        const info = articleInfos.find(i => String(i.articleId) === excessId);
                        if (info?.assignedLabel && info.assignedLabel.length > 0) {
                            for (const labelCode of info.assignedLabel) {
                                affectedLabels.push({ articleId: excessId, labelCode });
                            }
                        }
                    }
                } catch (error: any) {
                    appLogger.warn('PeopleService', `Could not check labels for excess slots: ${error.message}`);
                }

                if (affectedLabels.length > 0 && !force) {
                    appLogger.warn('PeopleService', `provisionSlots: ${affectedLabels.length} label(s) linked to excess slots — returning confirmation request`, { affectedLabels });
                    return {
                        provisioned: articles.length,
                        deleted: 0,
                        requiresConfirmation: true,
                        affectedLabels,
                        message: `Reducing seats will unlink ${affectedLabels.length} label(s). Set force=true to confirm.`,
                    };
                }

                if (affectedLabels.length > 0 && force) {
                    appLogger.warn('PeopleService', `provisionSlots: FORCE deleting ${excessIds.length} excess slots with ${affectedLabels.length} linked label(s)`, { affectedLabels, excessIds });
                }

                // Safe to delete (no labels or force=true)
                await aimsGateway.deleteArticles(storeId, excessIds);
                appLogger.info('PeopleService', `Deleted ${excessIds.length} excess slot articles from AIMS`, {
                    excessIds,
                    hadLinkedLabels: affectedLabels.length > 0,
                    forced: force,
                });
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
