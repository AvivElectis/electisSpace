import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, MenuItem, IconButton,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { CompassSpace, CompassSpaceType, SpaceMode, Amenity, Employee } from '../domain/types';

const SPACE_TYPES: CompassSpaceType[] = [
    'DESK', 'OFFICE', 'MEETING_ROOM', 'PHONE_BOOTH',
    'COLLABORATION_ZONE', 'PARKING', 'LOCKER', 'EVENT_SPACE',
];

interface FloorOption {
    id: string;
    name: string;
    buildingId: string;
    buildingName: string;
    areas: { id: string; name: string }[];
}

interface SpaceForm {
    externalId: string;
    displayName: string;
    compassSpaceType: string;
    compassMode: string;
    permanentAssigneeId: string;
    compassCapacity: string;
    minCapacity: string;
    maxCapacity: string;
    buildingId: string;
    floorId: string;
    areaId: string;
    neighborhoodId: string;
    amenityIds: string[];
    sortOrder: string;
}

const emptyForm: SpaceForm = {
    externalId: '',
    displayName: '',
    compassSpaceType: '',
    compassMode: 'AVAILABLE',
    permanentAssigneeId: '',
    compassCapacity: '',
    minCapacity: '',
    maxCapacity: '',
    buildingId: '',
    floorId: '',
    areaId: '',
    neighborhoodId: '',
    amenityIds: [],
    sortOrder: '0',
};

