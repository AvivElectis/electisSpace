import { Box, Chip, CircularProgress, Tooltip, IconButton, Popover, Typography, Stack, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useState } from 'react';
import type { MouseEvent } from 'react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

interface SyncStatusIndicatorProps {
    status: ConnectionStatus;
    lastSyncTime?: string;
    workingMode?: 'SFTP' | 'SoluM';
    errorMessage?: string;
    onSyncClick?: () => void;
}

/**
 * SyncStatusIndicator Component
 * 
 * Displays connection/sync status with a clickable indicator.
 * Shows detailed info in a popover on click.
 * 
 * @example
 * <SyncStatusIndicator
 *   status="connected"
 *   lastSyncTime={lastSync}
 *   workingMode="SFTP"
 *   onSyncClick={handleManualSync}
 * />
 */
export function SyncStatusIndicator({
    status,
    lastSyncTime,
    workingMode = 'SFTP',
    errorMessage,
    onSyncClick,
}: SyncStatusIndicatorProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    color: 'success' as const,
                    icon: <CheckCircleIcon fontSize="small" />,
                    label: 'Connected',
                };
            case 'disconnected':
                return {
                    color: 'default' as const,
                    icon: <CloudOffIcon fontSize="small" />,
                    label: 'Disconnected',
                };
            case 'syncing':
                return {
                    color: 'primary' as const,
                    icon: <CircularProgress size={16} />,
                    label: 'Syncing...',
                };
            case 'error':
                return {
                    color: 'error' as const,
                    icon: <ErrorIcon fontSize="small" />,
                    label: 'Error',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <>
            <Tooltip title="Click for details">
                <Chip
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    size="small"
                    onClick={handleClick}
                    sx={{ cursor: 'pointer', fontWeight: 500 }}
                />
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box sx={{ p: 2.5, minWidth: 280 }}>
                    <Stack spacing={2}>
                        {/* Status */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Status
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {config.icon}
                                <Typography variant="body2" fontWeight={500}>
                                    {config.label}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider />

                        {/* Working Mode */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Working Mode
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {workingMode}
                            </Typography>
                        </Box>

                        {/* Last Sync Time */}
                        {lastSyncTime && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Last Sync
                                </Typography>
                                <Typography variant="body2">{lastSyncTime}</Typography>
                            </Box>
                        )}

                        {/* Error Message */}
                        {status === 'error' && errorMessage && (
                            <Box>
                                <Typography variant="caption" color="error.main" display="block">
                                    Error Details
                                </Typography>
                                <Typography variant="body2" color="error.main">
                                    {errorMessage}
                                </Typography>
                            </Box>
                        )}

                        {/* Manual Sync Button */}
                        {onSyncClick && status !== 'syncing' && (
                            <>
                                <Divider />
                                <IconButton
                                    size="small"
                                    onClick={onSyncClick}
                                    sx={{
                                        alignSelf: 'flex-start',
                                        gap: 1,
                                        px: 2,
                                        borderRadius: 1,
                                    }}
                                >
                                    <SyncIcon fontSize="small" />
                                    <Typography variant="caption">Manual Sync</Typography>
                                </IconButton>
                            </>
                        )}
                    </Stack>
                </Box>
            </Popover>
        </>
    );
}
