/**
 * SoluM Settings Tab
 *
 * Simplified view showing AIMS connection status and quick access to
 * the unified AIMS Settings dialog (accessible from Companies tab).
 */
import { Box, Stack, Typography, Alert, Button, CircularProgress, Paper, Chip } from '@mui/material';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';

import type { SettingsData } from '../domain/types';

interface SolumSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * SoluM Settings Tab — Status overview + reconnect
 * Full AIMS configuration is now in the unified AIMSSettingsDialog
 * accessible from Companies tab or Edit Company dialog.
 */
export function SolumSettingsTab({ settings }: SolumSettingsTabProps) {
    const { t } = useTranslation();
    const { reconnectToSolum } = useAuthStore();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectError, setReconnectError] = useState<string | null>(null);

    const isConnected = settings.solumConfig?.isConnected || false;

    const handleReconnect = useCallback(async () => {
        setIsReconnecting(true);
        setReconnectError(null);
        try {
            let { activeStoreId, user, setActiveStore } = useAuthStore.getState();

            if (!activeStoreId && user?.stores && user.stores.length > 0) {
                const firstStoreId = user.stores[0].id;
                await setActiveStore(firstStoreId);
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { settings: newSettings } = useSettingsStore.getState();
                if (newSettings.solumConfig?.isConnected) return;
                setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
                return;
            }

            if (!activeStoreId) {
                setReconnectError(t('settings.noStoreSelected', 'No store selected. Please select a store from the header menu.'));
                return;
            }

            const success = await reconnectToSolum();
            if (!success) {
                setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
            }
        } catch {
            setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
        } finally {
            setIsReconnecting(false);
        }
    }, [reconnectToSolum, t]);

    return (
        <Box sx={{ px: 2, maxWidth: 600, mx: 'auto' }}>
            {/* Connection Status Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                <CloudIcon sx={{ fontSize: 48, color: isConnected ? 'success.main' : 'text.disabled', mb: 1 }} />

                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {t('settings.aims.dialogTitle', 'AIMS Settings')}
                </Typography>

                {isConnected ? (
                    <Stack alignItems="center" gap={1.5}>
                        <Chip
                            icon={<CheckCircleIcon />}
                            label={t('settings.connectedToSolumServer', 'Connected to AIMS via server')}
                            color="success"
                            variant="outlined"
                        />
                        {settings.autoSyncEnabled && (
                            <Chip
                                icon={<SyncIcon />}
                                label={`${t('settings.enableAutoSync')}: ${settings.autoSyncInterval || 10}s`}
                                size="small"
                                variant="outlined"
                            />
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {t('settings.aims.manageInCompanies', 'Manage AIMS credentials, sync settings, and field mappings from the Companies tab.')}
                        </Typography>
                    </Stack>
                ) : (
                    <Stack alignItems="center" gap={2}>
                        <Alert severity="warning" sx={{ width: '100%' }}>
                            {t('settings.notConnectedToSolum', 'Not connected to AIMS. Please configure AIMS credentials in Company Settings and re-login.')}
                        </Alert>

                        <Button
                            variant="contained"
                            startIcon={isReconnecting ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                            onClick={handleReconnect}
                            disabled={isReconnecting}
                        >
                            {isReconnecting
                                ? t('settings.connecting', 'Connecting...')
                                : t('settings.retryConnection', 'Retry Connection')}
                        </Button>

                        {reconnectError && (
                            <Alert severity="error" sx={{ width: '100%' }}>
                                {reconnectError}
                            </Alert>
                        )}
                    </Stack>
                )}
            </Paper>
        </Box>
    );
}
