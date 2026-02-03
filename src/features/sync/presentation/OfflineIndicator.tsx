/**
 * Offline Indicator Component
 * 
 * Shows a banner or badge when the user is offline.
 * Indicates pending items waiting to sync.
 */

import { Box, Snackbar, Alert, Badge, Chip, Tooltip, useTheme, alpha } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import { useTranslation } from 'react-i18next';
import { useOfflineQueueStore } from '../infrastructure/offlineQueueStore';

interface OfflineIndicatorProps {
    storeId?: string;
    variant?: 'banner' | 'badge' | 'chip';
}

export function OfflineIndicator({
    storeId,
    variant = 'chip',
}: OfflineIndicatorProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const { isOnline, items, isSyncing, getPendingCount } = useOfflineQueueStore();

    const pendingCount = storeId ? getPendingCount(storeId) : items.length;

    // If online and no pending items, don't show anything
    if (isOnline && pendingCount === 0) {
        return null;
    }

    if (variant === 'banner') {
        return (
            <Snackbar
                open={!isOnline}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity="warning"
                    icon={<CloudOffIcon />}
                    sx={{ width: '100%' }}
                >
                    {t('offline.banner', 'You are offline. Changes will be synced when you reconnect.')}
                    {pendingCount > 0 && (
                        <Box component="span" sx={{ ml: 1, fontWeight: 'bold' }}>
                            ({pendingCount} {t('offline.pendingItems', 'pending')})
                        </Box>
                    )}
                </Alert>
            </Snackbar>
        );
    }

    if (variant === 'badge') {
        const getIcon = () => {
            if (!isOnline) return <CloudOffIcon />;
            if (isSyncing) return <CloudQueueIcon />;
            if (pendingCount > 0) return <CloudQueueIcon />;
            return <CloudDoneIcon />;
        };

        const getColor = () => {
            if (!isOnline) return 'warning';
            if (isSyncing) return 'primary';
            if (pendingCount > 0) return 'info';
            return 'success';
        };

        return (
            <Tooltip
                title={
                    !isOnline
                        ? t('offline.tooltip', 'Offline - {{count}} pending', { count: pendingCount })
                        : isSyncing
                        ? t('offline.syncing', 'Syncing...')
                        : pendingCount > 0
                        ? t('offline.pending', '{{count}} items pending sync', { count: pendingCount })
                        : t('offline.online', 'Online')
                }
            >
                <Badge
                    badgeContent={pendingCount}
                    color={getColor()}
                    max={99}
                >
                    {getIcon()}
                </Badge>
            </Tooltip>
        );
    }

    // Default: chip variant
    if (!isOnline) {
        return (
            <Chip
                icon={<CloudOffIcon />}
                label={
                    pendingCount > 0
                        ? t('offline.chipWithCount', 'Offline ({{count}})', { count: pendingCount })
                        : t('offline.chip', 'Offline')
                }
                color="warning"
                size="small"
                sx={{
                    p: 1,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.dark,
                }}
            />
        );
    }

    if (pendingCount > 0) {
        return (
            <Chip
                icon={isSyncing ? <CloudQueueIcon /> : <CloudQueueIcon />}
                label={
                    isSyncing
                        ? t('offline.syncingChip', 'Syncing...')
                        : t('offline.pendingChip', '{{count}} pending', { count: pendingCount })
                }
                color="info"
                size="small"
                sx={{
                    p: 1,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.dark,
                }}
            />
        );
    }

    return null;
}

export default OfflineIndicator;
