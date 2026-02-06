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
    Divider,
    useTheme,
    alpha,
    CircularProgress,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';

/**
 * Connection status dot + label row
 */
function ConnectionRow({ label, connected }: { label: string; connected: boolean }) {
    const theme = useTheme();
    const { t } = useTranslation();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: connected ? theme.palette.success.main : theme.palette.error.main,
                }} />
                <Typography variant="body2" fontWeight={600} color={connected ? 'success.main' : 'error.main'}>
                    {connected ? t('sync.connected') : t('sync.disconnected')}
                </Typography>
            </Box>
        </Box>
    );
}

/**
 * Sync Page
 * Full sync dashboard — manual sync triggering, connection status, and queue info
 */
export function SyncPage() {
    const { t } = useTranslation();
    const theme = useTheme();
    const settingsController = useSettingsController();
    const [actionInProgress, setActionInProgress] = useState<'pull' | 'push' | 'full' | null>(null);

    // Use full backend sync controller from context
    const {
        syncState,
        syncStatus,
        serverConnected,
        storeId,
        pull,
        push,
        fullSync,
        refreshStatus,
    } = useBackendSyncContext();

    // Derived state
    const syncing = syncState.status === 'syncing' || actionInProgress !== null;
    const lastSync = syncState.lastSync ? new Date(syncState.lastSync) : null;
    const syncError = syncState.lastError || null;
    const aimsConnected = syncState.isConnected;
    const hasStore = !!storeId;

    const handlePull = async () => {
        setActionInProgress('pull');
        try {
            await pull();
        } catch {
            // Error is handled in controller state
        } finally {
            setActionInProgress(null);
        }
    };

    const handlePush = async () => {
        setActionInProgress('push');
        try {
            await push();
        } catch {
            // Error is handled in controller state
        } finally {
            setActionInProgress(null);
        }
    };

    const handleFullSync = async () => {
        setActionInProgress('full');
        try {
            await fullSync();
        } catch {
            // Error is handled in controller state
        } finally {
            setActionInProgress(null);
        }
    };

    const handleRefresh = async () => {
        await refreshStatus();
    };

    const getStatusChip = () => {
        if (syncing) {
            return <Chip sx={{ px: 2, paddingInlineEnd: 1 }} label={t('sync.syncing')} color="info" icon={<SyncIcon />} />;
        }
        if (syncError) {
            return <Chip sx={{ px: 2, paddingInlineEnd: 1 }} label={t('sync.error')} color="error" icon={<ErrorIcon />} />;
        }
        if (aimsConnected) {
            return <Chip sx={{ px: 2, paddingInlineEnd: 1 }} label={t('sync.connected')} color="success" icon={<CheckCircleIcon />} />;
        }
        if (!serverConnected) {
            return <Chip sx={{ px: 2, paddingInlineEnd: 1 }} label={t('sync.disconnected')} color="default" icon={<CloudOffIcon />} />;
        }
        return <Chip sx={{ px: 2, paddingInlineEnd: 1 }} label={t('sync.idle')} color="default" />;
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
                    <Stack gap={3}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">
                                {t('sync.syncStatus')}
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<RefreshIcon />}
                                onClick={handleRefresh}
                                disabled={!hasStore}
                                sx={{ textTransform: 'none' }}
                            >
                                {t('sync.refresh', 'Refresh')}
                            </Button>
                        </Box>

                        {getStatusChip()}

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

            {/* Connection Details Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('sync.connectionDetails', 'Connection Details')}
                    </Typography>
                    <Stack gap={1.5}>
                        <ConnectionRow
                            label={t('sync.serverConnection', 'Server')}
                            connected={serverConnected}
                        />
                        <ConnectionRow
                            label="AIMS (SoluM)"
                            connected={aimsConnected}
                        />
                    </Stack>

                    {/* Queue stats from syncStatus */}
                    {syncStatus && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('sync.queueTitle', 'Sync Queue')}
                            </Typography>
                            <Stack direction="row" gap={2}>
                                <Box sx={{
                                    flex: 1, p: 1.5, borderRadius: 2,
                                    bgcolor: syncStatus.pendingItems > 0
                                        ? alpha(theme.palette.info.main, 0.08)
                                        : alpha(theme.palette.success.main, 0.06),
                                    border: '1px solid',
                                    borderColor: syncStatus.pendingItems > 0
                                        ? alpha(theme.palette.info.main, 0.3)
                                        : alpha(theme.palette.success.main, 0.2),
                                    textAlign: 'center',
                                }}>
                                    <Typography variant="h5" fontWeight={700} color={syncStatus.pendingItems > 0 ? 'info.main' : 'success.main'}>
                                        {syncStatus.pendingItems}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                                </Box>
                                <Box sx={{
                                    flex: 1, p: 1.5, borderRadius: 2,
                                    bgcolor: syncStatus.failedItems > 0
                                        ? alpha(theme.palette.error.main, 0.08)
                                        : alpha(theme.palette.success.main, 0.06),
                                    border: '1px solid',
                                    borderColor: syncStatus.failedItems > 0
                                        ? alpha(theme.palette.error.main, 0.3)
                                        : alpha(theme.palette.success.main, 0.2),
                                    textAlign: 'center',
                                }}>
                                    <Typography variant="h5" fontWeight={700} color={syncStatus.failedItems > 0 ? 'error.main' : 'success.main'}>
                                        {syncStatus.failedItems}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Failed</Typography>
                                </Box>
                            </Stack>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('sync.currentConfig')}
                    </Typography>
                    <Stack gap={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('sync.workingMode')}
                            </Typography>
                            <Typography variant="body1">
                                {t('sync.solumMode')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('sync.autoSync')}
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.autoSyncEnabled
                                    ? `${t('sync.enabled')} (${t('sync.every')} ${settingsController.settings.autoSyncInterval || 300}s)`
                                    : t('sync.disabled')
                                }
                            </Typography>
                        </Box>
                        {storeId && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Store ID
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>
                                    {storeId}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* No store selected warning */}
            {!hasStore && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {t('sync.noStoreSelected', 'Select a store to enable sync operations')}
                </Alert>
            )}

            {/* Sync Action Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={syncing && actionInProgress === 'full'
                        ? <CircularProgress size={18} color="inherit" />
                        : <SyncIcon />
                    }
                    onClick={handleFullSync}
                    disabled={syncing || !hasStore}
                    sx={{ minWidth: { xs: '100%', sm: 200 } }}
                >
                    {syncing && actionInProgress === 'full' ? t('sync.syncing') : t('sync.manualSync')}
                </Button>
                <Button
                    variant="outlined"
                    size="large"
                    startIcon={syncing && actionInProgress === 'pull'
                        ? <CircularProgress size={18} color="inherit" />
                        : <CloudDownloadIcon />
                    }
                    onClick={handlePull}
                    disabled={syncing || !hasStore}
                    sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                    {syncing && actionInProgress === 'pull' ? t('sync.syncing') : 'Pull from AIMS'}
                </Button>
                <Button
                    variant="outlined"
                    size="large"
                    startIcon={syncing && actionInProgress === 'push'
                        ? <CircularProgress size={18} color="inherit" />
                        : <CloudUploadIcon />
                    }
                    onClick={handlePush}
                    disabled={syncing || !hasStore}
                    sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                    {syncing && actionInProgress === 'push' ? t('sync.syncing') : 'Push to AIMS'}
                </Button>
            </Stack>
        </Box>
    );
}
