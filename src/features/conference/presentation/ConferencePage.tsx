import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    IconButton,
    Chip,
    Stack,
    TextField,
    InputAdornment,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useState } from 'react';
import { useConferenceController } from '../application/useConferenceController';
import type { ConferenceRoom } from '@shared/domain/types';

/**
 * Conference Rooms Page - Clean Card-based Design
 */
export function ConferencePage() {
    const conferenceController = useConferenceController({});
    const [searchQuery, setSearchQuery] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<ConferenceRoom | null>(null);

    // Filter rooms based on search query
    const filteredRooms = conferenceController.conferenceRooms.filter((room) => {
        const query = searchQuery.toLowerCase();
        return (
            room.id.toLowerCase().includes(query) ||
            room.roomName.toLowerCase().includes(query) ||
            room.meetingName.toLowerCase().includes(query)
        );
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this conference room?')) {
            try {
                await conferenceController.deleteConferenceRoom(id);
            } catch (error) {
                alert(`Failed to delete conference room: ${error}`);
            }
        }
    };

    const handleViewDetails = (room: ConferenceRoom) => {
        setSelectedRoom(room);
        setDetailsOpen(true);
    };

    const occupiedRooms = conferenceController.conferenceRooms.filter(r => r.hasMeeting).length;
    const availableRooms = conferenceController.conferenceRooms.length - occupiedRooms;

    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                        Conference Rooms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage meeting rooms and schedules
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ minWidth: { xs: '100%', sm: '140px' } }}
                >
                    Add Room
                </Button>
            </Stack>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        bgcolor: 'primary.main',
                                        borderRadius: 2,
                                        p: 1.5,
                                        display: 'flex',
                                    }}
                                >
                                    <MeetingRoomIcon sx={{ color: 'white' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                                        {conferenceController.conferenceRooms.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Rooms
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        bgcolor: 'success.main',
                                        borderRadius: 2,
                                        p: 1.5,
                                        display: 'flex',
                                    }}
                                >
                                    <EventIcon sx={{ color: 'white' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                                        {availableRooms}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Available
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        bgcolor: 'warning.main',
                                        borderRadius: 2,
                                        p: 1.5,
                                        display: 'flex',
                                    }}
                                >
                                    <PeopleIcon sx={{ color: 'white' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                                        {occupiedRooms}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Occupied
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        bgcolor: 'info.main',
                                        borderRadius: 2,
                                        p: 1.5,
                                        display: 'flex',
                                    }}
                                >
                                    <AccessTimeIcon sx={{ color: 'white' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                                        {conferenceController.conferenceRooms.filter(r => r.labelCode).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        With Labels
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search Bar */}
            <TextField
                fullWidth
                placeholder="Search conference rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {/* Conference Rooms Grid */}
            {filteredRooms.length === 0 ? (
                <Card>
                    <CardContent sx={{ py: 8, textAlign: 'center' }}>
                        <MeetingRoomIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {searchQuery ? 'No rooms found' : 'No conference rooms yet'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery
                                ? `No conference rooms matching "${searchQuery}"`
                                : 'Click "Add Room" to create your first conference room'}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {filteredRooms.map((room) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={room.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3,
                                    },
                                    cursor: 'pointer',
                                }}
                                onClick={() => handleViewDetails(room)}
                            >
                                <CardContent>
                                    <Stack spacing={2}>
                                        {/* Room Header */}
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="start"
                                        >
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                                    {room.roomName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID: {room.id}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={room.hasMeeting ? 'Occupied' : 'Available'}
                                                color={room.hasMeeting ? 'warning' : 'success'}
                                                size="small"
                                            />
                                        </Stack>

                                        {/* Meeting Info */}
                                        {room.hasMeeting ? (
                                            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 500, mb: 1 }}
                                                >
                                                    {room.meetingName}
                                                </Typography>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <AccessTimeIcon fontSize="small" color="action" />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {room.startTime} - {room.endTime}
                                                    </Typography>
                                                </Stack>
                                                {room.participants.length > 0 && (
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                                        <PeopleIcon fontSize="small" color="action" />
                                                        <Typography variant="body2" color="text.secondary">
                                                            {room.participants.length} participant{room.participants.length === 1 ? '' : 's'}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No scheduled meetings
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Actions */}
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            justifyContent="flex-end"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Tooltip title="Edit">
                                                <IconButton size="small" color="primary">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(room.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Details Dialog */}
            <Dialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedRoom && (
                    <>
                        <DialogTitle>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography variant="h6">{selectedRoom.roomName}</Typography>
                                <Chip
                                    label={selectedRoom.hasMeeting ? 'Occupied' : 'Available'}
                                    color={selectedRoom.hasMeeting ? 'warning' : 'success'}
                                    size="small"
                                />
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Room ID
                                    </Typography>
                                    <Typography variant="body1">{selectedRoom.id}</Typography>
                                </Box>
                                {selectedRoom.labelCode && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Label Code
                                        </Typography>
                                        <Typography variant="body1">{selectedRoom.labelCode}</Typography>
                                    </Box>
                                )}
                                {selectedRoom.hasMeeting && (
                                    <>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Meeting Name
                                            </Typography>
                                            <Typography variant="body1">{selectedRoom.meetingName}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Time
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedRoom.startTime} - {selectedRoom.endTime}
                                            </Typography>
                                        </Box>
                                        {selectedRoom.participants.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Participants
                                                </Typography>
                                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                    {selectedRoom.participants.map((participant, index) => (
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
                            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                            <Button variant="contained" startIcon={<EditIcon />}>
                                Edit Room
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
