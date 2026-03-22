/**
 * NativeRoleFormPage — Create/edit role with permission checkboxes by category.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Alert,
    Typography,
    FormControlLabel,
    Switch,
    Checkbox,
    CircularProgress,
    Paper,
} from '@mui/material';

import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import type { PermissionsMap } from '@features/roles/domain/types';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export function NativeRoleFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin, isCompanyAdmin, activeCompanyId } = useAuthContext();

    const {
        roles,
        permissionsMatrix,
        fetchRoles,
        fetchPermissionsMatrix,
        createRole,
        updateRole,
        deleteRole,
    } = useRolesStore();

    const isEditMode = !!id;
    const existingRole = id ? roles.find((r) => r.id === id) : undefined;

    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState<PermissionsMap>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingRole, setLoadingRole] = useState(isEditMode && !existingRole);

    useEffect(() => {
        fetchPermissionsMatrix();
        if (isEditMode) {
            fetchRoles(activeCompanyId || undefined).finally(() => setLoadingRole(false));
        }
    }, []);

    useEffect(() => {
        if (existingRole) {
            setRoleName(existingRole.name);
            setDescription(existingRole.description || '');
            setPermissions(existingRole.permissions || {});
            setLoadingRole(false);
        }
    }, [existingRole]);

    const handlePermissionToggle = useCallback((resource: string, action: string) => {
        setPermissions((prev) => {
            const current = (prev[resource as keyof PermissionsMap] || []) as string[];
            const hasAction = current.includes(action);
            const updated = hasAction
                ? current.filter((a) => a !== action)
                : [...current, action];
            return { ...prev, [resource]: updated as any };
        });
    }, []);

    const handleSelectAllResource = useCallback((resource: string, allActions: string[]) => {
        setPermissions((prev) => {
            const current = (prev[resource as keyof PermissionsMap] || []) as string[];
            const allSelected = allActions.every((a) => current.includes(a));
            return { ...prev, [resource]: (allSelected ? [] : allActions) as any };
        });
    }, []);

    const handleSave = async () => {
        if (!roleName.trim()) {
            setError(t('validation.required', { field: t('settings.roles.name') }));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const permissionsPayload: Record<string, string[]> = {};
            for (const [resource, actions] of Object.entries(permissions)) {
                if (actions && (actions as string[]).length > 0) {
                    permissionsPayload[resource] = actions as string[];
                }
            }
            if (isEditMode && id) {
                await updateRole(id, {
                    name: roleName.trim(),
                    description: description.trim() || null,
                    permissions: permissionsPayload,
                });
            } else {
                await createRole({
                    name: roleName.trim(),
                    description: description.trim() || undefined,
                    companyId: isPlatformAdmin ? null : (activeCompanyId || null),
                    permissions: permissionsPayload,
                });
            }
            navigate(-1);
        } catch (err: any) {
            setError(err.message || t('settings.roles.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await deleteRole(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    const resources = permissionsMatrix ? Object.keys(permissionsMatrix).sort() : [];

    const pageTitle = isEditMode ? t('settings.roles.edit') : t('settings.roles.add');

    if (loadingRole) {
        return (
            <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </NativeFormPage>
        );
    }

    return (
        <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            <NativeFormSection title={t('settings.roles.roleInfo', 'Role Info')}>
                <NativeTextField
                    label={t('settings.roles.name')}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={existingRole?.isDefault}
                    autoFocus
                />
                <NativeTextField
                    label={t('settings.roles.description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                />
            </NativeFormSection>

            <NativeFormSection title={t('settings.roles.permissionMatrix')}>
                {!permissionsMatrix ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {resources.map((resource) => {
                            const validActions = permissionsMatrix[resource] || [];
                            const currentPerms = (permissions[resource as keyof PermissionsMap] || []) as string[];
                            const allSelected = validActions.length > 0 && validActions.every((a) => currentPerms.includes(a));

                            return (
                                <Paper key={resource} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {t(`permissions.resources.${resource}`, resource)}
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={allSelected}
                                                    onChange={() => handleSelectAllResource(resource, validActions)}
                                                />
                                            }
                                            label={<Typography variant="caption">{t('settings.roles.selectAll')}</Typography>}
                                            labelPlacement="start"
                                            sx={{ mr: 0 }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {validActions.map((action) => (
                                            <FormControlLabel
                                                key={action}
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={currentPerms.includes(action)}
                                                        onChange={() => handlePermissionToggle(resource, action)}
                                                    />
                                                }
                                                label={<Typography variant="caption">{t(`permissions.actions.${action}`, action)}</Typography>}
                                                sx={{ mr: 1 }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>
                )}
            </NativeFormSection>

            {isEditMode && !existingRole?.isDefault && (isPlatformAdmin || isCompanyAdmin) && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                    <NativeDeleteButton
                        onDelete={handleDelete}
                        isDeleting={deleting}
                        itemName={roleName}
                        label={t('settings.roles.delete')}
                    />
                </Box>
            )}
        </NativeFormPage>
    );
}
