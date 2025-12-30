/**
 * UpdateProgress Component
 * 
 * Progress bar showing update download and installation status.
 * Only visible during Electron updates with download progress.
 */

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    LinearProgress,
    Typography,
    Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useUpdateController } from '../application/useUpdateController';

export function UpdateProgress() {
    const { t } = useTranslation();
    const {
        downloading,
        installing,
        progress,
        installUpdate,
    } = useUpdateController();

    const isOpen = downloading || installing;
    const downloadComplete = !downloading && progress === 100;

    const getStatusMessage = () => {
        if (installing) {
            return t('update.installing');
        }
        if (downloading) {
            return t('update.downloading');
        }
        if (downloadComplete) {
            return t('update.downloadComplete');
        }
        return '';
    };

    return (
        <Dialog
            open={isOpen}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={installing}
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle>
                {installing ? t('update.installing') : t('update.downloading')}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ width: '100%', mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {getStatusMessage()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {progress}%
                        </Typography>
                    </Box>

                    <LinearProgress
                        variant={installing ? 'indeterminate' : 'determinate'}
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                        }}
                    />
                </Box>

                {downloadComplete && !installing && (
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'success.light',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'success.main',
                        }}
                    >
                        <Typography variant="body2" color="success.dark">
                            {t('update.readyToInstall')}
                        </Typography>
                    </Box>
                )}

                {installing && (
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'info.light',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'info.main',
                        }}
                    >
                        <Typography variant="body2" color="info.dark">
                            {t('update.installingMessage', {
                                defaultValue: 'Please wait while the update is being installed...',
                            })}
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            {downloadComplete && !installing && (
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={installUpdate}
                        variant="contained"
                        color="primary"
                        fullWidth
                    >
                        {t('update.installAndRestart')}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
}
