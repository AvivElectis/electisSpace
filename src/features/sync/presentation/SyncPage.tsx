import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    LinearProgress,
    Chip,
    Alert,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsController } from '@features/settings/application/useSettingsController';

/**
 * Sync Page
 * Manual sync triggering and status display
 */
export function SyncPage() {
    const { t } = useTranslation();
    const settingsController = useSettingsController();
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    const handleSync = async () => {
        setSyncing(true);
        setSyncError(null);

        try {
            // TODO: Implement actual sync logic with adapters
            // await syncController.sync();

            // Simulate sync delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            setLastSync(new Date());
        } catch (error) {
            setSyncError(error instanceof Error ? error.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const getStatusChip = () => {
        if (syncing) {
            return <Chip label={t('sync.syncing')} color="info" icon={<SyncIcon />} />;
        }
        if (syncError) {
            return <Chip label={t('sync.error')} color="error" icon={<ErrorIcon />} />;
        }
        if (lastSync) {
            return <Chip label={t('sync.connected')} color="success" icon={<CheckCircleIcon />} />;
        }
        return <Chip label={t('sync.idle')} color="default" />;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {t('sync.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('sync.manualTrigger')}
                </Typography>
            </Box>

            {/* Sync Status Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                {t('sync.syncStatus')}
                            </Typography>
                            {getStatusChip()}
                        </Box>

                        {syncing && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {t('sync.synchronizing')}
                                </Typography>
                                <LinearProgress />
                            </Box>
                        )}

                        {syncError && (
                            <Alert severity="error">
                                {syncError}
                            </Alert>
                        )}

                        {lastSync && !syncing && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    {t('sync.lastSync')}
                                </Typography>
                                <Typography variant="body1">
                                    {lastSync.toLocaleString()}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('sync.currentConfig')}
                    </Typography>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('sync.workingMode')}
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.workingMode === 'SFTP'
                                    ? t('sync.sftpMode')
                                    : t('sync.solumMode')
                                }
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('sync.autoSync')}
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.autoSyncEnabled
                                    ? `${t('sync.enabled')} (${t('sync.every')} ${settingsController.settings.autoSyncInterval}s)`
                                    : t('sync.disabled')
                                }
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* Sync Button */}
            <Button
                variant="contained"
                size="large"
                startIcon={<SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
                sx={{ minWidth: 200 }}
            >
                {syncing ? t('sync.syncing') : t('sync.manualSync')}
            </Button>
        </Box>
    );
}
