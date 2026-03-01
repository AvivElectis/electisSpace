/**
 * Role Dialog Component
 *
 * Dialog for creating and editing roles with a permission matrix.
 * Uses React Hook Form + Zod for validation.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    FormControlLabel,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    CircularProgress,
    Alert,
    Paper,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import type { Role, PermissionsMap } from '@features/roles/domain/types';

const roleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().or(z.literal('')),
    scope: z.enum(['SYSTEM', 'COMPANY']),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleDialogProps {
    open: boolean;
    role: Role | null;
    onClose: () => void;
    onSaved: () => void;
}

export function RoleDialog({ open, role, onClose, onSaved }: RoleDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isPlatformAdmin, activeCompanyId } = useAuthContext();
    const { createRole, updateRole, fetchPermissionsMatrix, permissionsMatrix } = useRolesStore();

    const [permissions, setPermissions] = useState<PermissionsMap>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const isEditing = !!role;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            scope: 'COMPANY',
        },
    });

    // Initialize form and fetch permissions matrix
    useEffect(() => {
        if (open) {
            fetchPermissionsMatrix();
            if (role) {
                reset({
                    name: role.name,
                    description: role.description || '',
                    scope: role.scope,
                });
                setPermissions(role.permissions || {});
            } else {
                reset({
                    name: '',
                    description: '',
                    scope: isPlatformAdmin ? 'SYSTEM' : 'COMPANY',
                });
                setPermissions({});
            }
            setSaveError(null);
        }
    }, [open, role, reset, fetchPermissionsMatrix, isPlatformAdmin]);

    // Toggle a single permission action for a resource
    const handlePermissionToggle = useCallback((resource: string, action: string) => {
        setPermissions(prev => {
            const current = prev[resource as keyof PermissionsMap] || [];
            const hasAction = current.includes(action as any);
            const updated = hasAction
                ? current.filter(a => a !== action)
                : [...current, action as any];
            return {
                ...prev,
                [resource]: updated,
            };
        });
    }, []);

    // Toggle all actions for a resource
    const handleSelectAllResource = useCallback((resource: string, allActions: string[]) => {
        setPermissions(prev => {
            const current = prev[resource as keyof PermissionsMap] || [];
            const allSelected = allActions.every(a => current.includes(a as any));
            return {
                ...prev,
                [resource]: allSelected ? [] : allActions.map(a => a as any),
            };
        });
    }, []);

    const onSubmit = useCallback(async (data: RoleFormData) => {
        setSaving(true);
        setSaveError(null);
        try {
            const permissionsPayload: Record<string, string[]> = {};
            for (const [resource, actions] of Object.entries(permissions)) {
                if (actions && actions.length > 0) {
                    permissionsPayload[resource] = actions;
                }
            }

            if (isEditing && role) {
                await updateRole(role.id, {
                    name: data.name,
                    description: data.description || null,
                    permissions: permissionsPayload,
                });
            } else {
                await createRole({
                    name: data.name,
                    description: data.description || undefined,
                    companyId: data.scope === 'COMPANY' ? (activeCompanyId || null) : null,
                    permissions: permissionsPayload,
                });
            }
            onSaved();
        } catch (err: unknown) {
            setSaveError(err instanceof Error ? err.message : t('settings.roles.saveFailed'));
        } finally {
            setSaving(false);
        }
    }, [isEditing, role, permissions, activeCompanyId, createRole, updateRole, onSaved]);

    // Get all unique actions from the matrix
    const allActions = permissionsMatrix
        ? [...new Set(Object.values(permissionsMatrix).flat())].sort()
        : [];

    const resources = permissionsMatrix ? Object.keys(permissionsMatrix).sort() : [];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{ sx: isMobile ? {} : { maxHeight: '85vh' } }}
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>
                    {isEditing ? t('settings.roles.edit') : t('settings.roles.add')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {saveError && (
                            <Alert severity="error">{saveError}</Alert>
                        )}

                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={t('settings.roles.name')}
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                    fullWidth
                                    size="small"
                                    disabled={role?.isDefault}
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={t('settings.roles.description')}
                                    error={!!errors.description}
                                    helperText={errors.description?.message}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    size="small"
                                />
                            )}
                        />

                        {/* Scope selector */}
                        {!isEditing && (
                            <Controller
                                name="scope"
                                control={control}
                                render={({ field }) => (
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">
                                            {t('settings.roles.scope')}
                                        </FormLabel>
                                        {isPlatformAdmin ? (
                                            <RadioGroup
                                                row
                                                value={field.value}
                                                onChange={field.onChange}
                                            >
                                                <FormControlLabel
                                                    value="SYSTEM"
                                                    control={<Radio size="small" />}
                                                    label={t('settings.roles.system')}
                                                />
                                                <FormControlLabel
                                                    value="COMPANY"
                                                    control={<Radio size="small" />}
                                                    label={t('settings.roles.company')}
                                                />
                                            </RadioGroup>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {t('settings.roles.company')}
                                            </Typography>
                                        )}
                                    </FormControl>
                                )}
                            />
                        )}

                        {isEditing && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('settings.roles.scope')}
                                </Typography>
                                <Typography variant="body2">
                                    {role?.scope === 'SYSTEM'
                                        ? t('settings.roles.system')
                                        : t('settings.roles.company')}
                                </Typography>
                            </Box>
                        )}

                        {/* Permission Matrix */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t('settings.roles.permissionMatrix')}
                            </Typography>

                            {!permissionsMatrix ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : isMobile ? (
                                /* ── Mobile: Card-based layout ── */
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {resources.map(resource => {
                                        const validActions = permissionsMatrix[resource] || [];
                                        const currentPerms = permissions[resource as keyof PermissionsMap] || [];
                                        const allSelected = validActions.length > 0 &&
                                            validActions.every(a => currentPerms.includes(a as any));

                                        return (
                                            <Paper key={resource} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {t(`permissions.resources.${resource}`, resource)}
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                size="small"
                                                                checked={allSelected}
                                                                indeterminate={currentPerms.length > 0 && !allSelected}
                                                                onChange={() => handleSelectAllResource(resource, validActions)}
                                                            />
                                                        }
                                                        label={
                                                            <Typography variant="caption" color="text.secondary">
                                                                {t('settings.roles.selectAll')}
                                                            </Typography>
                                                        }
                                                        labelPlacement="start"
                                                        sx={{ m: 0, gap: 0.5 }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                                                    {validActions.map(action => {
                                                        const isChecked = currentPerms.includes(action as any);
                                                        return (
                                                            <FormControlLabel
                                                                key={action}
                                                                control={
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={isChecked}
                                                                        onChange={() => handlePermissionToggle(resource, action)}
                                                                    />
                                                                }
                                                                label={
                                                                    <Typography variant="caption">
                                                                        {t(`permissions.actions.${action}`, action)}
                                                                    </Typography>
                                                                }
                                                                sx={{ minWidth: '45%', mr: 0 }}
                                                            />
                                                        );
                                                    })}
                                                </Box>
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            ) : (
                                /* ── Desktop: Table layout ── */
                                <TableContainer sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>
                                                    {t('settings.roles.permissions')}
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 600, minWidth: 70 }}>
                                                    {t('settings.roles.selectAll')}
                                                </TableCell>
                                                {allActions.map(action => (
                                                    <TableCell
                                                        key={action}
                                                        align="center"
                                                        sx={{ fontWeight: 600, fontSize: '0.75rem', minWidth: 60 }}
                                                    >
                                                        {t(`permissions.actions.${action}`, action)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {resources.map(resource => {
                                                const validActions = permissionsMatrix[resource] || [];
                                                const currentPerms = permissions[resource as keyof PermissionsMap] || [];
                                                const allSelected = validActions.length > 0 &&
                                                    validActions.every(a => currentPerms.includes(a as any));

                                                return (
                                                    <TableRow key={resource} hover>
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {t(`permissions.resources.${resource}`, resource)}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Checkbox
                                                                size="small"
                                                                checked={allSelected}
                                                                indeterminate={
                                                                    currentPerms.length > 0 &&
                                                                    !allSelected
                                                                }
                                                                onChange={() => handleSelectAllResource(resource, validActions)}
                                                            />
                                                        </TableCell>
                                                        {allActions.map(action => {
                                                            const isValid = validActions.includes(action);
                                                            const isChecked = currentPerms.includes(action as any);
                                                            return (
                                                                <TableCell key={action} align="center">
                                                                    {isValid ? (
                                                                        <Checkbox
                                                                            size="small"
                                                                            checked={isChecked}
                                                                            onChange={() => handlePermissionToggle(resource, action)}
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="body2" color="text.disabled">
                                                                            -
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} /> : undefined}
                    >
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default RoleDialog;
