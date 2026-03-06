import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, TextField, MenuItem,
    Stack, CircularProgress, Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { CompassSpace } from '../domain/types';

const modeColors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
    AVAILABLE: 'success',
    PERMANENT: 'info',
    MAINTENANCE: 'warning',
    EXCLUDED: 'default',
};

export function CompassSpacesTab() {
    const { t } = useTranslation();
    const { activeStoreId } = useAuthStore();
    const [spaces, setSpaces] = useState<CompassSpace[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [updatingSpaceId, setUpdatingSpaceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modeFilter, setModeFilter] = useState<string>('all');

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

    const handleModeChange = async (spaceId: string, mode: string) => {
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

    const filtered = modeFilter === 'all'
        ? spaces
        : spaces.filter(s => s.compassMode === modeFilter);

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {filtered.length} {t('compass.navigation.spaces').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('compass.dashboard.building', 'Building')}</TableCell>
                            <TableCell>{t('compass.dashboard.floor', 'Floor')}</TableCell>
                            <TableCell>{t('common.mode', 'Mode')}</TableCell>
                            <TableCell>{t('compass.dashboard.assignee', 'Assignee')}</TableCell>
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
                            filtered.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                                    </TableCell>
                                    <TableCell>{s.building?.name || '—'}</TableCell>
                                    <TableCell>{s.floor?.name || '—'}</TableCell>
                                    <TableCell>
                                        <TextField
                                            select
                                            size="small"
                                            value={s.compassMode || ''}
                                            onChange={(e) => handleModeChange(s.id, e.target.value)}
                                            disabled={updatingSpaceId === s.id}
                                            sx={{ minWidth: 130 }}
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
