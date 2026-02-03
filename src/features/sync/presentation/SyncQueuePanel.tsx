/**
 * Sync Queue Panel Component
 * 
 * Displays the sync queue status with pending, completed, and failed items.
 * Allows retry of failed items and shows sync history.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Tooltip,
    CircularProgress,
    Button,
    Divider,
    Collapse,
    alpha,
    useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GroupIcon from '@mui/icons-material/Group';
import { useTranslation } from 'react-i18next';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import type { SyncQueueItem, SyncEntityType, SyncItemStatus } from '@shared/infrastructure/services/syncApi';

interface SyncQueuePanelProps {
    storeId: string | null;
    compact?: boolean;
    maxItems?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

const getEntityIcon = (entityType: SyncEntityType) => {
    switch (entityType) {
        case 'SPACE':
            return <BusinessIcon fontSize="small" />;
        case 'PERSON':
            return <PersonIcon fontSize="small" />;
        case 'CONFERENCE_ROOM':
            return <MeetingRoomIcon fontSize="small" />;
        case 'PEOPLE_LIST':
            return <GroupIcon fontSize="small" />;
        default:
            return <BusinessIcon fontSize="small" />;
    }
};

const getStatusIcon = (status: SyncItemStatus) => {
    switch (status) {
        case 'SYNCED':
            return <CheckCircleIcon fontSize="small" color="success" />;
        case 'FAILED':
            return <ErrorIcon fontSize="small" color="error" />;
        case 'PENDING':
            return <HourglassEmptyIcon fontSize="small" color="action" />;
        default:
            return <HourglassEmptyIcon fontSize="small" />;
    }
};

export function SyncQueuePanel({
    storeId,
    compact = false,
    maxItems = 10,
    autoRefresh = true,
    refreshInterval = 30000,
}: SyncQueuePanelProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<SyncQueueItem[]>([]);
    const [expanded, setExpanded] = useState(!compact);
    const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
    const [retrying, setRetrying] = useState<string | null>(null);

    const fetchQueue = useCallback(async () => {
        if (!storeId) return;

        try {
            setLoading(true);
            const response = await syncApi.getQueue(storeId, { limit: maxItems });
            setItems(response.data);
            setStats({
                pending: response.data.filter(i => i.status === 'PENDING').length,
                failed: response.data.filter(i => i.status === 'FAILED').length,
                total: response.pagination.total,
            });
        } catch (error) {
            console.error('Failed to fetch sync queue:', error);
        } finally {
            setLoading(false);
        }
    }, [storeId, maxItems]);

    // Initial fetch
    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Auto refresh
    useEffect(() => {
        if (!autoRefresh || !storeId) return;

        const interval = setInterval(fetchQueue, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, storeId, fetchQueue]);

    const handleRetry = async (itemId: string) => {
        setRetrying(itemId);
        try {
            await syncApi.retryItem(itemId);
            await fetchQueue();
        } catch (error) {
            console.error('Retry failed:', error);
        } finally {
            setRetrying(null);
        }
    };

    const handleRetryAllFailed = async () => {
        if (!storeId) return;

        setLoading(true);
        try {
            await syncApi.retryAllFailed(storeId);
            await fetchQueue();
        } catch (error) {
            console.error('Retry all failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFailed = async () => {
        if (!storeId) return;

        setLoading(true);
        try {
            await syncApi.clearFailed(storeId);
            await fetchQueue();
        } catch (error) {
            console.error('Clear failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!storeId) {
        return (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    {t('sync.noStoreSelected', 'Select a store to view sync queue')}
                </Typography>
            </Paper>
        );
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getOperationLabel = (operation: string) => {
        switch (operation) {
            case 'CREATE':
                return t('sync.operation.create', 'Create');
            case 'UPDATE':
                return t('sync.operation.update', 'Update');
            case 'DELETE':
                return t('sync.operation.delete', 'Delete');
            default:
                return operation;
        }
    };

    return (
        <Paper sx={{ overflow: 'hidden' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    cursor: compact ? 'pointer' : 'default',
                }}
                onClick={() => compact && setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                        {t('sync.queueTitle', 'Sync Queue')}
                    </Typography>
                    {stats.pending > 0 && (
                        <Chip
                            size="small"
                            label={stats.pending}
                            color="primary"
                            sx={{ p: 1, height: 20, fontSize: '0.75rem' }}
                        />
                    )}
                    {stats.failed > 0 && (
                        <Chip
                            size="small"
                            label={stats.failed}
                            color="error"
                            sx={{ p: 1, height: 20, fontSize: '0.75rem' }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!compact && (
                        <Tooltip title={t('sync.refresh', 'Refresh')}>
                            <IconButton size="small" onClick={fetchQueue} disabled={loading}>
                                {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    )}
                    {compact && (
                        <IconButton size="small">
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    )}
                </Box>
            </Box>

            <Collapse in={expanded}>
                {/* Action buttons */}
                {stats.failed > 0 && (
                    <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Button
                            size="small"
                            startIcon={<ReplayIcon />}
                            onClick={handleRetryAllFailed}
                            disabled={loading}
                        >
                            {t('sync.retryAllFailed', 'Retry All Failed')}
                        </Button>
                        <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleClearFailed}
                            disabled={loading}
                        >
                            {t('sync.clearFailed', 'Clear Failed')}
                        </Button>
                    </Box>
                )}

                {/* Queue items */}
                {items.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {t('sync.queueEmpty', 'Sync queue is empty')}
                        </Typography>
                    </Box>
                ) : (
                    <List dense disablePadding>
                        {items.map((item, index) => (
                            <Box key={item.id}>
                                {index > 0 && <Divider component="li" />}
                                <ListItem>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        {getEntityIcon(item.entityType)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                                    {item.entityId.substring(0, 8)}...
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={getOperationLabel(item.operation)}
                                                    variant="outlined"
                                                    sx={{ p: 1, height: 18, fontSize: '0.65rem' }}
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {getStatusIcon(item.status)}
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.status === 'FAILED' && item.lastError
                                                        ? item.lastError.substring(0, 30) + '...'
                                                        : formatTime(item.createdAt)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        {item.status === 'FAILED' && (
                                            <Tooltip title={t('sync.retry', 'Retry')}>
                                                <IconButton
                                                    edge="end"
                                                    size="small"
                                                    onClick={() => handleRetry(item.id)}
                                                    disabled={retrying === item.id}
                                                >
                                                    {retrying === item.id ? (
                                                        <CircularProgress size={16} />
                                                    ) : (
                                                        <ReplayIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {item.status === 'PENDING' && (
                                            <HourglassEmptyIcon fontSize="small" color="action" />
                                        )}
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </Box>
                        ))}
                    </List>
                )}

                {/* Footer with total count */}
                {stats.total > maxItems && (
                    <Box sx={{ p: 1.5, textAlign: 'center', borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="caption" color="text.secondary">
                            {t('sync.showingItems', 'Showing {{shown}} of {{total}} items', {
                                shown: items.length,
                                total: stats.total,
                            })}
                        </Typography>
                    </Box>
                )}
            </Collapse>
        </Paper>
    );
}

export default SyncQueuePanel;
