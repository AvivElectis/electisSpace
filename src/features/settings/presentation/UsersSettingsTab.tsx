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
    Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { userService, type User, type CreateUserDto, type UpdateUserDto } from '@shared/infrastructure/services/userService';
import { UserDialog } from './UserDialog';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

export function UsersSettingsTab() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Fetch Users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await userService.getAll({
                page: page + 1, // API is 1-indexed
                limit,
            });
            setUsers(response.data);
            setTotal(response.pagination.total);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

    const handleSave = async (data: CreateUserDto | UpdateUserDto) => {
        if (selectedUser) {
            await userService.update(selectedUser.id, data as UpdateUserDto);
        } else {
            await userService.create(data as CreateUserDto);
        }
        fetchUsers();
    };

    // Role color helper
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'error';
            case 'MANAGER': return 'warning';
            case 'VIEWER': return 'info';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{t('settings.users.title')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                    {t('settings.users.addUser')}
                </Button>
            </Stack>

            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flex: 1 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('auth.email')}</TableCell>
                                <TableCell>{t('auth.name')}</TableCell>
                                <TableCell>{t('auth.role')}</TableCell>
                                <TableCell>{t('common.status.title')}</TableCell>
                                <TableCell align="right">{t('common.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        {t('common.noData')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.firstName} {user.lastName}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={t(`roles.${user.role.toLowerCase()}`)}
                                                color={getRoleColor(user.role) as any}
                                                size="small"
                                            />
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
                                            <Stack direction="row" justifyContent="flex-end">
                                                <Tooltip title={t('common.edit')}>
                                                    <IconButton onClick={() => handleEdit(user)} size="small" color="primary">
                                                        <EditIcon />
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
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
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
                />
            </Paper>

            <UserDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                user={selectedUser}
            />
            <ConfirmDialog />
        </Box>
    );
}
