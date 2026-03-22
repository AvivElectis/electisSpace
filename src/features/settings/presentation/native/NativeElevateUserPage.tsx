/**
 * NativeElevateUserPage — Role upgrade page with permission preview and confirmation.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, RadioGroup, Radio, FormControlLabel, Alert, CircularProgress } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';

import { userService, type User } from '@shared/infrastructure/services/userService';
import api from '@shared/infrastructure/services/apiClient';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { nativeSpacing, nativeColors } from '@shared/presentation/themes/nativeTokens';

type AppRole = 'PLATFORM_ADMIN' | 'APP_VIEWER' | 'USER';

export function NativeElevateUserPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [selectedRole, setSelectedRole] = useState<AppRole>('USER');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            setLoadingUser(true);
            userService.getAll({ limit: 200 })
                .then((resp) => {
                    const found = resp.data.find((u) => u.id === id);
                    if (found) {
                        setUser(found);
                        const role: AppRole = found.globalRole === 'PLATFORM_ADMIN'
                            ? 'PLATFORM_ADMIN'
                            : found.globalRole === 'APP_VIEWER'
                                ? 'APP_VIEWER'
                                : 'USER';
                        setSelectedRole(role);
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingUser(false));
        }
    }, [id]);

    const handleSave = async () => {
        if (!id || !user) return;
        const currentRole: AppRole = user.globalRole === 'PLATFORM_ADMIN'
            ? 'PLATFORM_ADMIN'
            : user.globalRole === 'APP_VIEWER'
                ? 'APP_VIEWER'
                : 'USER';
        if (selectedRole === currentRole) {
            navigate(-1);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await api.post(`/users/${id}/elevate`, { globalRole: selectedRole });
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.users.elevateError'));
        } finally {
            setSaving(false);
        }
    };

    const roleOptions: Array<{
        value: AppRole;
        label: string;
        description: string;
        icon: React.ReactNode;
    }> = [
        {
            value: 'PLATFORM_ADMIN',
            icon: <AdminPanelSettingsIcon sx={{ color: nativeColors.status.warning }} />,
            label: t('settings.users.role.platformAdmin', 'App Admin'),
            description: t('settings.users.role.platformAdminDesc', 'Full unrestricted access to all companies, stores, and settings'),
        },
        {
            value: 'APP_VIEWER',
            icon: <VisibilityIcon sx={{ color: nativeColors.status.info }} />,
            label: t('settings.users.role.appViewer', 'App Viewer'),
            description: t('settings.users.role.appViewerDesc', 'Read-only access — all add, edit, and delete actions are disabled'),
        },
        {
            value: 'USER',
            icon: <PersonIcon sx={{ color: nativeColors.primary.main }} />,
            label: t('settings.users.role.regularUser', 'Regular User'),
            description: t('settings.users.role.regularUserDesc', 'Access determined by company and store role assignments'),
        },
    ];

    const displayName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : '';

    return (
        <NativeFormPage
            title={t('settings.users.changeAppRole', 'Change App Role')}
            onSave={handleSave}
            isSaving={saving}
        >
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            {loadingUser ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {user && (
                        <NativeFormSection title={t('settings.users.userToElevate', 'User')}>
                            <Typography variant="subtitle1" fontWeight={600}>{displayName}</Typography>
                            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                        </NativeFormSection>
                    )}

                    <NativeFormSection title={t('auth.role')}>
                        <RadioGroup
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                        >
                            {roleOptions.map((option) => (
                                <Box
                                    key={option.value}
                                    onClick={() => setSelectedRole(option.value)}
                                    sx={{
                                        border: 1,
                                        borderColor: selectedRole === option.value ? 'primary.main' : 'divider',
                                        borderRadius: 2,
                                        p: 1.5,
                                        mb: 1,
                                        cursor: 'pointer',
                                        bgcolor: selectedRole === option.value ? 'action.selected' : 'transparent',
                                    }}
                                >
                                    <FormControlLabel
                                        value={option.value}
                                        control={<Radio size="small" />}
                                        sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                                        label={
                                            <Box sx={{ ml: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {option.icon}
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {option.label}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                                                    {option.description}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>
                            ))}
                        </RadioGroup>

                        {selectedRole === 'PLATFORM_ADMIN' && user?.globalRole !== 'PLATFORM_ADMIN' && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                {t('settings.users.elevateWarning', 'This will grant full administrative access to all companies, stores, and platform settings.')}
                            </Alert>
                        )}
                    </NativeFormSection>
                </>
            )}
        </NativeFormPage>
    );
}
