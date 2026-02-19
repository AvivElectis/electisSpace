import { Paper, Stack, Typography, Button, Box, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface PeopleBulkActionsBarProps {
    selectedCount: number;
    canEdit?: boolean;
    onBulkAssign: () => void;
    onCancelAllAssignments: () => void;
    onRemoveSelected: () => void;
    assignedCount: number;
}

/**
 * PeopleBulkActionsBar - Actions bar for bulk operations and cancel all assignments
 * Mobile: icon-only buttons with tooltips
 * Desktop: full text buttons
 */
export function PeopleBulkActionsBar({
    selectedCount,
    canEdit = true,
    onBulkAssign,
    onCancelAllAssignments,
    onRemoveSelected,
    assignedCount,
}: PeopleBulkActionsBarProps) {
    const { t } = useTranslation();
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

    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            {/* Bulk Selection Actions */}
            {selectedCount > 0 ? (
                <Paper sx={{ p: isMobile ? 1 : 1.5, bgcolor: 'action.selected' }}>
                    <Stack direction="row" gap={isMobile ? 0.5 : 2} alignItems="center">
                        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : undefined }}>
                            {t('people.selectedCount', { count: selectedCount })}
                        </Typography>
                        {isMobile ? (
                            <>
                                <Tooltip title={tWithSpaceType('people.autoAssignSpaces')}>
                                    <span>
                                    <IconButton size="small" color="primary" disabled={!canEdit} onClick={onBulkAssign}>
                                        <AutoAwesomeIcon fontSize="small" />
                                    </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title={t('people.removeSelectedPeople')}>
                                    <span>
                                    <IconButton size="small" color="error" disabled={!canEdit} onClick={onRemoveSelected}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Button size="small" startIcon={<AutoAwesomeIcon />} disabled={!canEdit} onClick={onBulkAssign}>
                                    {tWithSpaceType('people.autoAssignSpaces')}
                                </Button>
                                <Button size="small" color="error" startIcon={<DeleteIcon />} disabled={!canEdit} onClick={onRemoveSelected}>
                                    {t('people.removeSelectedPeople')}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Paper>
            ) : (
                <Box />
            )}

            {/* Cancel All Assignments — desktop only (on mobile it's in PeopleFiltersBar) */}
            {!isMobile && (
                <Button
                    variant="text"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={onCancelAllAssignments}
                    disabled={!canEdit || assignedCount === 0}
                    size="small"
                >
                    {t('people.cancelAllAssignments')}
                </Button>
            )}
        </Stack>
    );
}
