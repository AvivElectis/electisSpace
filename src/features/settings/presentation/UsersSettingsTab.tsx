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
    MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { userService, type User, type CreateUserDto, type UpdateUserDto, type UpdateUserStoreDto } from '@shared/infrastructure/services/userService';
import { companyService, type Company } from '@shared/infrastructure/services/companyService';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';

// Lazy load dialogs
const EnhancedUserDialog = lazy(() => import('./EnhancedUserDialog').then(m => ({ default: m.EnhancedUserDialog })));
const ElevateUserDialog = lazy(() => import('./ElevateUserDialog').then(m => ({ default: m.ElevateUserDialog })));


export function UsersSettingsTab() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const { isPlatformAdmin } = useAuthContext();
    const { confirm, ConfirmDialog } = useConfirmDialog();

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
            }).catch(err => console.error('Failed to fetch companies:', err));
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
            console.error('Failed to fetch users:', error);
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
                console.error('Failed to delete user:', error);
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

    // Role color helper
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'PLATFORM_ADMIN': return 'secondary';
            case 'STORE_ADMIN': return 'error';
            case 'STORE_MANAGER': return 'warning';
            case 'STORE_EMPLOYEE': return 'info';
            case 'STORE_VIEWER': return 'default';
            default: return 'default';
        }
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
                spacing={2}
            >
                <Typography variant="h6">{t('settings.users.title')}</Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder={t('settings.users.searchPlaceholder', 'Search users...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: 200 }}
                    />

                    {/* Company Filter (Platform Admin only) */}
                    {isPlatformAdmin && companies.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>{t('settings.users.companyFilter', 'Company')}</InputLabel>
                            <Select
                                value={selectedCompanyFilter}
                                label={t('settings.users.companyFilter', 'Company')}
                                onChange={(e) => {
                                    setSelectedCompanyFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">
                                    <em>{t('common.all', 'All')}</em>
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
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                        {t('settings.users.addUser')}
                    </Button>
                </Stack>
            </Stack>

            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flex: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('auth.email')}</TableCell>
                                <TableCell>{t('auth.name')}</TableCell>
                                <TableCell>{t('auth.role')}</TableCell>
                                <TableCell>{t('settings.users.features')}</TableCell>
                                <TableCell>{t('common.status.title')}</TableCell>
                                <TableCell align="right">{t('common.actions')}</TableCell>
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
                                            ? t('settings.users.noSearchResults', 'No users match your search')
                                            : t('common.noData')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => {
                                    // Get first store's role and features, or use globalRole for platform admins
                                    const firstStore = user.stores?.[0];
                                    const userRole = user.globalRole || firstStore?.role || 'STORE_VIEWER';
                                    const userFeatures = user.globalRole === 'PLATFORM_ADMIN' 
                                        ? ['dashboard', 'spaces', 'conference', 'people'] // Platform admins have all features
                                        : (firstStore?.features || ['dashboard']);
                                    const canElevate = isPlatformAdmin && 
                                        user.globalRole !== 'PLATFORM_ADMIN' && 
                                        user.id !== currentUser?.id;
                                    
                                    return (
                                        <TableRow key={user.id} hover>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                {user.firstName || user.lastName 
                                                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                                    : <Typography variant="body2" color="text.secondary">—</Typography>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={t(`roles.${userRole.toLowerCase()}`)}
                                                    color={getRoleColor(userRole) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
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
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                                                    {/* Elevate Button (Platform Admin only) */}
                                                    {canElevate && (
                                                        <Tooltip title={t('settings.users.elevate', 'Elevate to Platform Admin')}>
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
                />
            </Paper>

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
                    />
                )}
            </Suspense>

            <ConfirmDialog />
        </Box>
    );
}
