/**
 * Import Dialog Component
 * Allows user to import settings with preview
 */

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Alert,
    Box,
    Typography,
    Divider,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportPreview } from '../domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface ImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (password?: string) => Promise<void>;
    preview: ImportPreview | null;
    isEncrypted: boolean;
}

export function ImportDialog({ open, onClose, onImport, preview, isEncrypted }: ImportDialogProps) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        setError(null);

        if (isEncrypted && !password) {
            setError(t('importExport.passwordRequired'));
            return;
        }

        const confirmed = await confirm({
            title: t('common.dialog.warning'),
            message: t('importExport.importWarning'),
            confirmLabel: t('common.dialog.continue'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'warning'
        });

        if (!confirmed) {
            return;
        }

        setLoading(true);
        try {
            await onImport(isEncrypted ? password : undefined);

            // Reset and close
            setPassword('');
            onClose();
        } catch (err: any) {
            setError(err.message || t('importExport.importFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        setPassword('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('importExport.importDialog')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && (
                        <Alert severity="error" sx={{ py: 0, px: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Alert severity="warning" sx={{ py: 0, px: 2 }}>
                        {t('importExport.importWarningMessage')}
                    </Alert>

                    {preview && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {t('importExport.importPreview')}
                            </Typography>
                            <Stack spacing={0.5} sx={{
                                bgcolor: 'action.hover',
                                p: 1.5,
                                borderRadius: 1,
                                fontSize: '0.875rem'
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('importExport.appName')}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {preview.appName}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('importExport.workingMode')}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {preview.workingMode}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('importExport.hasCredentials')}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {preview.hasCredentials ? t('common.yes') : t('common.no')}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('importExport.hasLogos')}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {preview.hasLogos ? t('common.yes') : t('common.no')}
                                    </Typography>
                                </Box>
                                <Divider sx={{ my: 0.5 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('importExport.exportedAt')}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {new Date(preview.timestamp).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {isEncrypted && (
                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label={t('importExport.enterPassword')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleImport()}
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={handleImport} variant="contained" disabled={loading}>
                    {loading ? t('common.importing') : t('importExport.import')}
                </Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
