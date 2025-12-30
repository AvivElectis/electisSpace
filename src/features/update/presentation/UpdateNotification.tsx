/**
 * UpdateNotification Component
 * 
 * Toast notification for available updates.
 * Shows update version info and action buttons.
 */

import { useEffect, useState } from 'react';
import {
    Snackbar,
    Alert,
    AlertTitle,
    Button,
    Box,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useUpdateController } from '../application/useUpdateController';
import { UpdateDialog } from './UpdateDialog';
import { UpdateProgress } from './UpdateProgress';

export function UpdateNotification() {
    const { t } = useTranslation();
    const {
        available,
        updateInfo,
        skipThisVersion,
        dismissUpdate,
        downloadUpdate,
    } = useUpdateController();

    const [open, setOpen] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    // Show notification when update is available
    useEffect(() => {
        if (available && updateInfo) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [available, updateInfo]);

    const handleUpdateNow = () => {
        setOpen(false);
        downloadUpdate();
    };

    const handleLater = () => {
        setOpen(false);
        dismissUpdate();
    };

    const handleSkip = () => {
        setOpen(false);
        skipThisVersion();
    };

    const handleViewDetails = () => {
        setOpen(false);
        setShowDialog(true);
    };

    if (!available || !updateInfo) {
        return null;
    }

    return (
        <>
            <Snackbar
                open={open}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} // RTL might swap this visually if theme is RTL
                autoHideDuration={60000} // 1 minute
                onClose={(_event, reason) => {
                    if (reason === 'clickaway') {
                        return;
                    }
                    handleLater();
                }}
            >
                <Alert
                    severity="info"
                    variant="filled"
                    sx={{
                        width: '400px',
                        maxWidth: '90vw',
                        // Ensure RTL friendly text alignment if not handled by theme
                        textAlign: 'start',
                    }}
                    action={null}
                >
                    <AlertTitle sx={{ fontWeight: 600 }}>
                        {t('update.available')}
                    </AlertTitle>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                        {t('update.newVersion', { version: updateInfo.version })}
                    </Typography>

                    {updateInfo.releaseNotes && (
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                mb: 2,
                                opacity: 0.9,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {updateInfo.releaseNotes.substring(0, 60)}
                            {updateInfo.releaseNotes.length > 60 ? '...' : ''}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            size="small"
                            variant="contained"
                            color="inherit"
                            onClick={handleUpdateNow}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                color: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 1)',
                                },
                            }}
                        >
                            {t('update.updateNow')}
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={handleViewDetails}
                            sx={{
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                color: 'white',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.8)',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            {t('update.viewDetails')}
                        </Button>

                        <Button
                            size="small"
                            onClick={handleLater}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            {t('update.later')}
                        </Button>

                        <Button
                            size="small"
                            onClick={handleSkip}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.75rem',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            {t('update.skip')}
                        </Button>
                    </Box>
                </Alert>
            </Snackbar>

            {/* Update Dialog for detailed view */}
            <UpdateDialog
                open={showDialog}
                updateInfo={updateInfo}
                onUpdate={() => {
                    setShowDialog(false);
                    downloadUpdate();
                }}
                onCancel={() => {
                    setShowDialog(false);
                }}
            />

            {/* Update Progress Dialog */}
            <UpdateProgress />
        </>
    );
}
