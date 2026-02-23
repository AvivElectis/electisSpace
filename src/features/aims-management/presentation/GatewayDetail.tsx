/**
 * Gateway Detail Component
 */

import { useEffect } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, IconButton, Grid } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useGateways } from '../application/useGateways';

interface GatewayDetailProps {
    storeId: string;
    mac: string;
    onBack: () => void;
}

export function GatewayDetail({ storeId, mac, onBack }: GatewayDetailProps) {
    const { t } = useTranslation();
    const { selectedGateway, selectedGatewayLoading, fetchGatewayDetail } = useGateways(storeId);

    useEffect(() => { fetchGatewayDetail(mac); }, [mac, fetchGatewayDetail]);

    if (selectedGatewayLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    const gw = selectedGateway;
    if (!gw) return null;

    const isOnline = gw.status === 'ONLINE' || gw.status === 'online';

    const fields = [
        { label: t('aims.macAddress', 'MAC Address'), value: gw.mac || gw.macAddress || mac },
        { label: t('aims.ipAddress', 'IP Address'), value: gw.ip || gw.ipAddress },
        { label: t('aims.status', 'Status'), value: isOnline ? 'Online' : 'Offline', chip: true, color: isOnline ? 'success' as const : 'error' as const },
        { label: t('aims.model', 'Model'), value: gw.model },
        { label: t('aims.firmware', 'Firmware'), value: gw.firmwareVersion },
        { label: t('aims.serialNumber', 'Serial Number'), value: gw.serialNumber },
        { label: t('aims.networkType', 'Network Type'), value: gw.networkType },
        { label: t('aims.channel', 'Channel'), value: gw.channel },
        { label: t('aims.temperature', 'Temperature'), value: gw.temperature != null ? `${gw.temperature}°C` : undefined },
        { label: t('aims.connectedLabels', 'Connected Labels'), value: gw.connectedLabelCount },
    ];

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
        </Box>
    );
}
