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
    Box,
    Stack,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { PeopleTableRow, type PeopleTableTranslations } from './PeopleTableRow';
import type { Person } from '../../domain/types';

interface VisibleField {
    key: string;
    labelEn: string;
    labelHe: string;
    globalValue?: string; // If set, this value is used for all rows (globally assigned field)
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface PeopleTableProps {
    people: Person[];
    visibleFields: VisibleField[];
    nameFieldKey?: string;
    nameFieldLabel?: string;
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
    nameFieldKey,
    nameFieldLabel,
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

    // Create translations object once - passed to all rows
    const rowTranslations = useMemo<PeopleTableTranslations>(() => ({
        syncedToAims: t('people.syncedToAims'),
        syncPending: t('people.syncPending'),
        syncError: t('people.syncError'),
        notSynced: t('people.notSynced'),
        unassigned: t('people.unassigned'),
        inListsFormat: (count: number) => t('people.inLists', { count }),
        assignSpace: tWithSpaceType('people.assignSpace'),
        unassignSpace: tWithSpaceType('people.unassignSpace'),
        edit: t('common.edit'),
        delete: t('common.delete'),
    }), [t, tWithSpaceType]);

    const allSelected = people.length > 0 && selectedIds.size === people.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < people.length;

    // Mobile Card View
    if (isMobile) {
        return (
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                {/* Select All Header */}
                <Paper sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1, position: 'sticky', top: 0, zIndex: 1 }}>
                    <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                        {selectedIds.size > 0 
                            ? t('people.selectedCount', { count: selectedIds.size })
                            : t('people.selectAll')}
                    </Typography>
                </Paper>

                {people.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery || assignmentFilter !== 'all'
                                ? t('people.noResults')
                                : t('people.noPeopleYet')}
                        </Typography>
                    </Paper>
                ) : (
                    <Stack gap={1}>
                        {people.map((person, index) => (
                            <Card 
                                key={person.id} 
                                variant="outlined"
                                sx={{ 
                                    bgcolor: selectedIds.has(person.id) ? 'action.selected' : 'background.paper',
                                }}
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    {/* Row 1: Checkbox + Index + Name + Assignment Status */}
                                    <Stack direction="row" alignItems="center" gap={1} mb={1}>
                                        <Checkbox
                                            checked={selectedIds.has(person.id)}
                                            onChange={(e) => onSelectOne(person.id, e.target.checked)}
                                            size="small"
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24 }}>
                                            #{index + 1}
                                        </Typography>
                                        {nameFieldKey && person.data[nameFieldKey] && (
                                            <Typography variant="subtitle2" fontWeight={600} noWrap>
                                                {person.data[nameFieldKey]}
                                            </Typography>
                                        )}
                                        <Box sx={{ flex: 1 }} />
                                        {/* Assignment Status Chip */}
                                        {person.assignedSpaceId ? (
                                            <Chip label={person.assignedSpaceId} size="small" color="success" sx={{ p: 1 }} />
                                        ) : (
                                            <Chip label={t('people.unassigned')} size="small" variant="outlined" sx={{ p: 1 }} />
                                        )}
                                    </Stack>

                                    {/* Row 2: All Visible Fields (2 columns) */}
                                    <Box sx={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(2, 1fr)', 
                                        gap: 0.5, 
                                        mb: 1,
                                        pl: 1
                                    }}>
                                        {visibleFields.map((field) => (
                                            <Box key={field.key}>
                                                <Typography variant="caption" color="text.secondary" component="div">
                                                    {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                                </Typography>
                                                <Typography variant="body2" noWrap>
                                                    {field.globalValue || person.data[field.key] || '-'}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>

                                    {/* Row 3: Lists + AIMS Status + Actions */}
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                        <Stack direction="row" gap={1} alignItems="center">
                                            {/* Lists indicator */}
                                            {person.listMemberships && person.listMemberships.length > 0 && (
                                                <Chip 
                                                    label={t('people.inLists', { count: person.listMemberships.length })} 
                                                    size="small" 
                                                    variant="outlined"
                                                    color="info"
                                                    sx={{ p: 1 }}
                                                />
                                            )}
                                        </Stack>
                                        <Stack direction="row" gap={0.5}>
                                            {!person.assignedSpaceId && (
                                                <Tooltip title={tWithSpaceType('people.assignSpace')}>
                                                    <IconButton size="small" color="success" onClick={() => onAssignSpace(person)}>
                                                        <AssignmentIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {person.assignedSpaceId && (
                                                <Tooltip title={tWithSpaceType('people.unassignSpace')}>
                                                    <IconButton size="small" color="warning" onClick={() => onUnassignSpace(person)}>
                                                        <PersonRemoveIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title={t('common.edit')}>
                                                <IconButton size="small" color="primary" onClick={() => onEdit(person)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.delete')}>
                                                <IconButton size="small" color="error" onClick={() => onDelete(person.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Box>
        );
    }

    // Desktop Table View
    return (
        <TableContainer component={Paper} sx={{ maxHeight: { xs: '50vh', sm: '55vh', md: '60vh' } }}>
            <Table stickyHeader size="small" aria-label="people table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: 50 }}>#</TableCell>
                        <TableCell padding="checkbox">
                            <Checkbox
                                indeterminate={someSelected}
                                checked={allSelected}
                                onChange={(e) => onSelectAll(e.target.checked)}
                            />
                        </TableCell>
                        {nameFieldKey && (
                            <TableCell sx={{ fontWeight: 600, textAlign: 'start' }}>
                                <TableSortLabel
                                    active={sortConfig?.key === nameFieldKey}
                                    direction={sortConfig?.key === nameFieldKey ? sortConfig.direction : 'asc'}
                                    onClick={() => onSort(nameFieldKey)}
                                >
                                    {nameFieldLabel || t('people.name')}
                                </TableSortLabel>
                            </TableCell>
                        )}
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
                            <TableCell colSpan={visibleFields.length + (nameFieldKey ? 7 : 6)} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {searchQuery || assignmentFilter !== 'all'
                                        ? t('people.noResults')
                                        : t('people.noPeopleYet')}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        people.map((person, index) => (
                            <PeopleTableRow
                                key={person.id}
                                index={index + 1}
                                person={person}
                                visibleFields={visibleFields}
                                nameFieldKey={nameFieldKey}
                                isSelected={selectedIds.has(person.id)}
                                translations={rowTranslations}
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
