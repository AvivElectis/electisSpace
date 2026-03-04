/**
 * AIMS Overview Tab
 *
 * Stats dashboard showing store health metrics from AIMS store summary:
 * gateway/label counts, battery health, signal distribution, update progress,
 * and label type breakdown.
 */

import { useEffect } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, Grid, LinearProgress,
    Skeleton, Alert, useMediaQuery, useTheme,
} from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import LabelIcon from '@mui/icons-material/Label';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import BatteryChargingFullOutlined from '@mui/icons-material/BatteryChargingFull';
import SignalCellularAltOutlined from '@mui/icons-material/SignalCellularAlt';
import UpdateOutlined from '@mui/icons-material/Update';
import { useTranslation } from 'react-i18next';
import { useAimsOverview } from '../application/useAimsOverview';

interface AimsOverviewTabProps {
    storeId: string;
}

const cardsSetting = {
    boxShadow: 'none',
    bgcolor: 'transparent',
    border: 'none',
    '&:hover': { boxShadow: '0px 0px 1px 1px #6666663b' },
};

interface HealthBarProps {
    label: string;
    value: number;
    total: number;
    color: string;
}

function HealthBar({ label, value, total, color }: HealthBarProps) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{label}</Typography>
                <Typography variant="body2" fontWeight="bold" dir="ltr">
                    {value} / {total} ({total > 0 ? Math.round(pct) : 0}%)
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                }}
            />
        </Box>
    );
}

function OverviewSkeleton() {
    return (
        <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid size={{ xs: 12, md: 6 }} key={i}>
                    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                </Grid>
            ))}
        </Grid>
    );
}

