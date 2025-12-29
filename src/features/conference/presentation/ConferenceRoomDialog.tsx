import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Switch,
    FormControlLabel,
    Chip,
    Box,
    Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConferenceRoom } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface ConferenceRoomDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (room: Partial<ConferenceRoom>) => Promise<void>;
    room?: ConferenceRoom;
    existingIds?: string[];
}

/**
 * Conference Room Add/Edit Dialog
 */
export function ConferenceRoomDialog({
    open,
    onClose,
    onSave,
    room,
    existingIds = []
}: ConferenceRoomDialogProps) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.dir() === 'rtl';
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [id, setId] = useState('');
    const [idError, setIdError] = useState(''); // Local error state for ID
    const [roomName, setRoomName] = useState('');
    const [hasMeeting, setHasMeeting] = useState(false);
    const [meetingName, setMeetingName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [participantsText, setParticipantsText] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (room) {
                // Edit mode
                setId(room.id);
                setRoomName(room.data?.roomName || '');
                setHasMeeting(room.hasMeeting);
                setMeetingName(room.meetingName);
                setStartTime(room.startTime);
                setEndTime(room.endTime);
                setParticipantsText(room.participants.join(', '));
            } else {
                // Add mode - reset
                setId('');
                setIdError('');
                setRoomName('');
                setHasMeeting(false);
                setMeetingName('');
                setStartTime('');
                setEndTime('');
                setParticipantsText('');
            }
        }
    }, [open, room]);

    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().trim();
        setId(value);

        // Live Validation
        let checkId = value;
        if (checkId && !checkId.startsWith('C')) {
            checkId = 'C' + checkId;
        }

        // Check both raw and C-prefixed types just in case, but existingIds likely has full IDs
        // Actually the user types "101", we might save "C101". 
        // If existing is "C101".
        // If user types "101", we should check "C101". 
        // If user types "C101", we check "C101".

        const possibleId = value.startsWith('C') ? value : 'C' + value;

        if (existingIds.includes(possibleId) && (!room || room.id !== possibleId)) {
            setIdError(t('errors.idExists'));
        } else if (existingIds.includes(value) && (!room || room.id !== value)) {
            setIdError(t('errors.idExists'));
        } else {
            setIdError('');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const participants = participantsText
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            // Auto-format conference room ID: ensure C prefix
            let finalId = room ? room.id : id.toUpperCase().trim();
            if (finalId && !finalId.startsWith('C')) {
                // Add C prefix if not present
                finalId = 'C' + finalId;
            }

            const roomData: Partial<ConferenceRoom> = {
                id: finalId,
                hasMeeting,
                meetingName: hasMeeting ? meetingName : '',
                startTime: hasMeeting ? startTime : '',
                endTime: hasMeeting ? endTime : '',
                participants: hasMeeting ? participants : [],
                data: {
                    ...(room?.data || {}),
                    roomName: roomName
                },
            };

            await onSave(roomData);
            onClose();
        } catch (error) {
            await confirm({
                title: t('common.error'),
                message: `Failed to save conference room: ${error}`,
                confirmLabel: t('common.close'),
                severity: 'error',
                showCancel: false
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {room ? t('conference.editRoom') : t('conference.addRoom')}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* ID - only editable in add mode */}
                    <TextField
                        fullWidth
                        label={t('conference.roomId')}
                        value={id}
                        onChange={handleIdChange}
                        disabled={!!room}
                        required
                        error={!!idError}
                        helperText={idError || (room ? t('conference.idCannotChange') : t('conference.idAutoFormat'))}
                    />

                    {/* Room Name */}
                    <TextField
                        fullWidth
                        label={t('conference.roomName')}
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                        placeholder={t('conference.roomNamePlaceholder')}
                    />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                        {t('conference.meetingInfo')}
                    </Typography>

                    {/* Has Meeting Toggle */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={hasMeeting}
                                onChange={(e) => setHasMeeting(e.target.checked)}
                            />
                        }
                        label={t('conference.hasActiveMeeting')}
                    />

                    {hasMeeting && (
                        <>
                            <TextField
                                fullWidth
                                label={t('conference.meetingName')}
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                required={hasMeeting}
                                dir={isRtl ? 'rtl' : 'ltr'}
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                                <TextField
                                    fullWidth
                                    type="time"
                                    label={t('conference.startTime')}
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required={hasMeeting}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    fullWidth
                                    type="time"
                                    label={t('conference.endTime')}
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required={hasMeeting}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>

                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label={t('conference.participants')}
                                value={participantsText}
                                onChange={(e) => setParticipantsText(e.target.value)}
                                helperText={t('conference.participantsHelper')}
                                dir={isRtl ? 'rtl' : 'ltr'}
                            />

                            {participantsText && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('conference.preview')}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                        {participantsText
                                            .split(',')
                                            .map(p => p.trim())
                                            .filter(p => p.length > 0)
                                            .map((participant, index) => (
                                                <Chip
                                                    key={index}
                                                    label={participant}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                    </Stack>
                                </Box>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={
                        saving ||
                        !!idError ||
                        !roomName ||
                        (!room && !id) ||
                        (hasMeeting && (!meetingName || !startTime || !endTime))
                    }
                >
                    {saving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
