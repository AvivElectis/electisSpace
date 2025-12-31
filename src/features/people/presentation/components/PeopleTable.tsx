import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    TableSortLabel,
    Typography,
} from '@mui/material';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { PeopleTableRow } from './PeopleTableRow';
import type { Person } from '../../domain/types';

interface VisibleField {
    key: string;
    labelEn: string;
    labelHe: string;
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface PeopleTableProps {
    people: Person[];
    visibleFields: VisibleField[];
    selectedIds: Set<string>;
    sortConfig: SortConfig | null;
    searchQuery: string;
    assignmentFilter: 'all' | 'assigned' | 'unassigned';
    onSelectAll: (checked: boolean) => void;
    onSelectOne: (id: string, checked: boolean) => void;
    onSort: (key: string) => void;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    onAssignSpace: (person: Person) => void;
    onUnassignSpace: (person: Person) => void;
}

/**
 * PeopleTable - Main data table for people list
 */
export function PeopleTable({
    people,
    visibleFields,
    selectedIds,
    sortConfig,
    searchQuery,
    assignmentFilter,
    onSelectAll,
    onSelectOne,
    onSort,
    onEdit,
    onDelete,
    onAssignSpace,
    onUnassignSpace,
}: PeopleTableProps) {
    const { t, i18n } = useTranslation();
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback(
        (key: string, options?: Record<string, unknown>) => {
            return t(key, {
                ...options,
                spaceTypeSingular: getLabel('singular').toLowerCase(),
                spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
                spaceTypePlural: getLabel('plural').toLowerCase(),
                spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
            });
        },
        [t, getLabel]
    );

    const allSelected = people.length > 0 && selectedIds.size === people.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < people.length;

    return (
        <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small" aria-label="people table">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">
                            <Checkbox
                                indeterminate={someSelected}
                                checked={allSelected}
                                onChange={(e) => onSelectAll(e.target.checked)}
                            />
                        </TableCell>
                        {visibleFields.map((field) => (
                            <TableCell key={field.key} sx={{ fontWeight: 600, textAlign: 'start' }}>
                                <TableSortLabel
                                    active={sortConfig?.key === field.key}
                                    direction={sortConfig?.key === field.key ? sortConfig.direction : 'asc'}
                                    onClick={() => onSort(field.key)}
                                >
                                    {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                </TableSortLabel>
                            </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 600, textAlign: 'start' }}>
                            <TableSortLabel
                                active={sortConfig?.key === 'assignedSpaceId'}
                                direction={sortConfig?.key === 'assignedSpaceId' ? sortConfig.direction : 'asc'}
                                onClick={() => onSort('assignedSpaceId')}
                            >
                                {tWithSpaceType('people.assignedSpace')}
                            </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'start' }}>{t('people.lists')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'start' }}>{t('people.aimsStatus')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'start' }}>{t('common.actions')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {people.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={visibleFields.length + 5} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {searchQuery || assignmentFilter !== 'all'
                                        ? t('people.noResults')
                                        : t('people.noPeopleYet')}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        people.map((person) => (
                            <PeopleTableRow
                                key={person.id}
                                person={person}
                                visibleFields={visibleFields}
                                isSelected={selectedIds.has(person.id)}
                                onSelect={onSelectOne}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAssignSpace={onAssignSpace}
                                onUnassignSpace={onUnassignSpace}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