export function AimsOverviewTab({ storeId }: AimsOverviewTabProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        storeSummary, labelModels,
        overviewLoading, overviewError, fetchOverview,
    } = useAimsOverview(storeId);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    if (overviewLoading && !storeSummary) {
        return <OverviewSkeleton />;
    }

    if (overviewError) {
        return <Alert severity="error" sx={{ mb: 2 }}>{overviewError}</Alert>;
    }

    // All data comes from the store summary endpoint (correct AIMS field names)
    const gwOnline = storeSummary?.onlineGwCount ?? 0;
    const gwOffline = storeSummary?.offlineGwCount ?? 0;
    const gwTotal = gwOnline + gwOffline;

    const lblTotal = storeSummary?.totalLabelCount ?? 0;
    const lblOnline = storeSummary?.onlineLabelCount ?? 0;
    const lblOffline = storeSummary?.offlineLabelCount ?? 0;

    const lblUpdated = storeSummary?.updatedLabelCount ?? 0;
    const lblInProgress = storeSummary?.inProgressLabelCount ?? 0;
    const lblNotUpdated = storeSummary?.notUpdatedLabelCount ?? 0;

    const batGood = storeSummary?.goodBatteryCount ?? 0;
    const batLow = storeSummary?.lowBatteryCount ?? 0;
    const batTotal = batGood + batLow;

    const sigExcellent = storeSummary?.excellentSignalLabelCount ?? 0;
    const sigGood = storeSummary?.goodSignalLabelCount ?? 0;
    const sigBad = storeSummary?.badSignalLabelCount ?? 0;
    const sigTotal = sigExcellent + sigGood + sigBad;

    return (
        <Grid container spacing={2}>
            {/* Gateway Health */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <RouterIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.gatewayHealth')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                                {gwTotal} {t('aims.gateways')}
                            </Typography>
                        </Stack>
                        <HealthBar
                            label={t('aims.online')}
                            value={gwOnline}
                            total={gwTotal}
                            color={theme.palette.success.main}
                        />
                        <HealthBar
                            label={t('aims.offline')}
                            value={gwOffline}
                            total={gwTotal}
                            color={theme.palette.error.main}
                        />
                    </CardContent>
                </Card>
            </Grid>

            {/* Label Health */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'info.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <LabelIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.labelHealth')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                                {lblTotal} {t('aims.labels')}
                            </Typography>
                        </Stack>
                        <HealthBar
                            label={t('aims.online')}
                            value={lblOnline}
                            total={lblTotal}
                            color={theme.palette.success.main}
                        />
                        <HealthBar
                            label={t('aims.offline')}
                            value={lblOffline}
                            total={lblTotal}
                            color={theme.palette.error.main}
                        />
                    </CardContent>
                </Card>
            </Grid>

            {/* Update Progress */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <UpdateOutlined sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.productUpdates')}</Typography>
                        </Stack>
                        <HealthBar
                            label={t('aims.success')}
                            value={lblUpdated}
                            total={lblTotal}
                            color={theme.palette.success.main}
                        />
                        {lblInProgress > 0 && (
                            <HealthBar
                                label={t('aims.status')}
                                value={lblInProgress}
                                total={lblTotal}
                                color={theme.palette.warning.main}
                            />
                        )}
                        {lblNotUpdated > 0 && (
                            <HealthBar
                                label={t('aims.failed')}
                                value={lblNotUpdated}
                                total={lblTotal}
                                color={theme.palette.error.main}
                            />
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Battery Health */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'warning.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <BatteryChargingFullOutlined sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.batteryHealth')}</Typography>
                        </Stack>
                        {batTotal > 0 ? (
                            <>
                                <HealthBar
                                    label={t('aims.batteryGood')}
                                    value={batGood}
                                    total={batTotal}
                                    color={theme.palette.success.main}
                                />
                                <HealthBar
                                    label={t('aims.batteryLow')}
                                    value={batLow}
                                    total={batTotal}
                                    color={theme.palette.warning.main}
                                />
                            </>
                        ) : (
                            <Typography color="text.secondary" variant="body2">
                                {t('aims.noDetails')}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Signal Distribution */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'info.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <SignalCellularAltOutlined sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.signalDistribution')}</Typography>
                        </Stack>
                        {sigTotal > 0 ? (
                            <>
                                <HealthBar
                                    label={t('aims.signalExcellent')}
                                    value={sigExcellent}
                                    total={sigTotal}
                                    color={theme.palette.success.main}
                                />
                                <HealthBar
                                    label={t('aims.signalGood')}
                                    value={sigGood}
                                    total={sigTotal}
                                    color={theme.palette.info.main}
                                />
                                <HealthBar
                                    label={t('aims.signalBad')}
                                    value={sigBad}
                                    total={sigTotal}
                                    color={theme.palette.error.main}
                                />
                            </>
                        ) : (
                            <Typography color="text.secondary" variant="body2">
                                {t('aims.noDetails')}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Label Types / Models */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'secondary.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <CategoryOutlined sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.labelTypes')}</Typography>
                        </Stack>
                        {Array.isArray(labelModels) && labelModels.length > 0 ? (
                            <Box sx={{
                                maxHeight: 200,
                                overflowY: 'auto',
                                '&::-webkit-scrollbar': { width: 4 },
                                '&::-webkit-scrollbar-track': { bgcolor: 'grey.100', borderRadius: 2 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 },
                                scrollbarWidth: 'thin',
                            }}>
                                {labelModels
                                    .sort((a: any, b: any) => (b.count ?? 0) - (a.count ?? 0))
                                    .map((model: any, i: number) => {
                                        const name = model.labelType || model.type || 'Unknown';
                                        const count = model.count ?? 0;
                                        const short = name
                                            .replace(/^GRAPHIC_/, '')
                                            .replace(/_INT_RT$/, '')
                                            .replace(/_/g, ' ')
                                            .replace(/(\d) (\d)/g, '$1.$2');
                                        return (
                                            <Stack
                                                key={i}
                                                direction="row"
                                                alignItems="center"
                                                sx={{
                                                    py: 0.5,
                                                    borderBottom: i < labelModels.length - 1 ? 1 : 0,
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        flex: 1,
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '0.02em',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={name}
                                                >
                                                    {short}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    color="text.primary"
                                                    dir="ltr"
                                                    sx={{ minWidth: 36, textAlign: 'end' }}
                                                >
                                                    {count}
                                                </Typography>
                                            </Stack>
                                        );
                                    })}
                            </Box>
                        ) : (
                            <Typography color="text.secondary" variant="body2">
                                {t('aims.noDetails')}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}
