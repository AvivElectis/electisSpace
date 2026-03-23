import { Box, Card, CardContent, Typography, Stack, Grid, LinearProgress, Chip, Button, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RouterIcon from '@mui/icons-material/Router';
import SyncIcon from '@mui/icons-material/Sync';
import LabelIcon from '@mui/icons-material/Label';
import UpdateOutlined from '@mui/icons-material/Update';
import BatteryChargingFullOutlined from '@mui/icons-material/BatteryChargingFull';
import SignalCellularAltOutlined from '@mui/icons-material/SignalCellularAlt';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MobileStatTile } from './MobileStatTile';

interface DashboardAimsCardProps {
    storeSummary: any;
    labelModels: any[];
    isMobile?: boolean;
    onSyncNow?: () => void;
    isSyncing?: boolean;
}

/** Compact progress bar for dashboard sub-sections */
function MiniHealthBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <Box sx={{ mb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="caption" fontWeight={600} dir="ltr">
                    {value}/{total}
                </Typography>
            </Stack>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                }}
            />
        </Box>
    );
}

/** Icon badge used in section headers */
function SectionIcon({ icon, bgcolor }: { icon: React.ReactNode; bgcolor: string }) {
    return (
        <Box sx={{ bgcolor, borderRadius: 1.5, p: 0.5, display: 'flex', lineHeight: 0 }}>
            {icon}
        </Box>
    );
}

