import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Stack,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SearchIcon from '@mui/icons-material/Search';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';
import { useBookingStore } from '../application/useBookingStore';

export function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useCompassAuthStore((s) => s.user);
    const { activeBooking, fetchActiveBooking, checkIn, release } = useBookingStore();

    const [releaseConfirm, setReleaseConfirm] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        fetchActiveBooking();
    }, [fetchActiveBooking]);

    const handleCheckIn = async () => {
        if (!activeBooking) return;
        const ok = await checkIn(activeBooking.id);
        if (ok) setSuccessMsg(t('booking.checkInSuccess'));
    };

    const handleRelease = async () => {
        if (!activeBooking) return;
        const ok = await release(activeBooking.id);
        if (ok) {
            setReleaseConfirm(false);
            setSuccessMsg(t('booking.releaseSuccess'));
        }
    };

    const isBooked = activeBooking?.status === 'BOOKED';
    const isCheckedIn = activeBooking?.status === 'CHECKED_IN';

    return (
        <Box sx={{ p: 2, pb: 10 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                {t('home.greeting', { name: user?.displayName ?? '' })}
            </Typography>

            {/* Active booking card or empty state */}
            {activeBooking ? (
                <Card
                    variant="outlined"
                    sx={{
                        mb: 2,
                        borderColor: isCheckedIn ? 'success.main' : 'primary.main',
                        borderWidth: 2,
                    }}
                >
                    <CardContent>
                        <Typography variant="overline" color="text.secondary">
                            {t('home.activeBooking')}
                        </Typography>

                        <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                            {activeBooking.space?.displayName ?? activeBooking.spaceId}
                        </Typography>

                        {activeBooking.space && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {[activeBooking.space.buildingName, activeBooking.space.floorName]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Typography>
                            </Box>
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {new Date(activeBooking.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                            {' — '}
                            {new Date(activeBooking.endTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Typography>

                        {isCheckedIn && activeBooking.checkedInAt && (
                            <Typography variant="caption" sx={{ color: 'success.main', display: 'block', mt: 0.5 }}>
                                {t('booking.checkedInAt', {
                                    time: new Date(activeBooking.checkedInAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }),
                                })}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                            {isBooked && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="medium"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={handleCheckIn}
                                >
                                    {t('booking.checkIn')}
                                </Button>
                            )}
                            {isCheckedIn && (
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    startIcon={<LockOpenIcon />}
                                    onClick={() => setReleaseConfirm(true)}
                                >
                                    {t('booking.release')}
                                </Button>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            ) : (
                <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <EventSeatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            {t('home.noActiveBooking')}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/find')}
                            sx={{ mt: 1 }}
                        >
                            {t('home.findSpace')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Quick actions */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('home.quickActions')}
            </Typography>
            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SearchIcon />}
                    onClick={() => navigate('/find')}
                >
                    {t('home.bookSpace')}
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ListAltIcon />}
                    onClick={() => navigate('/bookings')}
                >
                    {t('home.myBookings')}
                </Button>
            </Stack>

            {/* Release confirmation dialog */}
            <Dialog open={releaseConfirm} onClose={() => setReleaseConfirm(false)}>
                <DialogTitle>{t('booking.releaseTitle')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('booking.releaseConfirm')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReleaseConfirm(false)} color="inherit">
                        {t('booking.no')}
                    </Button>
                    <Button variant="contained" onClick={handleRelease}>
                        {t('booking.yes')}
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
