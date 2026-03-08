import { useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, TextField,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Department, Neighborhood } from '../domain/types';

export function CompassNeighborhoodsTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();

    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Neighborhood | null>(null);
    const [form, setForm] = useState({ name: '', color: '', description: '' });
    const [confirmDelete, setConfirmDelete] = useState<Neighborhood | null>(null);

    // Departments for dropdown
    const [departments, setDepartments] = useState<Department[]>([]);

    // Floor selection placeholder — full floor selector will be added when buildings/floors API is integrated
    const [selectedFloorId] = useState<string | null>(null);

    const renderColorDot = (color: string | null) => {
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

    const filtered = search
        ? neighborhoods.filter(n =>
            n.name.toLowerCase().includes(search.toLowerCase()) ||
            (n.department && n.department.name.toLowerCase().includes(search.toLowerCase())) ||
            (n.description && n.description.toLowerCase().includes(search.toLowerCase())))
        : neighborhoods;

    // Show placeholder until floor selector is available
    if (!selectedFloorId) {
        return (
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <LocationCityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    {t('compass.neighborhoods.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('compass.neighborhoods.selectFloor')}
                </Typography>
            </Box>
        );
    }

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

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
                    onClick={() => {
                        setEditing(null);
                        setForm({ name: '', color: '', description: '' });
                        setDialogOpen(true);
                    }}
                >
                    {t('compass.neighborhoods.addNeighborhood')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.neighborhoods.title').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('compass.amenities.name')}</TableCell>
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
                            filtered.map((neighborhood) => (
                                <TableRow key={neighborhood.id} hover>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center">
                                            {renderColorDot(neighborhood.color)}
                                            <Typography variant="body2" fontWeight={500}>{neighborhood.name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{neighborhood.department?.name || '—'}</TableCell>
                                    <TableCell>
                                        <Chip label={neighborhood._count.spaces} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                                            {neighborhood.description || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setEditing(neighborhood);
                                                setForm({
                                                    name: neighborhood.name,
                                                    color: neighborhood.color || '',
                                                    description: neighborhood.description || '',
                                                });
                                                setDialogOpen(true);
                                            }}
                                            aria-label={t('compass.neighborhoods.editNeighborhood')}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(neighborhood)} aria-label={t('common.delete', 'Delete')}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editing ? t('compass.neighborhoods.editNeighborhood') : t('compass.neighborhoods.addNeighborhood')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('compass.amenities.name')}
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        sx={{ mt: 1, mb: 2 }}
                    />
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
                        label={t('compass.organization.color')}
                        type="color"
                        value={form.color || '#1976d2'}
                        onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (!selectedFloorId || !form.name.trim()) return;
                            try {
                                const payload = {
                                    name: form.name.trim(),
                                    floorId: selectedFloorId,
                                    color: form.color.trim() || undefined,
                                    description: form.description.trim() || undefined,
                                };
                                if (editing) {
                                    await compassAdminApi.updateNeighborhood(editing.id, {
                                        name: payload.name,
                                        color: form.color.trim() || null,
                                        description: form.description.trim() || null,
                                    });
                                } else {
                                    await compassAdminApi.createNeighborhood(payload);
                                }
                                setDialogOpen(false);
                                // Refresh would go here when floor selector is active
                            } catch {
                                setError(t('errors.saveFailed'));
                            }
                        }}
                        disabled={!form.name.trim()}
                    >
                        {editing ? t('common.save', 'Save') : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('common.confirmDelete', 'Are you sure you want to delete "{{name}}"?', { name: confirmDelete?.name })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
                    <Button
                        color="error"
                        onClick={async () => {
                            if (!confirmDelete) return;
                            try {
                                await compassAdminApi.deleteNeighborhood(confirmDelete.id);
                                setConfirmDelete(null);
                                // Refresh would go here when floor selector is active
                            } catch {
                                setError(t('errors.saveFailed'));
                                setConfirmDelete(null);
                            }
                        }}
                    >
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
