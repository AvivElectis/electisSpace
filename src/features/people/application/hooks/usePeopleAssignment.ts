import { useCallback } from 'react';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { postPersonAssignment, postBulkAssignments, clearSpaceInAims } from '../../infrastructure/peopleService';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person } from '../../domain/types';
import { isPoolId } from '../../infrastructure/virtualPoolService';

/**
 * Hook for space assignment operations in People Management
 */
export function usePeopleAssignment() {
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);

    /**
     * Assign space to person (auto-posts to AIMS)
     * If person already has a space, clears the old space first
     * If person has a POOL-ID, clears the POOL-ID article in AIMS
     */
    const assignSpaceToPerson = useCallback(async (
        personId: string,
        spaceId: string,
        postToAims: boolean = true
    ): Promise<boolean> => {
        try {
            const person = peopleStore.people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const oldSpaceId = person.assignedSpaceId;
            const oldVirtualSpaceId = person.virtualSpaceId;
            logger.info('PeopleAssignment', 'Assigning space to person', { 
                personId, spaceId, oldSpaceId, oldVirtualSpaceId, postToAims 
            });

            // If person has a POOL-ID, clear it in AIMS first (we're moving to a physical space)
            if (postToAims && oldVirtualSpaceId && isPoolId(oldVirtualSpaceId) && settings.solumConfig?.tokens) {
                try {
                    logger.info('PeopleAssignment', 'Clearing POOL-ID article before physical assignment', { 
                        poolId: oldVirtualSpaceId, newSpaceId: spaceId 
                    });
                    await clearSpaceInAims(
                        oldVirtualSpaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleAssignment', 'POOL-ID article cleared in AIMS', { poolId: oldVirtualSpaceId });
                } catch (clearError: any) {
                    logger.error('PeopleAssignment', 'Failed to clear POOL-ID article in AIMS', { error: clearError.message });
                    // Continue with assignment even if clearing fails
                }
            }

            // If person already has a different physical space, clear that too
            if (postToAims && oldSpaceId && oldSpaceId !== spaceId && settings.solumConfig?.tokens) {
                try {
                    logger.info('PeopleAssignment', 'Clearing old physical space before reassignment', { oldSpaceId, newSpaceId: spaceId });
                    await clearSpaceInAims(
                        oldSpaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleAssignment', 'Old physical space cleared in AIMS', { oldSpaceId });
                } catch (clearError: any) {
                    logger.error('PeopleAssignment', 'Failed to clear old physical space in AIMS', { error: clearError.message });
                    // Continue with assignment even if clearing old space fails
                }
            }

            // Update local state - set both assignedSpaceId and virtualSpaceId to the physical space
            peopleStore.assignSpace(personId, spaceId);
            // Also update virtualSpaceId to the physical space (no longer in pool)
            peopleStore.updatePerson(personId, { virtualSpaceId: spaceId });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus([personId], 'pending');
                
                // DEBUG: Log person's listMemberships before posting
                console.log('[DEBUG usePeopleAssignment] Posting to AIMS:', {
                    personId: person.id,
                    personName: person.data?.ITEM_NAME,
                    hasListMemberships: !!person.listMemberships,
                    listMemberships: person.listMemberships,
                    assignedSpaceId: spaceId,
                });
                
                try {
                    await postPersonAssignment(
                        { ...person, assignedSpaceId: spaceId, virtualSpaceId: spaceId },
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    peopleStore.updateSyncStatus([personId], 'synced');
                    logger.info('PeopleAssignment', 'Assignment posted to AIMS', { personId });
                    return true;
                } catch (aimsError: any) {
                    peopleStore.updateSyncStatus([personId], 'error');
                    logger.error('PeopleAssignment', 'Failed to post to AIMS', { error: aimsError.message });
                    return false;
                }
            }
            return true;
        } catch (error: any) {
            logger.error('PeopleAssignment', 'Failed to assign space', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Bulk assign spaces (auto-posts to AIMS)
     */
    const bulkAssignSpaces = useCallback(async (
        assignments: Array<{ personId: string; spaceId: string }>,
        postToAims: boolean = true
    ): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            logger.info('PeopleAssignment', 'Bulk assigning spaces', { count: assignments.length, postToAims });

            const personIds = assignments.map(a => a.personId);

            // Update local state
            assignments.forEach(({ personId, spaceId }) => {
                peopleStore.assignSpace(personId, spaceId);
            });

            // Auto-post to AIMS (default behavior)
            if (postToAims && settings.solumConfig && settings.solumConfig.tokens) {
                peopleStore.updateSyncStatus(personIds, 'pending');
                
                try {
                    // Get updated people with assigned spaces
                    const assignedPeople = assignments.map(({ personId, spaceId }) => {
                        const person = peopleStore.people.find(p => p.id === personId);
                        return person ? { ...person, assignedSpaceId: spaceId } : null;
                    }).filter((p): p is Person & { assignedSpaceId: string } => p !== null && !!p.assignedSpaceId);

                    if (assignedPeople.length > 0) {
                        await postBulkAssignments(
                            assignedPeople as Person[],
                            settings.solumConfig,
                            settings.solumConfig.tokens.accessToken,
                            settings.solumMappingConfig
                        );
                        peopleStore.updateSyncStatus(personIds, 'synced');
                        logger.info('PeopleAssignment', 'Bulk assignments posted to AIMS', { count: assignedPeople.length });
                        return { success: true, syncedCount: assignedPeople.length };
                    }
                } catch (aimsError: any) {
                    peopleStore.updateSyncStatus(personIds, 'error');
                    logger.error('PeopleAssignment', 'Failed to post bulk to AIMS', { error: aimsError.message });
                    return { success: false, syncedCount: 0 };
                }
            }
            return { success: true, syncedCount: 0 };
        } catch (error: any) {
            logger.error('PeopleAssignment', 'Failed to bulk assign spaces', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    /**
     * Unassign space from person with AIMS clearing
     * Posts empty data to AIMS (except ID and global fields), then clears local state
     */
    const unassignSpaceWithAims = useCallback(async (personId: string): Promise<boolean> => {
        try {
            const person = peopleStore.people.find(p => p.id === personId);
            if (!person) {
                throw new Error('Person not found');
            }

            const spaceId = person.assignedSpaceId;
            if (!spaceId) {
                logger.warn('PeopleAssignment', 'Person has no space assigned', { personId });
                return true; // Nothing to unassign
            }

            logger.info('PeopleAssignment', 'Unassigning space from person with AIMS clearing', { personId, spaceId });

            // Clear the space in AIMS first (if configured)
            if (settings.solumConfig && settings.solumConfig.tokens) {
                try {
                    await clearSpaceInAims(
                        spaceId,
                        person,
                        settings.solumConfig,
                        settings.solumConfig.tokens.accessToken,
                        settings.solumMappingConfig
                    );
                    logger.info('PeopleAssignment', 'Space cleared in AIMS', { spaceId });
                } catch (aimsError: any) {
                    logger.error('PeopleAssignment', 'Failed to clear space in AIMS', { error: aimsError.message });
                    // Continue with local clearing even if AIMS fails
                }
            }

            // Clear local assignment
            peopleStore.unassignSpace(personId);
            logger.info('PeopleAssignment', 'Space unassigned locally', { personId });

            return true;
        } catch (error: any) {
            logger.error('PeopleAssignment', 'Failed to unassign space', { error: error.message });
            throw error;
        }
    }, [peopleStore, settings.solumConfig, settings.solumMappingConfig]);

    return {
        assignSpaceToPerson,
        bulkAssignSpaces,
        unassignSpaceWithAims,
    };
}
