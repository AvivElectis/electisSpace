import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, Tabs, Tab, MenuItem,
    Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Department, Employee, Team } from '../domain/types';

export function CompassOrganizationTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();
    const [subTab, setSubTab] = useState(0);

    // Departments state
    const [departments, setDepartments] = useState<Department[]>([]);
    const [deptLoading, setDeptLoading] = useState(true);
    const [deptError, setDeptError] = useState<string | null>(null);
    const [deptSearch, setDeptSearch] = useState('');
    const [deptDialogOpen, setDeptDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptForm, setDeptForm] = useState({ name: '', code: '', parentId: '', managerId: '', color: '' });
    const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);

    // Teams state
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamError, setTeamError] = useState<string | null>(null);
    const [teamSearch, setTeamSearch] = useState('');
    const [teamDialogOpen, setTeamDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamForm, setTeamForm] = useState({ name: '', departmentId: '', leadId: '', color: '' });
    const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);

    // Employees for dropdowns
    const [employees, setEmployees] = useState<Employee[]>([]);

    const fetchDepartments = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setDeptLoading(true);
        try {
            const res = await compassAdminApi.listDepartments(activeCompanyId);
            setDepartments(res.data.data || []);
            setDeptError(null);
        } catch {
            setDeptError(t('errors.loadFailed'));
        } finally {
            setDeptLoading(false);
        }
    }, [activeCompanyId, t]);

    const fetchTeams = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setTeamLoading(true);
        try {
            const res = await compassAdminApi.listTeams(activeCompanyId);
            setTeams(res.data.data || []);
            setTeamError(null);
        } catch {
            setTeamError(t('errors.loadFailed'));
        } finally {
            setTeamLoading(false);
        }
    }, [activeCompanyId, t]);

    const fetchEmployees = useCallback(async () => {
        if (!activeCompanyId) return;
        try {
            const res = await compassAdminApi.listEmployees(activeCompanyId);
            setEmployees(res.data.data || []);
        } catch {
            // Silently fail — employees are only needed for dropdowns
        }
    }, [activeCompanyId]);

    useEffect(() => {
        fetchDepartments(true);
        fetchTeams(true);
        fetchEmployees();
    }, [fetchDepartments, fetchTeams, fetchEmployees]);

    // Department handlers
    const openAddDept = () => {
        setEditingDept(null);
        setDeptForm({ name: '', code: '', parentId: '', managerId: '', color: '' });
        setDeptDialogOpen(true);
    };

    const openEditDept = (dept: Department) => {
        setEditingDept(dept);
        setDeptForm({
            name: dept.name,
            code: dept.code || '',
            parentId: dept.parentId || '',
            managerId: dept.manager?.id || '',
            color: dept.color || '',
        });
        setDeptDialogOpen(true);
    };

    const handleSaveDept = async () => {
        if (!activeCompanyId || !deptForm.name.trim()) return;
        try {
            const payload = {
                name: deptForm.name.trim(),
                code: deptForm.code.trim() || undefined,
                parentId: deptForm.parentId || undefined,
                managerId: deptForm.managerId || undefined,
                color: deptForm.color.trim() || undefined,
            };
            if (editingDept) {
                await compassAdminApi.updateDepartment(activeCompanyId, editingDept.id, {
                    ...payload,
                    parentId: deptForm.parentId || null,
                    managerId: deptForm.managerId || null,
                    color: deptForm.color.trim() || null,
                });
            } else {
                await compassAdminApi.createDepartment(activeCompanyId, payload);
            }
            setDeptDialogOpen(false);
            fetchDepartments();
        } catch {
            setDeptError(t('errors.saveFailed'));
        }
    };

    const handleDeleteDept = async () => {
        if (!activeCompanyId || !confirmDeleteDept) return;
        try {
            await compassAdminApi.deleteDepartment(activeCompanyId, confirmDeleteDept.id);
            setConfirmDeleteDept(null);
            fetchDepartments();
        } catch {
            setDeptError(t('errors.saveFailed'));
            setConfirmDeleteDept(null);
        }
    };

    // Team handlers
    const openAddTeam = () => {
        setEditingTeam(null);
        setTeamForm({ name: '', departmentId: '', leadId: '', color: '' });
        setTeamDialogOpen(true);
    };

    const openEditTeam = (team: Team) => {
        setEditingTeam(team);
        setTeamForm({
            name: team.name,
            departmentId: team.department?.id || '',
            leadId: team.lead?.id || '',
            color: team.color || '',
        });
        setTeamDialogOpen(true);
    };

    const handleSaveTeam = async () => {
        if (!activeCompanyId || !teamForm.name.trim()) return;
        try {
            const payload = {
                name: teamForm.name.trim(),
                departmentId: teamForm.departmentId || undefined,
                leadId: teamForm.leadId || undefined,
                color: teamForm.color.trim() || undefined,
            };
            if (editingTeam) {
                await compassAdminApi.updateTeam(activeCompanyId, editingTeam.id, {
                    ...payload,
                    departmentId: teamForm.departmentId || null,
                    leadId: teamForm.leadId || null,
                    color: teamForm.color.trim() || null,
                });
            } else {
                await compassAdminApi.createTeam(activeCompanyId, payload);
            }
            setTeamDialogOpen(false);
            fetchTeams();
        } catch {
            setTeamError(t('errors.saveFailed'));
        }
    };

    const handleDeleteTeam = async () => {
        if (!activeCompanyId || !confirmDeleteTeam) return;
        try {
            await compassAdminApi.deleteTeam(activeCompanyId, confirmDeleteTeam.id);
            setConfirmDeleteTeam(null);
            fetchTeams();
        } catch {
            setTeamError(t('errors.saveFailed'));
            setConfirmDeleteTeam(null);
        }
    };

    // Filtered lists
    const filteredDepts = deptSearch
        ? departments.filter(d =>
            d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
            (d.code && d.code.toLowerCase().includes(deptSearch.toLowerCase())))
        : departments;

    const filteredTeams = teamSearch
        ? teams.filter(tm =>
            tm.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
            (tm.department && tm.department.name.toLowerCase().includes(teamSearch.toLowerCase())))
        : teams;

    const renderColorChip = (color: string | null) => {
        if (!color) return null;
        return (
            <Box
                sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    mr: 1,
                }}
            />
        );
    };

    const renderDepartments = () => {
        if (deptLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

        return (
            <Box>
                {deptError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeptError(null)}>{deptError}</Alert>}

                <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
                    <TextField
                        size="small"
                        placeholder={t('common.search', 'Search...')}
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        sx={{ minWidth: 200 }}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openAddDept}
                    >
                        {t('compass.organization.addDepartment')}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {filteredDepts.length} {t('compass.organization.departments').toLowerCase()}
                    </Typography>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('compass.organization.departmentName')}</TableCell>
                                <TableCell>{t('compass.organization.departmentCode')}</TableCell>
                                <TableCell>{t('compass.organization.manager')}</TableCell>
                                <TableCell>{t('compass.organization.members')}</TableCell>
                                <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredDepts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                            {t('compass.organization.noDepartments')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDepts.map((dept) => (
                                    <TableRow key={dept.id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center">
                                                {renderColorChip(dept.color)}
                                                <Typography variant="body2" fontWeight={500}>{dept.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            {dept.code ? <Chip label={dept.code} size="small" variant="outlined" /> : '—'}
                                        </TableCell>
                                        <TableCell>{dept.manager?.displayName || '—'}</TableCell>
                                        <TableCell>
                                            <Chip label={dept._count.members} size="small" icon={<GroupIcon />} variant="outlined" />
                                            {dept._count.children > 0 && (
                                                <Chip label={dept._count.children} size="small" icon={<AccountTreeIcon />} variant="outlined" sx={{ ml: 0.5 }} />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => openEditDept(dept)} aria-label={t('compass.organization.editDepartment')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => setConfirmDeleteDept(dept)} aria-label={t('common.delete', 'Delete')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    const renderTeams = () => {
        if (teamLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

        return (
            <Box>
                {teamError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTeamError(null)}>{teamError}</Alert>}

                <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
                    <TextField
                        size="small"
                        placeholder={t('common.search', 'Search...')}
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        sx={{ minWidth: 200 }}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openAddTeam}
                    >
                        {t('compass.organization.addTeam')}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {filteredTeams.length} {t('compass.organization.teams').toLowerCase()}
                    </Typography>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('compass.organization.teamName')}</TableCell>
                                <TableCell>{t('compass.organization.departments')}</TableCell>
                                <TableCell>{t('compass.organization.teamLead')}</TableCell>
                                <TableCell>{t('compass.organization.members')}</TableCell>
                                <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeams.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                            {t('compass.organization.noTeams')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTeams.map((team) => (
                                    <TableRow key={team.id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center">
                                                {renderColorChip(team.color)}
                                                <Typography variant="body2" fontWeight={500}>{team.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{team.department?.name || '—'}</TableCell>
                                        <TableCell>{team.lead?.displayName || '—'}</TableCell>
                                        <TableCell>
                                            <Chip label={team._count.members} size="small" icon={<GroupIcon />} variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => openEditTeam(team)} aria-label={t('compass.organization.editTeam')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => setConfirmDeleteTeam(team)} aria-label={t('common.delete', 'Delete')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    return (
        <Box>
            <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
                <Tab label={t('compass.organization.departments')} icon={<AccountTreeIcon />} iconPosition="start" />
                <Tab label={t('compass.organization.teams')} icon={<GroupIcon />} iconPosition="start" />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {subTab === 0 && renderDepartments()}
            {subTab === 1 && renderTeams()}

            {/* Department Add/Edit Dialog */}
            <Dialog
                open={deptDialogOpen}
                onClose={() => setDeptDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editingDept ? t('compass.organization.editDepartment') : t('compass.organization.addDepartment')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('compass.organization.departmentName')}
                        value={deptForm.name}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('compass.organization.departmentCode')}
                        value={deptForm.code}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, code: e.target.value }))}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        select
                        label={t('compass.organization.parentDepartment')}
                        value={deptForm.parentId}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, parentId: e.target.value }))}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>{t('common.none', 'None')}</em>
                        </MenuItem>
                        {departments
                            .filter(d => d.id !== editingDept?.id)
                            .map(d => (
                                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                            ))}
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label={t('compass.organization.manager')}
                        value={deptForm.managerId}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, managerId: e.target.value }))}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>{t('common.none', 'None')}</em>
                        </MenuItem>
                        {employees.filter(e => e.isActive).map(e => (
                            <MenuItem key={e.id} value={e.id}>{e.displayName}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('compass.organization.color')}
                        type="color"
                        value={deptForm.color || '#1976d2'}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, color: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeptDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleSaveDept} disabled={!deptForm.name.trim()}>
                        {editingDept ? t('common.save', 'Save') : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Department Delete Confirmation */}
            <Dialog open={!!confirmDeleteDept} onClose={() => setConfirmDeleteDept(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('common.confirmDelete', 'Are you sure you want to delete "{{name}}"?', { name: confirmDeleteDept?.name })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteDept(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleDeleteDept}>{t('common.confirm')}</Button>
                </DialogActions>
            </Dialog>

            {/* Team Add/Edit Dialog */}
            <Dialog
                open={teamDialogOpen}
                onClose={() => setTeamDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editingTeam ? t('compass.organization.editTeam') : t('compass.organization.addTeam')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('compass.organization.teamName')}
                        value={teamForm.name}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        select
                        label={t('compass.organization.departments')}
                        value={teamForm.departmentId}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, departmentId: e.target.value }))}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>{t('common.none', 'None')}</em>
                        </MenuItem>
                        {departments.map(d => (
                            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label={t('compass.organization.teamLead')}
                        value={teamForm.leadId}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, leadId: e.target.value }))}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>{t('common.none', 'None')}</em>
                        </MenuItem>
                        {employees.filter(e => e.isActive).map(e => (
                            <MenuItem key={e.id} value={e.id}>{e.displayName}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('compass.organization.color')}
                        type="color"
                        value={teamForm.color || '#1976d2'}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, color: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTeamDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleSaveTeam} disabled={!teamForm.name.trim()}>
                        {editingTeam ? t('common.save', 'Save') : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Team Delete Confirmation */}
            <Dialog open={!!confirmDeleteTeam} onClose={() => setConfirmDeleteTeam(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('common.confirmDelete', 'Are you sure you want to delete "{{name}}"?', { name: confirmDeleteTeam?.name })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteTeam(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleDeleteTeam}>{t('common.confirm')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
