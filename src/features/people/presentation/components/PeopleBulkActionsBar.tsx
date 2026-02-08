import { Paper, Stack, Typography, Button, Box } from '@mui/material';
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

            {/* Cancel All Assignments - Always visible on right */}
            <Button
                variant="text"
                color="error"
                startIcon={<CancelIcon />}
                onClick={onCancelAllAssignments}
                disabled={assignedCount === 0}
            >
                {t('people.cancelAllAssignments')}
            </Button>
        </Stack>
    );
}
