import { Box, Card, CardContent, Typography, Stack, LinearProgress, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RouterIcon from '@mui/icons-material/Router';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MobileStatTile } from './MobileStatTile';

interface DashboardAimsCardProps {
    totalGateways: number;
    onlineGateways: number;
    offlineGateways: number;
    totalLabels: number;
    onlineLabels: number;
    isMobile?: boolean;
    // Battery health indicators (optional for backward compatibility)
    batteryGood?: number;
    batteryLow?: number;
    batteryCritical?: number;
    // Additional label status counts (optional)
    labelsTimeout?: number;
    labelsProcessing?: number;
}

export function DashboardAimsCard({
    totalGateways,
    onlineGateways,
    offlineGateways,
    totalLabels,
    onlineLabels,
    isMobile,
    batteryGood,
    batteryLow,
    batteryCritical,
    labelsTimeout: _labelsTimeout,
    labelsProcessing: _labelsProcessing,
}: DashboardAimsCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const gatewayHealthPercent = totalGateways > 0 ? Math.round((onlineGateways / totalGateways) * 100) : 0;

    const hasBatteryData = batteryGood !== undefined || batteryLow !== undefined || batteryCritical !== undefined;

    const batteryChips = hasBatteryData ? (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {t('aims.batteryHealth')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {batteryGood != null && batteryGood > 0 && (
                    <Chip size="small" label={`${t('aims.batteryGood')}: ${batteryGood}`} color="success" variant="outlined" />
                )}
                {batteryLow != null && batteryLow > 0 && (
                    <Chip size="small" label={`${t('aims.batteryLow')}: ${batteryLow}`} color="warning" variant="outlined" />
                )}
                {batteryCritical != null && batteryCritical > 0 && (
                    <Chip size="small" label={`${t('aims.batteryCritical')}: ${batteryCritical}`} color="error" variant="outlined" />
                )}
                {/* Show "all good" when there are labels but no low/critical */}
                {batteryGood === 0 && batteryLow === 0 && batteryCritical === 0 && totalLabels > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        {t('aims.batteryGood')}
                    </Typography>
                )}
            </Box>
        </Box>
    ) : null;

    if (isMobile) {
        return (
            <Card data-testid="aims-card">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        gap={1}
                        onClick={() => navigate('/aims-management')}
                        sx={{ mb: 2, cursor: 'pointer' }}
                    >
                        <RouterIcon color="primary" sx={{ fontSize: 24 }} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                            {t('aims.management')}
                        </Typography>
                        <ArrowForwardIcon fontSize="small" color="action" />
                    </Stack>

                    {/* Hero number */}
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                        <Typography variant="h2" fontWeight={700} color="primary.main">
                            {totalGateways}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('aims.totalGateways')}
                        </Typography>
                    </Box>

                    {/* Gateway health bar */}
                    <Stack gap={0.5} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('aims.online')} {onlineGateways}/{totalGateways}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                                {gatewayHealthPercent}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={gatewayHealthPercent}
                            color="success"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Stack>

                    {/* Stat tiles */}
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                        <MobileStatTile
                            value={onlineGateways}
                            label={t('aims.online')}
                            color="success"
                        />
                        <MobileStatTile
                            value={offlineGateways}
                            label={t('aims.offline')}
                            color="error"
                        />
                    </Stack>
                    <Stack direction="row" gap={1}>
                        <MobileStatTile
                            value={totalLabels}
                            label={t('aims.totalLabels')}
                            color="primary"
                        />
                        <MobileStatTile
                            value={onlineLabels}
                            label={t('aims.onlineLabels')}
                            color="info"
                        />
                    </Stack>

                    {batteryChips}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="aims-card">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <RouterIcon color="primary" sx={{ fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                            {t('aims.management')}
                        </Typography>
                    </Stack>
                    <Stack
                        direction="row"
                        alignItems="center"
                        gap={0.5}
                        onClick={() => navigate('/aims-management')}
                        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                    >
                        <Typography variant="body2" color="primary">
                            {t('dashboard.toAims', 'To AIMS')}
                        </Typography>
                        <ArrowForwardIcon fontSize="small" />
                    </Stack>
                </Stack>

                <Stack gap={2}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {t('aims.totalGateways')}
                        </Typography>
                        <Typography variant="h3" fontWeight={600} color="primary.main">
                            {totalGateways}
                        </Typography>
                    </Box>

                    {/* Gateway health bar */}
                    <Stack gap={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.online')} {onlineGateways}/{totalGateways}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                                {gatewayHealthPercent}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={gatewayHealthPercent}
                            color="success"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.online')}
                            </Typography>
                            <Typography variant="h5" fontWeight={500} color="success.main">
                                {onlineGateways}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.offline')}
                            </Typography>
                            <Typography variant="h5" fontWeight={500} color="error.main">
                                {offlineGateways}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.totalLabels')}
                            </Typography>
                            <Typography variant="h5" fontWeight={500}>
                                {totalLabels}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.onlineLabels')}
                            </Typography>
                            <Typography variant="h5" fontWeight={500} color="info.main">
                                {onlineLabels}
                            </Typography>
                        </Box>
                    </Box>

                    {batteryChips}
                </Stack>
            </CardContent>
        </Card>
    );
}
