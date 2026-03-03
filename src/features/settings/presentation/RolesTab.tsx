/**
 * Roles Tab Component
 *
 * Two-section layout:
 * 1. App Roles — read-only info cards for App Admin, App Viewer, Regular User
 * 2. Company & Store Roles — editable roles table with add/edit/delete
 */
import {
    Box,
    Button,
    Card,
    CardContent,
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
    useTheme,
    useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import type { Role } from '@features/roles/domain/types';

const RoleDialog = lazy(() => import('./RoleDialog').then(m => ({ default: m.RoleDialog })));

const APP_ROLES = [
    {
        nameKey: 'roles.platform_admin',
        descKey: 'settings.roles.appAdminDesc',
        icon: AdminPanelSettingsIcon,
        color: 'error' as const,
    },
    {
        nameKey: 'roles.viewer',
        descKey: 'settings.roles.appViewerDesc',
        icon: VisibilityIcon,
        color: 'info' as const,
    },
    {
        nameKey: 'roles.employee',
        descKey: 'settings.roles.regularUserDesc',
        icon: PersonIcon,
        color: 'action' as const,
    },
] as const;

export function RolesTab() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Section 1: App Roles */}
            <Box>
                <Typography variant="h6" gutterBottom>
                    {t('settings.roles.appRoles')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.roles.appRolesDesc')}
                </Typography>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: 2,
                }}>
                    {APP_ROLES.map((appRole) => {
                        const Icon = appRole.icon;
                        return (
                            <Card key={appRole.nameKey} variant="outlined">
                                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Icon
                                            color={appRole.color}
                                            sx={{ fontSize: 28 }}
                                        />
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {t(appRole.nameKey)}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {t(appRole.descKey)}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {t('settings.roles.assignedVia')}
                                    </Typography>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            {/* Section 2: Company & Store Roles */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6">
                            {t('settings.roles.companyStoreRoles')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('settings.roles.companyStoreRolesDesc')}
                        </Typography>
                    </Box>
                    {canManageRoles && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAdd}
                            sx={{ whiteSpace: 'nowrap', ml: 2, flexShrink: 0 }}
                        >
                            {t('settings.roles.add')}
                        </Button>
                    )}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : roles.length === 0 ? (
                    <Alert severity="info">{t('settings.roles.noRoles')}</Alert>
                ) : isMobile ? (
                    /* Mobile: Card layout */
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {roles.map((role) => (
                            <Card key={role.id} variant="outlined">
                                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {t(`roles.${role.name.toLowerCase()}`, role.name)}
                                            </Typography>
                                            {role.description && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    {t(`roles.${role.name.toLowerCase()}_desc`, role.description)}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
                                                <Chip
                                                    label={role.scope === 'SYSTEM'
                                                        ? t('settings.roles.system')
                                                        : t('settings.roles.company')}
                                                    size="small"
                                                    color={role.scope === 'SYSTEM' ? 'primary' : 'secondary'}
                                                    variant="outlined"
                                                />
                                                <Chip
                                                    label={role.isDefault
                                                        ? t('settings.roles.default')
                                                        : t('settings.roles.custom')}
                                                    size="small"
                                                    color={role.isDefault ? 'info' : 'default'}
                                                />
                                            </Box>
                                        </Box>
                                        {canManageRoles && (
                                            <Box sx={{ display: 'flex', ml: 1, flexShrink: 0 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(role)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                {!role.isDefault ? (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(role)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                ) : (
                                                    <IconButton size="small" disabled>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                ) : (
                    /* Desktop: Table layout */
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
            </Box>

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
