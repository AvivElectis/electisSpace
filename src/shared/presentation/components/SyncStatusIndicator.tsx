import { Box, Chip, CircularProgress, Tooltip, IconButton, Popover, Typography, Stack, Divider } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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

    const buttonStates = {
        connected: {
            bgcolor: '#4caf4f8f',
            color: '#000',
            fontWeight: 600,
            //border: '1px solid #313131ff',
        },
        disconnected: {
            bgcolor: '#e66e6587',
            color: '#FFFFFF',
            //border: '1px solid #313131ff',
        },
        syncing: {
            bgcolor: '#2195f38a',
            color: '#FFFFFF',
        },
        error: {
            bgcolor: '#f4433681',
            color: '#FFFFFF',
        },
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    color: 'success' as const,
                    icon: <CheckCircleOutlineIcon />,
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
                    size="small"
                    onClick={handleClick}
                    sx={{
                        cursor: 'pointer',
                        fontWeight: 500,
                        px: 3,
                        paddingInlineEnd: 2,
                        borderRadius: 2,
                        py: 3,
                        boxShadow: '0px 0px 2px 1px rgba(0, 0, 0, 0.61)',
                        ...buttonStates[status],
                        '&:hover': {
                            backgroundColor: '#ffffffff',
                            color: '#363535ff',
                            textShadow: 'none',
                            transform: 'scale(1.05)',
                        },
                    }}
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
                    <Stack gap={2}>
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
                        {onSyncClick && status !== 'syncing' && status !== 'disconnected' && (
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
