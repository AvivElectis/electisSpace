import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, Button,
    FormControlLabel, Checkbox, Autocomplete,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Booking, BookingStatus, CompassSpace, Employee } from '../domain/types';

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
    const { activeCompanyId, activeStoreId } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    // Reserve dialog state
    const [reserveOpen, setReserveOpen] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [spaces, setSpaces] = useState<CompassSpace[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedSpace, setSelectedSpace] = useState<CompassSpace | null>(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [untilCancellation, setUntilCancellation] = useState(false);
    const [reserveNotes, setReserveNotes] = useState('');
    const [reserving, setReserving] = useState(false);

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

    const handleOpenReserve = async () => {
        if (!activeCompanyId || !activeStoreId) return;
        setReserveOpen(true);
        // Set default start time to now (rounded to nearest 15 min)
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        setStartTime(now.toISOString().slice(0, 16));
        // Fetch employees and spaces for the dropdowns
        try {
            const [empRes, spaceRes] = await Promise.all([
                compassAdminApi.listEmployees(activeCompanyId),
                compassAdminApi.listSpaces(activeStoreId),
            ]);
            setEmployees((empRes.data.data || []).filter(e => e.isActive));
            setSpaces((spaceRes.data.data || []).filter(s => s.compassMode === 'AVAILABLE'));
        } catch {
            setError(t('errors.loadFailed'));
        }
    };

    const handleCloseReserve = () => {
        setReserveOpen(false);
        setSelectedEmployee(null);
        setSelectedSpace(null);
        setStartTime('');
        setEndTime('');
        setUntilCancellation(false);
        setReserveNotes('');
    };

    const handleReserve = async () => {
        if (!activeCompanyId || !activeStoreId || !selectedEmployee || !selectedSpace || !startTime) return;
        setReserving(true);
        try {
            await compassAdminApi.createBooking(activeCompanyId, {
                companyUserId: selectedEmployee.id,
                branchId: activeStoreId,
                spaceId: selectedSpace.id,
                startTime: new Date(startTime).toISOString(),
                endTime: untilCancellation ? null : (endTime ? new Date(endTime).toISOString() : null),
                notes: reserveNotes.trim() || undefined,
            });
            handleCloseReserve();
            fetchBookings();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setReserving(false);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const canReserve = selectedEmployee && selectedSpace && startTime && (untilCancellation || endTime);

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" gap={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
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
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleOpenReserve}
                    disabled={!activeStoreId}
                >
                    {t('compass.reserveSpace')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {bookings.length} {t('compass.navigation.bookings').toLowerCase()}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('compass.navigation.employees')}</TableCell>
                            <TableCell>{t('compass.navigation.spaces')}</TableCell>
                            <TableCell>{t('compass.dashboard.start', 'Start')}</TableCell>
                            <TableCell>{t('compass.dashboard.end', 'End')}</TableCell>
                            <TableCell>{t('common.status.title', 'Status')}</TableCell>
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
                                    <TableCell>{b.endTime ? formatTime(b.endTime) : t('compass.untilCancellation')}</TableCell>
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

            {/* Reserve Space Dialog */}
            <Dialog open={reserveOpen} onClose={handleCloseReserve} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.reserveSpace')}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <Autocomplete
                            options={employees}
                            getOptionLabel={(e) => `${e.displayName} (${e.email})`}
                            value={selectedEmployee}
                            onChange={(_, v) => setSelectedEmployee(v)}
                            renderInput={(params) => (
                                <TextField {...params} label={t('compass.navigation.employees')} />
                            )}
                        />
                        <Autocomplete
                            options={spaces}
                            getOptionLabel={(s) => s.name}
                            value={selectedSpace}
                            onChange={(_, v) => setSelectedSpace(v)}
                            renderInput={(params) => (
                                <TextField {...params} label={t('compass.navigation.spaces')} />
                            )}
                        />
                        <TextField
                            label={t('compass.dashboard.start', 'Start')}
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={untilCancellation}
                                    onChange={(e) => setUntilCancellation(e.target.checked)}
                                />
                            }
                            label={t('compass.untilCancellation')}
                        />
                        {!untilCancellation && (
                            <TextField
                                label={t('compass.dashboard.end', 'End')}
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        )}
                        <TextField
                            label={t('common.notes', 'Notes')}
                            value={reserveNotes}
                            onChange={(e) => setReserveNotes(e.target.value)}
                            multiline
                            rows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReserve}>{t('common.cancel')}</Button>
                    <Button
                        variant="contained"
                        onClick={handleReserve}
                        disabled={!canReserve || reserving}
                    >
                        {t('compass.reserveSpace')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
