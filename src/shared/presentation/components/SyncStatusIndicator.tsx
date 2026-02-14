import { Box, CircularProgress, Popover, Typography, Stack, Divider, Paper, Button, useTheme, alpha } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

interface SyncStatusIndicatorProps {
    status: ConnectionStatus;
    lastSyncTime?: string;
    errorMessage?: string;
    onSyncClick?: () => void;
    serverConnected?: boolean;
    aimsConnected?: boolean;
    syncStartedAt?: Date;
    autoSyncEnabled?: boolean;
    autoSyncInterval?: number;
}

/** Format elapsed seconds into a human-readable string like "1m 23s" */
function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * SyncStatusIndicator Component
 * 
 * Displays connection/sync status with a professional floating badge design.
 * Shows detailed info in a popover on click.
 */
/** Format sync interval seconds into a friendly string like "Every 5 min" */
function formatSyncInterval(seconds: number): string {
    if (seconds < 60) return `Every ${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `Every ${minutes} min`;
}

export function SyncStatusIndicator({
    status,
    lastSyncTime,
    errorMessage,
    onSyncClick,
    serverConnected,
    aimsConnected,
    syncStartedAt,
    autoSyncEnabled,
    autoSyncInterval,
}: SyncStatusIndicatorProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Live elapsed-time counter while syncing
    useEffect(() => {
        if (status !== 'syncing' || !syncStartedAt) {
            setElapsedSeconds(0);
            return;
        }
        // Compute initial elapsed
        setElapsedSeconds(Math.floor((Date.now() - syncStartedAt.getTime()) / 1000));
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - syncStartedAt.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [status, syncStartedAt]);

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
                    color: theme.palette.success.main,
                    bg: alpha(theme.palette.success.main, 0.1),
                    borderColor: alpha(theme.palette.success.main, 0.5),
                    icon: <CheckCircleRoundedIcon fontSize="small" />,
                    label: t('sync.connected'),
                    description: t('sync.systemOperational'),
                };
            case 'disconnected':
                return {
                    color: theme.palette.text.secondary,
                    bg: theme.palette.action.hover,
                    borderColor: theme.palette.divider,
                    icon: <CloudOffRoundedIcon fontSize="small" />,
                    label: t('sync.disconnected'),
                    description: t('sync.checkConnection'),
                };
            case 'syncing':
                return {
                    color: theme.palette.primary.main,
                    bg: alpha(theme.palette.primary.main, 0.1),
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    icon: <CircularProgress size={16} color="inherit" />,
                    label: elapsedSeconds >= 5
                        ? `${t('sync.syncing')} (${formatElapsed(elapsedSeconds)})`
                        : t('sync.syncing'),
                    description: t('sync.processingData'),
                };
            case 'error':
                return {
                    color: theme.palette.error.main,
                    bg: alpha(theme.palette.error.main, 0.1),
                    borderColor: alpha(theme.palette.error.main, 0.5),
                    icon: <ErrorRoundedIcon fontSize="small" />,
                    label: t('sync.error'),
                    description: t('sync.attentionRequired'),
                };
        }
    };

    const config = getStatusConfig();

    return (
        <>
            <Paper
                elevation={2}
                onClick={handleClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    paddingInlineEnd: 2,
                    paddingInlineStart: 1,
                    py: 1,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid',
                    borderColor: config.borderColor,
                    bgcolor: config.bg,
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4],
                        borderColor: config.color,
                    }
                }}
            >
                {/* Status Icon Circle */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: config.bg,
                    color: config.color,
                    transition: 'background-color 0.3s ease',
                }}>
                    {config.icon}
                </Box>
                
                {/* Text Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2} color="text.primary">
                        {config.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1.1, mt: 0.3 }}>
                        {status === 'syncing'
                            ? (elapsedSeconds >= 5 ? t('sync.processingData') : t('sync.syncing'))
                            : 'SoluM API'}
                    </Typography>
                </Box>
            </Paper>
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
                slotProps={{
                    paper: {
                        sx: { 
                            mt: -1, 
                            borderRadius: 3,
                            boxShadow: '0px 0px 6px rgba(0, 0, 0, 0.32)',
                            overflow: 'hidden',
                            minWidth: { xs: 260, sm: 300 }
                        }
                    }
                }}
            >
                {/* Popover Header */}
                <Box sx={{ 
                    p: 2, 
                    bgcolor: alpha(config.color, 0.08),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <Box sx={{
                        color: config.color,
                        display: 'flex'
                    }}>
                        {config.icon}
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {config.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {config.description}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Stack gap={2.5}>
                        {/* Connection Details */}
                        {(serverConnected !== undefined || aimsConnected !== undefined) && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                                    {t('sync.connectionDetails', 'Connection Details')}
                                </Typography>
                                <Stack gap={1}>
                                    {serverConnected !== undefined && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('sync.serverConnection', 'Server')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{ 
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    bgcolor: serverConnected ? theme.palette.success.main : theme.palette.error.main 
                                                }} />
                                                <Typography variant="body2" fontWeight={500} color={serverConnected ? 'success.main' : 'error.main'}>
                                                    {serverConnected ? t('sync.connected') : t('sync.disconnected')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    {aimsConnected !== undefined && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                AIMS
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box sx={{ 
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    bgcolor: aimsConnected ? theme.palette.success.main : theme.palette.warning.main 
                                                }} />
                                                <Typography variant="body2" fontWeight={500} color={aimsConnected ? 'success.main' : 'warning.main'}>
                                                    {aimsConnected ? t('sync.connected') : t('sync.disconnected')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                        )}

                        {/* Last Sync Time */}
                        {lastSyncTime && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {t('sync.lastSync')}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {lastSyncTime}
                                </Typography>
                            </Box>
                        )}

                        {/* Auto Sync Interval */}
                        {autoSyncEnabled !== undefined && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {t('sync.autoSync', 'Auto Sync')}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTimeIcon sx={{ fontSize: 16, color: autoSyncEnabled ? 'success.main' : 'text.disabled' }} />
                                    <Typography variant="body2" fontWeight={500} color={autoSyncEnabled ? 'success.main' : 'text.disabled'}>
                                        {autoSyncEnabled && autoSyncInterval
                                            ? formatSyncInterval(autoSyncInterval)
                                            : t('sync.disabled', 'Disabled')}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Error Message */}
                        {status === 'error' && errorMessage && (
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    p: 1.5, 
                                    bgcolor: alpha(theme.palette.error.main, 0.05),
                                    borderColor: alpha(theme.palette.error.main, 0.2),
                                    borderRadius: 2
                                }}
                            >
                                <Typography variant="caption" color="error.main" fontWeight={600} display="block" gutterBottom>
                                    {t('common.errorDetails')}
                                </Typography>
                                <Typography variant="body2" color="text.primary" sx={{ wordBreak: 'break-word' }}>
                                    {errorMessage}
                                </Typography>
                            </Paper>
                        )}

                        {/* Manual Sync Button */}
                        {onSyncClick && status !== 'syncing' && (
                            <>
                                <Divider />
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<SyncRoundedIcon />}
                                    onClick={onSyncClick}
                                    disabled={status === 'disconnected'}
                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                >
                                    {t('sync.manualSync')}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Popover>
        </>
    );
}
