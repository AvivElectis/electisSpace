import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    MenuItem, Stack, CircularProgress, Alert,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import api from '@shared/infrastructure/services/apiClient';

interface Booking {
    id: string;
    companyUser: { displayName: string; email: string };
    space: { name: string; type: string };
    startTime: string;
    endTime: string | null;
    status: string;
    checkedInAt: string | null;
    notes: string | null;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
    BOOKED: 'info',
    CHECKED_IN: 'success',
    RELEASED: 'default',
    AUTO_RELEASED: 'default',
    CANCELLED: 'error',
    NO_SHOW: 'warning',
};

export function CompassBookingsTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchBookings = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const res = await api.get(`/v2/admin/compass/bookings/${activeCompanyId}`, { params });
            setBookings(res.data.data || []);
            setError(null);
        } catch {
            setError('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, statusFilter]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleCancel = async (bookingId: string) => {
        try {
            await api.patch(`/v2/admin/compass/bookings/${activeCompanyId}/${bookingId}/cancel`);
            fetchBookings();
        } catch {
            setError('Failed to cancel booking');
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                    select
                    size="small"
                    label={t('common.filter', 'Filter')}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="all">{t('common.all', 'All')}</MenuItem>
                    <MenuItem value="BOOKED">Booked</MenuItem>
                    <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                    <MenuItem value="RELEASED">Released</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="NO_SHOW">No Show</MenuItem>
                </TextField>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('compass.navigation.employees')}</TableCell>
                            <TableCell>{t('compass.navigation.spaces')}</TableCell>
                            <TableCell>{t('compass.dashboard.start', 'Start')}</TableCell>
                            <TableCell>{t('compass.dashboard.end', 'End')}</TableCell>
                            <TableCell>{t('common.status', 'Status')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            bookings.map((b) => (
                                <TableRow key={b.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{b.companyUser.displayName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{b.companyUser.email}</Typography>
                                    </TableCell>
                                    <TableCell>{b.space?.name || '—'}</TableCell>
                                    <TableCell>{formatTime(b.startTime)}</TableCell>
                                    <TableCell>{b.endTime ? formatTime(b.endTime) : '—'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={b.status.replace('_', ' ')}
                                            size="small"
                                            color={statusColors[b.status] || 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {b.status === 'BOOKED' && (
                                            <IconButton size="small" color="error" onClick={() => handleCancel(b.id)}>
                                                <CancelIcon fontSize="small" />
                                            </IconButton>
                                        )}
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
