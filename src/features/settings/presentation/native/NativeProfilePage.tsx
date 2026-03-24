/**
 * NativeProfilePage — Edit own name/email and change password.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Alert, Typography, Button, CircularProgress } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Capacitor } from '@capacitor/core';

import api from '@shared/infrastructure/services/apiClient';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { biometricService } from '@shared/infrastructure/services/biometricService';
import { deviceTokenStorage } from '@shared/infrastructure/services/deviceTokenStorage';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export function NativeProfilePage() {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Biometric state
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [hasDeviceToken, setHasDeviceToken] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
        }
    }, [user?.id]);

    // Check biometric availability and device token on mount
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            biometricService.isAvailable().then(setBiometricAvailable).catch(() => setBiometricAvailable(false));
            deviceTokenStorage.getDeviceToken().then((token) => setHasDeviceToken(!!token));
        }
    }, []);

    const handleEnableBiometric = async () => {
        setBiometricLoading(true);
        setError(null);
        try {
            const passed = await biometricService.authenticate(t('auth.biometric.reason', 'Verify to enable biometric login'));
            if (passed) {
                // Request a device token from the server
                const resp = await api.post('/auth/device-token');
                if (resp.data?.deviceToken) {
                    await deviceTokenStorage.setDeviceToken(resp.data.deviceToken);
                    setHasDeviceToken(true);
                    setSuccess(t('settings.biometric.enabled', 'Biometric login enabled'));
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.biometric.enableFailed', 'Failed to enable biometric login'));
        } finally {
            setBiometricLoading(false);
        }
    };

    const handleDisableBiometric = async () => {
        setBiometricLoading(true);
        setError(null);
        try {
            await deviceTokenStorage.removeDeviceToken();
            setHasDeviceToken(false);
            setSuccess(t('settings.biometric.disabled', 'Biometric login disabled'));
        } catch {
            setError(t('common.error'));
        } finally {
            setBiometricLoading(false);
        }
    };

    const handleSave = async () => {
        // Password validation FIRST — before any API calls
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError(t('validation.passwordsMustMatch', 'Passwords must match'));
                return;
            }
            if (!currentPassword) {
                setError(t('validation.currentPasswordRequired', 'Current password is required'));
                return;
            }
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Update profile info via PATCH /users/me
            const resp = await api.patch('/users/me', {
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined,
            });
            // Update auth store with new user data
            if (resp.data) {
                setUser({ ...user!, ...resp.data });
            }

            // Change password if provided (already validated above)
            if (newPassword) {
                await api.post('/users/me/change-password', {
                    currentPassword,
                    newPassword,
                });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }

            setSuccess(t('settings.users.profileSaved', 'Profile saved'));
        } catch (err: any) {
            setError(err.response?.data?.message || t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <NativeFormPage
            title={t('settings.users.editProfile')}
            onSave={handleSave}
            isSaving={saving}
        >
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}
            {success && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
                </Box>
            )}

            <NativeFormSection title={t('settings.users.basicInfo', 'Basic Info')}>
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">{t('auth.email')}</Typography>
                    <Typography variant="body2">{user?.email}</Typography>
                </Box>
                <NativeTextField
                    label={t('auth.firstName', 'First Name')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                />
                <NativeTextField
                    label={t('auth.lastName', 'Last Name')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                />
            </NativeFormSection>

            <NativeFormSection title={t('settings.users.changePassword', 'Change Password')}>
                <NativeTextField
                    label={t('auth.currentPassword', 'Current Password')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                />
                <NativeTextField
                    label={t('auth.newPassword', 'New Password')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                />
                <NativeTextField
                    label={t('auth.confirmPassword', 'Confirm Password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    error={!!(newPassword && confirmPassword && newPassword !== confirmPassword)}
                    helperText={
                        newPassword && confirmPassword && newPassword !== confirmPassword
                            ? t('validation.passwordsMustMatch', 'Passwords must match')
                            : undefined
                    }
                />
            </NativeFormSection>

            {/* Biometric Login — only on native with biometric hardware */}
            {Capacitor.isNativePlatform() && biometricAvailable && (
                <NativeFormSection title={t('settings.biometric.title', 'Biometric Login')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <FingerprintIcon sx={{ fontSize: 40, color: hasDeviceToken ? 'success.main' : 'text.secondary' }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                                {hasDeviceToken
                                    ? t('settings.biometric.statusEnabled', 'Biometric login is enabled')
                                    : t('settings.biometric.statusDisabled', 'Biometric login is not set up')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {hasDeviceToken
                                    ? t('settings.biometric.hintEnabled', 'You can log in using fingerprint or face recognition')
                                    : t('settings.biometric.hintDisabled', 'Enable to log in faster with fingerprint or face recognition')}
                            </Typography>
                        </Box>
                        {hasDeviceToken && <CheckCircleIcon color="success" />}
                    </Box>
                    <Button
                        fullWidth
                        variant={hasDeviceToken ? 'outlined' : 'contained'}
                        color={hasDeviceToken ? 'error' : 'primary'}
                        onClick={hasDeviceToken ? handleDisableBiometric : handleEnableBiometric}
                        disabled={biometricLoading}
                        startIcon={biometricLoading ? <CircularProgress size={18} /> : <FingerprintIcon />}
                        sx={{ textTransform: 'none', minHeight: 48 }}
                    >
                        {hasDeviceToken
                            ? t('settings.biometric.disable', 'Disable Biometric Login')
                            : t('settings.biometric.enable', 'Enable Biometric Login')}
                    </Button>
                </NativeFormSection>
            )}
        </NativeFormPage>
    );
}
