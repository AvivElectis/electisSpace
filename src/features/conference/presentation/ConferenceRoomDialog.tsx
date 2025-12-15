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
    const [id, setId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [hasMeeting, setHasMeeting] = useState(false);
    const [meetingName, setMeetingName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [participantsText, setParticipantsText] = useState('');
    const [labelCode, setLabelCode] = useState('');
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
                setLabelCode(room.labelCode || '');
            } else {
                // Add mode - reset
                setId('');
                setRoomName('');
                setHasMeeting(false);
                setMeetingName('');
                setStartTime('');
                setEndTime('');
                setParticipantsText('');
                setLabelCode('');
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

            const roomData: Partial<ConferenceRoom> = {
                id: room ? room.id : id, // Don't allow ID change in edit mode
                roomName,
                hasMeeting,
                meetingName: hasMeeting ? meetingName : '',
                startTime: hasMeeting ? startTime : '',
                endTime: hasMeeting ? endTime : '',
                participants: hasMeeting ? participants : [],
                labelCode: labelCode || undefined,
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
                {room ? 'Edit Conference Room' : 'Add Conference Room'}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* ID - only editable in add mode */}
                    <TextField
                        fullWidth
                        label="Room ID"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        disabled={!!room}
                        required
                        helperText={room ? 'ID cannot be changed' : 'Unique identifier (e.g., C01)'}
                    />

                    {/* Room Name */}
                    <TextField
                        fullWidth
                        label="Room Name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                        placeholder="Conference Room A"
                    />

                    {/* Label Code */}
                    <TextField
                        fullWidth
                        label="Label Code"
                        value={labelCode}
                        onChange={(e) => setLabelCode(e.target.value)}
                        helperText="ESL label barcode (optional)"
                    />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                        Meeting Information
                    </Typography>

                    {/* Has Meeting Toggle */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={hasMeeting}
                                onChange={(e) => setHasMeeting(e.target.checked)}
                            />
                        }
                        label="Room has active meeting"
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
                    Cancel
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
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