export function DashboardAimsCard({ storeSummary, labelModels, isMobile, onSyncNow, isSyncing }: DashboardAimsCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Extract data from storeSummary with safe defaults
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

    const gwHealthPct = gwTotal > 0 ? Math.round((gwOnline / gwTotal) * 100) : 0;

    // --- Mobile layout — all 6 categories ---
    if (isMobile) {
        return (
            <Card data-testid="aims-card">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Tappable header */}
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

                    {/* Hero — gateway health */}
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                        <Typography variant="h2" fontWeight={700} color="primary.main" dir="ltr">
                            {gwTotal}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('aims.totalGateways')}
                        </Typography>
                    </Box>

                    {/* Gateway health bar */}
                    <Stack gap={0.5} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('aims.online')} <span dir="ltr">{gwOnline}/{gwTotal}</span>
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} color="text.secondary" dir="ltr">
                                {gwHealthPct}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={gwHealthPct}
                            color="success"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Stack>

                    {/* 1. Gateways */}
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        {t('aims.gatewayHealth')}
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ mb: 1.5 }}>
                        <MobileStatTile value={gwOnline} label={t('aims.online')} color="success" />
                        <MobileStatTile value={gwOffline} label={t('aims.offline')} color="error" />
                    </Stack>

                    {/* 2. Labels */}
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        {t('aims.labelHealth')}
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ mb: 1.5 }}>
                        <MobileStatTile value={lblOnline} label={t('aims.online')} color="success" />
                        <MobileStatTile value={lblOffline} label={t('aims.offline')} color="error" />
                        <MobileStatTile value={lblTotal} label={t('aims.totalLabels')} color="primary" />
                    </Stack>

                    {/* 3. Update Progress */}
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                            {t('aims.productUpdates')}
                        </Typography>
                        <Stack direction="row" gap={1}>
                            <MobileStatTile value={lblUpdated} label={t('aims.success')} color="success" />
                            {lblInProgress > 0 && (
                                <MobileStatTile value={lblInProgress} label={t('aims.status')} color="warning" />
                            )}
                            {lblNotUpdated > 0 && (
                                <MobileStatTile value={lblNotUpdated} label={t('aims.failed')} color="error" />
                            )}
                        </Stack>
                    </Box>

                    {/* 4. Battery Health */}
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                            {t('aims.batteryHealth')}
                        </Typography>
                        {batTotal > 0 ? (
                            <Stack direction="row" gap={1}>
                                <MobileStatTile value={batGood} label={t('aims.batteryGood')} color="success" />
                                <MobileStatTile value={batLow} label={t('aims.batteryLow')} color="warning" />
                            </Stack>
                        ) : (
                            <Typography variant="caption" color="text.secondary">{t('aims.noDetails')}</Typography>
                        )}
                    </Box>

                    {/* 5. Signal Quality */}
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                            {t('aims.signalDistribution')}
                        </Typography>
                        {sigTotal > 0 ? (
                            <Stack direction="row" gap={1}>
                                <MobileStatTile value={sigExcellent} label={t('aims.signalExcellent')} color="success" />
                                <MobileStatTile value={sigGood} label={t('aims.signalGood')} color="info" />
                                <MobileStatTile value={sigBad} label={t('aims.signalBad')} color="error" />
                            </Stack>
                        ) : (
                            <Typography variant="caption" color="text.secondary">{t('aims.noDetails')}</Typography>
                        )}
                    </Box>

                    {/* 6. Label Models */}
                    {Array.isArray(labelModels) && labelModels.length > 0 && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                                {t('aims.labelTypes')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {labelModels.map((model: any, i: number) => (
                                    <Chip
                                        key={i}
                                        label={`${model.labelType || model.type || 'Unknown'}: ${model.count ?? 0}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Sync Now button — at bottom of card */}
                    {onSyncNow && (
                        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={isSyncing ? <CircularProgress size={14} /> : <SyncIcon />}
                                onClick={onSyncNow}
                                disabled={isSyncing}
                                sx={{ textTransform: 'none' }}
                            >
                                {t('sync.syncNow')}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    }

    // --- Desktop layout ---
    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="aims-card">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <RouterIcon color="primary" sx={{ fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                            {t('aims.management')}
                        </Typography>
                    </Stack>
                    <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/aims-management')}
                        sx={{ fontSize: '0.95rem' }}
                    >
                        {t('dashboard.toAims', 'To AIMS')}
                    </Button>
                </Stack>

                {/* 2x3 grid of health sub-sections */}
                <Grid container spacing={1.5}>
                    {/* Gateway Health */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<RouterIcon sx={{ color: 'white', fontSize: 16 }} />} bgcolor="primary.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.gatewayHealth')}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }} dir="ltr">
                                    {gwTotal}
                                </Typography>
                            </Stack>
                            <MiniHealthBar label={t('aims.online')} value={gwOnline} total={gwTotal} color="success.main" />
                            <MiniHealthBar label={t('aims.offline')} value={gwOffline} total={gwTotal} color="error.main" />
                        </Box>
                    </Grid>

                    {/* Label Health */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<LabelIcon sx={{ color: 'white', fontSize: 16 }} />} bgcolor="info.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.labelHealth')}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }} dir="ltr">
                                    {lblTotal}
                                </Typography>
                            </Stack>
                            <MiniHealthBar label={t('aims.online')} value={lblOnline} total={lblTotal} color="success.main" />
                            <MiniHealthBar label={t('aims.offline')} value={lblOffline} total={lblTotal} color="error.main" />
                        </Box>
                    </Grid>

                    {/* Update Progress */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<UpdateOutlined sx={{ color: 'white', fontSize: 16 }} />} bgcolor="success.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.productUpdates')}</Typography>
                            </Stack>
                            <MiniHealthBar label={t('aims.success')} value={lblUpdated} total={lblTotal} color="success.main" />
                            {lblInProgress > 0 && (
                                <MiniHealthBar label={t('aims.status')} value={lblInProgress} total={lblTotal} color="warning.main" />
                            )}
                            {lblNotUpdated > 0 && (
                                <MiniHealthBar label={t('aims.failed')} value={lblNotUpdated} total={lblTotal} color="error.main" />
                            )}
                        </Box>
                    </Grid>

                    {/* Battery Health */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<BatteryChargingFullOutlined sx={{ color: 'white', fontSize: 16 }} />} bgcolor="warning.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.batteryHealth')}</Typography>
                            </Stack>
                            {batTotal > 0 ? (
                                <>
                                    <MiniHealthBar label={t('aims.batteryGood')} value={batGood} total={batTotal} color="success.main" />
                                    <MiniHealthBar label={t('aims.batteryLow')} value={batLow} total={batTotal} color="warning.main" />
                                </>
                            ) : (
                                <Typography variant="caption" color="text.secondary">{t('aims.noDetails')}</Typography>
                            )}
                        </Box>
                    </Grid>

                    {/* Signal Quality */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<SignalCellularAltOutlined sx={{ color: 'white', fontSize: 16 }} />} bgcolor="info.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.signalDistribution')}</Typography>
                            </Stack>
                            {sigTotal > 0 ? (
                                <>
                                    <MiniHealthBar label={t('aims.signalExcellent')} value={sigExcellent} total={sigTotal} color="success.main" />
                                    <MiniHealthBar label={t('aims.signalGood')} value={sigGood} total={sigTotal} color="info.main" />
                                    <MiniHealthBar label={t('aims.signalBad')} value={sigBad} total={sigTotal} color="error.main" />
                                </>
                            ) : (
                                <Typography variant="caption" color="text.secondary">{t('aims.noDetails')}</Typography>
                            )}
                        </Box>
                    </Grid>

                    {/* Label Models */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                                <SectionIcon icon={<CategoryOutlined sx={{ color: 'white', fontSize: 16 }} />} bgcolor="secondary.main" />
                                <Typography variant="subtitle2" fontWeight={600}>{t('aims.labelTypes')}</Typography>
                            </Stack>
                            {Array.isArray(labelModels) && labelModels.length > 0 ? (
                                <Box sx={{
                                    maxHeight: 108,
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
                                            // Shorten: "GRAPHIC_2_9_RED_NFC_INT_RT" → "2.9 RED NFC"
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
                                                        py: 0.25,
                                                        borderBottom: i < labelModels.length - 1 ? 1 : 0,
                                                        borderColor: 'divider',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            flex: 1,
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.7rem',
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
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="text.primary"
                                                        dir="ltr"
                                                        sx={{ minWidth: 28, textAlign: 'end', fontSize: '0.7rem' }}
                                                    >
                                                        {count}
                                                    </Typography>
                                                </Stack>
                                            );
                                        })}
                                </Box>
                            ) : (
                                <Typography variant="caption" color="text.secondary">{t('aims.noDetails')}</Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
