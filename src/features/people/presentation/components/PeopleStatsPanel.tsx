import { Box, Paper, Stack, TextField, LinearProgress, Typography, Chip, Collapse, IconButton, useMediaQuery, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface PeopleStatsPanelProps {
    totalSpaces: number;
    assignedSpaces: number;
    availableSpaces: number;
    assignedCount: number;
    unassignedCount: number;
    canEdit?: boolean;
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
    canEdit = true,
    onTotalSpacesChange,
}: PeopleStatsPanelProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [expanded, setExpanded] = useState(false);
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

    // Mobile: compact collapsible stats
    if (isMobile) {
        return (
            <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                {/* Compact header — always visible */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 1.5, py: 1, cursor: 'pointer' }}
                    onClick={() => setExpanded(!expanded)}
                >
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                            {assignedCount}/{totalSpaces}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={allocationProgress}
                            sx={{ flex: 1, height: 6, borderRadius: 4, maxWidth: 120 }}
                            color={allocationProgress > 90 ? 'warning' : 'primary'}
                        />
                        <Chip
                            label={`${assignedCount} ${t('people.assigned')}`}
                            color="success"
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                    </Stack>
                    <IconButton size="small">
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </Stack>

                {/* Expanded details */}
                <Collapse in={expanded}>
                    <Box sx={{ px: 1.5, pb: 1.5 }}>
                        <Stack direction="row" gap={1} alignItems="center" mb={1}>
                            <TextField
                                label={tWithSpaceType('people.totalSpaces')}
                                type="number"
                                size="small"
                                value={totalSpaces}
                                onChange={(e) => onTotalSpacesChange(Number(e.target.value))}
                                disabled={!canEdit}
                                sx={{
                                    width: 80,
                                    '& .MuiInputBase-input': { px: 1, py: 0.5, fontSize: '0.875rem' },
                                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                                }}
                                inputProps={{ min: 0 }}
                            />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {availableSpaces} {t('people.available')}
                                </Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" gap={1}>
                            <Chip label={`${assignedCount} ${t('people.assigned')}`} color="success" size="small" sx={{ fontSize: '0.7rem' }} />
                            <Chip label={`${unassignedCount} ${t('people.unassigned')}`} color="default" size="small" sx={{ fontSize: '0.7rem' }} />
                        </Stack>
                    </Box>
                </Collapse>
            </Paper>
        );
    }

    // Desktop: full layout (unchanged)
    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" gap={3} alignItems="flex-start">
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, width: '100%' }}>
                    <TextField
                        label={tWithSpaceType('people.totalSpaces')}
                        type="number"
                        size="small"
                        value={totalSpaces}
                        onChange={(e) => onTotalSpacesChange(Number(e.target.value))}
                        disabled={!canEdit}
                        sx={{
                            width: 'fit-content',
                            '& .MuiInputBase-input': { px: 1.5, py: 1, fontSize: '1rem' },
                            '& .MuiInputLabel-root': { fontSize: '1rem' },
                        }}
                        inputProps={{ min: 0 }}
                    />
                    <Box sx={{ flex: 1, width: 'auto' }}>
                        <Stack direction="row" justifyContent="space-between" gap={1} mb={0.5}>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                {tWithSpaceType('people.spacesAssigned', { assigned: assignedCount, total: totalSpaces })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
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
                </Box>

                <Stack direction="row" gap={1}>
                    <Chip label={`${assignedCount} ${t('people.assigned')}`} color="success" size="small" sx={{ p: 1, fontSize: '0.8125rem' }} />
                    <Chip label={`${unassignedCount} ${t('people.unassigned')}`} color="default" size="small" sx={{ p: 1, fontSize: '0.8125rem' }} />
                </Stack>
            </Stack>
        </Paper>
    );
}
