import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, MenuItem, FormControlLabel, Checkbox,
    InputAdornment, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import Papa from 'papaparse';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Employee, Department, PaginationInfo } from '../domain/types';

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
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [page, setPage] = useState(1);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const fetchEmployees = useCallback(async (showLoading = false, targetPage = page) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listEmployees(activeCompanyId, { page: targetPage, pageSize: 50 });
            setEmployees(res.data.data || []);
            setPagination(res.data.pagination || null);
            setError(null);
        } catch {
            setError(t('errors.loadFailed', 'Failed to load data'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId, t, page]);

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
            employeeNumber: employee.employeeNumber || '',
            phone: employee.phone || '',
            isRemote: employee.isRemote ?? false,
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
                employeeNumber: form.employeeNumber.trim() || null,
                isRemote: form.isRemote,
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

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkToggleActive = async (isActive: boolean) => {
        if (!activeCompanyId || selectedIds.size === 0) return;
        try {
            await compassAdminApi.bulkUpdateEmployees(activeCompanyId, [...selectedIds], isActive);
            setSelectedIds(new Set());
            fetchEmployees();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        const rows = employees.map(emp => ({
            [t('common.name')]: emp.displayName,
            [t('common.email')]: emp.email,
            [t('common.role')]: emp.role,
            [t('compass.department')]: getDepartmentName(emp.departmentId),
            [t('compass.jobTitle')]: emp.jobTitle || '',
            [t('compass.employeeNumber')]: emp.employeeNumber || '',
            [t('common.phone')]: emp.phone || '',
            [t('compass.isRemote')]: emp.isRemote ? 'true' : 'false',
            [t('common.status.title')]: emp.isActive ? t('common.active') : t('common.inactive'),
        }));
        const csv = Papa.unparse(rows);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // CSV Import
    const [importOpen, setImportOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<Array<{ email: string; displayName: string; role: string; jobTitle: string; phone: string; employeeNumber: string }>>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ created: number; errors: number } | null>(null);

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = (results.data as Record<string, string>[])
                    .filter(row => row['email'] || row['Email'] || row[t('common.email')])
                    .map(row => ({
                        email: (row['email'] || row['Email'] || row[t('common.email')] || '').trim(),
                        displayName: (row['displayName'] || row['Name'] || row['name'] || row[t('common.name')] || '').trim(),
                        role: (row['role'] || row['Role'] || row[t('common.role')] || 'EMPLOYEE').trim().toUpperCase(),
                        jobTitle: (row['jobTitle'] || row['Job Title'] || row[t('compass.jobTitle')] || '').trim(),
                        phone: (row['phone'] || row['Phone'] || row[t('common.phone')] || '').trim(),
                        employeeNumber: (row['employeeNumber'] || row['Employee Number'] || row[t('compass.employeeNumber')] || '').trim(),
                    }));
                setImportPreview(rows);
                setImportOpen(true);
                setImportResult(null);
            },
        });
        // Reset the input so same file can be re-selected
        e.target.value = '';
    };

    const handleImportConfirm = async () => {
        if (!activeCompanyId || !activeStoreId || importPreview.length === 0) return;
        setImporting(true);

        // Validate rows first, separate valid from invalid
        const validRows = importPreview.filter(row => row.email && row.displayName);
        const invalidCount = importPreview.length - validRows.length;

        // Use Promise.allSettled for concurrent import without race conditions
        const results = await Promise.allSettled(
            validRows.map(row =>
                compassAdminApi.createEmployee(activeCompanyId, {
                    branchId: activeStoreId,
                    email: row.email.toLowerCase(),
                    displayName: row.displayName,
                    role: ['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(row.role) ? row.role : 'EMPLOYEE',
                    jobTitle: row.jobTitle || null,
                    phone: row.phone || null,
                    employeeNumber: row.employeeNumber || null,
                }),
            ),
        );

        const created = results.filter(r => r.status === 'fulfilled').length;
        const errors = results.filter(r => r.status === 'rejected').length + invalidCount;
        setImportResult({ created, errors });
        setImporting(false);
        if (created > 0) fetchEmployees();
    };

    const handleImportClose = () => {
        setImportOpen(false);
        setImportPreview([]);
        setImportResult(null);
    };

    const getDepartmentName = (departmentId: string | null): string => {
        if (!departmentId) return '-';
        const dept = departments.find(d => d.id === departmentId);
        return dept?.name || '-';
    };

    const filtered = useMemo(() => search
        ? employees.filter(e =>
            e.displayName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
            e.email.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
        : employees, [employees, search]);

    const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(e => e.id)));
        }
    };

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const renderFormFields = () => (
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
            <TextField
                fullWidth
                label={t('compass.employeeNumber', 'Employee Number')}
                value={form.employeeNumber}
                onChange={(e) => updateField('employeeNumber', e.target.value)}
            />
            <TextField
                fullWidth
                label={t('common.phone', 'Phone')}
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={form.isRemote}
                        onChange={(e) => updateField('isRemote', e.target.checked)}
                    />
                }
                label={t('compass.isRemote', 'Remote Employee')}
            />
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
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCSV}
                    disabled={employees.length === 0}
                >
                    {t('compass.exportCSV', 'Export CSV')}
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    component="label"
                    disabled={!activeStoreId}
                >
                    {t('compass.importCSV', 'Import CSV')}
                    <input type="file" accept=".csv" hidden onChange={handleImportFile} />
                </Button>
                {selectedIds.size > 0 && (
                    <>
                        <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleBulkToggleActive(false)}
                        >
                            {t('compass.bulkDeactivate', 'Deactivate')} ({selectedIds.size})
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="success"
                            onClick={() => handleBulkToggleActive(true)}
                        >
                            {t('compass.bulkActivate', 'Activate')} ({selectedIds.size})
                        </Button>
                    </>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {pagination ? pagination.total : filtered.length} {t('compass.navigation.employees', 'employees').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allSelected}
                                    indeterminate={selectedIds.size > 0 && !allSelected}
                                    onChange={toggleSelectAll}
                                />
                            </TableCell>
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
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((emp) => (
                                <TableRow key={emp.id} hover selected={selectedIds.has(emp.id)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            size="small"
                                            checked={selectedIds.has(emp.id)}
                                            onChange={() => toggleSelect(emp.id)}
                                        />
                                    </TableCell>
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

            {pagination && pagination.totalPages > 1 && (
                <TablePagination
                    component="div"
                    count={pagination.total}
                    page={pagination.page - 1}
                    onPageChange={(_, newPage) => {
                        setPage(newPage + 1);
                        fetchEmployees(false, newPage + 1);
                    }}
                    rowsPerPage={pagination.pageSize}
                    rowsPerPageOptions={[50]}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            )}

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
                    {renderFormFields()}
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
                    {renderFormFields()}
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

            {/* CSV Import Preview dialog */}
            <Dialog open={importOpen} onClose={handleImportClose} maxWidth="md" fullWidth>
                <DialogTitle>{t('compass.importCSV', 'Import CSV')}</DialogTitle>
                <DialogContent>
                    {importResult ? (
                        <Alert severity={importResult.errors > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                            {t('compass.importResult', '{{created}} created, {{errors}} errors', importResult)}
                        </Alert>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('compass.importPreview', '{{count}} employees found in CSV', { count: importPreview.length })}
                        </Typography>
                    )}
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('common.name')}</TableCell>
                                    <TableCell>{t('common.email')}</TableCell>
                                    <TableCell>{t('common.role')}</TableCell>
                                    <TableCell>{t('compass.jobTitle')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {importPreview.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{row.displayName || <Chip label={t('common.missing', 'Missing')} size="small" color="error" />}</TableCell>
                                        <TableCell>{row.email || <Chip label={t('common.missing', 'Missing')} size="small" color="error" />}</TableCell>
                                        <TableCell>{row.role}</TableCell>
                                        <TableCell>{row.jobTitle || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleImportClose}>
                        {importResult ? t('common.close', 'Close') : t('common.cancel')}
                    </Button>
                    {!importResult && (
                        <Button
                            variant="contained"
                            onClick={handleImportConfirm}
                            disabled={importing || importPreview.length === 0}
                        >
                            {importing ? <CircularProgress size={20} /> : t('compass.importEmployees', 'Import {{count}} Employees', { count: importPreview.length })}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
