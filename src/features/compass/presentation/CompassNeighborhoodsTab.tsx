import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Department, Neighborhood } from '../domain/types';

interface FloorOption {
    id: string;
    name: string;
    buildingName: string;
}

export function CompassNeighborhoodsTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();

    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [floors, setFloors] = useState<FloorOption[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedFloorId, setSelectedFloorId] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Neighborhood | null>(null);
    const [form, setForm] = useState({ name: '', color: '', description: '', departmentId: '' });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Neighborhood | null>(null);

    // Fetch buildings/floors hierarchy
    useEffect(() => {
        if (!activeCompanyId) return;
        const fetchData = async () => {
            try {
                const [buildingsRes, deptsRes] = await Promise.all([
                    compassAdminApi.listBuildings(activeCompanyId),
                    compassAdminApi.listDepartments(activeCompanyId),
                ]);
                const floorOptions: FloorOption[] = [];
                for (const building of buildingsRes.data.data || []) {
                    for (const floor of building.floors || []) {
                        floorOptions.push({
                            id: floor.id,
                            name: floor.name,
                            buildingName: building.name,
                        });
                    }
                }
                setFloors(floorOptions);
                setDepartments(deptsRes.data.data || []);
                if (floorOptions.length > 0 && !selectedFloorId) {
                    setSelectedFloorId(floorOptions[0].id);
                }
            } catch {
                setError(t('errors.loadFailed', 'Failed to load data'));
            } finally {
                setInitialLoading(false);
            }
        };
        fetchData();
    }, [activeCompanyId]);

    // Fetch neighborhoods when floor changes
    const fetchNeighborhoods = useCallback(async () => {
        if (!selectedFloorId) return;
        setLoading(true);
        try {
            const res = await compassAdminApi.listNeighborhoods(activeCompanyId!, selectedFloorId);
            setNeighborhoods(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    }, [selectedFloorId]);

    useEffect(() => { fetchNeighborhoods(); }, [fetchNeighborhoods]);

    const handleSave = async () => {
        if (!form.name.trim() || !selectedFloorId) return;
        setSaving(true);
        try {
            if (editing) {
                await compassAdminApi.updateNeighborhood(activeCompanyId!, editing.id, {
                    name: form.name.trim(),
                    color: form.color.trim() || null,
                    description: form.description.trim() || null,
                    departmentId: form.departmentId || null,
                });
            } else {
                await compassAdminApi.createNeighborhood(activeCompanyId!, {
                    name: form.name.trim(),
                    floorId: selectedFloorId,
                    color: form.color.trim() || undefined,
                    description: form.description.trim() || undefined,
                    departmentId: form.departmentId || undefined,
                });
            }
            setDialogOpen(false);
            fetchNeighborhoods();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await compassAdminApi.deleteNeighborhood(activeCompanyId!, confirmDelete.id);
            setConfirmDelete(null);
            fetchNeighborhoods();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save'));
            setConfirmDelete(null);
        }
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', color: '', description: '', departmentId: '' });
        setDialogOpen(true);
    };

    const openEdit = (n: Neighborhood) => {
        setEditing(n);
        setForm({
            name: n.name,
            color: n.color || '',
            description: n.description || '',
            departmentId: n.department?.id || '',
        });
        setDialogOpen(true);
    };

    const renderColorDot = (color: string | null) => {
        if (!color) return null;
        return (
            <Box
                sx={{
                    width: 16, height: 16, borderRadius: '50%',
                    backgroundColor: color, border: '1px solid', borderColor: 'divider',
                    display: 'inline-block', verticalAlign: 'middle', mr: 1,
                }}
            />
        );
    };

    const filtered = search
        ? neighborhoods.filter(n =>
            n.name.toLowerCase().includes(search.toLowerCase()) ||
            (n.department && n.department.name.toLowerCase().includes(search.toLowerCase())) ||
            (n.description && n.description.toLowerCase().includes(search.toLowerCase())))
        : neighborhoods;

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    if (floors.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                    {t('compass.neighborhoods.selectFloor', 'No floors found. Create buildings and floors first.')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
                <TextField
                    size="small"
                    select
                    label={t('compass.dashboard.floor', 'Floor')}
                    value={selectedFloorId}
                    onChange={(e) => setSelectedFloorId(e.target.value)}
                    sx={{ minWidth: 220 }}
                >
                    {floors.map(f => (
                        <MenuItem key={f.id} value={f.id}>
                            {f.buildingName} — {f.name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    size="small"
                    placeholder={t('common.search', 'Search...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 200 }}
                />
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd}>
                    {t('compass.neighborhoods.addNeighborhood')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.neighborhoods.title').toLowerCase()}
                </Typography>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('common.name', 'Name')}</TableCell>
                                <TableCell>{t('compass.neighborhoods.departmentAffinity')}</TableCell>
                                <TableCell>{t('compass.neighborhoods.spacesCount')}</TableCell>
                                <TableCell>{t('compass.neighborhoods.description')}</TableCell>
                                <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                            {t('compass.neighborhoods.noNeighborhoods')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((n) => (
                                    <TableRow key={n.id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center">
                                                {renderColorDot(n.color)}
                                                <Typography variant="body2" fontWeight={500}>{n.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{n.department?.name || '—'}</TableCell>
                                        <TableCell>
                                            <Chip label={n._count.spaces} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                                                {n.description || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => openEdit(n)} aria-label={t('common.edit', 'Edit')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => setConfirmDelete(n)} aria-label={t('common.delete', 'Delete')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editing ? t('compass.neighborhoods.editNeighborhood') : t('compass.neighborhoods.addNeighborhood')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('common.name', 'Name')}
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        select
                        label={t('compass.neighborhoods.departmentAffinity')}
                        value={form.departmentId}
                        onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">{t('common.none', 'None')}</MenuItem>
                        {departments.map(d => (
                            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('compass.neighborhoods.description')}
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        multiline
                        rows={2}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('compass.organization.color', 'Color')}
                        type="color"
                        value={form.color || '#1976d2'}
                        onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
                        {saving ? <CircularProgress size={20} /> : editing ? t('common.save', 'Save') : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('common.confirmDelete', 'Are you sure you want to delete this item?')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleDelete}>{t('common.confirm')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
