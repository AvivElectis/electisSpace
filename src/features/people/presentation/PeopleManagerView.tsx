import { logger } from '@shared/infrastructure/services/logger';
import { Box } from '@mui/material';
import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { usePeopleController } from '../application/usePeopleController';
import { usePeopleFilters } from '../application/usePeopleFilters';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { useUnsavedListGuard } from '@shared/presentation/hooks/useUnsavedListGuard';
import { peopleApi } from '@shared/infrastructure/services/peopleApi';

// Lazy load dialogs - not needed on initial render
const PersonDialog = lazy(() => import('./PersonDialog').then(m => ({ default: m.PersonDialog })));
const CSVUploadDialog = lazy(() => import('./CSVUploadDialog').then(m => ({ default: m.CSVUploadDialog })));
const PeopleSaveListDialog = lazy(() => import('./PeopleSaveListDialog').then(m => ({ default: m.PeopleSaveListDialog })));
const PeopleListsManagerDialog = lazy(() => import('./PeopleListsManagerDialog').then(m => ({ default: m.PeopleListsManagerDialog })));
const SpaceSelectionDialog = lazy(() => import('./SpaceSelectionDialog').then(m => ({ default: m.SpaceSelectionDialog })));

// Extracted components
import {
    PeopleToolbar,
    PeopleStatsPanel,
    PeopleFiltersBar,
    PeopleBulkActionsBar,
    PeopleTable,
    PeopleListPanel,
} from './components';

import type { Person, PeopleFilters } from '../domain/types';

/**
 * People Manager View - Main component for managing people and space assignments
 * Refactored to use extracted sub-components for better maintainability
 */
