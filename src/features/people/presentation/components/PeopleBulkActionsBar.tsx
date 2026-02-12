import { Paper, Stack, Typography, Button, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface PeopleBulkActionsBarProps {
    selectedCount: number;
    onBulkAssign: () => void;
    onCancelAllAssignments: () => void;
    onRemoveSelected: () => void;
    assignedCount: number;
    assignmentFilter?: 'all' | 'assigned' | 'unassigned';
    onAssignmentFilterChange?: (value: 'all' | 'assigned' | 'unassigned') => void;
}

/**
 * PeopleBulkActionsBar - Actions bar for bulk operations and cancel all assignments
 */
export function PeopleBulkActionsBar({
    selectedCount,
    onBulkAssign,
    onCancelAllAssignments,
    onRemoveSelected,
    assignedCount,
    assignmentFilter,
    onAssignmentFilterChange,
}: PeopleBulkActionsBarProps) {
    const { t } = useTranslation();
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

    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            {/* Bulk Selection Actions */}
            {selectedCount > 0 ? (
                <Paper sx={{ p: 1.5, bgcolor: 'action.selected' }}>
                    <Stack direction="row" gap={2} alignItems="center">
                        <Typography variant="body2">
                            {t('people.selectedCount', { count: selectedCount })}
                        </Typography>
                        <Button size="small" startIcon={<AutoAwesomeIcon />} onClick={onBulkAssign}>
                            {tWithSpaceType('people.autoAssignSpaces')}
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={onRemoveSelected}>
                            {t('people.removeSelectedPeople')}
                        </Button>
                    </Stack>
                </Paper>
            ) : (
                <Box />
            )}

            {/* Right side: Status filter (mobile only) + Cancel All */}
            <Stack direction="row" alignItems="center" gap={1}>
                {/* Status filter - mobile only (hidden on desktop, shown in PeopleFiltersBar) */}
                {assignmentFilter !== undefined && onAssignmentFilterChange && (
                    <FormControl size="small" sx={{ minWidth: 120, display: { xs: 'flex', md: 'none' } }}>
                        <InputLabel>{t('people.filterStatus')}</InputLabel>
                        <Select
                            value={assignmentFilter}
                            label={t('people.filterStatus')}
                            onChange={(e) => onAssignmentFilterChange(e.target.value as 'all' | 'assigned' | 'unassigned')}
                        >
                            <MenuItem value="all">{t('people.all')}</MenuItem>
                            <MenuItem value="assigned">{t('people.assigned')}</MenuItem>
                            <MenuItem value="unassigned">{t('people.unassigned')}</MenuItem>
                        </Select>
                    </FormControl>
                )}
                <Button
                    variant="text"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={onCancelAllAssignments}
                    disabled={assignedCount === 0}
                    size="small"
                >
                    {t('people.cancelAllAssignments')}
                </Button>
            </Stack>
        </Stack>
    );
}
