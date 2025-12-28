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
    Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingsData } from '../domain/types';
import { ImportExportSection } from '@features/import-export/presentation/ImportExportSection';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface SecuritySettingsTabProps {
    isPasswordProtected: boolean;
    isLocked: boolean;
    settings: SettingsData;
    onSetPassword: (password: string) => void;
    onLock: () => void;
    onUnlock: (password: string) => boolean;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * Security Settings Tab
 * Password protection and app locking
 */
export function SecuritySettingsTab({
    isPasswordProtected,
    isLocked,
    settings,
    onSetPassword,
    onLock,
    onUnlock,
    onUpdate,
}: SecuritySettingsTabProps) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSetPassword = async () => {
        setError(null);

        if (!newPassword) {
            setError(t('settings.passwordCannotBeEmpty'));
            return;
        }

        if (newPassword.length < 4) {
            setError(t('settings.passwordTooShort'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('settings.passwordsDoNotMatch'));
            return;
        }

        try {
            onSetPassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            await confirm({
                title: t('common.success'),
                message: t('settings.setPasswordSuccess'),
                confirmLabel: t('common.close'),
                severity: 'success',
                showCancel: false
            });
        } catch (err) {
            setError(`Failed to set password: ${err}`);
        }
    };

    const handleUnlock = async () => {
        setError(null);

        if (!unlockPassword) {
            setError(t('settings.enterPassword'));
            return;
        }

        const success = onUnlock(unlockPassword);
        if (success) {
            setUnlockPassword('');
            await confirm({
                title: t('common.success'),
                message: t('settings.unlockSuccess'),
                confirmLabel: t('common.close'),
                severity: 'success',
                showCancel: false
            });
        } else {
            setError(t('settings.incorrectPassword'));
            setUnlockPassword('');
        }
    };

    const handleLock = async () => {
        if (!isPasswordProtected) {
            setError(t('settings.setPasswordFirst'));
            return;
        }

        const confirmed = await confirm({
            title: t('common.dialog.confirm'),
            message: t('settings.lockConfirm'),
            confirmLabel: t('settings.lock'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'warning'
        });

        if (confirmed) {
            onLock();
            // Dialog will close automatically via useEffect in SettingsDialog
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
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            <Stack spacing={2}>
                {/* Status */}
                <Alert severity={isLocked ? 'warning' : 'info'} sx={{ py: 0, px: 2, alignItems: 'center' }}>
                    {isLocked
                        ? `🔒 ${t('settings.lockedMessage')}`
                        : isPasswordProtected
                            ? `🔓 ${t('settings.unlockedMessage')}`
                            : t('settings.noPasswordMessage')
                    }
                </Alert>

                {/* Error */}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, px: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Set/Change Password */}
                {!isLocked && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {isPasswordProtected ? t('settings.setPassword') : t('settings.setPassword')}
                        </Typography>
                        <Stack spacing={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('settings.newPassword')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText={strength.text}
                                FormHelperTextProps={{
                                    sx: { color: `${strength.color}.main`, m: 0 }
                                }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('settings.confirmPassword')}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Box sx={{ display: 'flex', gap: 0, justifyContent: 'flex-start' }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSetPassword}
                                    disabled={!newPassword || !confirmPassword}
                                    sx={{ width: 'fit-content' }}
                                >
                                    {isPasswordProtected ? t('settings.setPassword') : t('settings.setPassword')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<LockIcon />}
                                    onClick={handleLock}
                                    disabled={!isPasswordProtected}
                                    sx={{ width: 'fit-content' }}
                                >
                                    {t('settings.lockAppSettings')}
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                )}

                <Divider />

                {/* Unlock Section (only shown when locked) */}
                {isLocked && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.unlockSettings')}
                        </Typography>

                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="password"
                                    label={t('settings.enterPasswordToUnlock')}
                                    value={unlockPassword}
                                    onChange={(e) => setUnlockPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                                />
                                <Tooltip title={t('settings.adminPasswordHint')} arrow>
                                    <InfoOutlined color="action" sx={{ cursor: 'help' }} />
                                </Tooltip>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<LockOpenIcon />}
                                onClick={handleUnlock}
                                disabled={!unlockPassword}
                                sx={{ width: 'fit-content' }}
                            >
                                {t('settings.unlockAppSettings')}
                            </Button>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {t('settings.unlockToAccess')}
                        </Typography>
                    </Box>
                )}

                <Divider />

                {/* Auto-Lock Settings */}
                {!isLocked && isPasswordProtected && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.autoLockSettings')}
                        </Typography>
                        <Stack spacing={1.5}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.autoLockEnabled || false}
                                        onChange={(e) => onUpdate({ autoLockEnabled: e.target.checked })}
                                    />
                                }
                                label={t('settings.autoLockEnabled')}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.autoLockDescription')}
                            </Typography>
                        </Stack>
                    </Box>
                )}

                <Divider />

                {/* Clear Storage */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.clearAppData')}
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0, px: 2 }}>
                        {t('settings.clearStorageWarning')}
                    </Alert>
                    <Button
                        variant="text"
                        color="error"
                        onClick={async () => {
                            const confirmed = await confirm({
                                title: t('common.dialog.warning'),
                                message: t('settings.clearStorageConfirm'),
                                confirmLabel: t('common.dialog.delete'),
                                cancelLabel: t('common.dialog.cancel'),
                                severity: 'error'
                            });

                            if (confirmed) {
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

                <Divider />

                {/* Import/Export Settings */}
                <ImportExportSection />
                <ConfirmDialog />
            </Stack>
        </Box>
    );
}
