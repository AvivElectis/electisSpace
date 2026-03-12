/**
 * Spaces Sync Panel
 *
 * Shows AIMS sync status and provides pull/push/full sync buttons.
 */
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Paper,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { spacesApi } from '../infrastructure/spacesApi';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { logger } from '@shared/infrastructure/services/logger';

interface SyncStatus {
    totalSpaces: number;
    pendingSpaces: number;
    syncedSpaces: number;
    errorSpaces: number;
    pendingQueueItems: number;
    failedQueueItems: number;
    lastSyncAt: string | null;
    syncEnabled: boolean;
    aimsConnected: boolean;
}

interface SpacesSyncPanelProps {
    onSyncComplete?: () => void;
}

export function SpacesSyncPanel({ onSyncComplete }: SpacesSyncPanelProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const activeStoreId = useAuthStore((state) => state.activeStoreId);

    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<SyncStatus | null>(null);
    const [syncing, setSyncing] = useState<'pull' | 'push' | 'full' | null>(null);
    const [lastResult, setLastResult] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        if (!activeStoreId) return;
        try {
            const result = await spacesApi.syncStatus(activeStoreId);
            setStatus(result);
        } catch (err) {
            logger.error('SpacesSyncPanel', 'Failed to fetch sync status', { error: String(err) });
        }
    }, [activeStoreId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handlePull = async () => {
        if (!activeStoreId || syncing) return;
        setSyncing('pull');
        setLastResult(null);
        try {
            const result = await spacesApi.syncPull(activeStoreId);
            setLastResult(t('spaces.sync.pullResult', { created: result.created, updated: result.updated, unchanged: result.unchanged }));
            await fetchStatus();
            onSyncComplete?.();
        } catch (err) {
            setLastResult(t('spaces.sync.error', 'Sync failed'));
            logger.error('SpacesSyncPanel', 'Pull failed', { error: String(err) });
        } finally {
            setSyncing(null);
        }
    };

    const handlePush = async () => {
        if (!activeStoreId || syncing) return;
        setSyncing('push');
        setLastResult(null);
        try {
            const result = await spacesApi.syncPush(activeStoreId);
            setLastResult(t('spaces.sync.pushResult', { processed: result.processed, pending: result.pending }));
            await fetchStatus();
        } catch (err) {
            setLastResult(t('spaces.sync.error', 'Sync failed'));
            logger.error('SpacesSyncPanel', 'Push failed', { error: String(err) });
        } finally {
            setSyncing(null);
        }
    };

    const handleFullSync = async () => {
        if (!activeStoreId || syncing) return;
        setSyncing('full');
        setLastResult(null);
        try {
            await spacesApi.syncFull(activeStoreId);
            setLastResult(t('spaces.sync.fullResult', 'Full sync complete'));
            await fetchStatus();
            onSyncComplete?.();
        } catch (err) {
            setLastResult(t('spaces.sync.error', 'Sync failed'));
            logger.error('SpacesSyncPanel', 'Full sync failed', { error: String(err) });
        } finally {
            setSyncing(null);
        }
    };

    if (!activeStoreId) return null;

    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1, bgcolor: 'action.hover', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <Stack direction="row" alignItems="center" gap={1}>
                    <SyncIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight={600}>
                        {t('spaces.sync.title', 'AIMS Sync')}
                    </Typography>
                    {status && (
                        <Tooltip title={status.aimsConnected ? t('spaces.sync.connected', 'Connected') : t('spaces.sync.disconnected', 'Disconnected')}>
                            {status.aimsConnected
                                ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                : <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            }
                        </Tooltip>
                    )}
                    {status && status.pendingQueueItems > 0 && (
                        <Chip label={`${status.pendingQueueItems} ${t('spaces.sync.pending', 'pending')}`} size="small" color="warning" variant="outlined" />
                    )}
                </Stack>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Stack>

            <Collapse in={expanded}>
                <Box sx={{ px: 2, py: 1.5 }}>
                    {/* Status Row */}
                    {status && (
                        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                            <Chip label={`${status.syncedSpaces} ${t('spaces.sync.synced', 'synced')}`} size="small" color="success" variant="outlined" />
                            <Chip label={`${status.pendingSpaces} ${t('spaces.sync.pendingSpaces', 'pending')}`} size="small" color="warning" variant="outlined" />
                            {status.errorSpaces > 0 && (
                                <Chip label={`${status.errorSpaces} ${t('spaces.sync.errors', 'errors')}`} size="small" color="error" variant="outlined" />
                            )}
                            {status.lastSyncAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                    {t('spaces.sync.lastSync', 'Last sync')}: {new Date(status.lastSyncAt).toLocaleString()}
                                </Typography>
                            )}
                        </Stack>
                    )}

                    {/* Action Buttons */}
                    <Stack direction={isMobile ? 'column' : 'row'} gap={1}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={syncing === 'pull' ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                            onClick={handlePull}
                            disabled={!!syncing}
                        >
                            {t('spaces.sync.pull', 'Pull from AIMS')}
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={syncing === 'push' ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                            onClick={handlePush}
                            disabled={!!syncing}
                        >
                            {t('spaces.sync.push', 'Push to AIMS')}
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={syncing === 'full' ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                            onClick={handleFullSync}
                            disabled={!!syncing}
                        >
                            {t('spaces.sync.fullSync', 'Full Sync')}
                        </Button>
                    </Stack>

                    {/* Last Result */}
                    {lastResult && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {lastResult}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
}
