import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Employee } from '../domain/types';

export function CompassEmployeesTab() {
    const { t } = useTranslation();
    const { activeCompanyId, activeStoreId } = useAuthStore();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [emailError, setEmailError] = useState('');
    const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);

    const fetchEmployees = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listEmployees(activeCompanyId);
            setEmployees(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => { fetchEmployees(true); }, [fetchEmployees]);

    const handleToggleActive = async (employee: Employee) => {
        if (employee.isActive) {
            setConfirmDeactivate(employee);
            return;
        }
        try {
            await compassAdminApi.updateEmployee(activeCompanyId!, employee.id, { isActive: true });
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const handleConfirmDeactivate = async () => {
        if (!confirmDeactivate || !activeCompanyId) return;
        try {
            await compassAdminApi.updateEmployee(activeCompanyId, confirmDeactivate.id, { isActive: false });
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setConfirmDeactivate(null);
        }
    };

    const handleAdd = async () => {
        if (!newEmail.trim() || !newName.trim() || !activeCompanyId || !activeStoreId) return;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            setEmailError(t('errors.invalidEmail', 'Invalid email address'));
            return;
        }
        try {
            await compassAdminApi.createEmployee(activeCompanyId, {
                branchId: activeStoreId,
                email: newEmail.trim().toLowerCase(),
                displayName: newName.trim(),
            });
            setNewEmail('');
            setNewName('');
            setAddOpen(false);
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const filtered = search
        ? employees.filter(e =>
            e.displayName.toLowerCase().includes(search.toLowerCase()) ||
            e.email.toLowerCase().includes(search.toLowerCase()))
        : employees;

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder={t('common.search', 'Search...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 200 }}
                />
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                    disabled={!activeStoreId}
                >
                    {t('compass.addEmployee')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.navigation.employees').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('common.email', 'Email')}</TableCell>
                            <TableCell>{t('common.role', 'Role')}</TableCell>
                            <TableCell>{t('common.status', 'Status')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((e) => (
                                <TableRow key={e.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{e.displayName}</Typography>
                                    </TableCell>
                                    <TableCell>{e.email}</TableCell>
                                    <TableCell>
                                        <Chip label={e.role} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={e.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            size="small"
                                            color={e.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            color={e.isActive ? 'error' : 'success'}
                                            onClick={() => handleToggleActive(e)}
                                            aria-label={e.isActive ? t('compass.deactivateEmployee') : t('common.activate')}
                                        >
                                            {e.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Confirmation dialog for deactivating an employee */}
            <Dialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('compass.confirmDeactivate')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeactivate(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleConfirmDeactivate}>
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={addOpen} onClose={() => { setAddOpen(false); setNewEmail(''); setNewName(''); setEmailError(''); }} maxWidth="xs" fullWidth>
                <DialogTitle>{t('compass.addEmployee')}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('common.name', 'Name')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('common.email', 'Email')}
                        type="email"
                        value={newEmail}
                        onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }}
                        error={!!emailError}
                        helperText={emailError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setAddOpen(false); setNewEmail(''); setNewName(''); setEmailError(''); }}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleAdd} disabled={!newEmail.trim() || !newName.trim()}>
                        {t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
