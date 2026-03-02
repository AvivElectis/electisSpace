/**
 * Gateway Detail Component
 */

import { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Chip, CircularProgress, IconButton, Grid,
    Button, Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BugReportIcon from '@mui/icons-material/BugReport';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useGateways } from '../application/useGateways';

interface GatewayDetailProps {
    storeId: string;
    mac: string;
    onBack: () => void;
}

function formatUptime(seconds?: number): string | undefined {
    if (seconds == null) return undefined;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export function GatewayDetail({ storeId, mac, onBack }: GatewayDetailProps) {
    const { t } = useTranslation();
    const {
        selectedGateway, selectedGatewayLoading, fetchGatewayDetail,
        debugReport, debugReportLoading, fetchDebugReport,
    } = useGateways(storeId);
    const [debugOpen, setDebugOpen] = useState(false);

    useEffect(() => { fetchGatewayDetail(mac); }, [mac, fetchGatewayDetail]);

    if (selectedGatewayLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    const gw = selectedGateway;
    if (!gw) return null;

    const statusRaw = (gw.status || gw.networkStatus || '').toUpperCase();
    const isOnline = statusRaw === 'ONLINE' || statusRaw === 'CONNECTED';

    const fields = [
        { label: t('aims.macAddress', 'MAC Address'), value: gw.mac || gw.macAddress || mac },
        { label: t('aims.ipAddress', 'IP Address'), value: gw.ip || gw.ipAddress },
        { label: t('aims.status', 'Status'), value: isOnline ? 'Online' : 'Offline', chip: true, color: isOnline ? 'success' as const : 'error' as const },
        { label: t('aims.model', 'Model'), value: gw.model },
        { label: t('aims.firmware', 'Firmware'), value: gw.firmwareVersion },
        { label: t('aims.serialNumber', 'Serial Number'), value: gw.serialNumber },
        { label: t('aims.apName', 'AP Name'), value: gw.apName },
        { label: t('aims.txPower', 'TX Power'), value: gw.txPower != null ? `${gw.txPower} dBm` : undefined },
        { label: t('aims.uptime', 'Uptime'), value: formatUptime(gw.uptime ?? gw.uptimeSeconds) },
        { label: t('aims.networkType', 'Network Type'), value: gw.networkType },
        { label: t('aims.channel', 'Channel'), value: gw.channel },
        { label: t('aims.temperature', 'Temperature'), value: gw.temperature != null ? `${gw.temperature}°C` : undefined },
        { label: t('aims.connectedLabels', 'Connected Labels'), value: gw.connectedLabelCount },
    ];

    const handleLoadDebugReport = () => {
        if (!debugOpen && !debugReport) {
            fetchDebugReport(mac);
        }
        setDebugOpen(!debugOpen);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={onBack} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                <Typography variant="h6">{t('aims.gatewayDetail', 'Gateway Detail')}</Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                    {fields.map((f) => f.value != null ? (
                        <Grid size={{ xs: 12, sm: 6 }} key={f.label}>
                            <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                            {f.chip ? (
                                <Box><Chip label={f.value} color={f.color} size="small" variant="outlined" /></Box>
                            ) : (
                                <Typography variant="body2">{String(f.value)}</Typography>
                            )}
                        </Grid>
                    ) : null)}
                </Grid>
            </Paper>

            {/* Debug Report */}
            <Box sx={{ mt: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<BugReportIcon />}
                    endIcon={debugOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={handleLoadDebugReport}
                    disabled={debugReportLoading}
                >
                    {debugReportLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                    {t('aims.debugReport')}
                </Button>
                <Collapse in={debugOpen}>
                    <Paper
                        variant="outlined"
                        sx={{
                            mt: 1, p: 2, maxHeight: 400, overflow: 'auto',
                            bgcolor: 'grey.50',
                            '& pre': { m: 0, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
                        }}
                    >
                        {debugReportLoading ? (
                            <CircularProgress size={20} />
                        ) : debugReport ? (
                            <pre>{JSON.stringify(debugReport, null, 2)}</pre>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {t('aims.noDetails')}
                            </Typography>
                        )}
                    </Paper>
                </Collapse>
            </Box>
        </Box>
    );
}
