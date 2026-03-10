import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Snackbar,
    List,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useBookingStore } from '../application/useBookingStore';
import { BookingCard } from './BookingCard';
import type { CancelScope } from '../domain/types';

export function BookingsPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0);

    const {
        activeBooking,
        upcomingBookings,
        pastBookings,
        isLoading,
        error,
        fetchActiveBooking,
        fetchBookings,
        checkIn,
        release,
        extend,
        cancel,
        clearError,
    } = useBookingStore();

    const [extendDialogId, setExtendDialogId] = useState<string | null>(null);
    const [extendTime, setExtendTime] = useState('');
    const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
    const [recurringCancelId, setRecurringCancelId] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);

    useEffect(() => {
        fetchActiveBooking();
        fetchBookings();
    }, [fetchActiveBooking, fetchBookings]);

    const handleCheckIn = async (id: string) => {
        setLoadingBookingId(id);
        const ok = await checkIn(id);
        setLoadingBookingId(null);
        if (ok) setSuccessMsg(t('booking.checkInSuccess'));
    };

    const handleRelease = async (id: string) => {
        setLoadingBookingId(id);
        const ok = await release(id);
        setLoadingBookingId(null);
        if (ok) setSuccessMsg(t('booking.releaseSuccess'));
    };

    const handleExtendConfirm = async () => {
        if (!extendDialogId || !extendTime) return;
        const booking = activeBooking?.id === extendDialogId
            ? activeBooking
            : upcomingBookings.find((b) => b.id === extendDialogId);
        if (!booking) return;

        setLoadingBookingId(extendDialogId);
        const date = (booking.endTime ?? booking.startTime).split('T')[0];
        const newEndISO = new Date(`${date}T${extendTime}:00`).toISOString();
        const ok = await extend(extendDialogId, { newEndTime: newEndISO });
        setLoadingBookingId(null);
        if (ok) {
            setExtendDialogId(null);
            setSuccessMsg(t('booking.extendSuccess'));
        }
    };

    const handleCancelConfirm = async () => {
        if (!cancelConfirmId) return;
        setLoadingBookingId(cancelConfirmId);
        const ok = await cancel(cancelConfirmId);
        setLoadingBookingId(null);
        if (ok) {
            setCancelConfirmId(null);
            setSuccessMsg(t('booking.cancelSuccess'));
        }
    };

    const handleRecurringCancel = async (scope: CancelScope) => {
        if (!recurringCancelId) return;
        setLoadingBookingId(recurringCancelId);
        const ok = await cancel(recurringCancelId, scope);
        setLoadingBookingId(null);
        if (ok) {
            setRecurringCancelId(null);
            setSuccessMsg(t('booking.cancelSuccess'));
        }
    };

    // Split active from upcoming
    const activeBookings = activeBooking ? [activeBooking] : [];
    const futureBookings = upcomingBookings.filter(
        (b) => b.status === 'BOOKED' && b.id !== activeBooking?.id,
    );

    const handleCancelRequest = (id: string) => {
        // Check if this booking is part of a recurring series
        const allBookings = [...activeBookings, ...futureBookings];
        const booking = allBookings.find((b) => b.id === id);
        if (booking?.recurrenceGroupId) {
            setRecurringCancelId(id);
        } else {
            setCancelConfirmId(id);
        }
    };

    return (
        <Box sx={{ pb: 10 }}>
            <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    {t('bookings.title')}
                </Typography>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
                <Tab label={t('bookings.upcoming')} />
                <Tab label={t('bookings.past')} />
            </Tabs>

            {error && (
                <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && tab === 0 && (
                <Box sx={{ p: 2 }}>
                    {/* Active bookings */}
                    {activeBookings.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {t('bookings.active')}
                            </Typography>
                            {activeBookings.map((b) => (
                                <BookingCard
                                    key={b.id}
                                    booking={b}
                                    isLoading={loadingBookingId === b.id}
                                    onRelease={handleRelease}
                                    onExtend={(id) => {
                                        setExtendTime('');
                                        setExtendDialogId(id);
                                    }}
                                />
                            ))}
                        </>
                    )}

                    {/* Upcoming bookings */}
                    {futureBookings.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
                                {t('bookings.upcomingSection')}
                            </Typography>
                            {futureBookings.map((b) => (
                                <BookingCard
                                    key={b.id}
                                    booking={b}
                                    isLoading={loadingBookingId === b.id}
                                    onCheckIn={handleCheckIn}
                                    onCancel={(id) => handleCancelRequest(id)}
                                />
                            ))}
                        </>
                    )}

                    {activeBookings.length === 0 && futureBookings.length === 0 && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            textAlign="center"
                            sx={{ mt: 4 }}
                        >
                            {t('bookings.noUpcoming')}
                        </Typography>
                    )}
                </Box>
            )}

            {!isLoading && tab === 1 && (
                <Box sx={{ p: 2 }}>
                    {pastBookings.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            textAlign="center"
                            sx={{ mt: 4 }}
                        >
                            {t('bookings.noPast')}
                        </Typography>
                    ) : (
                        pastBookings.map((b) => (
                            <BookingCard key={b.id} booking={b} />
                        ))
                    )}
                </Box>
            )}

            {/* Extend dialog */}
            <Dialog open={!!extendDialogId} onClose={() => setExtendDialogId(null)}>
                <DialogTitle>{t('booking.extendTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={t('booking.newEndTime')}
                        type="time"
                        fullWidth
                        value={extendTime}
                        onChange={(e) => setExtendTime(e.target.value)}
                        sx={{ mt: 1 }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExtendDialogId(null)} color="inherit">
                        {t('booking.cancel')}
                    </Button>
                    <Button variant="contained" onClick={handleExtendConfirm} disabled={!extendTime}>
                        {t('booking.extend')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel confirmation dialog */}
            <Dialog open={!!cancelConfirmId} onClose={() => setCancelConfirmId(null)}>
                <DialogTitle>{t('booking.cancelTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('booking.cancelConfirm')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelConfirmId(null)} color="inherit">
                        {t('booking.no')}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleCancelConfirm}>
                        {t('booking.yes')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Recurring cancel scope dialog */}
            <Dialog open={!!recurringCancelId} onClose={() => setRecurringCancelId(null)}>
                <DialogTitle>{t('recurrence.cancelTitle')}</DialogTitle>
                <DialogContent sx={{ px: 0, pb: 0 }}>
                    <List>
                        <ListItemButton onClick={() => handleRecurringCancel('instance')}>
                            <ListItemText primary={t('recurrence.cancelInstance')} />
                        </ListItemButton>
                        <ListItemButton onClick={() => handleRecurringCancel('future')}>
                            <ListItemText primary={t('recurrence.cancelFuture')} />
                        </ListItemButton>
                        <ListItemButton onClick={() => handleRecurringCancel('all')}>
                            <ListItemText primary={t('recurrence.cancelSeries')} />
                        </ListItemButton>
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRecurringCancelId(null)} color="inherit">
                        {t('booking.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success snackbar */}
            <Snackbar
                open={!!successMsg}
                autoHideDuration={3000}
                onClose={() => setSuccessMsg(null)}
                message={successMsg}
            />
        </Box>
    );
}
