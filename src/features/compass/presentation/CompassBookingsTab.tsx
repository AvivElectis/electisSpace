import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Booking, BookingStatus } from '../domain/types';

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
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const fetchBookings = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const res = await compassAdminApi.listBookings(activeCompanyId, params);
            setBookings(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId, statusFilter]);

    useEffect(() => { fetchBookings(true); }, [fetchBookings]);

    const handleCancel = async (bookingId: string) => {
        if (!activeCompanyId) return;
        setCancelling(true);
        try {
            await compassAdminApi.cancelBooking(activeCompanyId, bookingId);
            fetchBookings();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setCancelling(false);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

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
                    <MenuItem value="all">{t('common.all')}</MenuItem>
                    <MenuItem value="BOOKED">{t('compass.bookingStatus.BOOKED')}</MenuItem>
                    <MenuItem value="CHECKED_IN">{t('compass.bookingStatus.CHECKED_IN')}</MenuItem>
                    <MenuItem value="RELEASED">{t('compass.bookingStatus.RELEASED')}</MenuItem>
                    <MenuItem value="AUTO_RELEASED">{t('compass.bookingStatus.AUTO_RELEASED')}</MenuItem>
                    <MenuItem value="CANCELLED">{t('compass.bookingStatus.CANCELLED')}</MenuItem>
                    <MenuItem value="NO_SHOW">{t('compass.bookingStatus.NO_SHOW')}</MenuItem>
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
                                            label={t(`compass.bookingStatus.${b.status}`, b.status.replace('_', ' '))}
                                            size="small"
                                            color={statusColors[b.status] || 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {(b.status === 'BOOKED' || b.status === 'CHECKED_IN') && (
                                            <IconButton size="small" color="error" onClick={() => setConfirmCancel(b.id)} aria-label={t('compass.cancelBooking')}>
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

            {/* Confirmation dialog for cancelling a booking */}
            <Dialog open={!!confirmCancel} onClose={() => setConfirmCancel(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.confirmCancel')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmCancel(null)}>{t('common.cancel')}</Button>
                    <Button
                        color="error"
                        disabled={cancelling}
                        onClick={async () => {
                            if (confirmCancel) await handleCancel(confirmCancel);
                            setConfirmCancel(null);
                        }}
                    >
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