export function PeopleManagerView() {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const settings = useSettingsStore((state) => state.settings);
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback((key: string, options?: Record<string, unknown>) => {
        return t(key, {
            ...options,
            spaceTypeSingular: getLabel('singular').toLowerCase(),
            spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
            spaceTypePlural: getLabel('plural').toLowerCase(),
            spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
        });
    }, [t, getLabel]);

    // Store state
    const people = usePeopleStore((state) => state.people);
    const fetchPeople = usePeopleStore((state) => state.fetchPeople);
    const activeListName = usePeopleStore((state) => state.activeListName);
    const activeListId = usePeopleStore((state) => state.activeListId);
    const pendingChanges = usePeopleStore((state) => state.pendingChanges);
    const clearPendingChanges = usePeopleStore((state) => state.clearPendingChanges);

    // Unsaved list guard — prompts save/discard on navigation or browser close
    const { UnsavedChangesDialog } = useUnsavedListGuard({
        hasActiveList: !!activeListId,
        hasPendingChanges: pendingChanges,
        onSave: async () => {
            if (!activeListId) return;
            const content = people.map(p => ({
                id: p.id,
                virtualSpaceId: p.virtualSpaceId,
                data: p.data,
                assignedSpaceId: p.assignedSpaceId,
                listMemberships: p.listMemberships,
            }));
            await peopleApi.lists.update(activeListId, { content });
            clearPendingChanges();
        },
        onDiscard: () => {
            clearPendingChanges();
        },
    });

    // Fetch people from server on mount, then apply list overlay if a list is active
    useEffect(() => {
        const activeListId = usePeopleStore.getState().activeListId;

        // Always fetch fresh people from server first
        fetchPeople()
            .then(() => {
                if (activeListId) {
                    // A list is active — re-apply its assignments from _LIST_MEMBERSHIPS_
                    // (same logic as loadList uses: rebuild from memberships, NOT from stale snapshot)
                    const store = usePeopleStore.getState();
                    const list = store.peopleLists.find(l => l.id === activeListId);
                    if (list) {
                        const storageName = list.storageName || list.id.replace('aims-list-', '');
                        const updatedPeople = store.people.map(person => {
                            const memberships = (person as any)._LIST_MEMBERSHIPS_ as Array<{ listName: string; spaceId?: string }> | undefined;
                            const membership = memberships?.find((m: { listName: string }) => m.listName === storageName);
                            if (membership) {
                                return { ...person, assignedSpaceId: membership.spaceId || undefined };
                            }
                            return { ...person, assignedSpaceId: undefined };
                        });
                        store.setPeople(updatedPeople);
                        store.updateSpaceAllocation();
                        logger.info('PeopleManagerView', 'Applied list overlay on mount', {
                            listId: activeListId,
                            name: list.name,
                        });
                    } else {
                        // List not found locally — try fetching from DB
                        logger.warn('PeopleManagerView', 'Active list not found in store, clearing', { activeListId });
                        usePeopleStore.getState().setActiveListId(undefined);
                        usePeopleStore.getState().setActiveListName(undefined);
                    }
                }
            })
            .catch((err) => {
                logger.warn('PeopleManagerView', 'Failed to fetch people from server', {
                    error: err instanceof Error ? err.message : 'Unknown',
                });
            });
    }, [fetchPeople]);

    // Single source of truth: totalSpaces from settings, assignedSpaces computed from people
    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;
    const assignedSpaces = useMemo(() => people.filter(p => p.assignedSpaceId).length, [people]);
    const availableSpaces = totalSpaces - assignedSpaces;

    // Controller
    const peopleController = usePeopleController();

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

    const filters: PeopleFilters = {
        searchQuery: debouncedSearchQuery,
        assignmentStatus: assignmentFilter,
    };

    const { filteredPeople, assignedCount, unassignedCount } = usePeopleFilters(people, filters);

    // Sort state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Selection state for bulk operations
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog states
    const [personDialogOpen, setPersonDialogOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
    const [csvUploadOpen, setCSVUploadOpen] = useState(false);
    const [saveListOpen, setSaveListOpen] = useState(false);
    const [listsManagerOpen, setListsManagerOpen] = useState(false);
    const [spaceSelectDialogOpen, setSpaceSelectDialogOpen] = useState(false);
    const [spaceSelectPerson, setSpaceSelectPerson] = useState<Person | null>(null);

    // The articleName mapped field key (shown as dedicated "Name" column)
    const nameFieldKey = settings.solumMappingConfig?.mappingInfo?.articleName;

    // Get visible fields from mapping config for dynamic table columns
    const visibleFields = useMemo(() => {
        if (!settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settings.solumMappingConfig.mappingInfo?.articleId;
        const globalAssignments = settings.solumMappingConfig.globalFieldAssignments || {};
        const globalFieldKeys = Object.keys(globalAssignments);

        // Visible fields (excluding ID field, Name field, and global fields)
        return Object.entries(settings.solumMappingConfig.fields)
            .filter(([fieldKey, config]) => {
                if (idFieldKey && fieldKey === idFieldKey) return false;
                if (nameFieldKey && fieldKey === nameFieldKey) return false; // Exclude name field (dedicated column)
                if (globalFieldKeys.includes(fieldKey)) return false; // Skip global fields
                return config.visible !== false; // undefined = visible by default
            })
            .map(([fieldKey, config]) => ({
                key: fieldKey,
                labelEn: config.friendlyNameEn,
                labelHe: config.friendlyNameHe
            }));
    }, [settings.solumMappingConfig, nameFieldKey]);

    // Handle sort
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => {
            let direction: 'asc' | 'desc' = 'asc';
            if (prev && prev.key === key && prev.direction === 'asc') {
                direction = 'desc';
            }
            return { key, direction };
        });
    }, []);

    // Sort filtered people
    const sortedPeople = useMemo(() => {
        if (!sortConfig) return filteredPeople;

        return [...filteredPeople].sort((a, b) => {
            let aValue: string = '';
            let bValue: string = '';

            if (sortConfig.key === 'id') {
                aValue = a.id;
                bValue = b.id;
            } else if (sortConfig.key === 'assignedSpaceId') {
                aValue = a.assignedSpaceId || '';
                bValue = b.assignedSpaceId || '';
            } else {
                aValue = a.data[sortConfig.key] || '';
                bValue = b.data[sortConfig.key] || '';
            }

            const comparison = aValue.localeCompare(bValue);
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredPeople, sortConfig]);

    // Selection handlers
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(sortedPeople.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    }, [sortedPeople]);

    const handleSelectOne = useCallback((id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    // Action handlers
    const handleDelete = useCallback(async (id: string) => {
        const confirmed = await confirm({
            title: t('people.deletePerson'),
            message: t('common.dialog.areYouSure'),
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            peopleController.deletePerson(id);
        }
    }, [confirm, t, peopleController]);

    const handleEdit = useCallback((person: Person) => {
        setEditingPerson(person);
        setPersonDialogOpen(true);
    }, []);

    const handleAdd = useCallback(() => {
        setEditingPerson(undefined);
        setPersonDialogOpen(true);
    }, []);

    const handleAssignSpace = useCallback(async (person: Person) => {
        if (availableSpaces <= 0) {
            await confirm({
                title: tWithSpaceType('people.noAvailableSpaces'),
                message: tWithSpaceType('people.noAvailableSpacesMessage'),
                confirmLabel: t('common.close'),
                severity: 'warning',
                showCancel: false
            });
            return;
        }
        setSpaceSelectPerson(person);
        setSpaceSelectDialogOpen(true);
    }, [availableSpaces, confirm, t, tWithSpaceType]);

    const handleSpaceSelected = useCallback(async (spaceId: string) => {
        if (!spaceSelectPerson) return;
        await peopleController.assignSpaceToPerson(spaceSelectPerson.id, spaceId);
        setSpaceSelectDialogOpen(false);
        setSpaceSelectPerson(null);
    }, [spaceSelectPerson, peopleController]);

    const handleUnassignSpace = useCallback(async (person: Person) => {
        const confirmed = await confirm({
            title: tWithSpaceType('people.unassignSpace'),
            message: tWithSpaceType('people.unassignSpaceConfirm'),
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
            severity: 'warning'
        });

        if (confirmed) {
            try {
                await peopleController.unassignSpace(person.id);
            } catch (error: any) {
                logger.error('PeopleManagerView', 'Failed to unassign space', { error: error?.message || error });
            }
        }
    }, [confirm, t, tWithSpaceType, peopleController]);

    const handleBulkAssign = useCallback(async () => {
        const selectedPeople = sortedPeople.filter(p => selectedIds.has(p.id) && !p.assignedSpaceId);
        if (selectedPeople.length === 0) return;

        // Calculate how many can actually be assigned
        const countToAssign = Math.min(selectedPeople.length, availableSpaces);
        
        if (countToAssign === 0) {
            await confirm({
                title: tWithSpaceType('people.noAvailableSpaces'),
                message: tWithSpaceType('people.noAvailableSpacesMessage'),
                confirmLabel: t('common.close'),
                severity: 'warning',
                showCancel: false
            });
            return;
        }

        // Show different message if we're assigning fewer than selected
        const message = selectedPeople.length > availableSpaces
            ? tWithSpaceType('people.bulkAssignPartial', { 
                selected: selectedPeople.length, 
                available: countToAssign 
            })
            : tWithSpaceType('people.bulkAssignConfirmAuto', { count: countToAssign });

        const confirmed = await confirm({
            title: tWithSpaceType('people.bulkAssign'),
            message,
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
        });

        if (confirmed) {
            const usedSpaceIds = new Set(people.filter(p => p.assignedSpaceId).map(p => parseInt(p.assignedSpaceId!, 10)));
            const availableIds: number[] = [];
            for (let i = 1; i <= totalSpaces && availableIds.length < countToAssign; i++) {
                if (!usedSpaceIds.has(i)) {
                    availableIds.push(i);
                }
            }
            
            // Only assign to the first N people (up to available spaces)
            const peopleToAssign = selectedPeople.slice(0, countToAssign);
            const assignments = peopleToAssign.map((p, index) => ({
                personId: p.id,
                spaceId: String(availableIds[index])
            }));
            await peopleController.bulkAssignSpaces(assignments);
            setSelectedIds(new Set());
        }
    }, [sortedPeople, selectedIds, availableSpaces, people, totalSpaces, confirm, t, tWithSpaceType, peopleController]);

    const handleCancelAllAssignments = useCallback(async () => {
        const assignedPeople = people.filter(p => p.assignedSpaceId);
        if (assignedPeople.length === 0) {
            await confirm({
                title: t('people.noAssignments'),
                message: t('people.noAssignmentsToCancel'),
                confirmLabel: t('common.close'),
                severity: 'info',
                showCancel: false
            });
            return;
        }

        const confirmed = await confirm({
            title: t('people.cancelAllAssignments'),
            message: t('people.cancelAllAssignmentsConfirm', { count: assignedPeople.length }),
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            await peopleController.cancelAllAssignments();
        }
    }, [people, confirm, t, peopleController]);

    return (
        <Box>
            {/* Header Section */}
            <PeopleToolbar
                activeListName={activeListName ?? null}
                totalPeople={people.length}
                onAddPerson={handleAdd}
                onUploadCSV={() => setCSVUploadOpen(true)}
            />

            {/* Space Allocation Panel */}
            <PeopleStatsPanel
                totalSpaces={totalSpaces}
                assignedSpaces={assignedSpaces}
                availableSpaces={availableSpaces}
                assignedCount={assignedCount}
                unassignedCount={unassignedCount}
                onTotalSpacesChange={peopleController.setTotalSpaces}
            />

             {/* List Management Panel */}
            <PeopleListPanel
                onManageLists={() => setListsManagerOpen(true)}
                onSaveAsNew={() => setSaveListOpen(true)}
            />

            {/* Search and Filter Bar */}
            <PeopleFiltersBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                assignmentFilter={assignmentFilter}
                onAssignmentFilterChange={setAssignmentFilter}
            />

            {/* Bulk Actions */}
            <PeopleBulkActionsBar
                selectedCount={selectedIds.size}
                onBulkAssign={handleBulkAssign}
                onCancelAllAssignments={handleCancelAllAssignments}
                assignedCount={assignedCount}
            />

            {/* People Table */}
            <PeopleTable
                people={sortedPeople}
                visibleFields={visibleFields}
                nameFieldKey={nameFieldKey}
                selectedIds={selectedIds}
                sortConfig={sortConfig}
                searchQuery={searchQuery}
                assignmentFilter={assignmentFilter}
                onSelectAll={handleSelectAll}
                onSelectOne={handleSelectOne}
                onSort={handleSort}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAssignSpace={handleAssignSpace}
                onUnassignSpace={handleUnassignSpace}
            />


            {/* Dialogs - Lazy loaded */}
            <Suspense fallback={null}>
                {personDialogOpen && (
                    <PersonDialog
                        open={personDialogOpen}
                        onClose={() => setPersonDialogOpen(false)}
                        person={editingPerson}
                    />
                )}

                {csvUploadOpen && (
                    <CSVUploadDialog
                        open={csvUploadOpen}
                        onClose={() => setCSVUploadOpen(false)}
                    />
                )}

                {saveListOpen && (
                    <PeopleSaveListDialog
                        open={saveListOpen}
                        onClose={() => setSaveListOpen(false)}
                    />
                )}

                {listsManagerOpen && (
                    <PeopleListsManagerDialog
                        open={listsManagerOpen}
                        onClose={() => setListsManagerOpen(false)}
                    />
                )}

                {spaceSelectDialogOpen && (
                    <SpaceSelectionDialog
                        open={spaceSelectDialogOpen}
                        onClose={() => {
                            setSpaceSelectDialogOpen(false);
                            setSpaceSelectPerson(null);
                        }}
                        onSelect={handleSpaceSelected}
                        personId={spaceSelectPerson?.id || ''}
                        personName={spaceSelectPerson ? Object.values(spaceSelectPerson.data)[0] : undefined}
                    />
                )}
            </Suspense>

            <ConfirmDialog />
            <UnsavedChangesDialog />
        </Box>
    );
}
