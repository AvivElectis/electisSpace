import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    Stack,
    Alert,
    IconButton,
    Tooltip,
    Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UnlockDialogProps {
    open: boolean;
    onClose: () => void;
    onUnlock: (password: string) => boolean;
}

/**
 * Simple unlock dialog for locked settings
 * Shows only password input form
 */
export function UnlockDialog({ open, onClose, onUnlock }: UnlockDialogProps) {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = () => {
        setError(null);

        if (!password) {
            setError(t('settings.enterPassword'));
            return;
        }

        const success = onUnlock(password);
        if (success) {
            setPassword('');
            setError(null);
            // Dialog will close automatically when unlocked
        } else {
            setError(t('settings.incorrectPassword'));
            setPassword('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={(_event, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
                onClose();
            }}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {t('settings.unlockSettings')}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        insetInlineEnd: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 3 }}>
                <Stack gap={2.5}>
                    {/* Status */}
                    <Alert severity="warning" sx={{ py: 0.5, px: 2 }}>
                        🔒 {t('settings.lockedMessage')}
                    </Alert>

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ py: 0.5, px: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Password Input */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                fullWidth
                                autoFocus
                                type="password"
                                label={t('settings.enterPasswordToUnlock')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                size="medium"
                            />
                            <Tooltip title={t('settings.adminPasswordHint')} arrow>
                                <InfoOutlined color="action" sx={{ cursor: 'help' }} />
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Unlock Button */}
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<LockOpenIcon />}
                        onClick={handleUnlock}
                        disabled={!password}
                        fullWidth
                    >
                        {t('settings.unlockAppSettings')}
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
