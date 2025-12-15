import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePersonnelStore } from '../infrastructure/personnelStore';
import { validatePerson, isPersonIdUnique } from '../domain/validation';
import { mergePersonDefaults, generatePersonId } from '../domain/businessRules';
import type { Person, CSVConfig } from '@shared/domain/types';
import type { ChairList } from '../domain/types';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Personnel Controller Hook
 * Main orchestration for personnel CRUD operations
 */

interface UsePersonnelControllerProps {
    csvConfig: CSVConfig;
    onSync?: () => Promise<void>;  // Callback to trigger sync after changes
}

export function usePersonnelController({
    csvConfig,
    onSync,
}: UsePersonnelControllerProps) {
    const {
        personnel,
        chairLists,
        setPersonnel,
        addPerson: addToStore,
        updatePerson: updateInStore,
        deletePerson: deleteFromStore,
        addChairList,
        updateChairList,
        deleteChairList,
        loadChairList,
    } = usePersonnelStore();

    /**
     * Add new person
     */
    const addPerson = useCallback(
        async (personData: Partial<Person>): Promise<void> => {
            logger.info('PersonnelController', 'Adding person', { id: personData.id });

            // Generate ID if not provided
            if (!personData.id) {
                const existingIds = personnel.map(p => p.id);
                personData.id = generatePersonId(personData.roomName || '', existingIds);
            }

            // Validate
            const validation = validatePerson(personData, csvConfig);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('PersonnelController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness
            if (!isPersonIdUnique(personData.id!, personnel)) {
                throw new Error('Person ID already exists');
            }

            // Merge with defaults
            const person = mergePersonDefaults(personData, csvConfig);

            // Add to store
            addToStore(person);

            // Trigger sync if configured
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('PersonnelController', 'Sync after add failed', { error });
                }
            }

            logger.info('PersonnelController', 'Person added successfully', { id: person.id });
        },
        [personnel, csvConfig, addToStore, onSync]
    );

    /**
     * Update existing person
     */
    const updatePerson = useCallback(
        async (id: string, updates: Partial<Person>): Promise<void> => {
            logger.info('PersonnelController', 'Updating person', { id });

            const existingPerson = personnel.find(p => p.id === id);
            if (!existingPerson) {
                throw new Error('Person not found');
            }

            // Merge updates with existing person
            const updatedPerson: Partial<Person> = {
                ...existingPerson,
                ...updates,
                data: { ...existingPerson.data, ...updates.data },
            };

            // Validate
            const validation = validatePerson(updatedPerson, csvConfig);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('PersonnelController', 'Validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Check ID uniqueness if ID changed
            if (updates.id && updates.id !== id) {
                if (!isPersonIdUnique(updates.id, personnel, id)) {
                    throw new Error('Person ID already exists');
                }
            }

            // Update in store
            updateInStore(id, updatedPerson);

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('PersonnelController', 'Sync after update failed', { error });
                }
            }

            logger.info('PersonnelController', 'Person updated successfully', { id });
        },
        [personnel, csvConfig, updateInStore, onSync]
    );

    /**
     * Delete person
     */
    const deletePerson = useCallback(
        async (id: string): Promise<void> => {
            logger.info('PersonnelController', 'Deleting person', { id });

            const existingPerson = personnel.find(p => p.id === id);
            if (!existingPerson) {
                throw new Error('Person not found');
            }

            // Delete from store
            deleteFromStore(id);

            // Trigger sync
            if (onSync) {
                try {
                    await onSync();
                } catch (error) {
                    logger.warn('PersonnelController', 'Sync after delete failed', { error });
                }
            }

            logger.info('PersonnelController', 'Person deleted successfully', { id });
        },
        [personnel, deleteFromStore, onSync]
    );

    /**
     * Find person by ID
     */
    const findPersonById = useCallback(
        (id: string): Person | undefined => {
            return personnel.find(p => p.id === id);
        },
        [personnel]
    );

    /**
     * Import personnel from sync (replaces all)
     */
    const importFromSync = useCallback(
        (importedPersonnel: Person[]): void => {
            logger.info('PersonnelController', 'Importing from sync', {
                count: importedPersonnel.length
            });
            setPersonnel(importedPersonnel);
        },
        [setPersonnel]
    );

    /**
     * Get all personnel
     */
    const getAllPersonnel = useCallback((): Person[] => {
        return personnel;
    }, [personnel]);

    /**
     * Save current personnel as chair list
     */
    const saveChairList = useCallback(
        (name: string, id?: string): void => {
            logger.info('PersonnelController', 'Saving chair list', { name, id });

            const chairList: ChairList = {
                id: id || uuidv4(),
                name,
                createdAt: new Date().toISOString(),
                personnel: [...personnel],
            };

            if (id) {
                // Update existing
                updateChairList(id, chairList);
            } else {
                // Create new
                addChairList(chairList);
            }

            logger.info('PersonnelController', 'Chair list saved', { id: chairList.id });
        },
        [personnel, addChairList, updateChairList]
    );

    /**
     * Load chair list (replaces current personnel)
     */
    const loadSavedChairList = useCallback(
        (id: string): void => {
            logger.info('PersonnelController', 'Loading chair list', { id });
            loadChairList(id);
        },
        [loadChairList]
    );

    /**
     * Delete chair list
     */
    const deleteSavedChairList = useCallback(
        (id: string): void => {
            logger.info('PersonnelController', 'Deleting chair list', { id });
            deleteChairList(id);
        },
        [deleteChairList]
    );

    return {
        // Personnel operations
        addPerson,
        updatePerson,
        deletePerson,
        findPersonById,
        importFromSync,
        getAllPersonnel,
        personnel,

        // Chair list operations
        saveChairList,
        loadChairList: loadSavedChairList,
        deleteChairList: deleteSavedChairList,
        chairLists,
    };
}
