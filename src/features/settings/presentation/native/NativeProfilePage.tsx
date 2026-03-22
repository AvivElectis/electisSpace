/**
 * NativeProfilePage — Edit own name/email and change password.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Alert, Typography } from '@mui/material';

import api from '@shared/infrastructure/services/apiClient';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export function NativeProfilePage() {
    const { t } = useTranslation();
    const { user, setUser } = useAuthStore();

    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
        }
    }, [user?.id]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Update profile info
            if (user?.id) {
                const resp = await api.put(`/users/${user.id}`, {
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                });
                // Update auth store with new user data
                if (resp.data?.user) {
                    setUser(resp.data.user);
                }
            }

            // Change password if provided
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    setError(t('validation.passwordsMustMatch', 'Passwords must match'));
                    setSaving(false);
                    return;
                }
                if (!currentPassword) {
                    setError(t('validation.currentPasswordRequired', 'Current password is required'));
                    setSaving(false);
                    return;
                }
                await api.post('/auth/change-password', {
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
        </NativeFormPage>
    );
}
