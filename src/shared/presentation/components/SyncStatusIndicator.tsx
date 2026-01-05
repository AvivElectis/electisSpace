import { Box, CircularProgress, Popover, Typography, Stack, Divider, Paper, Button, useTheme, alpha } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
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
 * Displays connection/sync status with a professional floating badge design.
 * Shows detailed info in a popover on click.
 */
export function SyncStatusIndicator({
    status,
    lastSyncTime,
    workingMode = 'SFTP',
    errorMessage,
    onSyncClick,
}: SyncStatusIndicatorProps) {
    const { t } = useTranslation();
    const theme = useTheme();
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
                    icon: <CheckCircleRoundedIcon fontSize="small" />,
                    label: t('sync.connected'),
                    description: t('sync.systemOperational'),
                };
            case 'disconnected':
                return {
                    color: 'text' as const, // Use text.secondary for disconnected
                    icon: <CloudOffRoundedIcon fontSize="small" />,
                    label: t('sync.disconnected'),
                    description: t('sync.checkConnection'),
                };
            case 'syncing':
                return {
                    color: 'primary' as const,
                    icon: <CircularProgress size={16} color="inherit" />,
                    label: t('sync.syncing'),
                    description: t('sync.processingData'),
                };
            case 'error':
                return {
                    color: 'error' as const,
                    icon: <ErrorRoundedIcon fontSize="small" />,
                    label: t('sync.error'),
                    description: t('sync.attentionRequired'),
                };
        }
    };

    const config = getStatusConfig();
    const statusColor = status === 'disconnected' ? theme.palette.text.secondary : theme.palette[config.color].main;
    const statusBg = status === 'disconnected' ? theme.palette.action.hover : alpha(theme.palette[config.color].main, 0.1);

    return (
        <>
            <Paper
                elevation={2}
                onClick={handleClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: 1,
                    pr: 2.5,
                    py: 1,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4],
                        borderColor: alpha(statusColor, 0.5),
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
                    bgcolor: statusBg,
                    color: statusColor,
                    transition: 'background-color 0.3s ease',
                }}>
                    {config.icon}
                </Box>
                
                {/* Text Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" fontWeight={600} lineHeight={1.2} color="text.primary">
                        {config.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, mt: 0.3 }}>
                        {workingMode} Mode
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
                PaperProps={{
                    sx: { 
                        mt: -1, 
                        borderRadius: 3,
                        boxShadow: theme.shadows[8],
                        overflow: 'hidden',
                        minWidth: 300
                    }
                }}
            >
                {/* Popover Header */}
                <Box sx={{ 
                    p: 2, 
                    bgcolor: alpha(statusColor, 0.08),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <Box sx={{
                        color: statusColor,
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
                        {/* Working Mode Detail */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('sync.workingMode')}
                            </Typography>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    px: 1, 
                                    py: 0.5, 
                                    borderRadius: 1, 
                                    bgcolor: 'action.hover',
                                    typography: 'caption',
                                    fontWeight: 600
                                }}
                            >
                                {workingMode === 'SFTP' ? t('sync.sftpMode') : t('sync.solumMode')}
                            </Paper>
                        </Box>

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
                                    startIcon={<RefreshRoundedIcon />}
                                    onClick={onSyncClick}
                                    disabled={status === 'syncing'}
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
