/**
 * Export Dialog Component
 * Allows user to configure export options
 */

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    FormControlLabel,
    Checkbox,
    Alert,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExportOptions } from '../domain/types';

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportDialog({ open, onClose, onExport }: ExportDialogProps) {
    const { t } = useTranslation();
    const [includeCredentials, setIncludeCredentials] = useState(true);
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setError(null);

        // Validate password if enabled
        if (usePassword) {
            if (!password) {
                setError(t('importExport.passwordRequired'));
                return;
            }
            if (password.length < 4) {
                setError(t('importExport.passwordTooShort'));
                return;
            }
            if (password !== confirmPassword) {
                setError(t('importExport.passwordsDoNotMatch'));
                return;
            }
        }

        setLoading(true);
        try {
            await onExport({
                includeCredentials,
                password: usePassword ? password : undefined,
            });

            // Reset and close
            setPassword('');
            setConfirmPassword('');
            setUsePassword(false);
            setIncludeCredentials(true);
            onClose();
        } catch (err: any) {
            setError(err.message || t('importExport.exportFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        setPassword('');
        setConfirmPassword('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('importExport.exportDialog')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" sx={{ py: 0, px: 2 }}>
                        {t('importExport.exportDescription')}
                    </Alert>

                    {error && (
                        <Alert severity="error" sx={{ py: 0, px: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={includeCredentials}
                                onChange={(e) => setIncludeCredentials(e.target.checked)}
                            />
                        }
                        label={t('importExport.includeCredentials')}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={usePassword}
                                onChange={(e) => setUsePassword(e.target.checked)}
                            />
                        }
                        label={t('importExport.protectWithPassword')}
                    />

                    {usePassword && (
                        <>
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('importExport.password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('importExport.confirmPassword')}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={handleExport} variant="contained" disabled={loading}>
                    {loading ? t('common.exporting') : t('importExport.export')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
