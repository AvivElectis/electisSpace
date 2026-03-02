/**
 * AIMS Overview Tab
 *
 * Stats dashboard showing store health metrics: gateway/label counts,
 * battery/signal distributions, label type breakdown, and update stats.
 */

import { useEffect } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, Grid, LinearProgress, Chip,
    Skeleton, Alert, useMediaQuery, useTheme,
} from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import LabelIcon from '@mui/icons-material/Label';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
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
                <Typography variant="body2" fontWeight="bold">
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
            {[1, 2, 3, 4].map((i) => (
                <Grid size={{ xs: 12, md: 6 }} key={i}>
                    <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
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
        storeSummary, labelStatusSummary, gatewayStatusSummary, labelModels,
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

    // Gateway stats with safe defaults
    const gwTotal = gatewayStatusSummary?.totalGateways ?? storeSummary?.gatewayCount ?? 0;
    const gwConnected = gatewayStatusSummary?.connectedCount ?? storeSummary?.onlineGatewayCount ?? 0;
    const gwDisconnected = gatewayStatusSummary?.disconnectedCount ?? storeSummary?.offlineGatewayCount ?? 0;

    // Label stats with safe defaults
    const lblTotal = labelStatusSummary?.totalLabels ?? storeSummary?.labelCount ?? 0;
    const lblOnline = labelStatusSummary?.onlineCount ?? storeSummary?.onlineLabelCount ?? 0;
    const lblOffline = labelStatusSummary?.offlineCount ?? storeSummary?.offlineLabelCount ?? 0;
    const lblSuccess = labelStatusSummary?.successCount ?? 0;
    const lblProcessing = labelStatusSummary?.processingCount ?? 0;
    const lblTimeout = labelStatusSummary?.timeoutCount ?? 0;

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
                        </Stack>
                        <HealthBar
                            label={t('aims.online')}
                            value={gwConnected}
                            total={gwTotal}
                            color={theme.palette.success.main}
                        />
                        <HealthBar
                            label={t('aims.offline')}
                            value={gwDisconnected}
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
                        {lblTimeout > 0 && (
                            <HealthBar
                                label={t('aims.failed')}
                                value={lblTimeout}
                                total={lblTotal}
                                color={theme.palette.warning.main}
                            />
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
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {labelModels.map((model: any, i: number) => (
                                    <Chip
                                        key={i}
                                        label={`${model.labelType || model.type || 'Unknown'}: ${model.count ?? 0}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        ) : (
                            <Typography color="text.secondary" variant="body2">
                                {t('aims.noDetails')}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* Store Summary / Quick Stats */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={cardsSetting}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                            <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1, display: 'flex' }}>
                                <BarChartOutlined sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6">{t('aims.storeSummary')}</Typography>
                        </Stack>
                        <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={isMobile ? 2 : 3}
                        >
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="primary" sx={{ fontWeight: 500 }}>
                                    {gwTotal}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('aims.gateways')}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="primary" sx={{ fontWeight: 500 }}>
                                    {lblTotal}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('aims.labels')}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="success.main" sx={{ fontWeight: 500 }}>
                                    {lblSuccess}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('aims.success')}
                                </Typography>
                            </Box>
                            {lblProcessing > 0 && (
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 500 }}>
                                        {lblProcessing}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('aims.status')}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}
