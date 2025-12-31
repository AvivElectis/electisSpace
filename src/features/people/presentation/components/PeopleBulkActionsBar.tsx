import { Paper, Stack, Typography, Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SendIcon from '@mui/icons-material/Send';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface PeopleBulkActionsBarProps {
    selectedCount: number;
    onBulkAssign: () => void;
    onBulkPostToAims: () => void;
}

/**
 * PeopleBulkActionsBar - Actions bar shown when people are selected
 */
export function PeopleBulkActionsBar({
    selectedCount,
    onBulkAssign,
    onBulkPostToAims,
}: PeopleBulkActionsBarProps) {
    const { t } = useTranslation();
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback(
        (key: string, options?: Record<string, unknown>) => {
            return t(key, {
                ...options,
                spaceTypeSingular: getLabel('singular').toLowerCase(),
                spaceTypePlural: getLabel('plural').toLowerCase(),
            });
        },
        [t, getLabel]
    );

    if (selectedCount === 0) {
        return null;
    }

    return (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.selected' }}>
            <Stack direction="row" gap={2} alignItems="center">
                <Typography variant="body2">
                    {t('people.selectedCount', { count: selectedCount })}
                </Typography>
                <Button size="small" startIcon={<AssignmentIcon />} onClick={onBulkAssign}>
                    {tWithSpaceType('people.assignSpaces')}
                </Button>
                <Button size="small" startIcon={<SendIcon />} onClick={onBulkPostToAims} color="success">
                    {t('people.postToAims')}
                </Button>
            </Stack>
        </Paper>
    );
}
