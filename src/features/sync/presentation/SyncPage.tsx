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
import { useSettingsController } from '@features/settings/application/useSettingsController';

/**
 * Sync Page
 * Manual sync triggering and status display
 */
export function SyncPage() {
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
            return <Chip label="Syncing..." color="info" icon={<SyncIcon />} />;
        }
        if (syncError) {
            return <Chip label="Error" color="error" icon={<ErrorIcon />} />;
        }
        if (lastSync) {
            return <Chip label="Connected" color="success" icon={<CheckCircleIcon />} />;
        }
        return <Chip label="Idle" color="default" />;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Synchronization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manually trigger sync or view sync status
                </Typography>
            </Box>

            {/* Sync Status Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Sync Status
                            </Typography>
                            {getStatusChip()}
                        </Box>

                        {syncing && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Synchronizing...
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
                                    Last Sync
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
                        Current Configuration
                    </Typography>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Working Mode
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.workingMode === 'SFTP'
                                    ? 'SFTP (CSV Files)'
                                    : 'SoluM API'
                                }
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Auto-Sync
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.autoSyncEnabled
                                    ? `Enabled (every ${settingsController.settings.autoSyncInterval}s)`
                                    : 'Disabled'
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
                {syncing ? 'Syncing...' : 'Manual Sync'}
            </Button>
        </Box>
    );
}
