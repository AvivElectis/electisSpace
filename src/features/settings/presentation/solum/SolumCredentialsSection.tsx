import { Box, TextField, Stack, Typography, Button, Alert, Dialog, DialogContent, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsController } from '../../application/useSettingsController';
import type { SolumConfig } from '@shared/domain/types';

interface SolumCredentialsSectionProps {
    solumConfig: Partial<SolumConfig>;
    isConnected: boolean;
    isLocked: boolean;
    onConfigChange: (config: Partial<SolumConfig>) => void;
    /** Optional callback to trigger initial sync after successful connection */
    onConnected?: () => Promise<void>;
}

/**
 * SolumCredentialsSection - Authentication credentials and connect/disconnect
 */
export function SolumCredentialsSection({
    solumConfig,
    isConnected,
    isLocked,
    onConfigChange,
    onConnected,
}: SolumCredentialsSectionProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useNotifications();
    const { connectToSolum, disconnectFromSolum } = useSettingsController();
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const updateConfig = (updates: Partial<SolumConfig>) => {
        onConfigChange({
            ...solumConfig,
            companyName: solumConfig.companyName || '',
            username: solumConfig.username || '',
            password: solumConfig.password || '',
            storeNumber: solumConfig.storeNumber || '',
            cluster: solumConfig.cluster || 'common',
            baseUrl: solumConfig.baseUrl || '',
            syncInterval: solumConfig.syncInterval || 60,
            ...updates,
        });
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            await connectToSolum();
            showSuccess(t('settings.connectionSuccess'));
            
            // Trigger initial sync if callback provided
            if (onConnected) {
                setSyncing(true);
                try {
                    await onConnected();
                    showSuccess(t('settings.initialSyncComplete'));
                } catch (syncError) {
                    showError(
                        t('settings.initialSyncError', {
                            error: syncError instanceof Error ? syncError.message : String(syncError),
                        })
                    );
                } finally {
                    setSyncing(false);
                }
            }
        } catch (error) {
            showError(
                t('settings.connectionError', {
                    error: error instanceof Error ? error.message : String(error),
                })
            );
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        await disconnectFromSolum();
        showSuccess(t('settings.disconnected'));
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.authentication')}
            </Typography>
            <Stack gap={1.5}>
                <TextField
                    fullWidth
                    size="small"
                    label={t('settings.companyCode')}
                    value={solumConfig.companyName || ''}
                    onChange={(e) => updateConfig({ companyName: e.target.value })}
                    disabled={isLocked}
                />

                <TextField
                    fullWidth
                    size="small"
                    label={t('settings.storeNumber')}
                    value={solumConfig.storeNumber || ''}
                    onChange={(e) => updateConfig({ storeNumber: e.target.value })}
                    disabled={isLocked}
                />

                <TextField
                    fullWidth
                    size="small"
                    label={t('settings.username')}
                    value={solumConfig.username || ''}
                    onChange={(e) => updateConfig({ username: e.target.value })}
                    disabled={isLocked}
                />

                <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label={t('settings.password')}
                    value={solumConfig.password || ''}
                    onChange={(e) => updateConfig({ password: e.target.value })}
                    disabled={isLocked}
                />

                {isConnected ? (
                    <>
                        <Alert severity="success" sx={{ py: 0, px: 2, alignItems: 'center' }}>
                            {t('settings.connectedToSolum')}
                        </Alert>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDisconnect}
                            sx={{ width: 'fit-content' }}
                        >
                            {t('settings.disconnect')}
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleConnect}
                        disabled={connecting || syncing}
                        sx={{ width: 'fit-content' }}
                    >
                        {connecting ? t('settings.connecting') : t('settings.connect')}
                    </Button>
                )}
            </Stack>

            {/* Initial Sync Loading Dialog */}
            <Dialog
                open={syncing}
                PaperProps={{
                    sx: {
                        p: 3,
                        textAlign: 'center',
                        minWidth: 280,
                    }
                }}
            >
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={48} />
                    <Typography variant="body1" color="text.secondary">
                        {t('settings.fetchingInitialData')}
                    </Typography>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