export function CompassSpacesTab() {
    const { t } = useTranslation();
    const { activeStoreId, activeCompanyId } = useAuthStore();
    const [spaces, setSpaces] = useState<CompassSpace[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [updatingSpaceId, setUpdatingSpaceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modeFilter, setModeFilter] = useState<string>('all');

    // Unified dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
    const [form, setForm] = useState<SpaceForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof SpaceForm, string>>>({});

    // Reference data
    const [floors, setFloors] = useState<FloorOption[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

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

    // Load buildings/floors for dialog
    useEffect(() => {
        if (!activeCompanyId) return;
        const load = async () => {
            try {
                const res = await compassAdminApi.listBuildings(activeCompanyId);
                const opts: FloorOption[] = [];
                for (const b of res.data.data || []) {
                    for (const f of b.floors || []) {
                        opts.push({
                            id: f.id,
                            name: f.name,
                            buildingId: b.id,
                            buildingName: b.name,
                            areas: (f as any).areas || [],
                        });
                    }
                }
                setFloors(opts);
            } catch { /* non-critical */ }
        };
        load();
    }, [activeCompanyId]);

    // Load amenities and employees for dialog
    useEffect(() => {
        if (!activeCompanyId) return;
        const load = async () => {
            try {
                const [amenRes, empRes] = await Promise.all([
                    compassAdminApi.listAmenities(activeCompanyId),
                    compassAdminApi.listEmployees(activeCompanyId, { pageSize: 1000 }),
                ]);
                setAmenities((amenRes.data.data || []).filter((a) => a.isActive));
                setEmployees((empRes.data.data || []).filter((e) => e.isActive));
            } catch { /* non-critical */ }
        };
        load();
    }, [activeCompanyId]);

    // Load neighborhoods when floor changes in form
    useEffect(() => {
        if (!form.floorId || !activeCompanyId) { setNeighborhoods([]); return; }
        let cancelled = false;
        const load = async () => {
            try {
                const res = await compassAdminApi.listNeighborhoods(activeCompanyId, form.floorId);
                if (!cancelled) {
                    setNeighborhoods((res.data.data || []).map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })));
                }
            } catch { if (!cancelled) setNeighborhoods([]); }
        };
        load();
        return () => { cancelled = true; };
    }, [form.floorId, activeCompanyId]);

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

    // Dialog handlers
    const openAddDialog = () => {
        setForm(emptyForm);
        setFormErrors({});
        setDialogMode('add');
        setEditingSpaceId(null);
        setDialogOpen(true);
    };

    const openEditDialog = (space: CompassSpace) => {
        const floorOpt = floors.find(f => f.id === space.floorId);
        setForm({
            externalId: space.type || '',
            displayName: space.name || '',
            compassSpaceType: space.compassSpaceType || '',
            compassMode: space.compassMode || 'AVAILABLE',
            permanentAssigneeId: space.permanentAssignee?.id || '',
            compassCapacity: space.compassCapacity?.toString() || '',
            minCapacity: space.minCapacity?.toString() || '',
            maxCapacity: space.maxCapacity?.toString() || '',
            buildingId: floorOpt?.buildingId || space.buildingId || '',
            floorId: space.floorId || '',
            areaId: space.areaId || '',
            neighborhoodId: space.neighborhoodId || '',
            amenityIds: space.structuredAmenities?.map(sa => sa.amenity.id) || [],
            sortOrder: space.sortOrder?.toString() || '0',
        });
        setFormErrors({});
        setDialogMode('edit');
        setEditingSpaceId(space.id);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingSpaceId(null);
    };

    const updateForm = (field: keyof SpaceForm, value: string | string[]) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'buildingId') {
                updated.floorId = '';
                updated.areaId = '';
                updated.neighborhoodId = '';
            }
            if (field === 'floorId') {
                updated.areaId = '';
                updated.neighborhoodId = '';
            }
            if (field === 'compassMode' && value !== 'PERMANENT') {
                updated.permanentAssigneeId = '';
            }
            return updated;
        });
        // Live uniqueness check for externalId in add mode
        if (field === 'externalId' && dialogMode === 'add' && typeof value === 'string') {
            const trimmed = value.trim();
            const duplicate = trimmed && spaces.some(s => s.type === trimmed);
            setFormErrors(prev => ({
                ...prev,
                externalId: duplicate ? t('compass.spaceDialog.idExists') : undefined,
            }));
        } else if (formErrors[field as keyof SpaceForm]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof SpaceForm, string>> = {};
        if (!form.externalId.trim()) {
            errors.externalId = t('compass.spaceDialog.required');
        } else if (dialogMode === 'add' && spaces.some(s => s.type === form.externalId.trim())) {
            errors.externalId = t('compass.spaceDialog.idExists');
        }
        if (!form.compassSpaceType) errors.compassSpaceType = t('compass.spaceDialog.required');
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const displayName = form.displayName.trim() || form.externalId.trim();

            if (dialogMode === 'add') {
                const externalId = form.externalId.trim();
                const createRes = await compassAdminApi.createSpace(activeStoreId!, {
                    externalId,
                    data: { ITEM_NAME: displayName },
                });
                const newSpaceId = (createRes.data as any).data?.id || (createRes.data as any).id;
                if (newSpaceId) {
                    await compassAdminApi.updateSpaceProperties(newSpaceId, {
                        compassSpaceType: (form.compassSpaceType as CompassSpaceType) || null,
                        compassCapacity: form.compassCapacity ? parseInt(form.compassCapacity, 10) : null,
                        minCapacity: form.minCapacity ? parseInt(form.minCapacity, 10) : null,
                        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity, 10) : null,
                        buildingId: form.buildingId || null,
                        floorId: form.floorId || null,
                        areaId: form.areaId || null,
                        neighborhoodId: form.neighborhoodId || null,
                        permanentAssigneeId: form.permanentAssigneeId || null,
                        amenityIds: form.amenityIds,
                        sortOrder: parseInt(form.sortOrder, 10) || 0,
                    });
                    if (form.compassMode && form.compassMode !== 'AVAILABLE') {
                        await compassAdminApi.updateSpaceMode(
                            newSpaceId,
                            form.compassMode as SpaceMode,
                            form.compassMode === 'PERMANENT' ? form.permanentAssigneeId || undefined : undefined,
                        );
                    }
                }
            } else if (editingSpaceId) {
                await compassAdminApi.updateSpaceProperties(editingSpaceId, {
                    compassSpaceType: (form.compassSpaceType as CompassSpaceType) || null,
                    compassCapacity: form.compassCapacity ? parseInt(form.compassCapacity, 10) : null,
                    minCapacity: form.minCapacity ? parseInt(form.minCapacity, 10) : null,
                    maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity, 10) : null,
                    buildingId: form.buildingId || null,
                    floorId: form.floorId || null,
                    areaId: form.areaId || null,
                    neighborhoodId: form.neighborhoodId || null,
                    permanentAssigneeId: form.permanentAssigneeId || null,
                    amenityIds: form.amenityIds,
                    sortOrder: parseInt(form.sortOrder, 10) || 0,
                });
                await compassAdminApi.updateSpaceMode(
                    editingSpaceId,
                    (form.compassMode as SpaceMode) || 'AVAILABLE',
                    form.compassMode === 'PERMANENT' ? form.permanentAssigneeId || undefined : undefined,
                );
            }

            closeDialog();
            fetchSpaces();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    // Derived values for location cascade
    const availableFloors = form.buildingId
        ? floors.filter(f => f.buildingId === form.buildingId)
        : floors;

    const selectedFloor = floors.find(f => f.id === form.floorId);
    const availableAreas = selectedFloor?.areas ?? [];

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
                    onClick={openAddDialog}
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
                                        <IconButton size="small" onClick={() => openEditDialog(s)} aria-label={t('common.edit', 'Edit')}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Unified Space Dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {dialogMode === 'add'
                        ? t('compass.spaceDialog.addTitle')
                        : t('compass.spaceDialog.editTitle')}
                </DialogTitle>
                <DialogContent>
                    <Stack gap={2.5} sx={{ mt: 1 }}>
                        {/* Section 1: Identity */}
                        <Stack direction="row" gap={2}>
                            <TextField
                                fullWidth
                                required
                                label={t('compass.spaceDialog.spaceNumber')}
                                value={form.externalId}
                                onChange={(e) => updateForm('externalId', e.target.value)}
                                error={!!formErrors.externalId}
                                helperText={formErrors.externalId || t('compass.spaceDialog.spaceNumberHelper')}
                                disabled={dialogMode === 'edit'}
                            />
                            <TextField
                                fullWidth
                                label={t('compass.spaceDialog.displayName')}
                                value={form.displayName}
                                onChange={(e) => updateForm('displayName', e.target.value)}
                                helperText={t('compass.spaceDialog.displayNameHelper')}
                            />
                        </Stack>

                        {/* Section 2: Classification */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('compass.spaceDialog.classification')}
                        </Typography>
                        <Stack direction="row" gap={2}>
                            <TextField
                                fullWidth
                                required
                                select
                                label={t('compass.spaceType', 'Type')}
                                value={form.compassSpaceType}
                                onChange={(e) => updateForm('compassSpaceType', e.target.value)}
                                error={!!formErrors.compassSpaceType}
                                helperText={formErrors.compassSpaceType}
                            >
                                {SPACE_TYPES.map(st => (
                                    <MenuItem key={st} value={st}>{t(`compass.spaceTypes.${st}`)}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                select
                                label={t('compass.spaceDialog.mode')}
                                value={form.compassMode}
                                onChange={(e) => updateForm('compassMode', e.target.value)}
                            >
                                <MenuItem value="AVAILABLE">{t('compass.spaceMode.AVAILABLE')}</MenuItem>
                                <MenuItem value="PERMANENT">{t('compass.spaceMode.PERMANENT')}</MenuItem>
                                <MenuItem value="MAINTENANCE">{t('compass.spaceMode.MAINTENANCE')}</MenuItem>
                                <MenuItem value="EXCLUDED">{t('compass.spaceMode.EXCLUDED')}</MenuItem>
                            </TextField>
                        </Stack>

                        {/* Permanent Assignee — only when mode = PERMANENT */}
                        {form.compassMode === 'PERMANENT' && (
                            <Autocomplete
                                options={employees}
                                getOptionLabel={(opt) => `${opt.displayName} (${opt.email})`}
                                value={employees.find(e => e.id === form.permanentAssigneeId) || null}
                                onChange={(_, val) => updateForm('permanentAssigneeId', val?.id || '')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={t('compass.spaceDialog.assignee')}
                                        placeholder={t('compass.spaceDialog.searchEmployee')}
                                    />
                                )}
                            />
                        )}

                        {/* Section 3: Capacity */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('compass.spaceDialog.capacitySection')}
                        </Typography>
                        <Stack direction="row" gap={2}>
                            <TextField
                                fullWidth
                                type="number"
                                label={t('compass.spaceDialog.capacity')}
                                value={form.compassCapacity}
                                onChange={(e) => updateForm('compassCapacity', e.target.value)}
                                slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                            />
                            <TextField
                                fullWidth
                                type="number"
                                label={t('compass.spaceDialog.minCapacity')}
                                value={form.minCapacity}
                                onChange={(e) => updateForm('minCapacity', e.target.value)}
                                slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                            />
                            <TextField
                                fullWidth
                                type="number"
                                label={t('compass.spaceDialog.maxCapacity')}
                                value={form.maxCapacity}
                                onChange={(e) => updateForm('maxCapacity', e.target.value)}
                                slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                            />
                        </Stack>

                        {/* Section 4: Location */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('compass.spaceDialog.location')}
                        </Typography>
                        <Stack direction="row" gap={2}>
                            <TextField
                                fullWidth
                                select
                                label={t('compass.dashboard.building')}
                                value={form.buildingId}
                                onChange={(e) => updateForm('buildingId', e.target.value)}
                            >
                                <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                                {[...new Map(floors.map(f => [f.buildingId, f.buildingName])).entries()].map(([id, name]) => (
                                    <MenuItem key={id} value={id}>{name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                select
                                label={t('compass.dashboard.floor')}
                                value={form.floorId}
                                onChange={(e) => updateForm('floorId', e.target.value)}
                                disabled={!form.buildingId}
                            >
                                <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                                {availableFloors.map(f => (
                                    <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                                ))}
                            </TextField>
                        </Stack>
                        <Stack direction="row" gap={2}>
                            {availableAreas.length > 0 && (
                                <TextField
                                    fullWidth
                                    select
                                    label={t('compass.dashboard.area')}
                                    value={form.areaId}
                                    onChange={(e) => updateForm('areaId', e.target.value)}
                                >
                                    <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                                    {availableAreas.map(a => (
                                        <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {neighborhoods.length > 0 && (
                                <TextField
                                    fullWidth
                                    select
                                    label={t('compass.neighborhoods.title')}
                                    value={form.neighborhoodId}
                                    onChange={(e) => updateForm('neighborhoodId', e.target.value)}
                                >
                                    <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                                    {neighborhoods.map(n => (
                                        <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Stack>

                        {/* Section 5: Amenities */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('compass.spaceDialog.amenitiesSection')}
                        </Typography>
                        {amenities.length > 0 ? (
                            <Autocomplete
                                multiple
                                options={amenities}
                                getOptionLabel={(opt) => opt.name}
                                value={amenities.filter(a => form.amenityIds.includes(a.id))}
                                onChange={(_, val) => updateForm('amenityIds', val.map(v => v.id))}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            {...getTagProps({ index })}
                                            key={option.id}
                                            label={option.name}
                                            size="small"
                                        />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder={t('compass.spaceDialog.selectAmenities')}
                                    />
                                )}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {t('compass.spaceDialog.noAmenities')}
                            </Typography>
                        )}

                        {/* Section 6: Sort Order */}
                        <TextField
                            fullWidth
                            type="number"
                            label={t('compass.spaceDialog.sortOrder')}
                            value={form.sortOrder}
                            onChange={(e) => updateForm('sortOrder', e.target.value)}
                            helperText={t('compass.spaceDialog.sortOrderHelper')}
                            slotProps={{ htmlInput: { min: 0 } }}
                            sx={{ maxWidth: 200 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : dialogMode === 'add' ? t('common.add') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
