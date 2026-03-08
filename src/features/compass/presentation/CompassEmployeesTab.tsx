import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, MenuItem, FormControlLabel, Checkbox,
    InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Employee, Department } from '../domain/types';

const ROLE_OPTIONS = ['EMPLOYEE', 'MANAGER', 'ADMIN'] as const;
const CREATE_NEW_DEPT = '__CREATE_NEW__';

interface EmployeeFormState {
    email: string;
    displayName: string;
    role: string;
    departmentId: string;
    jobTitle: string;
    employeeNumber: string;
    phone: string;
    isRemote: boolean;
}

const emptyForm: EmployeeFormState = {
    email: '',
    displayName: '',
    role: 'EMPLOYEE',
    departmentId: '',
    jobTitle: '',
    employeeNumber: '',
    phone: '',
    isRemote: false,
};

export function CompassEmployeesTab() {
    const { t } = useTranslation();
    const { activeCompanyId, activeStoreId } = useAuthStore();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Dialog state
    const [addOpen, setAddOpen] = useState(false);
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);

    // Form state
    const [form, setForm] = useState<EmployeeFormState>(emptyForm);
    const [emailError, setEmailError] = useState('');
    const [saving, setSaving] = useState(false);

    // Inline department creation
    const [creatingDept, setCreatingDept] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');

    const fetchEmployees = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listEmployees(activeCompanyId);
            setEmployees(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed', 'Failed to load data'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId, t]);

    const fetchDepartments = useCallback(async () => {
        if (!activeCompanyId) return;
        try {
            const res = await compassAdminApi.listDepartments(activeCompanyId);
            setDepartments(res.data.data || []);
        } catch {
            // Departments are non-critical; silently fail
        }
    }, [activeCompanyId]);

    useEffect(() => {
        fetchEmployees(true);
        fetchDepartments();
    }, [fetchEmployees, fetchDepartments]);

    // Form helpers
    const updateField = <K extends keyof EmployeeFormState>(field: K, value: EmployeeFormState[K]) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (field === 'email') setEmailError('');
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEmailError('');
        setCreatingDept(false);
        setNewDeptName('');
    };

    const openAddDialog = () => {
        resetForm();
        setAddOpen(true);
    };

    const closeAddDialog = () => {
        setAddOpen(false);
        resetForm();
    };

    const openEditDialog = (employee: Employee) => {
        setForm({
            email: employee.email,
            displayName: employee.displayName,
            role: employee.role,
            departmentId: employee.departmentId || '',
            jobTitle: employee.jobTitle || '',
            employeeNumber: '',
            phone: employee.phone || '',
            isRemote: false,
        });
        setEmailError('');
        setCreatingDept(false);
        setNewDeptName('');
        setEditEmployee(employee);
    };

    const closeEditDialog = () => {
        setEditEmployee(null);
        resetForm();
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setEmailError(t('errors.invalidEmail', 'Invalid email address'));
            return false;
        }
        return true;
    };

    const handleDepartmentChange = (value: string) => {
        if (value === CREATE_NEW_DEPT) {
            setCreatingDept(true);
            updateField('departmentId', '');
        } else {
            setCreatingDept(false);
            setNewDeptName('');
            updateField('departmentId', value);
        }
    };

    const handleCreateDepartment = async () => {
        if (!newDeptName.trim() || !activeCompanyId) return;
        try {
            const res = await compassAdminApi.createDepartment(activeCompanyId, { name: newDeptName.trim() });
            const newDept = res.data.data;
            setDepartments(prev => [...prev, newDept]);
            updateField('departmentId', newDept.id);
            setCreatingDept(false);
            setNewDeptName('');
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        }
    };

    const handleAdd = async () => {
        if (!form.email.trim() || !form.displayName.trim() || !activeCompanyId || !activeStoreId) return;
        if (!validateEmail(form.email)) return;

        setSaving(true);
        try {
            await compassAdminApi.createEmployee(activeCompanyId, {
                branchId: activeStoreId,
                email: form.email.trim().toLowerCase(),
                displayName: form.displayName.trim(),
                role: form.role,
                departmentId: form.departmentId || null,
                jobTitle: form.jobTitle.trim() || null,
                employeeNumber: form.employeeNumber.trim() || null,
                phone: form.phone.trim() || null,
                isRemote: form.isRemote,
            });
            closeAddDialog();
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!editEmployee || !activeCompanyId) return;
        if (!form.displayName.trim()) return;
        if (!validateEmail(form.email)) return;

        setSaving(true);
        try {
            await compassAdminApi.updateEmployee(activeCompanyId, editEmployee.id, {
                email: form.email.trim().toLowerCase(),
                displayName: form.displayName.trim(),
                role: form.role,
                departmentId: form.departmentId || null,
                jobTitle: form.jobTitle.trim() || null,
                phone: form.phone.trim() || null,
            });
            closeEditDialog();
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (employee: Employee) => {
        if (employee.isActive) {
            setConfirmDeactivate(employee);
            return;
        }
        try {
            await compassAdminApi.updateEmployee(activeCompanyId!, employee.id, { isActive: true });
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        }
    };

    const handleConfirmDeactivate = async () => {
        if (!confirmDeactivate || !activeCompanyId) return;
        try {
            await compassAdminApi.updateEmployee(activeCompanyId, confirmDeactivate.id, { isActive: false });
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        } finally {
            setConfirmDeactivate(null);
        }
    };

    const getDepartmentName = (departmentId: string | null): string => {
        if (!departmentId) return '-';
        const dept = departments.find(d => d.id === departmentId);
        return dept?.name || '-';
    };

    const filtered = search
        ? employees.filter(e =>
            e.displayName.toLowerCase().includes(search.toLowerCase()) ||
            e.email.toLowerCase().includes(search.toLowerCase()))
        : employees;

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const renderFormFields = (isEdit: boolean) => (
        <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
                fullWidth
                required
                label={t('common.name', 'Name')}
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
            />
            <TextField
                fullWidth
                required
                label={t('common.email', 'Email')}
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={!!emailError}
                helperText={emailError}
            />
            <TextField
                fullWidth
                select
                label={t('common.role', 'Role')}
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
            >
                {ROLE_OPTIONS.map(role => (
                    <MenuItem key={role} value={role}>
                        {t(`roles.${role.toLowerCase()}`, role)}
                    </MenuItem>
                ))}
            </TextField>
            {!creatingDept ? (
                <TextField
                    fullWidth
                    select
                    label={t('compass.department', 'Department')}
                    value={form.departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                    <MenuItem value="">
                        <em>{t('common.none', 'None')}</em>
                    </MenuItem>
                    {departments.map(dept => (
                        <MenuItem key={dept.id} value={dept.id}>
                            {dept.name}
                        </MenuItem>
                    ))}
                    <MenuItem value={CREATE_NEW_DEPT}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                            <AddIcon fontSize="small" />
                            {t('compass.createNewDepartment', 'Create New')}
                        </Stack>
                    </MenuItem>
                </TextField>
            ) : (
                <TextField
                    fullWidth
                    autoFocus
                    label={t('compass.newDepartmentName', 'New Department Name')}
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateDepartment();
                        }
                        if (e.key === 'Escape') {
                            setCreatingDept(false);
                            setNewDeptName('');
                        }
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <Button
                                    size="small"
                                    onClick={handleCreateDepartment}
                                    disabled={!newDeptName.trim()}
                                >
                                    {t('common.create', 'Create')}
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => { setCreatingDept(false); setNewDeptName(''); }}
                                >
                                    {t('common.cancel', 'Cancel')}
                                </Button>
                            </InputAdornment>
                        ),
                    }}
                    helperText={t('compass.pressEnterToCreate', 'Press Enter to create or Escape to cancel')}
                />
            )}
            <TextField
                fullWidth
                label={t('compass.jobTitle', 'Job Title')}
                value={form.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
            />
            {!isEdit && (
                <TextField
                    fullWidth
                    label={t('compass.employeeNumber', 'Employee Number')}
                    value={form.employeeNumber}
                    onChange={(e) => updateField('employeeNumber', e.target.value)}
                />
            )}
            <TextField
                fullWidth
                label={t('common.phone', 'Phone')}
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
            />
            {!isEdit && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={form.isRemote}
                            onChange={(e) => updateField('isRemote', e.target.checked)}
                        />
                    }
                    label={t('compass.isRemote', 'Remote Employee')}
                />
            )}
        </Stack>
    );

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
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
                    onClick={openAddDialog}
                    disabled={!activeStoreId}
                >
                    {t('compass.addEmployee', 'Add Employee')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.navigation.employees', 'employees').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('common.email', 'Email')}</TableCell>
                            <TableCell>{t('common.role', 'Role')}</TableCell>
                            <TableCell>{t('compass.department', 'Department')}</TableCell>
                            <TableCell>{t('compass.jobTitle', 'Job Title')}</TableCell>
                            <TableCell>{t('common.status.title', 'Status')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((emp) => (
                                <TableRow key={emp.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {emp.displayName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{emp.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={t(`roles.${emp.role.toLowerCase()}`, emp.role)}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                                    <TableCell>{emp.jobTitle || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={emp.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            size="small"
                                            color={emp.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => openEditDialog(emp)}
                                            aria-label={t('common.edit', 'Edit')}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color={emp.isActive ? 'error' : 'success'}
                                            onClick={() => handleToggleActive(emp)}
                                            aria-label={emp.isActive ? t('compass.deactivateEmployee', 'Deactivate') : t('common.activate', 'Activate')}
                                        >
                                            {emp.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Deactivate confirmation dialog */}
            <Dialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}>
                <DialogTitle>{t('common.confirm', 'Confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('compass.confirmDeactivate', 'Are you sure you want to deactivate this employee?')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeactivate(null)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button color="error" onClick={handleConfirmDeactivate}>
                        {t('common.confirm', 'Confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Employee dialog */}
            <Dialog open={addOpen} onClose={closeAddDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.addEmployee', 'Add Employee')}</DialogTitle>
                <DialogContent>
                    {renderFormFields(false)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeAddDialog} disabled={saving}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        disabled={!form.email.trim() || !form.displayName.trim() || saving}
                    >
                        {saving ? <CircularProgress size={20} /> : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Employee dialog */}
            <Dialog open={!!editEmployee} onClose={closeEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.editEmployee', 'Edit Employee')}</DialogTitle>
                <DialogContent>
                    {renderFormFields(true)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog} disabled={saving}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleEdit}
                        disabled={!form.email.trim() || !form.displayName.trim() || saving}
                    >
                        {saving ? <CircularProgress size={20} /> : t('common.save', 'Save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
