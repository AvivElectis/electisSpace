import { Box, Chip, CircularProgress, Tooltip, IconButton, Popover, Typography, Stack, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
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
                    label: t('sync.connected'),
                };
            case 'disconnected':
                return {
                    color: 'default' as const,
                    icon: <CloudOffIcon fontSize="small" />,
                    label: t('sync.disconnected'),
                };
            case 'syncing':
                return {
                    color: 'primary' as const,
                    icon: <CircularProgress size={16} />,
                    label: t('sync.syncing'),
                };
            case 'error':
                return {
                    color: 'error' as const,
                    icon: <ErrorIcon fontSize="small" />,
                    label: t('sync.error'),
                };
        }
    };

    const config = getStatusConfig();

    return (
        <>
            <Tooltip title={t('sync.syncStatus')}>
                <Chip
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    size="small"
                    onClick={handleClick}
                    sx={{ cursor: 'pointer', 
                        fontWeight: 500, 
                        px: 3, 
                        paddingInlineEnd: 2, 
                        borderRadius: 2, 
                        py:3, 
                        border: '1px solid #007AFF', 
                        bgcolor: 'rgba(255, 255, 255, 0.8)',}}
                />
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2.5, minWidth: 280 }}>
                    <Stack spacing={2}>
                        {/* Status */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {t('sync.status')}
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
                                {t('sync.workingMode')}
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {workingMode === 'SFTP' ? t('sync.sftpMode') : t('sync.solumMode')}
                            </Typography>
                        </Box>

                        {/* Last Sync Time */}
                        {lastSyncTime && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {t('sync.lastSync')}
                                </Typography>
                                <Typography variant="body2">{lastSyncTime}</Typography>
                            </Box>
                        )}

                        {/* Error Message */}
                        {status === 'error' && errorMessage && (
                            <Box>
                                <Typography variant="caption" color="error.main" display="block">
                                    {t('common.error')}
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
                                    <Typography variant="caption">{t('sync.manualSync')}</Typography>
                                </IconButton>
                            </>
                        )}
                    </Stack>
                </Box>
            </Popover>
        </>
    );
}
