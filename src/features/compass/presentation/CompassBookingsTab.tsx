import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, Button,
    FormControlLabel, Checkbox, Autocomplete, Tooltip,
    RadioGroup, Radio, TablePagination,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { Booking, CompassSpace, Employee, PaginationInfo } from '../domain/types';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
    BOOKED: 'info',
    CHECKED_IN: 'success',
    RELEASED: 'default',
    AUTO_RELEASED: 'default',
    CANCELLED: 'error',
    NO_SHOW: 'warning',
};

type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';
type CancelScope = 'instance' | 'future' | 'all';

function buildRRule(type: RecurrenceType, endDate: string): string | undefined {
    if (type === 'none' || !endDate) return undefined;
    const until = endDate.replace(/-/g, '') + 'T235959Z';
    switch (type) {
        case 'daily':
            return `FREQ=DAILY;UNTIL=${until}`;
        case 'weekdays':
            return `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${until}`;
        case 'weekly':
            return `FREQ=WEEKLY;UNTIL=${until}`;
        default:
            return undefined;
    }
}

export function CompassBookingsTab() {
    const { t } = useTranslation();
    const { activeCompanyId, activeStoreId } = useAuthStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [page, setPage] = useState(1);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
    const [cancelScope, setCancelScope] = useState<CancelScope>('instance');
    const [cancelling, setCancelling] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    // Edit dialog state
    const [editBooking, setEditBooking] = useState<Booking | null>(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editUntilCancellation, setEditUntilCancellation] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleOpenEdit = (booking: Booking) => {
        setEditBooking(booking);
        setEditStartTime(new Date(booking.startTime).toISOString().slice(0, 16));
        setEditEndTime(booking.endTime ? new Date(booking.endTime).toISOString().slice(0, 16) : '');
        setEditUntilCancellation(!booking.endTime);
        setEditNotes(booking.notes || '');
    };

    const handleCloseEdit = () => {
        setEditBooking(null);
        setEditStartTime('');
        setEditEndTime('');
        setEditUntilCancellation(false);
        setEditNotes('');
    };

    const handleSaveEdit = async () => {
        if (!activeCompanyId || !editBooking) return;
        setSaving(true);
        try {
            await compassAdminApi.updateBooking(activeCompanyId, editBooking.id, {
                startTime: new Date(editStartTime).toISOString(),
                endTime: editUntilCancellation ? null : (editEndTime ? new Date(editEndTime).toISOString() : null),
                notes: editNotes.trim() || null,
            });
            handleCloseEdit();
            fetchBookings();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const fetchBookings = useCallback(async (showLoading = false, targetPage = page) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const params: Record<string, string | number> = { page: targetPage, pageSize: 50 };
            if (statusFilter !== 'all') params.status = statusFilter;
            const res = await compassAdminApi.listBookings(activeCompanyId, params as any);
            setBookings(res.data.data || []);
            setPagination(res.data.pagination || null);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId, statusFilter, page]);

    useEffect(() => { fetchBookings(true); }, [fetchBookings]);

    const handleCancel = async (booking: Booking, scope?: CancelScope) => {
        if (!activeCompanyId) return;
        setCancelling(true);
        try {
            const effectiveScope = booking.recurrenceGroupId ? scope : undefined;
            await compassAdminApi.cancelBooking(activeCompanyId, booking.id, effectiveScope);
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
        setRecurrenceType('none');
        setRecurrenceEndDate('');
    };

    const handleReserve = async () => {
        if (!activeCompanyId || !activeStoreId || !selectedEmployee || !selectedSpace || !startTime) return;
        setReserving(true);
        try {
            const rrule = buildRRule(recurrenceType, recurrenceEndDate);
            await compassAdminApi.createBooking(activeCompanyId, {
                companyUserId: selectedEmployee.id,
                branchId: activeStoreId,
                spaceId: selectedSpace.id,
                startTime: new Date(startTime).toISOString(),
                endTime: untilCancellation ? null : (endTime ? new Date(endTime).toISOString() : null),
                notes: reserveNotes.trim() || undefined,
                recurrenceRule: rrule,
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

    const canReserve = selectedEmployee && selectedSpace && startTime && (untilCancellation || endTime)
        && (recurrenceType === 'none' || recurrenceEndDate);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectableBookings = bookings.filter(b => b.status === 'BOOKED' || b.status === 'CHECKED_IN');
    const allSelected = selectableBookings.length > 0 && selectableBookings.every(b => selectedIds.has(b.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableBookings.map(b => b.id)));
        }
    };

    const handleBulkCancel = async () => {
        if (!activeCompanyId || selectedIds.size === 0) return;
        setCancelling(true);
        try {
            await compassAdminApi.bulkCancelBookings(activeCompanyId, [...selectedIds]);
            setSelectedIds(new Set());
            fetchBookings();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setCancelling(false);
        }
    };

    const handleOpenCancelDialog = (booking: Booking) => {
        setConfirmCancel(booking);
        setCancelScope('instance');
    };

    const handleCloseCancelDialog = () => {
        setConfirmCancel(null);
        setCancelScope('instance');
    };

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
                {selectedIds.size > 0 && (
                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={handleBulkCancel}
                        disabled={cancelling}
                    >
                        {t('compass.bulkCancel', 'Cancel Selected')} ({selectedIds.size})
                    </Button>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {pagination ? `${pagination.total} ${t('compass.navigation.bookings').toLowerCase()}` : `${bookings.length} ${t('compass.navigation.bookings').toLowerCase()}`}
                </Typography>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allSelected}
                                    indeterminate={selectedIds.size > 0 && !allSelected}
                                    onChange={toggleSelectAll}
                                />
                            </TableCell>
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
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            bookings.map((b) => (
                                <TableRow key={b.id} hover selected={selectedIds.has(b.id)}>
                                    <TableCell padding="checkbox">
                                        {(b.status === 'BOOKED' || b.status === 'CHECKED_IN') ? (
                                            <Checkbox
                                                size="small"
                                                checked={selectedIds.has(b.id)}
                                                onChange={() => toggleSelect(b.id)}
                                            />
                                        ) : null}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{b.companyUser.displayName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{b.companyUser.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {b.space?.name || '\u2014'}
                                            {b.isRecurrence && (
                                                <Tooltip title={t('compass.recurrence.partOfSeries')}>
                                                    <RepeatIcon fontSize="small" sx={{ ml: 0.5 }} color="action" />
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
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
                                        {b.status === 'BOOKED' && (
                                            <IconButton size="small" onClick={() => handleOpenEdit(b)} aria-label={t('common.edit')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                        {(b.status === 'BOOKED' || b.status === 'CHECKED_IN') && (
                                            <IconButton size="small" color="error" onClick={() => handleOpenCancelDialog(b)} aria-label={t('compass.cancelBooking')}>
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

            {pagination && pagination.totalPages > 1 && (
                <TablePagination
                    component="div"
                    count={pagination.total}
                    page={pagination.page - 1}
                    onPageChange={(_, newPage) => {
                        setPage(newPage + 1);
                        fetchBookings(false, newPage + 1);
                    }}
                    rowsPerPage={pagination.pageSize}
                    rowsPerPageOptions={[50]}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            )}

            {/* Confirmation dialog for cancelling a booking */}
            <Dialog open={!!confirmCancel} onClose={handleCloseCancelDialog}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.confirmCancel')}</DialogContentText>
                    {confirmCancel?.recurrenceGroupId && (
                        <RadioGroup
                            value={cancelScope}
                            onChange={(e) => setCancelScope(e.target.value as CancelScope)}
                            sx={{ mt: 2 }}
                        >
                            <FormControlLabel
                                value="instance"
                                control={<Radio />}
                                label={t('compass.recurrence.cancelInstance')}
                            />
                            <FormControlLabel
                                value="future"
                                control={<Radio />}
                                label={t('compass.recurrence.cancelFuture')}
                            />
                            <FormControlLabel
                                value="all"
                                control={<Radio />}
                                label={t('compass.recurrence.cancelSeries')}
                            />
                        </RadioGroup>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCancelDialog}>{t('common.cancel')}</Button>
                    <Button
                        color="error"
                        disabled={cancelling}
                        onClick={async () => {
                            if (confirmCancel) await handleCancel(confirmCancel, cancelScope);
                            handleCloseCancelDialog();
                        }}
                    >
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Booking Dialog */}
            <Dialog open={!!editBooking} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.editBooking', 'Edit Booking')}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <TextField
                            label={t('compass.dashboard.start', 'Start')}
                            type="datetime-local"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editUntilCancellation}
                                    onChange={(e) => setEditUntilCancellation(e.target.checked)}
                                />
                            }
                            label={t('compass.untilCancellation')}
                        />
                        {!editUntilCancellation && (
                            <TextField
                                label={t('compass.dashboard.end', 'End')}
                                type="datetime-local"
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        )}
                        <TextField
                            label={t('common.notes', 'Notes')}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            multiline
                            rows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEdit}>{t('common.cancel')}</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={!editStartTime || (!editUntilCancellation && !editEndTime) || saving}
                    >
                        {t('common.save')}
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
                            select
                            label={t('compass.recurrence.title')}
                            value={recurrenceType}
                            onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                            fullWidth
                        >
                            <MenuItem value="none">{t('compass.recurrence.none')}</MenuItem>
                            <MenuItem value="daily">{t('compass.recurrence.daily')}</MenuItem>
                            <MenuItem value="weekdays">{t('compass.recurrence.weekdays')}</MenuItem>
                            <MenuItem value="weekly">{t('compass.recurrence.weekly')}</MenuItem>
                        </TextField>
                        {recurrenceType !== 'none' && (
                            <TextField
                                label={t('compass.recurrence.endsOn')}
                                type="date"
                                value={recurrenceEndDate}
                                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
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
