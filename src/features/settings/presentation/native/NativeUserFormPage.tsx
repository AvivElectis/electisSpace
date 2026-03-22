/**
 * NativeUserFormPage — Android-native create/edit user form.
 * Create mode: no `id` param. Edit mode: `id` param present.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Switch, FormControlLabel, Alert, MenuItem, Select, InputLabel, FormControl } from '@mui/material';

import { userService, type User } from '@shared/infrastructure/services/userService';
import api from '@shared/infrastructure/services/apiClient';
import { useAuthContext } from '@features/auth/application/useAuthContext';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export function NativeUserFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin } = useAuthContext();

    const isEditMode = !!id;

    const [user, setUser] = useState<User | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [companyRoleId, setCompanyRoleId] = useState('role-employee');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Load user in edit mode
    useEffect(() => {
        if (id) {
            userService.getAll({ limit: 200 })
                .then((resp) => {
                    const found = resp.data.find((u) => u.id === id);
                    if (found) {
                        setUser(found);
                        setFirstName(found.firstName || '');
                        setLastName(found.lastName || '');
                        setEmail(found.email || '');
                        setPhone((found as any).phone || '');
                        setIsActive(found.isActive ?? true);
                        const firstCompany = (found as any).companies?.[0];
                        if (firstCompany?.roleId) {
                            setCompanyRoleId(firstCompany.roleId);
                        }
                    }
                })
                .catch(() => {});
        }
    }, [id]);

    const pageTitle = isEditMode
        ? t('settings.users.editUser')
        : t('settings.users.addUser');

    const handleSave = useCallback(async () => {
        if (!email.trim()) {
            setError(t('validation.required', { field: t('auth.email') }));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (isEditMode && id) {
                await api.put(`/users/${id}`, {
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    phone: phone.trim() || undefined,
                    isActive,
                });
            } else {
                await api.post('/users', {
                    email: email.trim(),
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    phone: phone.trim() || undefined,
                    password: password || undefined,
                    isActive,
                    companyRoleId,
                });
            }
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || t('common.error'));
        } finally {
            setSaving(false);
        }
    }, [isEditMode, id, email, firstName, lastName, phone, password, isActive, companyRoleId, navigate, t]);

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await userService.delete(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    const roleOptions = [
        { value: 'role-admin', label: t('roles.admin') },
        { value: 'role-manager', label: t('roles.manager') },
        { value: 'role-employee', label: t('roles.employee') },
        { value: 'role-viewer', label: t('roles.viewer') },
    ];

    return (
        <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            <NativeFormSection title={t('settings.users.basicInfo', 'Basic Info')}>
                {!isEditMode && (
                    <NativeTextField
                        label={t('auth.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        type="email"
                        inputProps={{ autoCapitalize: 'none' }}
                    />
                )}
                {isEditMode && (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">{t('auth.email')}</Typography>
                        <Typography variant="body2">{user?.email}</Typography>
                    </Box>
                )}
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
                <NativeTextField
                    label={t('auth.phone', 'Phone')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                />
                {!isEditMode && (
                    <NativeTextField
                        label={t('auth.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                    />
                )}
            </NativeFormSection>

            {!isEditMode && (
                <NativeFormSection title={t('auth.role')}>
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('auth.role')}</InputLabel>
                        <Select
                            value={companyRoleId}
                            label={t('auth.role')}
                            onChange={(e) => setCompanyRoleId(e.target.value)}
                        >
                            {roleOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </NativeFormSection>
            )}

            <NativeFormSection title={t('common.status.title')}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                    }
                    label={t('common.status.active')}
                />
            </NativeFormSection>

            {isEditMode && isPlatformAdmin && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                    <NativeDeleteButton
                        onDelete={handleDelete}
                        isDeleting={deleting}
                        itemName={`${firstName} ${lastName}`.trim() || user?.email}
                        label={t('settings.users.deleteUser', 'Delete User')}
                    />
                </Box>
            )}
        </NativeFormPage>
    );
}
