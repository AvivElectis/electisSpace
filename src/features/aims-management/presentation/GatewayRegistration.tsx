/**
 * Gateway Registration Dialog
 */

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, Typography, Chip, Stack, CircularProgress, Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGatewayManagement } from '../application/useGatewayManagement';
import { useGateways } from '../application/useGateways';

interface GatewayRegistrationProps {
    open: boolean;
    onClose: () => void;
    storeId: string;
    onSuccess: () => void;
}

export function GatewayRegistration({ open, onClose, storeId, onSuccess }: GatewayRegistrationProps) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'he';
    const [mac, setMac] = useState('');
    const { registerGateway, loading, error } = useGatewayManagement(storeId);
    const { floatingGateways, floatingGatewaysLoading, fetchFloatingGateways } = useGateways(storeId);

    useEffect(() => {
        if (open) {
            fetchFloatingGateways();
        }
    }, [open, fetchFloatingGateways]);

    const handleSubmit = async () => {
        if (!mac.trim()) return;
        try {
            await registerGateway(mac.trim().toUpperCase());
            setMac('');
            onSuccess();
            onClose();
        } catch {
            // error is handled by hook
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir={isRtl ? 'rtl' : 'ltr'}>
            <DialogTitle sx={{ textAlign: 'start' }}>{t('aims.registerGateway')}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 1, textAlign: 'start' }}>
                    {t('aims.macAddressHelp')}
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    label={t('aims.macAddress')}
                    placeholder="D02544FFFE..."
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    slotProps={{
                        input: {
                            dir: 'ltr',
                            sx: { textAlign: 'left', fontFamily: 'monospace' },
                        },
                    }}
                />

                {/* Floating gateways selection */}
                {floatingGatewaysLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">{t('aims.floatingGateways')}...</Typography>
                    </Box>
                )}
                {!floatingGatewaysLoading && floatingGateways.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'start' }}>
                            {t('aims.selectFromList')}
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            {floatingGateways.map((gw: any) => {
                                const gwMac = gw.mac || gw.macAddress || '';
                                return (
                                    <Chip
                                        key={gwMac}
                                        label={gwMac}
                                        onClick={() => setMac(gwMac)}
                                        variant={mac === gwMac ? 'filled' : 'outlined'}
                                        color={mac === gwMac ? 'primary' : 'default'}
                                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading || !mac.trim()}>
                    {t('aims.register')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
