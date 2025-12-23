import {
    Box,
    Stack,
    Typography,
    Button,
    TextField,
    Alert,
    Divider,
    FormControlLabel,
    Switch,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SecuritySettingsTabProps {
    isPasswordProtected: boolean;
    isLocked: boolean;
    onSetPassword: (password: string) => void;
    onLock: () => void;
    onUnlock: (password: string) => boolean;
}

/**
 * Security Settings Tab
 * Password protection and app locking
 */
export function SecuritySettingsTab({
    isPasswordProtected,
    isLocked,
    onSetPassword,
    onLock,
    onUnlock,
}: SecuritySettingsTabProps) {
    const { t } = useTranslation();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSetPassword = () => {
        setError(null);

        if (!newPassword) {
            setError('Password cannot be empty');
            return;
        }

        if (newPassword.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            onSetPassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            alert('Password set successfully!');
        } catch (err) {
            setError(`Failed to set password: ${err}`);
        }
    };

    const handleUnlock = () => {
        setError(null);

        if (!unlockPassword) {
            setError('Please enter password');
            return;
        }

        const success = onUnlock(unlockPassword);
        if (success) {
            setUnlockPassword('');
            alert('App unlocked successfully!');
        } else {
            setError('Incorrect password');
            setUnlockPassword('');
        }
    };

    const handleLock = () => {
        if (!isPasswordProtected) {
            setError('Please set a password first before locking the app');
            return;
        }

        if (window.confirm('Are you sure you want to lock the app? You will need the password to unlock it.')) {
            onLock();
        }
    };

    const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
        if (!password) return { level: 0, text: '', color: 'grey' };
        if (password.length < 4) return { level: 1, text: 'Too short', color: 'error' };
        if (password.length < 6) return { level: 2, text: 'Weak', color: 'warning' };
        if (password.length < 8) return { level: 3, text: 'Medium', color: 'info' };
        return { level: 4, text: 'Strong', color: 'success' };
    };

    const strength = getPasswordStrength(newPassword);

    return (
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* Status */}
                <Alert severity={isLocked ? 'warning' : 'info'}>
                    {isLocked
                        ? '🔒 App is currently locked'
                        : isPasswordProtected
                            ? '🔓 Password protection is enabled'
                            : 'No password protection set'
                    }
                </Alert>

                {/* Error */}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Set/Change Password */}
                {!isLocked && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            {isPasswordProtected ? t('settings.setPassword') : t('settings.setPassword')}
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                type="password"
                                label={t('settings.newPassword')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText={strength.text}
                                FormHelperTextProps={{
                                    sx: { color: `${strength.color}.main` }
                                }}
                            />
                            <TextField
                                fullWidth
                                type="password"
                                label={t('settings.confirmPassword')}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={handleSetPassword}
                                disabled={!newPassword || !confirmPassword}
                            >
                                {isPasswordProtected ? t('settings.setPassword') : t('settings.setPassword')}
                            </Button>
                        </Stack>
                    </Box>
                )}

                <Divider />

                {/* Lock/Unlock */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.unlockSettings')}
                    </Typography>

                    {isLocked ? (
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                type="password"
                                label={t('settings.enterPasswordToUnlock')}
                                value={unlockPassword}
                                onChange={(e) => setUnlockPassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                            />
                            <Button
                                variant="contained"
                                startIcon={<LockOpenIcon />}
                                onClick={handleUnlock}
                                disabled={!unlockPassword}
                            >
                                {t('settings.unlock')} App
                            </Button>
                        </Stack>
                    ) : (
                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<LockIcon />}
                            onClick={handleLock}
                            disabled={!isPasswordProtected}
                        >
                            {t('settings.lock')} App
                        </Button>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {isLocked
                            ? 'Enter your password to unlock and access app features'
                            : 'Locking will require password entry to access the app'
                        }
                    </Typography>
                </Box>

                <Divider />

                {/* Additional Options */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.autoLockSettings')}
                    </Typography>
                    <FormControlLabel
                        control={<Switch disabled />}
                        label={t('settings.autoLockAfterInactivity')}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                        Coming soon: Automatically lock app after period of inactivity
                    </Typography>
                </Box>

                <Divider />

                {/* Clear Storage */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.clearAppData')}
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('settings.clearStorageWarning')}
                    </Alert>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                            if (window.confirm(t('settings.clearStorageConfirm'))) {
                                // Clear all localStorage
                                localStorage.clear();
                                // Reload the page
                                window.location.reload();
                            }
                        }}
                    >
                        {t('settings.clearAllStorage')}
                    </Button>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {t('settings.clearStorageHelper')}
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
}
