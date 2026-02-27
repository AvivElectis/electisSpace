/**
 * Labels Overview Component
 *
 * Displays label stats, battery/signal distributions, and includes label search.
 */

import { useEffect } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, CircularProgress, Alert,
    useMediaQuery, useTheme,
} from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useTranslation } from 'react-i18next';
import { useLabelsOverview } from '../application/useLabelsOverview';
import { LabelHistory } from './LabelHistory';

interface LabelsOverviewProps {
    storeId: string;
}

const cardsSetting = {
    boxShadow: 'none',
    bgcolor: 'transparent',
    border: 'none',
    '&:hover': { boxShadow: '0px 0px 1px 1px #6666663b' },
};

function DistributionBar({ items }: { items: { label: string; value: number; color: string }[] }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    return (
        <Box>
            <Stack direction="row" sx={{ mb: 0.5, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                {items.map((item) => (
                    <Box
                        key={item.label}
                        sx={{
                            width: `${(item.value / total) * 100}%`,
                            bgcolor: item.color,
                            minWidth: item.value > 0 ? 4 : 0,
                        }}
                    />
                ))}
            </Stack>
            <Stack direction="row" gap={2} flexWrap="wrap">
                {items.map((item) => (
                    <Stack key={item.label} direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                        <Typography variant="caption" color="text.secondary">
                            {item.label}: {item.value}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}

export function LabelsOverview({ storeId }: LabelsOverviewProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        labelsLoading, labelsError, stats,
        fetchLabels, fetchUnassignedLabels,
    } = useLabelsOverview(storeId);

    useEffect(() => {
        fetchLabels();
        fetchUnassignedLabels();
    }, [fetchLabels, fetchUnassignedLabels]);

    if (labelsLoading && stats.total === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (labelsError) {
        return <Alert severity="error" sx={{ mb: 2 }}>{labelsError}</Alert>;
    }

    const batteryItems = [
        { label: t('aims.batteryGood'), value: stats.battery.good, color: theme.palette.success.main },
        { label: t('aims.batteryLow'), value: stats.battery.low, color: theme.palette.warning.main },
        { label: t('aims.batteryCritical'), value: stats.battery.critical, color: theme.palette.error.main },
    ];

    const signalItems = [
        { label: t('aims.signalExcellent'), value: stats.signal.excellent, color: theme.palette.success.main },
        { label: t('aims.signalGood'), value: stats.signal.good, color: theme.palette.success.light },
        { label: t('aims.signalNormal'), value: stats.signal.normal, color: theme.palette.warning.main },
        { label: t('aims.signalBad'), value: stats.signal.bad, color: theme.palette.error.main },
    ];

    return (
        <Box>
            {/* Stats */}
            {isMobile ? (
                <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 2, px: 1 }} flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {stats.total} {t('aims.labels')}
                    </Typography>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="caption">{stats.online}</Typography>
                    </Stack>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="caption">{stats.offline}</Typography>
                    </Stack>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                        <Typography variant="caption">{stats.unassignedCount}</Typography>
                    </Stack>
                </Stack>
            ) : (
                <Stack direction="row" gap={2} sx={{ mb: 3 }}>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <LabelIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {stats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.totalLabels')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <WifiIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {stats.online}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.onlineLabels')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'error.light', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <WifiOffIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {stats.offline}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.offlineLabels')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'text.disabled', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <LinkOffIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {stats.unassignedCount}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.unassignedLabels')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            )}

            {/* Distribution bars */}
            {stats.total > 0 && (
                <Stack gap={2} sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('aims.batteryDistribution')}</Typography>
                        <DistributionBar items={batteryItems} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('aims.signalDistribution')}</Typography>
                        <DistributionBar items={signalItems} />
                    </Box>
                </Stack>
            )}

            {/* Label search */}
            <LabelHistory storeId={storeId} />
        </Box>
    );
}
