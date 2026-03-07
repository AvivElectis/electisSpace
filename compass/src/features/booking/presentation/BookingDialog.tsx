import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Slide,
    CircularProgress,
    Alert,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBookingStore } from '../application/useBookingStore';
import type { SpaceWithAvailability } from '../domain/types';

const SlideUp = forwardRef(function SlideUp(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface BookingDialogProps {
    space: SpaceWithAvailability;
    onClose: () => void;
}

function getDefaultTimes() {
    const now = new Date();
    // Round up to next 30 minutes
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const startHour = minutes < 30 ? now.getHours() : now.getHours() + 1;

    const start = new Date(now);
    start.setHours(startHour, roundedMinutes, 0, 0);

    const end = new Date(start);
    end.setHours(start.getHours() + 8);
    // Cap at 20:00
    if (end.getHours() > 20 || (end.getHours() === 0 && end.getDate() !== start.getDate())) {
        end.setHours(20, 0, 0, 0);
        end.setDate(start.getDate());
    }

    return {
        startTime: formatTimeForInput(start),
        endTime: formatTimeForInput(end),
        date: formatDateForInput(start),
    };
}

function formatTimeForInput(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function BookingDialog({ space, onClose }: BookingDialogProps) {
    const { t } = useTranslation();
    const createBooking = useBookingStore((s) => s.createBooking);
    const storeError = useBookingStore((s) => s.error);
    const isStoreLoading = useBookingStore((s) => s.isLoading);

    const defaults = useMemo(() => getDefaultTimes(), []);
    const [date, setDate] = useState(defaults.date);
    const [startTime, setStartTime] = useState(defaults.startTime);
    const [endTime, setEndTime] = useState(defaults.endTime);
    const [notes, setNotes] = useState('');

    // Branch work hours config — will be populated when branch data is available
    const branchWorkHours: {
        workingHoursStart?: string;
        workingHoursEnd?: string;
        workingDays?: Record<string, boolean>;
    } | null = null;

    const isOutsideWorkHours = useMemo(() => {
        if (!date || !startTime || !branchWorkHours) return false;

        const selectedStart = new Date(`${date}T${startTime}`);
        if (isNaN(selectedStart.getTime())) return false;

        const startHour = selectedStart.getHours();
        const startMinute = selectedStart.getMinutes();
        const startMinutes = startHour * 60 + startMinute;

        const [wStartH, wStartM] = (branchWorkHours.workingHoursStart || '08:00').split(':').map(Number);
        const [wEndH, wEndM] = (branchWorkHours.workingHoursEnd || '17:00').split(':').map(Number);
        const workStart = wStartH * 60 + wStartM;
        const workEnd = wEndH * 60 + wEndM;

        if (startMinutes < workStart || startMinutes >= workEnd) return true;

        const dayOfWeek = selectedStart.getDay().toString();
        const workingDays = branchWorkHours.workingDays;
        if (workingDays && workingDays[dayOfWeek] === false) return true;

        return false;
    }, [date, startTime, branchWorkHours]);

    const duration = useMemo(() => {
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) return null;
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    }, [date, startTime, endTime]);

    const locationParts = [space.buildingName, space.floorName].filter(Boolean);

    const handleConfirm = async () => {
        const startISO = new Date(`${date}T${startTime}:00`).toISOString();
        const endISO = new Date(`${date}T${endTime}:00`).toISOString();

        const result = await createBooking({
            spaceId: space.id,
            startTime: startISO,
            endTime: endISO,
            notes: notes || undefined,
        });

        if (result) {
            onClose();
        }
    };

    return (
        <Dialog
            open
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            TransitionComponent={SlideUp}
            sx={{
                '& .MuiDialog-paper': {
                    position: 'fixed',
                    bottom: 0,
                    m: 0,
                    borderRadius: '16px 16px 0 0',
                    maxHeight: '80vh',
                },
            }}
        >
            <DialogTitle>
                <Typography variant="h6" fontWeight={600}>
                    {t('booking.bookSpace', { name: space.displayName })}
                </Typography>
                {locationParts.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                            {locationParts.join(' · ')}
                        </Typography>
                    </Box>
                )}
            </DialogTitle>

            <DialogContent>
                {storeError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {storeError}
                    </Alert>
                )}

                <TextField
                    label={t('booking.date')}
                    type="date"
                    fullWidth
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    sx={{ mb: 2, mt: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                />

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                        label={t('booking.startTime')}
                        type="time"
                        fullWidth
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                        label={t('booking.endTime')}
                        type="time"
                        fullWidth
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Box>

                {isOutsideWorkHours && (
                    <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
                        {t('booking.outsideWorkHours')}
                    </Alert>
                )}

                {duration && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('booking.duration')}: {duration}
                    </Typography>
                )}

                <TextField
                    label={t('booking.notes')}
                    fullWidth
                    multiline
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('booking.notesPlaceholder')}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} color="inherit">
                    {t('booking.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={!duration || isStoreLoading}
                    startIcon={isStoreLoading ? <CircularProgress size={16} /> : undefined}
                    fullWidth
                >
                    {t('booking.confirmBooking')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
