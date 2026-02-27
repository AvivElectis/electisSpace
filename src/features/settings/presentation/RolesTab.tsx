/**
 * Roles Tab Component
 *
 * Displays role management UI inside the Settings dialog.
 * Lists all roles with name, description, scope, and default status.
 * Allows creating, editing, and deleting custom roles.
 */
import {
    Box,
    Button,
    Chip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import type { Role } from '@features/roles/domain/types';

const RoleDialog = lazy(() => import('./RoleDialog').then(m => ({ default: m.RoleDialog })));

export function RolesTab() {
    const { t } = useTranslation();
    const { isPlatformAdmin, isCompanyAdmin, activeCompanyId } = useAuthContext();
    const { roles, loading, error, fetchRoles, deleteRole } = useRolesStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const canManageRoles = isPlatformAdmin || isCompanyAdmin;

    useEffect(() => {
        fetchRoles(activeCompanyId || undefined);
    }, [fetchRoles, activeCompanyId]);

    const handleAdd = useCallback(() => {
        setEditingRole(null);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback((role: Role) => {
        setEditingRole(role);
        setDialogOpen(true);
    }, []);

    const handleDelete = useCallback(async (role: Role) => {
        if (role.isDefault) return;

        const confirmed = await confirm({
            title: t('settings.roles.delete'),
            message: t('settings.roles.confirmDelete'),
            confirmLabel: t('common.delete'),
            cancelLabel: t('common.cancel'),
            severity: 'error',
        });

        if (confirmed) {
            try {
                await deleteRole(role.id);
            } catch {
                // Error handled by store
            }
        }
    }, [confirm, t, deleteRole]);

    const handleDialogClose = useCallback(() => {
        setDialogOpen(false);
        setEditingRole(null);
    }, []);

    const handleDialogSaved = useCallback(() => {
        setDialogOpen(false);
        setEditingRole(null);
        fetchRoles(activeCompanyId || undefined);
    }, [fetchRoles, activeCompanyId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('settings.roles.title')}</Typography>
                {canManageRoles && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {t('settings.roles.add')}
                    </Button>
                )}
            </Box>

            {roles.length === 0 ? (
                <Alert severity="info">{t('settings.roles.noRoles')}</Alert>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('settings.roles.name')}</TableCell>
                                <TableCell>{t('settings.roles.description')}</TableCell>
                                <TableCell>{t('settings.roles.scope')}</TableCell>
                                <TableCell align="center">{t('common.type')}</TableCell>
                                {canManageRoles && (
                                    <TableCell align="right">{t('common.actions')}</TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {t(`roles.${role.name.toLowerCase()}`, role.name)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {role.description
                                                ? t(`roles.${role.name.toLowerCase()}_desc`, role.description)
                                                : '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={role.scope === 'SYSTEM'
                                                ? t('settings.roles.system')
                                                : t('settings.roles.company')}
                                            size="small"
                                            color={role.scope === 'SYSTEM' ? 'primary' : 'secondary'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={role.isDefault
                                                ? t('settings.roles.default')
                                                : t('settings.roles.custom')}
                                            size="small"
                                            color={role.isDefault ? 'info' : 'default'}
                                        />
                                    </TableCell>
                                    {canManageRoles && (
                                        <TableCell align="right">
                                            <Tooltip title={t('settings.roles.edit')}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(role)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {!role.isDefault && (
                                                <Tooltip title={t('settings.roles.delete')}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(role)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {role.isDefault && (
                                                <Tooltip title={t('settings.roles.cannotDeleteDefault')}>
                                                    <span>
                                                        <IconButton size="small" disabled>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {dialogOpen && (
                <Suspense fallback={null}>
                    <RoleDialog
                        open={dialogOpen}
                        role={editingRole}
                        onClose={handleDialogClose}
                        onSaved={handleDialogSaved}
                    />
                </Suspense>
            )}

            <ConfirmDialog />
        </Box>
    );
}

export default RolesTab;
