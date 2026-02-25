/**
 * Gateway Registration Dialog
 */

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGatewayManagement } from '../application/useGatewayManagement';

interface GatewayRegistrationProps {
    open: boolean;
    onClose: () => void;
    storeId: string;
    onSuccess: () => void;
}

export function GatewayRegistration({ open, onClose, storeId, onSuccess }: GatewayRegistrationProps) {
    const { t } = useTranslation();
    const [mac, setMac] = useState('');
    const { registerGateway, loading, error } = useGatewayManagement(storeId);

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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('aims.registerGateway', 'Register Gateway')}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                    autoFocus
                    fullWidth
                    label={t('aims.macAddress', 'MAC Address')}
                    placeholder="D02544FFFE..."
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                    sx={{ mt: 1 }}
                    helperText={t('aims.macAddressHelp', 'Enter the gateway MAC address (e.g., D02544FFFE123456)')}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading || !mac.trim()}>
                    {t('aims.register', 'Register')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
