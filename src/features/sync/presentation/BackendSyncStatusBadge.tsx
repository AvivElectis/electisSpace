/**
 * Backend Sync Status Badge
 * 
 * Compact badge showing sync status from the backend API.
 * Shows connection status, pending items, and failed items count.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Badge,
    Tooltip,
    IconButton,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import type { SyncStatusResponse } from '@shared/infrastructure/services/syncApi';

interface BackendSyncStatusBadgeProps {
    storeId: string | null;
    onClick?: () => void;
    autoRefresh?: boolean;
    refreshInterval?: number;
    size?: 'small' | 'medium' | 'large';
}

export function BackendSyncStatusBadge({
    storeId,
    onClick,
    autoRefresh = true,
    refreshInterval = 30000,
    size = 'medium',
}: BackendSyncStatusBadgeProps) {
    const theme = useTheme();
    const [status, setStatus] = useState<SyncStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        if (!storeId) {
            setStatus(null);
            return;
        }

        try {
            setLoading(true);
            const response = await syncApi.getStatus(storeId);
            setStatus(response);
        } catch (error) {
            console.error('Failed to fetch sync status:', error);
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        if (!autoRefresh || !storeId) return;

        const interval = setInterval(fetchStatus, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, storeId, fetchStatus]);

    const getStatusConfig = () => {
        if (loading) {
            return {
                icon: <CircularProgress size={size === 'small' ? 16 : 20} />,
                color: theme.palette.primary.main,
                bgColor: alpha(theme.palette.primary.main, 0.1),
                tooltip: 'Checking status...',
            };
        }

        if (!status || !storeId) {
            return {
                icon: <CloudOffIcon fontSize={size} />,
                color: theme.palette.text.disabled,
                bgColor: theme.palette.action.disabledBackground,
                tooltip: 'No store selected',
            };
        }

        if (status.status === 'syncing') {
            return {
                icon: (
                    <SyncIcon
                        fontSize={size}
                        sx={{
                            animation: 'spin 1s linear infinite',
                            '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                            },
                        }}
                    />
                ),
                color: theme.palette.primary.main,
                bgColor: alpha(theme.palette.primary.main, 0.1),
                tooltip: `Syncing... (${status.pendingItems} pending)`,
            };
        }

        if (status.failedItems > 0) {
            return {
                icon: <ErrorIcon fontSize={size} />,
                color: theme.palette.error.main,
                bgColor: alpha(theme.palette.error.main, 0.1),
                tooltip: `${status.failedItems} failed items`,
            };
        }

        if (!status.aimsConnected) {
            return {
                icon: <CloudOffIcon fontSize={size} />,
                color: theme.palette.warning.main,
                bgColor: alpha(theme.palette.warning.main, 0.1),
                tooltip: 'AIMS disconnected',
            };
        }

        return {
            icon: <CheckCircleIcon fontSize={size} />,
            color: theme.palette.success.main,
            bgColor: alpha(theme.palette.success.main, 0.1),
            tooltip: status.lastSync
                ? `Last sync: ${new Date(status.lastSync).toLocaleTimeString()}`
                : 'Connected',
        };
    };

    const config = getStatusConfig();
    const badgeContent = status ? status.pendingItems + status.failedItems : 0;

    return (
        <Tooltip title={config.tooltip}>
            <IconButton
                onClick={onClick}
                size={size}
                sx={{
                    color: config.color,
                    bgcolor: config.bgColor,
                    '&:hover': {
                        bgcolor: alpha(config.color, 0.2),
                    },
                }}
            >
                <Badge
                    badgeContent={badgeContent > 0 ? badgeContent : undefined}
                    color={status?.failedItems ? 'error' : 'primary'}
                    max={99}
                    sx={{
                        '& .MuiBadge-badge': {
                            fontSize: '0.65rem',
                            height: 16,
                            minWidth: 16,
                        },
                    }}
                >
                    {config.icon}
                </Badge>
            </IconButton>
        </Tooltip>
    );
}

export default BackendSyncStatusBadge;
