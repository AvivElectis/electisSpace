import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
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
    Grid,
    Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { useConferenceController } from '../application/useConferenceController';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import type { ConferenceRoom } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

// Lazy load dialog - not needed on initial render
const ConferenceRoomDialog = lazy(() => import('./ConferenceRoomDialog').then(m => ({ default: m.ConferenceRoomDialog })));

/**
 * Conference Rooms Page - Clean Card-based Design
 */
export function ConferencePage() {
    const { t } = useTranslation();
    const { settings } = useSettingsStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Get SoluM access token if available
    const solumToken = settings.solumConfig?.tokens?.accessToken;

    // Get sync context for triggering sync after SFTP operations
    const { sync } = useSyncContext();

    // Wrap sync to match expected void return type
    const handleSync = useCallback(async () => {
        await sync();
    }, [sync]);

    const conferenceController = useConferenceController({
        onSync: settings.workingMode === 'SOLUM_API' ? handleSync : undefined,  // Trigger sync after add/edit/delete in SOLUM mode
        solumConfig: settings.solumConfig,
        solumToken,
        solumMappingConfig: settings.solumMappingConfig,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search for performance
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<ConferenceRoom | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<ConferenceRoom | undefined>(undefined);

    // Fetch conference rooms from AIMS on mount (SoluM mode)
    useEffect(() => {
        if (settings.workingMode === 'SOLUM_API' && settings.solumConfig && solumToken && settings.solumMappingConfig) {
            conferenceController.fetchFromSolum().catch(() => {
                // console.error('Failed to fetch conference rooms from AIMS:', error);
            });
        }
        // Only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter rooms based on debounced search query (memoized for performance)
    const filteredRooms = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        if (!query) return conferenceController.conferenceRooms;

        return conferenceController.conferenceRooms.filter((room) => {
            const name = room.data?.roomName || '';
            return (
                room.id.toLowerCase().includes(query) ||
                name.toLowerCase().includes(query) ||
                room.meetingName.toLowerCase().includes(query)
            );
        });
    }, [conferenceController.conferenceRooms, debouncedSearchQuery]);

    // Memoized stats calculations
    const { occupiedRooms, availableRooms } = useMemo(() => {
        const occupied = conferenceController.conferenceRooms.filter(r => r.hasMeeting).length;
        const available = conferenceController.conferenceRooms.length - occupied;
        return { occupiedRooms: occupied, availableRooms: available };
    }, [conferenceController.conferenceRooms]);

    // Memoized event handlers for better performance
    const handleDelete = useCallback(async (id: string) => {
        const confirmed = await confirm({
            title: t('common.dialog.delete'),
            message: t('conference.confirmDelete'),
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await conferenceController.deleteConferenceRoom(id);
            } catch (error) {
                await confirm({
                    title: t('common.error'),
                    message: `Failed to delete conference room: ${error}`,
                    confirmLabel: t('common.close'),
                    severity: 'error',
                    showCancel: false
                });
            }
        }
    }, [confirm, t, conferenceController]);

    const handleViewDetails = useCallback((room: ConferenceRoom) => {
        setSelectedRoom(room);
        setDetailsOpen(true);
    }, []);

    const handleAdd = useCallback(() => {
        setEditingRoom(undefined);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback((room: ConferenceRoom) => {
        setEditingRoom(room);
        setDialogOpen(true);
        setDetailsOpen(false); // Close details if open
    }, []);

    const handleSave = useCallback(async (roomData: Partial<ConferenceRoom>) => {
        if (editingRoom) {
            await conferenceController.updateConferenceRoom(editingRoom.id, roomData);
        } else {
            await conferenceController.addConferenceRoom(roomData);
        }
    }, [editingRoom, conferenceController]);

    const cardsSetting = useMemo(() => ({
        boxShadow: 'none',
        bgcolor: 'transparent',
        border: 'none',
        '&:hover': { boxShadow: '0px 0px 1px 1px #6666663b' }
    }), []);

    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {t('conference.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('conference.manage')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    sx={{ minWidth: { xs: '100%', sm: '140px' } }}
                >
                    {t('conference.addRoom')}
                </Button>
            </Stack>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={cardsSetting}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box
                                    sx={{
                                        bgcolor: 'primary.main',
                                        borderRadius: 2,
                                        p: 1.5,
                                        display: 'flex',
                                    }}
                                >
                                    <ConferenceIcon sx={{ color: 'white' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                                        {conferenceController.conferenceRooms.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('conference.totalRooms')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={cardsSetting}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
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
                                        {t('conference.available')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={cardsSetting}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box
                                    sx={{
                                        bgcolor: 'error.light',
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
                                        {t('conference.occupied')}
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
                placeholder={t('conference.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                    mb: 3,
                    maxWidth: { xs: '100%', sm: 400 },
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 4,
                    }
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }
                }}
            />
            {/* Conference Rooms Grid */}
            {conferenceController.isFetching ? (
                <Grid container spacing={3}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`skeleton-${index}`}>
                            <Card sx={{ height: 200 }}>
                                <CardContent>
                                    <Stack gap={2}>
                                        <Skeleton variant="text" width="70%" height={28} />
                                        <Skeleton variant="text" width="50%" height={20} />
                                        <Skeleton variant="text" width="90%" />
                                        <Skeleton variant="text" width="80%" />
                                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                            <Skeleton variant="circular" width={32} height={32} />
                                            <Skeleton variant="circular" width={32} height={32} />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : filteredRooms.length === 0 ? (
                <Card>
                    <CardContent sx={{ py: 8, textAlign: 'center' }}>
                        <ConferenceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {searchQuery ? t('conference.noRoomsFound') : t('conference.noRoomsYet')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery
                                ? t('conference.noRoomsMatching') + ` "${searchQuery}"`
                                : t('conference.clickAddRoom', { button: `"${t('conference.addRoom')}"` })}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Box sx={{ maxHeight: '70vh', overflowY: 'auto', p: 1 }}>
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
                                        <Stack gap={2} >
                                            {/* Room Header */}
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                alignItems="start"
                                                sx={{ backgroundColor: room.hasMeeting ? '#EF4444' : '#22C55E', px: 1, py: 1, mx: 0, borderRadius: 1, color: 'white', textShadow: '0px 0px 2px rgba(0, 0, 0, 0.75)' }}
                                            >
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                                        {room.id} - {room.data?.roomName || room.id}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={room.hasMeeting ? t('conference.occupied') : t('conference.available')}
                                                    color={'primary'}
                                                    variant={'outlined'}
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
                                                    <Stack direction="row" gap={1} alignItems="center">
                                                        <AccessTimeIcon fontSize="small" color="action" />
                                                        <Typography variant="body2" color="text.secondary">
                                                            {room.startTime} - {room.endTime}
                                                        </Typography>
                                                    </Stack>
                                                    {room.participants.length > 0 && (
                                                        <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1 }}>
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
                                                        {t('conference.noScheduledMeetings')}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Actions */}
                                            <Stack
                                                direction="row"
                                                gap={1}
                                                justifyContent="flex-end"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Tooltip title={t('common.edit')}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleEdit(room)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('common.delete')}>
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
                </Box>
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
                                <Typography variant="h6">{selectedRoom.data?.roomName || selectedRoom.id}</Typography>
                                <Chip
                                    label={selectedRoom.hasMeeting ? t('conference.occupied') : t('conference.available')}
                                    color={selectedRoom.hasMeeting ? 'warning' : 'success'}
                                    size="small"
                                />
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack gap={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('conference.roomId')}
                                    </Typography>
                                    <Typography variant="body1">{selectedRoom.id}</Typography>
                                </Box>
                                {selectedRoom.hasMeeting && (
                                    <>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('conference.meetingName')}
                                            </Typography>
                                            <Typography variant="body1">{selectedRoom.meetingName}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('conference.time')}
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedRoom.startTime} - {selectedRoom.endTime}
                                            </Typography>
                                        </Box>
                                        {selectedRoom.participants.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('conference.participants')}
                                                </Typography>
                                                <Stack gap={0.5} sx={{ mt: 0.5 }}>
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
                            <Button onClick={() => setDetailsOpen(false)}>{t('common.close')}</Button>
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                onClick={() => handleEdit(selectedRoom)}
                            >
                                {t('conference.editRoomButton')}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
            {/* Add/Edit Dialog - Lazy loaded */}
            <Suspense fallback={null}>
                {dialogOpen && (
                    <ConferenceRoomDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        onSave={handleSave}
                        room={editingRoom}
                        existingIds={conferenceController.conferenceRooms.map(r => r.id)}
                    />
                )}
            </Suspense>
            <ConfirmDialog />
        </Box>
    );
}
