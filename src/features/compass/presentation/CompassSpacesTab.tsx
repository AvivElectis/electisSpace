import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, TextField, MenuItem,
    Stack, CircularProgress, Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import api from '@shared/infrastructure/services/apiClient';

interface CompassSpace {
    id: string;
    name: string;
    type: string;
    compassMode: string | null;
    building?: { name: string } | null;
    floor?: { name: string } | null;
    area?: { name: string } | null;
    permanentAssignee?: { displayName: string } | null;
}

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modeFilter, setModeFilter] = useState<string>('all');

    const fetchSpaces = useCallback(async () => {
        if (!activeStoreId) return;
        setLoading(true);
        try {
            const res = await api.get(`/v2/admin/compass/spaces/${activeStoreId}`);
            setSpaces(res.data.data || []);
            setError(null);
        } catch {
            setError('Failed to load spaces');
        } finally {
            setLoading(false);
        }
    }, [activeStoreId]);

    useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

    const handleModeChange = async (spaceId: string, mode: string) => {
        try {
            await api.put(`/v2/admin/compass/spaces/${spaceId}/mode`, { mode });
            fetchSpaces();
        } catch {
            setError('Failed to update space mode');
        }
    };

    const filtered = modeFilter === 'all'
        ? spaces
        : spaces.filter(s => s.compassMode === modeFilter);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

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
                    <MenuItem value="all">{t('common.all', 'All')}</MenuItem>
                    <MenuItem value="AVAILABLE">Available</MenuItem>
                    <MenuItem value="PERMANENT">Permanent</MenuItem>
                    <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                    <MenuItem value="EXCLUDED">Excluded</MenuItem>
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
                                            sx={{ minWidth: 130 }}
                                        >
                                            <MenuItem value="AVAILABLE">Available</MenuItem>
                                            <MenuItem value="PERMANENT">Permanent</MenuItem>
                                            <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                                            <MenuItem value="EXCLUDED">Excluded</MenuItem>
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
