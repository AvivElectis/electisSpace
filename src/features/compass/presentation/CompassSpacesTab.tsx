import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, MenuItem, IconButton,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { CompassSpace, CompassSpaceType, SpaceMode } from '../domain/types';

const SPACE_TYPES: CompassSpaceType[] = [
    'DESK', 'MEETING_ROOM', 'PHONE_BOOTH',
    'COLLABORATION_ZONE', 'PARKING', 'LOCKER', 'EVENT_SPACE',
];

interface FloorOption {
    id: string;
    name: string;
    buildingId: string;
    buildingName: string;
}

interface EditForm {
    compassSpaceType: string;
    compassCapacity: string;
    buildingId: string;
    floorId: string;
    neighborhoodId: string;
}

const emptyForm: EditForm = {
    compassSpaceType: '',
    compassCapacity: '',
    buildingId: '',
    floorId: '',
    neighborhoodId: '',
};

export function CompassSpacesTab() {
    const { t } = useTranslation();
    const { activeStoreId, activeCompanyId } = useAuthStore();
    const [spaces, setSpaces] = useState<CompassSpace[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [updatingSpaceId, setUpdatingSpaceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modeFilter, setModeFilter] = useState<string>('all');
    const [addOpen, setAddOpen] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceId, setNewSpaceId] = useState('');

    // Edit dialog state
    const [editSpace, setEditSpace] = useState<CompassSpace | null>(null);
    const [editForm, setEditForm] = useState<EditForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    // Building/floor hierarchy
    const [floors, setFloors] = useState<FloorOption[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);

    const fetchSpaces = useCallback(async (showLoading = false) => {
        if (!activeStoreId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listSpaces(activeStoreId);
            setSpaces(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeStoreId]);

    useEffect(() => { fetchSpaces(true); }, [fetchSpaces]);

    // Load buildings/floors for edit dialog
    useEffect(() => {
        if (!activeCompanyId) return;
        const load = async () => {
            try {
                const res = await compassAdminApi.listBuildings(activeCompanyId);
                const opts: FloorOption[] = [];
                for (const b of res.data.data || []) {
                    for (const f of b.floors || []) {
                        opts.push({ id: f.id, name: f.name, buildingId: b.id, buildingName: b.name });
                    }
                }
                setFloors(opts);
            } catch { /* non-critical */ }
        };
        load();
    }, [activeCompanyId]);

    // Load neighborhoods when floor changes in edit form
    useEffect(() => {
        if (!editForm.floorId) { setNeighborhoods([]); return; }
        let cancelled = false;
        const load = async () => {
            try {
                const res = await compassAdminApi.listNeighborhoods(activeCompanyId!, editForm.floorId);
                if (!cancelled) {
                    setNeighborhoods((res.data.data || []).map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })));
                }
            } catch { if (!cancelled) setNeighborhoods([]); }
        };
        load();
        return () => { cancelled = true; };
    }, [editForm.floorId]);

    const handleModeChange = async (spaceId: string, mode: SpaceMode) => {
        setUpdatingSpaceId(spaceId);
        try {
            await compassAdminApi.updateSpaceMode(spaceId, mode);
            await fetchSpaces();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setUpdatingSpaceId(null);
        }
    };

    const handleAddSpace = async () => {
        if (!newSpaceName.trim() || !activeStoreId) return;
        const externalId = newSpaceId.trim() || newSpaceName.trim().toUpperCase().replace(/\s+/g, '-');
        try {
            await compassAdminApi.createSpace(activeStoreId, {
                externalId,
                data: { ITEM_NAME: newSpaceName.trim() },
            });
            setNewSpaceName('');
            setNewSpaceId('');
            setAddOpen(false);
            fetchSpaces();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const openEdit = (space: CompassSpace) => {
        const floorOpt = floors.find(f => f.id === space.floorId);
        setEditForm({
            compassSpaceType: space.compassSpaceType || '',
            compassCapacity: space.compassCapacity?.toString() || '',
            buildingId: floorOpt?.buildingId || space.buildingId || '',
            floorId: space.floorId || '',
            neighborhoodId: space.neighborhoodId || '',
        });
        setEditSpace(space);
    };

    const handleSaveEdit = async () => {
        if (!editSpace) return;
        setSaving(true);
        try {
            await compassAdminApi.updateSpaceProperties(editSpace.id, {
                compassSpaceType: (editForm.compassSpaceType as CompassSpaceType) || null,
                compassCapacity: editForm.compassCapacity ? parseInt(editForm.compassCapacity, 10) : null,
                buildingId: editForm.buildingId || null,
                floorId: editForm.floorId || null,
                neighborhoodId: editForm.neighborhoodId || null,
            });
            setEditSpace(null);
            fetchSpaces();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const availableFloors = editForm.buildingId
        ? floors.filter(f => f.buildingId === editForm.buildingId)
        : floors;

    const filtered = modeFilter === 'all'
        ? spaces
        : spaces.filter(s => s.compassMode === modeFilter);

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
                <TextField
                    select
                    size="small"
                    label={t('common.filter', 'Filter')}
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="all">{t('common.all')}</MenuItem>
                    <MenuItem value="AVAILABLE">{t('compass.spaceMode.AVAILABLE')}</MenuItem>
                    <MenuItem value="PERMANENT">{t('compass.spaceMode.PERMANENT')}</MenuItem>
                    <MenuItem value="MAINTENANCE">{t('compass.spaceMode.MAINTENANCE')}</MenuItem>
                    <MenuItem value="EXCLUDED">{t('compass.spaceMode.EXCLUDED')}</MenuItem>
                </TextField>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                    disabled={!activeStoreId}
                >
                    {t('compass.addSpace', 'Add Space')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.navigation.spaces').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('compass.spaceType', 'Type')}</TableCell>
                            <TableCell>{t('compass.dashboard.building', 'Building')}</TableCell>
                            <TableCell>{t('compass.dashboard.floor', 'Floor')}</TableCell>
                            <TableCell>{t('common.mode', 'Mode')}</TableCell>
                            <TableCell>{t('compass.dashboard.assignee', 'Assignee')}</TableCell>
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
                            filtered.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {s.compassSpaceType
                                            ? <Chip label={t(`compass.spaceTypes.${s.compassSpaceType}`)} size="small" variant="outlined" />
                                            : '—'}
                                    </TableCell>
                                    <TableCell>{s.building?.name || '—'}</TableCell>
                                    <TableCell>{s.floor?.name || '—'}</TableCell>
                                    <TableCell>
                                        <TextField
                                            select
                                            size="small"
                                            value={s.compassMode || ''}
                                            onChange={(e) => handleModeChange(s.id, e.target.value as SpaceMode)}
                                            disabled={updatingSpaceId === s.id}
                                            sx={{ minWidth: 130 }}
                                            slotProps={{
                                                input: {
                                                    endAdornment: updatingSpaceId === s.id ? <CircularProgress size={16} sx={{ mr: 2 }} /> : undefined,
                                                },
                                            }}
                                        >
                                            <MenuItem value="AVAILABLE">{t('compass.spaceMode.AVAILABLE')}</MenuItem>
                                            <MenuItem value="PERMANENT">{t('compass.spaceMode.PERMANENT')}</MenuItem>
                                            <MenuItem value="MAINTENANCE">{t('compass.spaceMode.MAINTENANCE')}</MenuItem>
                                            <MenuItem value="EXCLUDED">{t('compass.spaceMode.EXCLUDED')}</MenuItem>
                                        </TextField>
                                    </TableCell>
                                    <TableCell>
                                        {s.permanentAssignee?.displayName || '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => openEdit(s)} aria-label={t('common.edit', 'Edit')}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Space Dialog */}
            <Dialog open={addOpen} onClose={() => { setAddOpen(false); setNewSpaceName(''); setNewSpaceId(''); }} maxWidth="xs" fullWidth>
                <DialogTitle>{t('compass.addSpace', 'Add Space')}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label={t('common.name', 'Name')}
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label={t('common.id', 'ID')}
                            value={newSpaceId}
                            onChange={(e) => setNewSpaceId(e.target.value)}
                            helperText={t('compass.spaceIdHelper', 'Leave empty to auto-generate from name')}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setAddOpen(false); setNewSpaceName(''); setNewSpaceId(''); }}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleAddSpace} disabled={!newSpaceName.trim()}>
                        {t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Space Properties Dialog */}
            <Dialog open={!!editSpace} onClose={() => setEditSpace(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.editSpace', 'Edit Space')} — {editSpace?.name}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            select
                            label={t('compass.spaceType', 'Type')}
                            value={editForm.compassSpaceType}
                            onChange={(e) => setEditForm(prev => ({ ...prev, compassSpaceType: e.target.value }))}
                        >
                            <MenuItem value=""><em>{t('common.none', 'None')}</em></MenuItem>
                            {SPACE_TYPES.map(st => (
                                <MenuItem key={st} value={st}>{t(`compass.spaceTypes.${st}`)}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            type="number"
                            label={t('compass.capacity', 'Capacity')}
                            value={editForm.compassCapacity}
                            onChange={(e) => setEditForm(prev => ({ ...prev, compassCapacity: e.target.value }))}
                            slotProps={{ htmlInput: { min: 1, max: 999 } }}
                        />
                        <TextField
                            fullWidth
                            select
                            label={t('compass.dashboard.building', 'Building')}
                            value={editForm.buildingId}
                            onChange={(e) => setEditForm(prev => ({
                                ...prev,
                                buildingId: e.target.value,
                                floorId: '',
                                neighborhoodId: '',
                            }))}
                        >
                            <MenuItem value=""><em>{t('common.none', 'None')}</em></MenuItem>
                            {[...new Map(floors.map(f => [f.buildingId, f.buildingName])).entries()].map(([id, name]) => (
                                <MenuItem key={id} value={id}>{name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            select
                            label={t('compass.dashboard.floor', 'Floor')}
                            value={editForm.floorId}
                            onChange={(e) => setEditForm(prev => ({ ...prev, floorId: e.target.value, neighborhoodId: '' }))}
                            disabled={!editForm.buildingId}
                        >
                            <MenuItem value=""><em>{t('common.none', 'None')}</em></MenuItem>
                            {availableFloors.map(f => (
                                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                        </TextField>
                        {neighborhoods.length > 0 && (
                            <TextField
                                fullWidth
                                select
                                label={t('compass.neighborhoods.title', 'Neighborhood')}
                                value={editForm.neighborhoodId}
                                onChange={(e) => setEditForm(prev => ({ ...prev, neighborhoodId: e.target.value }))}
                            >
                                <MenuItem value=""><em>{t('common.none', 'None')}</em></MenuItem>
                                {neighborhoods.map(n => (
                                    <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditSpace(null)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : t('common.save', 'Save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
