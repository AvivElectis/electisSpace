/**
 * Gateway Configuration Dialog
 *
 * Allows viewing and editing gateway refresh settings and displays
 * read-only network information.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Grid, Typography, Box, Alert, CircularProgress,
    Divider, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useGatewayConfig } from '../application/useGatewayConfig';

interface GatewayConfigDialogProps {
    open: boolean;
    onClose: () => void;
    gateway: any;
    storeId: string;
    onSaved?: () => void;
}

export default function GatewayConfigDialog({ open, onClose, gateway, storeId, onSaved }: GatewayConfigDialogProps) {
    const { t } = useTranslation();
    const { saveConfig, saveLoading, saveError, saveSuccess, setSaveSuccess } = useGatewayConfig(storeId);

    // Form state initialized from gateway data
    const [form, setForm] = useState({
        refreshStart: '',
        refreshEnd: '',
        refreshInterval: '',
        refreshMode: '',
    });

    useEffect(() => {
        if (gateway && open) {
            setForm({
                refreshStart: gateway.refreshStart || '',
                refreshEnd: gateway.refreshEnd || '',
                refreshInterval: String(gateway.refreshInterval ?? ''),
                refreshMode: gateway.refreshMode || '',
            });
            setSaveSuccess(false);
        }
    }, [gateway, open, setSaveSuccess]);

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSave = async () => {
        if (!gateway) return;
        const mac = gateway.mac || gateway.macAddress || gateway.gatewayId || '';
        const configData: Record<string, any> = {};
        if (form.refreshStart) configData.refreshStart = form.refreshStart;
        if (form.refreshEnd) configData.refreshEnd = form.refreshEnd;
        if (form.refreshInterval) configData.refreshInterval = Number(form.refreshInterval);
        if (form.refreshMode) configData.refreshMode = form.refreshMode;

        await saveConfig(mac, configData);
        if (onSaved) onSaved();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('aims.gatewayConfig', 'Gateway Configuration')}</Typography>
                    <IconButton onClick={onClose} size="small" aria-label={t('common.cancel')}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
                {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{t('aims.configSaved', 'Configuration saved successfully')}</Alert>}

                <Typography variant="subtitle2" gutterBottom>
                    {t('aims.refreshSettings', 'Refresh Settings')}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label={t('aims.refreshStart', 'Refresh Start')}
                            value={form.refreshStart}
                            onChange={handleChange('refreshStart')}
                            fullWidth
                            size="small"
                        />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label={t('aims.refreshEnd', 'Refresh End')}
                            value={form.refreshEnd}
                            onChange={handleChange('refreshEnd')}
                            fullWidth
                            size="small"
                        />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label={t('aims.refreshInterval', 'Refresh Interval')}
                            value={form.refreshInterval}
                            onChange={handleChange('refreshInterval')}
                            fullWidth
                            size="small"
                            type="number"
                        />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label={t('aims.refreshMode', 'Refresh Mode')}
                            value={form.refreshMode}
                            onChange={handleChange('refreshMode')}
                            fullWidth
                            size="small"
                        />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Read-only network info */}
                <Typography variant="subtitle2" gutterBottom>
                    {t('aims.networkInfo', 'Network Information')} ({t('aims.readOnly', 'Read Only')})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {gateway?.ipAddress && (
                        <Typography variant="body2">
                            {t('aims.ipAddress', 'IP Address')}: {gateway.ipAddress}
                        </Typography>
                    )}
                    {(gateway?.ip && !gateway?.ipAddress) && (
                        <Typography variant="body2">
                            {t('aims.ipAddress', 'IP Address')}: {gateway.ip}
                        </Typography>
                    )}
                    {gateway?.netmask && (
                        <Typography variant="body2">
                            {t('aims.netmask', 'Netmask')}: {gateway.netmask}
                        </Typography>
                    )}
                    {gateway?.ipDefGw && (
                        <Typography variant="body2">
                            {t('aims.defaultGateway', 'Default Gateway')}: {gateway.ipDefGw}
                        </Typography>
                    )}
                    {gateway?.ipDns && (
                        <Typography variant="body2">
                            {t('aims.dns', 'DNS')}: {gateway.ipDns}
                        </Typography>
                    )}
                    {!gateway?.ipAddress && !gateway?.ip && !gateway?.netmask && !gateway?.ipDefGw && !gateway?.ipDns && (
                        <Typography variant="body2" color="text.secondary">
                            {t('aims.noDetails', 'No details available.')}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} variant="contained" disabled={saveLoading}>
                    {saveLoading ? <CircularProgress size={20} /> : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
