import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    Stack,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CancelIcon from '@mui/icons-material/Cancel';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../domain/types';

interface BookingCardProps {
    booking: Booking;
    onCheckIn?: (id: string) => void;
    onRelease?: (id: string) => void;
    onExtend?: (id: string) => void;
    onCancel?: (id: string) => void;
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return '';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow, ';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ';
}

function describeRecurrence(rrule: string | null, t: (key: string) => string): string {
    if (!rrule) return t('recurrence.partOfSeries');
    if (rrule.includes('BYDAY=MO,TU,WE,TH,FR')) return t('recurrence.weekdays');
    if (rrule.includes('FREQ=DAILY')) return t('recurrence.daily');
    if (rrule.includes('FREQ=WEEKLY')) return t('recurrence.weekly');
    return t('recurrence.partOfSeries');
}

const statusColors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
    BOOKED: 'info',
    CHECKED_IN: 'success',
    RELEASED: 'default',
    AUTO_RELEASED: 'warning',
    NO_SHOW: 'error',
    CANCELLED: 'default',
};

export function BookingCard({ booking, onCheckIn, onRelease, onExtend, onCancel }: BookingCardProps) {
    const { t } = useTranslation();
    const spaceName = booking.space?.displayName ?? booking.spaceId;
    const locationParts = [
        booking.space?.buildingName,
        booking.space?.floorName,
    ].filter(Boolean);

    const isActive = booking.status === 'CHECKED_IN';
    const isBooked = booking.status === 'BOOKED';
    const isPast = ['RELEASED', 'AUTO_RELEASED', 'NO_SHOW', 'CANCELLED'].includes(booking.status);
    const datePrefix = formatDate(booking.startTime);

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 1.5,
                borderColor: isActive ? 'success.main' : undefined,
                borderWidth: isActive ? 2 : 1,
            }}
        >
            <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {spaceName}
                    </Typography>
                    <Chip
                        label={t(`booking.status.${booking.status}`)}
                        size="small"
                        color={statusColors[booking.status]}
                        variant={isPast ? 'outlined' : 'filled'}
                    />
                </Box>

                {locationParts.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                            {locationParts.join(' · ')}
                        </Typography>
                    </Box>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {datePrefix}{formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                </Typography>

                {(booking.isRecurrence || booking.recurrenceGroupId) && (
                    <Chip
                        icon={<RepeatIcon />}
                        label={describeRecurrence(booking.recurrenceRule, t)}
                        size="small"
                        variant="outlined"
                        color="secondary"
                        sx={{ mt: 0.5 }}
                    />
                )}

                {booking.checkedInAt && (
                    <Typography variant="caption" sx={{ color: 'success.main', mt: 0.5, display: 'block' }}>
                        {t('booking.checkedInAt', {
                            time: formatTime(booking.checkedInAt),
                        })}
                    </Typography>
                )}

                {/* Action buttons */}
                {!isPast && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        {isBooked && onCheckIn && (
                            <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => onCheckIn(booking.id)}
                            >
                                {t('booking.checkIn')}
                            </Button>
                        )}
                        {isActive && onRelease && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<LockOpenIcon />}
                                onClick={() => onRelease(booking.id)}
                            >
                                {t('booking.release')}
                            </Button>
                        )}
                        {(isActive || isBooked) && onExtend && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ScheduleIcon />}
                                onClick={() => onExtend(booking.id)}
                            >
                                {t('booking.extend')}
                            </Button>
                        )}
                        {isBooked && onCancel && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => onCancel(booking.id)}
                            >
                                {t('booking.cancelBtn')}
                            </Button>
                        )}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
