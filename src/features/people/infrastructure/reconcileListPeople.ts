/**
 * Reconcile List People with Server
 * 
 * When loading a list snapshot, people may have been deleted from the server.
 * This module re-creates missing people on the server so that operations
 * (delete, assign, AIMS sync) work correctly.
 */

import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { Person } from '../domain/types';
import peopleApi from './peopleApi';

/**
 * Reconciles snapshot people with the server.
 * People that exist in the snapshot but NOT on the server are re-created.
 * Returns the full list of people with valid server IDs.
 * 
 * @param snapshotPeople - People from the list snapshot
 * @param serverPeopleIds - Set of IDs that currently exist on the server
 * @returns Reconciled people array (all exist on server)
 */
export async function reconcileListPeopleWithServer(
    snapshotPeople: Person[],
    serverPeopleIds: Set<string>
): Promise<Person[]> {
    const missingPeople = snapshotPeople.filter(p => !serverPeopleIds.has(p.id));

    if (missingPeople.length === 0) {
        logger.info('ReconcileListPeople', 'All snapshot people exist on server', {
            total: snapshotPeople.length,
        });
        return snapshotPeople;
    }

    logger.info('ReconcileListPeople', 'Re-creating missing people on server', {
        total: snapshotPeople.length,
        missing: missingPeople.length,
    });

    const activeStoreId = useAuthStore.getState().activeStoreId;
    if (!activeStoreId) {
        logger.warn('ReconcileListPeople', 'No active store, returning snapshot as-is');
        return snapshotPeople;
    }

    // Map from old snapshot ID → new server ID
    const idMap = new Map<string, string>();

    // Re-create each missing person on the server
    for (const person of missingPeople) {
        try {
            const serverPerson = await peopleApi.create({
                storeId: activeStoreId,
                externalId: person.id, // Use old ID as externalId for traceability
                data: { ...person.data },
            });
            idMap.set(person.id, serverPerson.id);
            logger.info('ReconcileListPeople', 'Re-created person on server', {
                oldId: person.id,
                newId: serverPerson.id,
            });
        } catch (error) {
            logger.error('ReconcileListPeople', 'Failed to re-create person', {
                personId: person.id,
                error: error instanceof Error ? error.message : 'Unknown',
            });
            // Keep the original person in the list (local-only, operations may fail)
        }
    }

    // Build reconciled list with updated IDs
    const reconciledPeople = snapshotPeople.map(person => {
        const newId = idMap.get(person.id);
        if (newId) {
            return { ...person, id: newId };
        }
        return person;
    });

    logger.info('ReconcileListPeople', 'Reconciliation complete', {
        total: reconciledPeople.length,
        recreated: idMap.size,
        failed: missingPeople.length - idMap.size,
    });

    return reconciledPeople;
}
