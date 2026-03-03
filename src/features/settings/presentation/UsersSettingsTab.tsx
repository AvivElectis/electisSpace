import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Typography,
    Chip,
    TablePagination,
    CircularProgress,
    Stack,
    Tooltip,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { logger } from '@shared/infrastructure/services/logger';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { userService, type User } from '@shared/infrastructure/services/userService';
import { companyService, type Company } from '@shared/infrastructure/services/companyService';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { canElevateUser, getAllowedAppRoles } from '@features/auth/application/permissionHelpers';

// Lazy load dialogs
const EnhancedUserDialog = lazy(() => import('./EnhancedUserDialog').then(m => ({ default: m.EnhancedUserDialog })));
const ElevateUserDialog = lazy(() => import('./ElevateUserDialog').then(m => ({ default: m.ElevateUserDialog })));


export function UsersSettingsTab() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const { isPlatformAdmin } = useAuthContext();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // Companies filter (for platform admin)
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [elevateDialogOpen, setElevateDialogOpen] = useState(false);
    const [userToElevate, setUserToElevate] = useState<User | null>(null);

    // Fetch Companies for filter (platform admin only)
    useEffect(() => {
        if (isPlatformAdmin) {
            companyService.getAll({ limit: 100 }).then(response => {
                setCompanies(response.data);
            }).catch(err => logger.error('UsersSettingsTab', 'Failed to fetch companies', { error: String(err) }));
        }
    }, [isPlatformAdmin]);

    // Fetch Users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: page + 1, // API is 1-indexed
                limit,
            };
            if (searchQuery) {
                params.search = searchQuery;
            }
            if (selectedCompanyFilter) {
                params.companyId = selectedCompanyFilter;
            }
            const response = await userService.getAll(params);
            setUsers(response.data);
            setTotal(response.pagination.total);
        } catch (error) {
            logger.error('UsersSettingsTab', 'Failed to fetch users', { error: String(error) });
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchQuery, selectedCompanyFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Search debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setPage(0);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Handlers
    const handleAdd = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleDelete = async (user: User) => {
        const confirmed = await confirm({
            title: t('settings.users.deleteConfirmTitle'),
            message: t('settings.users.deleteConfirmMessage', { email: user.email }),
            confirmLabel: t('common.delete'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await userService.delete(user.id);
                fetchUsers();
            } catch (error) {
                logger.error('UsersSettingsTab', 'Failed to delete user', { error: String(error) });
            }
        }
    };

    const handleElevate = (user: User) => {
        setUserToElevate(user);
        setElevateDialogOpen(true);
    };

    const handleElevateSuccess = () => {
        setElevateDialogOpen(false);
        setUserToElevate(null);
        fetchUsers();
    };

    const handleDialogSave = () => {
        setDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
    };

    /** Compute display role key and color for a user, with scope context */
    const getUserRoleDisplay = (user: any): { roleKey: string; color: string; isAdminLevel: boolean } => {
        // App-level roles
        if (user.globalRole === 'PLATFORM_ADMIN') {
            return { roleKey: 'platform_admin', color: 'secondary', isAdminLevel: true };
        }
        if (user.globalRole === 'APP_VIEWER') {
            return { roleKey: 'viewer', color: 'default', isAdminLevel: false };
        }
        // Company-level: check if user has company admin role via roleId
        const firstCompany = user.companies?.[0];
        if (firstCompany?.roleId === 'role-admin' && firstCompany?.allStoresAccess) {
            return { roleKey: 'company_admin', color: 'primary', isAdminLevel: true };
        }
        // Store-level role
        const firstStore = user.stores?.[0];
        const roleId = firstCompany?.roleId || firstStore?.roleId;
        if (roleId) {
            const key = roleId.startsWith('role-') ? roleId.substring(5) : roleId;
            const colorMap: Record<string, string> = { admin: 'error', manager: 'warning', employee: 'info', viewer: 'default' };
            return { roleKey: key, color: colorMap[key] || 'default', isAdminLevel: key === 'admin' };
        }
        return { roleKey: 'viewer', color: 'default', isAdminLevel: false };
    };

    // Feature icon helper
    const getFeatureIcon = (feature: string) => {
        switch (feature) {
            case 'dashboard': return '📊';
            case 'spaces': return '🏷️';
            case 'conference': return '🎤';
            case 'people': return '👥';
            default: return '•';
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header */}
            <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
            >
                <Typography variant="h6">{t('settings.users.title')}</Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder={t('settings.users.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: { xs: '100%', sm: 200 } }}
                    />

                    {/* Company Filter (Platform Admin only) */}
                    {isPlatformAdmin && companies.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel>{t('settings.users.companyFilter')}</InputLabel>
                            <Select
                                value={selectedCompanyFilter}
                                label={t('settings.users.companyFilter')}
                                onChange={(e) => {
                                    setSelectedCompanyFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">
                                    <em>{t('common.all')}</em>
                                </MenuItem>
                                {companies.map(company => (
                                    <MenuItem key={company.id} value={company.id}>
                                        {company.code} - {company.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Add Button */}
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ whiteSpace: 'nowrap' }}>
                        {t('settings.users.addUser')}
                    </Button>
                </Stack>
            </Stack>

            {isMobile ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : users.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                {searchQuery
                                    ? t('settings.users.noSearchResults')
                                    : t('common.noData')}
                            </Typography>
                        ) : (
                            users.map((user) => {
                                const { roleKey, color, isAdminLevel } = getUserRoleDisplay(user);
                                const firstStore = user.stores?.[0];
                                const userFeatures = isAdminLevel
                                    ? ['dashboard', 'spaces', 'conference', 'people']
                                    : (firstStore?.features || ['dashboard']);
                                const canElevate = canElevateUser(currentUser, user);

                                return (
                                    <Card key={user.id} sx={{ mb: 1.5, overflow: 'hidden' }}>
                                        <Box sx={{ height: 3, background: user.isActive ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})` : theme.palette.grey[300] }} />
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>{user.email}</Typography>
                                                    {(user.firstName || user.lastName) && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Stack direction="row" gap={0.5}>
                                                    {canElevate && (
                                                        <Tooltip title={t('settings.users.elevate')}><IconButton onClick={() => handleElevate(user)} size="small" color="warning"><AdminPanelSettingsIcon fontSize="small" /></IconButton></Tooltip>
                                                    )}
                                                    <Tooltip title={t('common.edit')}><IconButton onClick={() => handleEdit(user)} size="small" color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title={t('common.delete')}><span><IconButton onClick={() => handleDelete(user)} size="small" color="error" disabled={user.id === currentUser?.id}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>
                                                </Stack>
                                            </Stack>
                                            <Divider sx={{ my: 1.5 }} />
                                            <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                                                <Chip label={t(`roles.${roleKey}`)} color={color as any} variant="filled" size="small" sx={{ p: 1, px: 1.5 }} />
                                                <Chip label={user.isActive ? t('common.status.active') : t('common.status.inactive')} color={user.isActive ? 'success' : 'default'} variant="outlined" size="small" sx={{ p: 1, px: 1.5 }} />
                                            </Stack>
                                            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                                                {userFeatures.map(feature => (
                                                    <Tooltip key={feature} title={t(`navigation.${feature}`)}>
                                                        <span style={{ fontSize: '1.1rem' }}>{getFeatureIcon(feature)}</span>
                                                    </Tooltip>
                                                ))}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </Box>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={limit}
                        onRowsPerPageChange={(e) => {
                            setLimit(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={t('common.rowsPerPage')}
                        sx={{
                            '.MuiTablePagination-selectLabel': {
                                display: 'none',
                            },
                            '.MuiTablePagination-displayedRows': {
                                margin: 0,
                            },
                            '.MuiTablePagination-toolbar': {
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 1,
                            },
                        }}
                    />
                </Box>
            ) : (
                <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TableContainer sx={{ flex: 1 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 150 }}>{t('auth.email')}</TableCell>
                                    <TableCell sx={{ minWidth: 100, display: { xs: 'none', sm: 'table-cell' } }}>{t('auth.name')}</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>{t('auth.role')}</TableCell>
                                    <TableCell sx={{ minWidth: 80, display: { xs: 'none', md: 'table-cell' } }}>{t('settings.users.features')}</TableCell>
                                    <TableCell sx={{ minWidth: 80 }}>{t('common.status.title')}</TableCell>
                                    <TableCell align="right" sx={{ minWidth: 100 }}>{t('common.actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <CircularProgress size={24} />
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            {searchQuery
                                                ? t('settings.users.noSearchResults')
                                                : t('common.noData')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => {
                                        const { roleKey, color, isAdminLevel } = getUserRoleDisplay(user);
                                        const firstStore = user.stores?.[0];
                                        const userFeatures = isAdminLevel
                                            ? ['dashboard', 'spaces', 'conference', 'people']
                                            : (firstStore?.features || ['dashboard']);
                                        const canElevate = canElevateUser(currentUser, user);

                                        return (
                                            <TableRow key={user.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 120, sm: 180 } }}>
                                                        {user.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                    {user.firstName || user.lastName
                                                        ? <Typography variant="body2" noWrap>{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</Typography>
                                                        : <Typography variant="body2" color="text.secondary">—</Typography>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={t(`roles.${roleKey}`)}
                                                        color={color as any}
                                                        variant='filled'
                                                        size="small"
                                                        sx={{ p: 1, px: 1.5 }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                                                        {userFeatures.map(feature => (
                                                            <Tooltip key={feature} title={t(`navigation.${feature}`)}>
                                                                <span style={{ fontSize: '1.1rem' }}>
                                                                    {getFeatureIcon(feature)}
                                                                </span>
                                                            </Tooltip>
                                                        ))}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.isActive ? t('common.status.active') : t('common.status.inactive')}
                                                        color={user.isActive ? 'success' : 'default'}
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ p: 1, px: 1.5 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                                                        {/* Elevate Button (Platform Admin only) */}
                                                        {canElevate && (
                                                            <Tooltip title={t('settings.users.elevate')}>
                                                                <IconButton
                                                                    onClick={() => handleElevate(user)}
                                                                    size="small"
                                                                    color="warning"
                                                                >
                                                                    <AdminPanelSettingsIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title={t('common.edit')}>
                                                            <IconButton onClick={() => handleEdit(user)} size="small" color="primary">
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={t('common.delete')}>
                                                            <span>
                                                                <IconButton
                                                                    onClick={() => handleDelete(user)}
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={user.id === currentUser?.id} // Cannot delete self
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={limit}
                        onRowsPerPageChange={(e) => {
                            setLimit(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={t('common.rowsPerPage')}
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                margin: 0,
                            },
                            '.MuiTablePagination-toolbar': {
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 1,
                            },
                        }}
                    />
                </Paper>
            )}

            {/* User Dialog */}
            <Suspense fallback={null}>
                {dialogOpen && (
                    <EnhancedUserDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        onSave={handleDialogSave}
                        user={selectedUser as any}
                    />
                )}
            </Suspense>

            {/* Elevate Dialog */}
            <Suspense fallback={null}>
                {elevateDialogOpen && userToElevate && (
                    <ElevateUserDialog
                        open={elevateDialogOpen}
                        onClose={() => {
                            setElevateDialogOpen(false);
                            setUserToElevate(null);
                        }}
                        onSuccess={handleElevateSuccess}
                        user={userToElevate}
                        allowedRoles={getAllowedAppRoles(currentUser)}
                    />
                )}
            </Suspense>

            <ConfirmDialog />
        </Box>
    );
}
