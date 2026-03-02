/**
 * Labels Overview Component
 *
 * Displays label stats, battery/signal distributions, searchable label list,
 * and a label detail dialog for individual label actions.
 */

import { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, CircularProgress, Alert,
    useMediaQuery, useTheme, TextField, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, TableSortLabel,
} from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useLabelsOverview } from '../application/useLabelsOverview';
import { LabelDetailView } from './LabelDetailView';

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

function getStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'ONLINE') return 'success';
    if (s === 'OFFLINE') return 'error';
    if (s === 'ERROR' || s === 'TIMEOUT' || s === 'FAILED') return 'error';
    if (s === 'PROCESSING' || s === 'PENDING') return 'warning';
    return 'default';
}

function getBatteryColor(battery?: string): 'success' | 'warning' | 'error' | 'default' {
    if (!battery) return 'default';
    const b = battery.toUpperCase();
    if (b === 'GOOD' || b === 'NORMAL') return 'success';
    if (b === 'LOW') return 'warning';
    if (b === 'CRITICAL' || b === 'EMPTY') return 'error';
    return 'default';
}

type SortField = 'labelCode' | 'status' | 'battery' | 'signal' | 'type';
type SortDir = 'asc' | 'desc';

export function LabelsOverview({ storeId }: LabelsOverviewProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        labels, labelsLoading, labelsError, stats,
        fetchLabels, fetchUnassignedLabels,
    } = useLabelsOverview(storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLabel, setSelectedLabel] = useState<any | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>('labelCode');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    useEffect(() => {
        fetchLabels();
        fetchUnassignedLabels();
    }, [fetchLabels, fetchUnassignedLabels]);

    // Filter and sort labels
    const filteredLabels = useMemo(() => {
        let result = labels;

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter((l: any) => {
                const code = (l.labelCode || l.code || '').toLowerCase();
                const type = (l.labelType || l.type || '').toLowerCase();
                const template = (l.templateName || '').toLowerCase();
                const gateway = (l.gateway || '').toLowerCase();
                return code.includes(term) || type.includes(term) || template.includes(term) || gateway.includes(term);
            });
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let aVal = '';
            let bVal = '';
            switch (sortField) {
                case 'labelCode':
                    aVal = a.labelCode || a.code || '';
                    bVal = b.labelCode || b.code || '';
                    break;
                case 'status':
                    aVal = a.status || '';
                    bVal = b.status || '';
                    break;
                case 'battery':
                    aVal = a.batteryStatus || a.battery || '';
                    bVal = b.batteryStatus || b.battery || '';
                    break;
                case 'signal':
                    aVal = a.signalStrength || a.signal || '';
                    bVal = b.signalStrength || b.signal || '';
                    break;
                case 'type':
                    aVal = a.labelType || a.type || '';
                    bVal = b.labelType || b.type || '';
                    break;
            }
            const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [labels, searchTerm, sortField, sortDir]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleLabelClick = (label: any) => {
        setSelectedLabel(label);
        setDetailOpen(true);
    };

    const handleDetailClose = () => {
        setDetailOpen(false);
        setSelectedLabel(null);
    };

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

            {/* Search */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder={t('aims.searchByLabel')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ width: { xs: '100%', sm: 400 } }}
                />
                {searchTerm && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {filteredLabels.length} / {labels.length}
                    </Typography>
                )}
            </Box>

            {/* Label list */}
            {labels.length > 0 ? (
                isMobile ? (
                    // Mobile: card-style list
                    <Stack gap={1}>
                        {filteredLabels.slice(0, 100).map((label: any) => {
                            const code = label.labelCode || label.code || '';
                            const labelStatus = label.status || '';
                            const labelBattery = label.batteryStatus || label.battery || '';
                            const labelSignal = label.signalStrength || label.signal || '';
                            const labelType = label.labelType || label.type || '';
                            return (
                                <Paper
                                    key={code}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                    onClick={() => handleLabelClick(label)}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                            {code}
                                        </Typography>
                                        <Chip
                                            label={labelStatus || '\u2014'}
                                            color={getStatusColor(labelStatus)}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Stack direction="row" gap={1} flexWrap="wrap">
                                        {labelBattery && (
                                            <Chip
                                                label={`${t('aims.battery')}: ${labelBattery}`}
                                                color={getBatteryColor(labelBattery)}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        )}
                                        {labelSignal && (
                                            <Typography variant="caption" color="text.secondary">
                                                {t('aims.signal')}: {labelSignal}
                                            </Typography>
                                        )}
                                        {labelType && (
                                            <Typography variant="caption" color="text.secondary">
                                                {labelType}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            );
                        })}
                        {filteredLabels.length > 100 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                {t('aims.searchByLabel')} ({filteredLabels.length - 100} more)
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    // Desktop: table
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'labelCode'}
                                            direction={sortField === 'labelCode' ? sortDir : 'asc'}
                                            onClick={() => handleSort('labelCode')}
                                        >
                                            {t('aims.labelCode')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'status'}
                                            direction={sortField === 'status' ? sortDir : 'asc'}
                                            onClick={() => handleSort('status')}
                                        >
                                            {t('aims.status')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'battery'}
                                            direction={sortField === 'battery' ? sortDir : 'asc'}
                                            onClick={() => handleSort('battery')}
                                        >
                                            {t('aims.battery')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'signal'}
                                            direction={sortField === 'signal' ? sortDir : 'asc'}
                                            onClick={() => handleSort('signal')}
                                        >
                                            {t('aims.signal')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'type'}
                                            direction={sortField === 'type' ? sortDir : 'asc'}
                                            onClick={() => handleSort('type')}
                                        >
                                            {t('common.type')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>{t('aims.gateway')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLabels.slice(0, 200).map((label: any) => {
                                    const code = label.labelCode || label.code || '';
                                    const labelStatus = label.status || '';
                                    const labelBattery = label.batteryStatus || label.battery || '';
                                    const labelSignal = label.signalStrength || label.signal || '';
                                    const labelType = label.labelType || label.type || '';
                                    const labelGateway = label.gateway || '';
                                    return (
                                        <TableRow
                                            key={code}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleLabelClick(label)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {code}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={labelStatus || '\u2014'}
                                                    color={getStatusColor(labelStatus)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {labelBattery ? (
                                                    <Chip
                                                        label={labelBattery}
                                                        color={getBatteryColor(labelBattery)}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ) : '\u2014'}
                                            </TableCell>
                                            <TableCell>{labelSignal || '\u2014'}</TableCell>
                                            <TableCell>{labelType || '\u2014'}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {labelGateway || '\u2014'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            ) : (
                !labelsLoading && (
                    <Alert severity="info">{t('aims.noGateways').replace('gateways', 'labels')}</Alert>
                )
            )}

            {filteredLabels.length > 200 && !isMobile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {t('aims.searchByLabel')} ({filteredLabels.length - 200} more)
                </Typography>
            )}

            {/* Label detail dialog */}
            <LabelDetailView
                open={detailOpen}
                onClose={handleDetailClose}
                label={selectedLabel}
                storeId={storeId}
            />
        </Box>
    );
}
