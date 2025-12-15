import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Chip,
    Alert,
    LinearProgress,
    Divider,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ErrorIcon from '@mui/icons-material/Error';
import { useSyncController } from '../application/useSyncController';
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';

/**
 * Sync Page - Synchronization Management
 */
export function SyncPage() {
    const settingsController = useSettingsController();
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
    });
    const syncController = useSyncController({
        csvConfig: settingsController.settings.csvConfig,
        onSpaceUpdate: (spaces) => spaceController.importFromSync(spaces),
    });

    const handleConnect = async () => {
        try {
            await syncController.connect();
        } catch (error) {
            console.error('Connection failed:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await syncController.disconnect();
        } catch (error) {
            console.error('Disconnection failed:', error);
        }
    };

    const handleSync = async () => {
        try {
            await syncController.sync();
        } catch (error) {
            console.error('Sync failed:', error);
        }
    };

    const getStatusColor = () => {
        if (syncController.syncState.isConnected) return 'success';
        if (syncController.syncState.lastError) return 'error';
        return 'default';
    };

    const getStatusIcon = () => {
        if (syncController.syncState.isConnected) return <CloudDoneIcon />;
        if (syncController.syncState.lastError) return <ErrorIcon />;
        return <CloudOffIcon />;
    };

    const getStatusText = () => {
        if (syncController.syncState.status === 'syncing') return 'Syncing...';
        if (syncController.syncState.isConnected) return 'Connected';
        if (syncController.syncState.lastError) return 'Error';
        return 'Disconnected';
    };

    return (
        <Box>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Synchronization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage data synchronization with {syncController.workingMode === 'SFTP' ? 'SFTP Server' : 'SoluM API'}
                </Typography>
            </Box>

            {/* Connection Status Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={3}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'start', sm: 'center' }}
                            spacing={2}
                        >
                            <Box>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Connection Status
                                </Typography>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Chip
                                        icon={getStatusIcon()}
                                        label={getStatusText()}
                                        color={getStatusColor()}
                                    />
                                    <Chip
                                        label={syncController.workingMode}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                {syncController.syncState.isConnected ? (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDisconnect}
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        onClick={handleConnect}
                                    >
                                        Connect
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    startIcon={<SyncIcon />}
                                    onClick={handleSync}
                                    disabled={!syncController.syncState.isConnected || syncController.syncState.status === 'syncing'}
                                >
                                    Sync Now
                                </Button>
                            </Stack>
                        </Stack>

                        {syncController.syncState.status === 'syncing' && (
                            <Box>
                                <LinearProgress />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                    Synchronizing data...
                                </Typography>
                            </Box>
                        )}

                        {syncController.syncState.lastError && (
                            <Alert severity="error" icon={<ErrorIcon />}>
                                {syncController.syncState.lastError}
                            </Alert>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Sync Information */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Sync Information
                    </Typography>
                    <Stack spacing={2} divider={<Divider />}>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="body2" color="text.secondary">
                                Last Sync
                            </Typography>
                            <Typography variant="body2">
                                {syncController.syncState.lastSync
                                    ? new Date(syncController.syncState.lastSync).toLocaleString()
                                    : 'Never'}
                            </Typography>
                        </Stack>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="body2" color="text.secondary">
                                Auto-Sync
                            </Typography>
                            <Chip
                                label={syncController.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                                color={syncController.autoSyncEnabled ? 'success' : 'default'}
                                size="small"
                            />
                        </Stack>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="body2" color="text.secondary">
                                Working Mode
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {syncController.workingMode}
                            </Typography>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* Help Text */}
            <Alert severity="info">
                Configure synchronization settings in the Settings page to change working mode and credentials.
            </Alert>
        </Box>
    );
}
