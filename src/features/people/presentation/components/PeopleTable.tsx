import {
    Paper,
    Checkbox,
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { List as VirtualList } from 'react-window';
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

// Row height for virtualized list
const ROW_HEIGHT = 52;

// Shared header cell style
const headerCellSx = {
    display: 'flex',
    alignItems: 'center',
    px: 1,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { color: 'primary.main' },
} as const;

/**
 * Sort indicator icon
 */
function SortIndicator({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
    if (!active) return null;
    return direction === 'asc'
        ? <ArrowUpwardIcon sx={{ fontSize: 16, ml: 0.5, color: 'primary.main' }} />
        : <ArrowDownwardIcon sx={{ fontSize: 16, ml: 0.5, color: 'primary.main' }} />;
}

/**
 * PeopleTable - Main data table for people list
 * Desktop: virtualized with react-window for performance
 * Mobile: card-based layout (not virtualized, kept simple)
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

    // Desktop Virtualized View — hooks must be called before any early return
    const VirtualRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const person = people[index];
        if (!person) return null;
        return (
            <PeopleTableRow
                index={index + 1}
                person={person}
                visibleFields={visibleFields}
                nameFieldKey={nameFieldKey}
                isSelected={selectedIds.has(person.id)}
                translations={rowTranslations}
                style={style}
                onSelect={onSelectOne}
                onEdit={onEdit}
                onDelete={onDelete}
                onAssignSpace={onAssignSpace}
                onUnassignSpace={onUnassignSpace}
            />
        );
    }, [people, visibleFields, nameFieldKey, selectedIds, rowTranslations, onSelectOne, onEdit, onDelete, onAssignSpace, onUnassignSpace]);

    // Expanded card state for mobile tap-to-expand
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    const handleCardTap = useCallback((personId: string) => {
        setExpandedCardId(prev => prev === personId ? null : personId);
    }, []);

    // Mobile Card View — compact by default, tap to expand
    if (isMobile) {
        return (
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                {/* Select All Header */}
                <Paper sx={{ p: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1, position: 'sticky', top: 0, zIndex: 1 }}>
                    <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        size="small"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
                    <Stack gap={0.5}>
                        {people.map((person, index) => {
                            const isExpanded = expandedCardId === person.id;
                            return (
                                <Card
                                    key={person.id}
                                    variant="outlined"
                                    sx={{
                                        bgcolor: selectedIds.has(person.id) ? 'action.selected' : 'background.paper',
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                        {/* Compact row — always visible */}
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            gap={0.5}
                                            onClick={() => handleCardTap(person.id)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <Checkbox
                                                checked={selectedIds.has(person.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onSelectOne(person.id, e.target.checked);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18, fontSize: '0.7rem' }}>
                                                {index + 1}
                                            </Typography>
                                            {nameFieldKey && person.data[nameFieldKey] && (
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.85rem' }}>
                                                    {person.data[nameFieldKey]}
                                                </Typography>
                                            )}
                                            {!nameFieldKey && (
                                                <Box sx={{ flex: 1 }} />
                                            )}
                                            {person.assignedSpaceId ? (
                                                <Chip label={person.assignedSpaceId} size="small" color="success" sx={{ height: 22, fontSize: '0.7rem' }} />
                                            ) : (
                                                <Chip label={t('people.unassigned')} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                            )}
                                        </Stack>

                                        {/* Expanded details — shown on tap */}
                                        {isExpanded && (
                                            <Box sx={{ mt: 1, pl: 4.5 }}>
                                                {/* Visible Fields (2 columns) */}
                                                {visibleFields.length > 0 && (
                                                    <Box sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                        gap: 0.25,
                                                        mb: 1,
                                                    }}>
                                                        {visibleFields.map((field) => (
                                                            <Box key={field.key}>
                                                                <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: '0.65rem' }}>
                                                                    {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                                                </Typography>
                                                                <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>
                                                                    {field.globalValue || person.data[field.key] || '-'}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}

                                                {/* Lists + Actions */}
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                                    <Stack direction="row" gap={0.5} alignItems="center">
                                                        {person.listMemberships && person.listMemberships.length > 0 && (
                                                            <Chip
                                                                label={t('people.inLists', { count: person.listMemberships.length })}
                                                                size="small"
                                                                variant="outlined"
                                                                color="info"
                                                                sx={{ height: 22, fontSize: '0.7rem' }}
                                                            />
                                                        )}
                                                    </Stack>
                                                    <Stack direction="row" gap={1}>
                                                        {!person.assignedSpaceId && (
                                                            <Tooltip title={tWithSpaceType('people.assignSpace')}>
                                                                <IconButton size="medium" color="success" onClick={() => onAssignSpace(person)}>
                                                                    <AssignmentIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {person.assignedSpaceId && (
                                                            <Tooltip title={tWithSpaceType('people.unassignSpace')}>
                                                                <IconButton size="medium" color="warning" onClick={() => onUnassignSpace(person)}>
                                                                    <PersonRemoveIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title={t('common.edit')}>
                                                            <IconButton size="medium" color="primary" onClick={() => onEdit(person)}>
                                                                <EditIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={t('common.delete')}>
                                                            <IconButton size="medium" color="error" onClick={() => onDelete(person.id)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        );
    }

    // Calculate list height - cap at 60vh equivalent
    const listHeight = Math.min(people.length * ROW_HEIGHT, window.innerHeight * 0.6);

    const TypedVirtualList = VirtualList as any;

    // Desktop Virtualized View
    return (
        <Paper sx={{ overflow: 'hidden' }}>
            {/* Sticky Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    py: 1,
                    minHeight: 42,
                }}
            >
                {/* Index */}
                <Box sx={{ ...headerCellSx, width: 50, flexShrink: 0, justifyContent: 'center', cursor: 'default' }}>
                    #
                </Box>
                {/* Checkbox */}
                <Box sx={{ ...headerCellSx, width: 48, flexShrink: 0, justifyContent: 'center', cursor: 'default' }}>
                    <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={(e) => onSelectAll(e.target.checked)}
                        size="small"
                    />
                </Box>
                {/* Name */}
                {nameFieldKey && (
                    <Box sx={{ ...headerCellSx, flex: 1, minWidth: 100 }} onClick={() => onSort(nameFieldKey)}>
                        {nameFieldLabel || t('people.name')}
                        <SortIndicator active={sortConfig?.key === nameFieldKey} direction={sortConfig?.key === nameFieldKey ? sortConfig.direction : 'asc'} />
                    </Box>
                )}
                {/* Dynamic fields */}
                {visibleFields.map((field) => (
                    <Box key={field.key} sx={{ ...headerCellSx, flex: 1, minWidth: 80 }} onClick={() => onSort(field.key)}>
                        {i18n.language === 'he' ? field.labelHe : field.labelEn}
                        <SortIndicator active={sortConfig?.key === field.key} direction={sortConfig?.key === field.key ? sortConfig.direction : 'asc'} />
                    </Box>
                ))}
                {/* Assigned Space */}
                <Box sx={{ ...headerCellSx, width: 120, flexShrink: 0 }} onClick={() => onSort('assignedSpaceId')}>
                    {tWithSpaceType('people.assignedSpace')}
                    <SortIndicator active={sortConfig?.key === 'assignedSpaceId'} direction={sortConfig?.key === 'assignedSpaceId' ? sortConfig.direction : 'asc'} />
                </Box>
                {/* Lists */}
                <Box sx={{ ...headerCellSx, width: 120, flexShrink: 0, cursor: 'default' }}>
                    {t('people.lists')}
                </Box>
                {/* AIMS Status */}
                <Box sx={{ ...headerCellSx, width: 80, flexShrink: 0, cursor: 'default' }}>
                    {t('people.aimsStatus')}
                </Box>
                {/* Actions */}
                <Box sx={{ ...headerCellSx, width: 160, flexShrink: 0, cursor: 'default' }}>
                    {t('common.actions')}
                </Box>
            </Box>

            {/* Virtualized Body */}
            {people.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {searchQuery || assignmentFilter !== 'all'
                            ? t('people.noResults')
                            : t('people.noPeopleYet')}
                    </Typography>
                </Box>
            ) : (
                <TypedVirtualList
                    rowCount={people.length}
                    rowHeight={ROW_HEIGHT}
                    rowComponent={VirtualRow}
                    rowProps={{}}
                    style={{ height: listHeight, maxHeight: '60vh' }}
                />
            )}
        </Paper>
    );
}
