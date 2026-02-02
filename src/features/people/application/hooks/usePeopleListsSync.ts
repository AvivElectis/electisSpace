import { useCallback } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { postBulkAssignments, postBulkAssignmentsWithMetadata } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person } from '../../domain/types';
import {
    getPersonListSpaceId,
    isPersonInList,
} from '../../domain/types';

/**
 * Hook for People List AIMS sync operations
 * Handles syncing list data to/from AIMS for cross-device persistence
 */
export function usePeopleListsSync() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);

    /**
     * Save list data to AIMS for cross-device persistence
     * Posts all people with list memberships (_LIST_MEMBERSHIPS_ JSON) to AIMS
     * Syncs people who have a POOL slot (virtualSpaceId) - these are their permanent AIMS articles
     * @param peopleToSync - Optional: specific people to sync (use after savePeopleList to avoid stale closure)
     */
    const saveListToAims = useCallback(async (peopleToSync?: Person[]): Promise<{ success: boolean; syncedCount: number; error?: string }> => {
        try {
            console.log('[saveListToAims] Starting...');
            console.log('[saveListToAims] solumConfig:', settings.solumConfig ? 'present' : 'missing');
            console.log('[saveListToAims] tokens:', settings.solumConfig?.tokens ? 'present' : 'missing');
            console.log('[saveListToAims] peopleToSync provided:', peopleToSync ? peopleToSync.length : 'no (using store)');

            if (!settings.solumConfig?.tokens) {
                console.log('[saveListToAims] ERROR: Not connected to SoluM');
                return { success: false, syncedCount: 0, error: 'Not connected to SoluM' };
            }

            // Use provided people or fall back to store (provided avoids stale closure issue)
            const sourcePeople = peopleToSync || peopleStore.people;

            // Sync people who have a POOL slot (virtualSpaceId) - this is their permanent AIMS article
            // People without virtualSpaceId don't exist in AIMS yet
            const peopleWithPoolSlot = sourcePeople.filter(p => p.virtualSpaceId);
            console.log('[saveListToAims] People with POOL slot:', peopleWithPoolSlot.length);
            console.log('[saveListToAims] Sample person:', peopleWithPoolSlot[0] ? {
                id: peopleWithPoolSlot[0].id,
                virtualSpaceId: peopleWithPoolSlot[0].virtualSpaceId,
                listMemberships: peopleWithPoolSlot[0].listMemberships,
            } : 'none');

            if (peopleWithPoolSlot.length === 0) {
                logger.warn('PeopleLists', 'No people with POOL slots to sync to AIMS');
                return { success: true, syncedCount: 0 };
            }

            const withListMemberships = peopleWithPoolSlot.filter(p => p.listMemberships?.length);
            console.log('[saveListToAims] People with list memberships:', withListMemberships.length);

            logger.info('PeopleLists', 'Saving list data to AIMS', {
                count: peopleWithPoolSlot.length,
                withListMemberships: withListMemberships.length
            });

            // Post with metadata (includes _LIST_MEMBERSHIPS_ JSON)
            console.log('[saveListToAims] Calling postBulkAssignmentsWithMetadata...');
            await postBulkAssignmentsWithMetadata(
                peopleWithPoolSlot,
                settings.solumConfig,
                settings.solumConfig.tokens.accessToken,
                settings.solumMappingConfig
            );
            console.log('[saveListToAims] postBulkAssignmentsWithMetadata completed successfully');

            logger.info('PeopleLists', 'List data saved to AIMS', { count: peopleWithPoolSlot.length });
            return { success: true, syncedCount: peopleWithPoolSlot.length };
        } catch (error: any) {
            console.error('[saveListToAims] ERROR:', error);
            logger.error('PeopleLists', 'Failed to save list to AIMS', { error: error.message });
            return { success: false, syncedCount: 0, error: error.message };
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Apply active list's assignments and sync to AIMS
     * Copies list's spaceId to assignedSpaceId for all people in active list
     * Then syncs assignments to AIMS
     */
    const applyListAssignmentsToAims = useCallback(async (
        activeListStorageName: string | undefined
    ): Promise<{ success: boolean; applied: number; error?: string }> => {
        try {
            if (!activeListStorageName) {
                return { success: false, applied: 0, error: 'No active list' };
            }

            const peopleWithListSpaces = peopleStore.people.filter(p => {
                const listSpaceId = getPersonListSpaceId(p, activeListStorageName);
                return listSpaceId !== undefined;
            });

            if (peopleWithListSpaces.length === 0) {
                logger.info('PeopleLists', 'No list assignments to apply');
                return { success: true, applied: 0 };
            }

            logger.info('PeopleLists', 'Applying list assignments', { count: peopleWithListSpaces.length });

            // Update local state: copy list's spaceId to assignedSpaceId
            const updatedPeople: Person[] = peopleStore.people.map(p => {
                const listSpaceId = getPersonListSpaceId(p, activeListStorageName);
                if (listSpaceId) {
                    return {
                        ...p,
                        assignedSpaceId: listSpaceId,
                        aimsSyncStatus: 'pending' as const,
                    };
                }
                return p;
            });

            peopleStore.setPeople(updatedPeople);

            // Sync to AIMS
            if (settings.solumConfig?.tokens) {
                const personIds = peopleWithListSpaces.map(p => p.id);

                try {
                    await postBulkAssignments(
                        updatedPeople.filter(p => personIds.includes(p.id)),
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );

                    peopleStore.updateSyncStatusLocal(personIds, 'synced');
                    logger.info('PeopleLists', 'List assignments synced to AIMS', { count: personIds.length });
                } catch (syncError: any) {
                    peopleStore.updateSyncStatusLocal(personIds, 'error');
                    logger.error('PeopleLists', 'Failed to sync list assignments to AIMS', { error: syncError.message });
                    return { success: false, applied: 0, error: syncError.message };
                }
            }

            return { success: true, applied: peopleWithListSpaces.length };
        } catch (error: any) {
            logger.error('PeopleLists', 'Failed to apply list assignments', { error: error.message });
            return { success: false, applied: 0, error: error.message };
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Sync list assignments to AIMS during list load
     */
    const syncListLoadToAims = useCallback(async (
        updatedPeople: Person[],
        storageName: string
    ): Promise<void> => {
        const peopleToSync = updatedPeople.filter(
            p => isPersonInList(p, storageName) && p.assignedSpaceId
        );

        if (peopleToSync.length > 0 && settings.solumConfig?.tokens) {
            try {
                const personIds = peopleToSync.map(p => p.id);

                await postBulkAssignments(
                    peopleToSync,
                    settings.solumConfig,
                    settings.solumConfig.tokens.accessToken,
                    settings.solumMappingConfig
                );

                peopleStore.updateSyncStatusLocal(personIds, 'synced');
                logger.info('PeopleLists', 'List assignments synced to AIMS', { count: peopleToSync.length });
            } catch (postError: any) {
                logger.error('PeopleLists', 'Failed to sync list assignments to AIMS', { error: postError.message });
            }
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    return {
        saveListToAims,
        applyListAssignmentsToAims,
        syncListLoadToAims,
        isConnectedToAims: !!settings.solumConfig?.tokens,
    };
}
