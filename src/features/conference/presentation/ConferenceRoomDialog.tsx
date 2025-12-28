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

interface ConferenceRoomDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (room: Partial<ConferenceRoom>) => Promise<void>;
    room?: ConferenceRoom;
}

/**
 * Conference Room Add/Edit Dialog
 */
export function ConferenceRoomDialog({
    open,
    onClose,
    onSave,
    room,
}: ConferenceRoomDialogProps) {
    const { t } = useTranslation();
    const [id, setId] = useState('');
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
                setRoomName(room.roomName);
                setHasMeeting(room.hasMeeting);
                setMeetingName(room.meetingName);
                setStartTime(room.startTime);
                setEndTime(room.endTime);
                setParticipantsText(room.participants.join(', '));
            } else {
                // Add mode - reset
                setId('');
                setRoomName('');
                setHasMeeting(false);
                setMeetingName('');
                setStartTime('');
                setEndTime('');
                setParticipantsText('');
            }
        }
    }, [open, room]);

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
                roomName,
                hasMeeting,
                meetingName: hasMeeting ? meetingName : '',
                startTime: hasMeeting ? startTime : '',
                endTime: hasMeeting ? endTime : '',
                participants: hasMeeting ? participants : [],
                data: room?.data || {},  // Preserve existing dynamic data
            };

            await onSave(roomData);
            onClose();
        } catch (error) {
            alert(`Failed to save conference room: ${error}`);
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
                        onChange={(e) => setId(e.target.value.toUpperCase().trim())}
                        disabled={!!room}
                        required
                        helperText={room ? t('conference.idCannotChange') : t('conference.idAutoFormat')}
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
                                label="Meeting Name"
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                required={hasMeeting}
                                placeholder="Weekly Team Meeting"
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    type="time"
                                    label="Start Time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required={hasMeeting}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    fullWidth
                                    type="time"
                                    label="End Time"
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
                                label="Participants"
                                value={participantsText}
                                onChange={(e) => setParticipantsText(e.target.value)}
                                helperText="Comma-separated list of participants"
                                placeholder="John Doe, Jane Smith, Bob Johnson"
                            />

                            {participantsText && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Preview:
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
                        !roomName ||
                        (!room && !id) ||
                        (hasMeeting && (!meetingName || !startTime || !endTime))
                    }
                >
                    {saving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
