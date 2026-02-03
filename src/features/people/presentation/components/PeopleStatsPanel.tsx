import { Box, Paper, Stack, TextField, LinearProgress, Typography, Chip } from '@mui/material';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface PeopleStatsPanelProps {
    totalSpaces: number;
    assignedSpaces: number;
    availableSpaces: number;
    assignedCount: number;
    unassignedCount: number;
    onTotalSpacesChange: (value: number) => void;
}

/**
 * PeopleStatsPanel - Space allocation statistics and progress
 */
export function PeopleStatsPanel({
    totalSpaces,
    assignedSpaces,
    availableSpaces,
    assignedCount,
    unassignedCount,
    onTotalSpacesChange,
}: PeopleStatsPanelProps) {
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

    // Space allocation progress
    const allocationProgress = totalSpaces > 0 ? (assignedSpaces / totalSpaces) * 100 : 0;

    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems="center">
                <TextField
                    label={tWithSpaceType('people.totalSpaces')}
                    type="number"
                    size="small"
                    value={totalSpaces}
                    onChange={(e) => onTotalSpacesChange(Number(e.target.value))}
                    sx={{ width: { xs: '100%', sm: 150 } }}
                    inputProps={{ min: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}>
                    <Stack direction="row" justifyContent="space-between" gap={1} mb={0.5}>
                        <Typography variant="body2">
                            {tWithSpaceType('people.spacesAssigned', { assigned: assignedCount, total: totalSpaces })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {availableSpaces} {t('people.available')}
                        </Typography>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={allocationProgress}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={allocationProgress > 90 ? 'warning' : 'primary'}
                    />
                </Box>
                <Stack direction="row" gap={1}>
                    <Chip label={`${assignedCount} ${t('people.assigned')}`} color="success" size="small" sx={{ p: 1 }} />
                    <Chip label={`${unassignedCount} ${t('people.unassigned')}`} color="default" size="small" sx={{ p: 1 }} />
                </Stack>
            </Stack>
        </Paper>
    );
}
