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
import type { Amenity } from '../domain/types';

const AMENITY_CATEGORIES = ['EQUIPMENT', 'FURNITURE', 'ACCESSIBILITY', 'CONNECTIVITY'] as const;

export function CompassAmenitiesTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();

    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Amenity | null>(null);
    const [form, setForm] = useState({ name: '', nameHe: '', icon: '', category: 'EQUIPMENT' });
    const [confirmDelete, setConfirmDelete] = useState<Amenity | null>(null);

    const fetchAmenities = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setLoading(true);
        try {
            const res = await compassAdminApi.listAmenities(activeCompanyId);
            setAmenities(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, t]);

    useEffect(() => {
        fetchAmenities(true);
    }, [fetchAmenities]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', nameHe: '', icon: '', category: 'EQUIPMENT' });
        setDialogOpen(true);
    };

    const openEdit = (amenity: Amenity) => {
        setEditing(amenity);
        setForm({
            name: amenity.name,
            nameHe: amenity.nameHe || '',
            icon: amenity.icon || '',
            category: amenity.category,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!activeCompanyId || !form.name.trim()) return;
        try {
            const payload = {
                name: form.name.trim(),
                nameHe: form.nameHe.trim() || undefined,
                icon: form.icon.trim() || undefined,
                category: form.category,
            };
            if (editing) {
                await compassAdminApi.updateAmenity(activeCompanyId, editing.id, {
                    ...payload,
                    nameHe: form.nameHe.trim() || null,
                    icon: form.icon.trim() || null,
                });
            } else {
                await compassAdminApi.createAmenity(activeCompanyId, payload);
            }
            setDialogOpen(false);
            fetchAmenities();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const handleDelete = async () => {
        if (!activeCompanyId || !confirmDelete) return;
        try {
            await compassAdminApi.deleteAmenity(activeCompanyId, confirmDelete.id);
            setConfirmDelete(null);
            fetchAmenities();
        } catch {
            setError(t('errors.saveFailed'));
            setConfirmDelete(null);
        }
    };

    const handleToggleActive = async (amenity: Amenity) => {
        if (!activeCompanyId) return;
        try {
            await compassAdminApi.updateAmenity(activeCompanyId, amenity.id, { isActive: !amenity.isActive });
            fetchAmenities();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const filtered = search
        ? amenities.filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            (a.nameHe && a.nameHe.toLowerCase().includes(search.toLowerCase())) ||
            a.category.toLowerCase().includes(search.toLowerCase()))
        : amenities;

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
                    onClick={openAdd}
                >
                    {t('compass.amenities.addAmenity')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.amenities.title').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('compass.amenities.name')}</TableCell>
                            <TableCell>{t('compass.amenities.nameHe')}</TableCell>
                            <TableCell>{t('compass.amenities.icon')}</TableCell>
                            <TableCell>{t('compass.amenities.category')}</TableCell>
                            <TableCell>{t('common.status.title', 'Status')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('compass.amenities.noAmenities')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((amenity) => (
                                <TableRow key={amenity.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{amenity.name}</Typography>
                                    </TableCell>
                                    <TableCell>{amenity.nameHe || '—'}</TableCell>
                                    <TableCell>{amenity.icon || '—'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={t(`compass.amenities.${amenity.category}`)}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={amenity.isActive ? t('compass.amenities.active') : t('compass.amenities.inactive')}
                                            size="small"
                                            color={amenity.isActive ? 'success' : 'default'}
                                            onClick={() => handleToggleActive(amenity)}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => openEdit(amenity)} aria-label={t('compass.amenities.editAmenity')}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(amenity)} aria-label={t('common.delete', 'Delete')}>
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
                    {editing ? t('compass.amenities.editAmenity') : t('compass.amenities.addAmenity')}
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
                        label={t('compass.amenities.nameHe')}
                        value={form.nameHe}
                        onChange={(e) => setForm(prev => ({ ...prev, nameHe: e.target.value }))}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('compass.amenities.icon')}
                        value={form.icon}
                        onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                        helperText={t('compass.amenities.iconHint', 'e.g. monitor, wifi, wheelchair')}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        select
                        label={t('compass.amenities.category')}
                        value={form.category}
                        onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                        {AMENITY_CATEGORIES.map(cat => (
                            <MenuItem key={cat} value={cat}>
                                {t(`compass.amenities.${cat}`)}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleSave} disabled={!form.name.trim()}>
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
                    <Button color="error" onClick={handleDelete}>{t('common.confirm')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
