/**
 * UpdateDialog Component
 * 
 * Modal dialog displaying detailed update information.
 * Shows release notes and platform-specific instructions.
 */

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo } from '../domain/types';
import { detectPlatform } from '@shared/infrastructure/platform/platformDetector';

interface UpdateDialogProps {
    open: boolean;
    updateInfo: UpdateInfo | null;
    onUpdate: () => void;
    onCancel: () => void;
}

export function UpdateDialog({
    open,
    updateInfo,
    onUpdate,
    onCancel,
}: UpdateDialogProps) {
    const { t } = useTranslation();
    const platform = detectPlatform();

    if (!updateInfo) {
        return null;
    }

    const getPlatformInstructions = () => {
        switch (platform) {
            case 'electron':
                return t('update.electronInstructions', {
                    defaultValue: 'The update will be downloaded and installed. The application will restart automatically.',
                });
            case 'android':
                return t('update.androidInstructions', {
                    defaultValue: 'You will be redirected to download the APK file. Please install it manually.',
                });
            case 'web':
                return t('update.webInstructions', {
                    defaultValue: 'You will be redirected to the download page.',
                });
            default:
                return '';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" component="span">
                        {t('update.available')}
                    </Typography>
                    <Chip
                        label={`v${updateInfo.version}`}
                        color="primary"
                        size="small"
                    />
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Release Info */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('update.whatsNew')}
                    </Typography>

                    {updateInfo.releaseNotes ? (
                        <Box
                            sx={{
                                mt: 1,
                                p: 2,
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                maxHeight: '200px',
                                overflow: 'auto',
                                '& h1, & h2, & h3': {
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    margin: '0.5em 0',
                                },
                                '& p': {
                                    margin: '0.5em 0',
                                },
                                '& ul, & ol': {
                                    paddingLeft: '1.5em',
                                    margin: '0.5em 0',
                                },
                                '& hr': {
                                    margin: '1em 0',
                                    border: 'none',
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                },
                            }}
                            dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                        />
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t('update.noReleaseNotes', {
                                defaultValue: 'No release notes available.',
                            })}
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Additional Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {updateInfo.releaseDate && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('update.releaseDate')}:
                            </Typography>
                            <Typography variant="body2">
                                {new Date(updateInfo.releaseDate).toLocaleDateString()}
                            </Typography>
                        </Box>
                    )}

                    {updateInfo.fileSize && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('update.size')}:
                            </Typography>
                            <Typography variant="body2">
                                {(updateInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Platform Instructions */}
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
                        {getPlatformInstructions()}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onCancel} variant="outlined">
                    {t('common.cancel')}
                </Button>
                <Button
                    onClick={onUpdate}
                    variant="contained"
                    color="primary"
                    autoFocus
                >
                    {t('update.updateNow')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
