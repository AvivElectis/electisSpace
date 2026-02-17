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
    Snackbar,
    Alert,
    Fab,
    Badge,
    Collapse,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { useConferenceController } from '../application/useConferenceController';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import type { ConferenceRoom } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useStoreEvents } from '@shared/presentation/hooks/useStoreEvents';

// Lazy load dialog - not needed on initial render
const ConferenceRoomDialog = lazy(() => import('./ConferenceRoomDialog').then(m => ({ default: m.ConferenceRoomDialog })));

/**
 * Conference Rooms Page - Clean Card-based Design
 */
export function ConferencePage() {
    const { t } = useTranslation();
    const isAppReady = useAuthStore((state) => state.isAppReady);
    const activeStoreId = useAuthStore((state) => state.activeStoreId);
    const { settings } = useSettingsStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Get SoluM access token if available
    const solumToken = settings.solumConfig?.tokens?.accessToken;

    // Get sync context for triggering push after CRUD operations
    const { push } = useBackendSyncContext();

    // Push pending queue items to AIMS after each CRUD operation
    const handleSync = useCallback(async () => {
        await push();
    }, [push]);

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
    const [sseAlert, setSseAlert] = useState<{ message: string; severity: 'info' } | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [searchOpen, setSearchOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // SSE real-time sync — alert when other users modify conference rooms
    useStoreEvents({
        onConferenceChanged: (event) => {
            console.log('[ConferencePage] SSE event received:', event);
            const actionText = event.action === 'create' ? 'added' :
                              event.action === 'update' ? 'updated' :
                              event.action === 'delete' ? 'deleted' :
                              event.action === 'toggle' ? (event.hasMeeting ? 'started a meeting in' : 'ended a meeting in') :
                              'modified';

            setSseAlert({
                message: t('conference.roomChangedByOther', {
                    defaultValue: '{{user}} {{action}} conference room {{roomId}}',
                    user: event.userName || 'Another user',
                    action: actionText,
                    roomId: event.roomId || 'Unknown',
                }),
                severity: 'info',
            });

            // Refetch conference rooms to stay in sync
            conferenceController.fetchRooms().catch(() => {
                // Ignore errors, user already sees their view
            });
        },
    });

    // Fetch conference rooms from server when app is ready or store changes (SoluM mode)
    // Server returns rooms with serverId (UUID) needed for correct PATCH/DELETE calls
    useEffect(() => {
        if (isAppReady && activeStoreId && settings.workingMode === 'SOLUM_API' && settings.solumConfig) {
            conferenceController.fetchRooms().catch(() => {
                // Fallback to AIMS fetch if server fetch fails
                if (solumToken && settings.solumMappingConfig) {
                    conferenceController.fetchFromSolum().catch(() => {});
                }
            });
        }
        // conferenceController is created from useConferenceController with stable config
        // Only re-run when app becomes ready or store changes, not on config changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

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
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                gap={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
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
                    sx={{ minWidth: { xs: '100%', sm: '140px' }, display: { xs: 'none', md: 'inline-flex' } }}
                >
                    {t('conference.addRoom')}
                </Button>
            </Stack>
            {/* Stats */}
            {isMobile ? (
                /* Mobile: compact single-line stats */
                <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 2, px: 1 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {conferenceController.conferenceRooms.length} {t('conference.totalRooms')}
                    </Typography>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="caption">{availableRooms}</Typography>
                    </Stack>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="caption">{occupiedRooms}</Typography>
                    </Stack>
                </Stack>
            ) : (
                /* Desktop: full stats cards (unchanged) */
                <Stack direction="row" gap={2} sx={{ mb: 3 }}>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <ConferenceIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {conferenceController.conferenceRooms.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('conference.totalRooms')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <EventIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {availableRooms}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('conference.available')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'error.light', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <PeopleIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {occupiedRooms}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('conference.occupied')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            )}
            {/* Search */}
            {isMobile ? (
                <Box sx={{ mb: 2 }}>
                    <IconButton
                        onClick={() => setSearchOpen(!searchOpen)}
                        color={searchQuery ? 'primary' : 'default'}
                    >
                        <Badge badgeContent={searchQuery ? 1 : 0} color="primary">
                            <FilterListIcon />
                        </Badge>
                    </IconButton>
                    <Collapse in={searchOpen}>
                        <TextField
                            fullWidth
                            placeholder={t('conference.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                    </Collapse>
                </Box>
            ) : (
                <TextField
                    fullWidth
                    placeholder={t('conference.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        mb: 3,
                        maxWidth: 400,
                        '& .MuiOutlinedInput-root': { borderRadius: 4 }
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
            )}
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
                                {isMobile ? (
                                    /* Mobile: compact card with tap-to-expand */
                                    <Card
                                        variant="outlined"
                                        sx={{ transition: 'background-color 0.15s' }}
                                    >
                                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                            {/* Compact row */}
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                onClick={() => setExpandedCardId(prev => prev === room.id ? null : room.id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.85rem' }}>
                                                    {room.data?.roomName || room.id}
                                                </Typography>
                                                <Chip
                                                    label={room.hasMeeting ? t('conference.occupied') : t('conference.available')}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.7rem',
                                                        bgcolor: room.hasMeeting ? 'error.main' : 'success.main',
                                                        color: 'white',
                                                    }}
                                                />
                                            </Stack>

                                            {/* Expanded */}
                                            {expandedCardId === room.id && (
                                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                                    {room.hasMeeting ? (
                                                        <Box sx={{ mb: 1 }}>
                                                            <Typography variant="caption" fontWeight={500}>{room.meetingName}</Typography>
                                                            <Stack direction="row" gap={1} alignItems="center">
                                                                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {room.startTime} - {room.endTime}
                                                                </Typography>
                                                            </Stack>
                                                            {room.participants.length > 0 && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {room.participants.length} participant{room.participants.length === 1 ? '' : 's'}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                            {t('conference.noScheduledMeetings')}
                                                        </Typography>
                                                    )}
                                                    <Stack direction="row" gap={1} justifyContent="flex-end">
                                                        <Tooltip title={t('common.edit')}>
                                                            <IconButton size="medium" color="primary" onClick={() => handleEdit(room)}>
                                                                <EditIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={t('common.delete')}>
                                                            <IconButton size="medium" color="error" onClick={() => handleDelete(room.id)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    /* Desktop: full card (unchanged) */
                                    <Card
                                        sx={{
                                            height: '100%',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleViewDetails(room)}
                                    >
                                        <CardContent>
                                            <Stack gap={2}>
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
                                                        color="primary"
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                </Stack>
                                                {room.hasMeeting ? (
                                                    <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>{room.meetingName}</Typography>
                                                        <Stack direction="row" gap={1} alignItems="center">
                                                            <AccessTimeIcon fontSize="small" color="action" />
                                                            <Typography variant="body2" color="text.secondary">{room.startTime} - {room.endTime}</Typography>
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
                                                        <Typography variant="body2" color="text.secondary">{t('conference.noScheduledMeetings')}</Typography>
                                                    </Box>
                                                )}
                                                <Stack direction="row" gap={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip title={t('common.edit')}>
                                                        <IconButton size="small" color="primary" onClick={() => handleEdit(room)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('common.delete')}>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(room.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                )}
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
            {/* Mobile FAB — Add Room */}
            {isMobile && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={handleAdd}
                    sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1050 }}
                >
                    <AddIcon sx={{ mr: 1 }} />
                    {t('conference.addRoom')}
                </Fab>
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
            {/* SSE Alert Snackbar */}
            <Snackbar
                open={!!sseAlert}
                autoHideDuration={6000}
                onClose={() => setSseAlert(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSseAlert(null)}
                    severity={sseAlert?.severity || 'info'}
                    sx={{ width: '100%' }}
                >
                    {sseAlert?.message}
                </Alert>
            </Snackbar>
            <ConfirmDialog />
        </Box>
    );
}
