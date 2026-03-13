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
    Radio,
    RadioGroup,
    FormControlLabel,
    CircularProgress,
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
import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { useConferenceController } from '../application/useConferenceController';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import type { ConferenceRoom } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useStoreEvents } from '@shared/presentation/hooks/useStoreEvents';
import { conferenceApi } from '../infrastructure/conferenceApi';
import { logger } from '@shared/infrastructure/services/logger';
import { EmptyState } from '@shared/presentation/components/EmptyState';

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
    const { hasStoreRole, isAppViewer } = useAuthContext();
    const canEdit = hasStoreRole('STORE_EMPLOYEE') && !isAppViewer;

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

    // Simple conference mode state
    const { activeStoreEffectiveFeatures } = useAuthContext();
    const isSimpleMode = activeStoreEffectiveFeatures?.simpleConferenceMode ?? false;
    const [labelPages, setLabelPages] = useState<Record<string, number>>({});
    const [labelPagesLoading, setLabelPagesLoading] = useState(false);
    const [flippingRoomId, setFlippingRoomId] = useState<string | null>(null);
    const [flipSnackbar, setFlipSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
    const labelPagesFetchedRef = useRef(false);

    // Fetch label pages from AIMS when in simple mode
    useEffect(() => {
        if (!isSimpleMode || !isAppReady || !activeStoreId || labelPagesFetchedRef.current) return;
        labelPagesFetchedRef.current = true;
        setLabelPagesLoading(true);
        conferenceApi.getLabelPages(activeStoreId)
            .then(pages => setLabelPages(pages))
            .catch(() => {})
            .finally(() => setLabelPagesLoading(false));
    }, [isSimpleMode, isAppReady, activeStoreId]);

    // Reset label pages fetch ref when store or mode changes
    useEffect(() => {
        labelPagesFetchedRef.current = false;
    }, [activeStoreId, isSimpleMode]);

    // Get room page status: check all labels for this room, return the dominant page
    const getRoomPage = useCallback((room: ConferenceRoom): number => {
        const codes: string[] = [];
        if (room.labelCode) codes.push(room.labelCode);
        if (room.assignedLabels?.length) {
            for (const lc of room.assignedLabels) {
                if (!codes.includes(lc)) codes.push(lc);
            }
        }
        if (codes.length === 0) return 1; // Default: available
        // Use the first label's page as the room's status
        for (const code of codes) {
            if (labelPages[code] !== undefined) return labelPages[code];
        }
        return 1; // Default: available
    }, [labelPages]);

    // Handle page flip for simple mode
    const handleFlipPage = useCallback(async (room: ConferenceRoom, targetPage: number) => {
        const serverId = room.serverId || room.id;
        setFlippingRoomId(room.id);
        try {
            const result = await conferenceApi.flipPage(serverId, targetPage);
            // Update local label pages state
            if (result.labelCodes) {
                setLabelPages(prev => {
                    const next = { ...prev };
                    for (const lc of result.labelCodes) {
                        next[lc] = targetPage;
                    }
                    return next;
                });
            }
            setFlipSnackbar({ message: t('conference.flipPageSuccess'), severity: 'success' });
        } catch {
            setFlipSnackbar({ message: t('conference.flipPageFailed'), severity: 'error' });
        } finally {
            setFlippingRoomId(null);
        }
    }, [t]);

    // SSE real-time sync — alert when other users modify conference rooms
    useStoreEvents({
        onConferenceChanged: (event) => {
            logger.debug('ConferencePage', 'SSE event received', { type: event?.type });

            // Handle page-flip events from other users
            if (event.action === 'page-flip') {
                const { labelCodes, page } = event as any;
                if (labelCodes && page !== undefined) {
                    setLabelPages(prev => {
                        const next = { ...prev };
                        for (const lc of labelCodes) {
                            next[lc] = page;
                        }
                        return next;
                    });
                }
                setSseAlert({
                    message: t('conference.roomChangedByOther', {
                        defaultValue: '{{user}} {{action}} conference room {{roomId}}',
                        user: event.userName || 'Another user',
                        action: page === 2 ? 'set as occupied' : 'set as available',
                        roomId: event.roomId || 'Unknown',
                    }),
                    severity: 'info',
                });
                return;
            }

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
        '&:hover': { boxShadow: (theme: any) => `0px 0px 1px 1px ${theme.palette.action.focus}` },
    }), []);

    // ─── Simple Conference Mode Rendering ─────────────────────────────────
    if (isSimpleMode) {
        return (
            <Box>
                {/* Header — reuses same pattern as full mode */}
                <Stack
                    direction="row"
                    alignItems="center"
                    gap={2}
                    sx={{ mb: 2 }}
                >
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                            {t('conference.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('conference.manage')} - {conferenceController.conferenceRooms.length} {t('conference.totalRooms')}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        disabled={!canEdit}
                        sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'inline-flex' } }}
                    >
                        {t('conference.addRoom')}
                    </Button>
                </Stack>

                {conferenceController.isFetching ? (
                    <Stack gap={2}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={64} />
                        ))}
                    </Stack>
                ) : labelPagesLoading ? (
                    <Stack alignItems="center" gap={2} sx={{ py: 4 }}>
                        <CircularProgress size={32} />
                        <Typography variant="body2" color="text.secondary">
                            {t('conference.loadingPages')}
                        </Typography>
                    </Stack>
                ) : conferenceController.conferenceRooms.length === 0 ? (
                    <EmptyState
                        icon={<ConferenceIcon sx={{ fontSize: 80 }} />}
                        title={t('conference.noRoomsYet')}
                        actionLabel={canEdit ? t('conference.addRoom') : undefined}
                        onAction={canEdit ? handleAdd : undefined}
                    />
                ) : (
                    <Stack gap={1}>
                        {filteredRooms.map((room) => {
                            const roomPage = getRoomPage(room);
                            const isFlipping = flippingRoomId === room.id;
                            const hasLabels = !!(room.labelCode || (room.assignedLabels && room.assignedLabels.length > 0));
                            const labelCount = new Set([
                                ...(room.labelCode ? [room.labelCode] : []),
                                ...(room.assignedLabels || []),
                            ]).size;

                            return (
                                <Card
                                    key={room.id}
                                    variant="outlined"
                                    sx={{
                                        transition: 'background-color 0.2s',
                                        bgcolor: roomPage === 2 ? 'error.50' : 'transparent',
                                        borderColor: roomPage === 2 ? 'error.main' : 'divider',
                                    }}
                                >
                                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            gap={2}
                                        >
                                            {/* Room info */}
                                            <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    dir="ltr"
                                                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                                >
                                                    {room.id}
                                                </Typography>
                                                <Typography variant="body1" fontWeight={500} noWrap>
                                                    {room.roomName || room.data?.roomName || room.id}
                                                </Typography>
                                                {hasLabels && labelCount > 1 && (
                                                    <Chip
                                                        label={`${labelCount} ${t('conference.labels')}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                )}
                                            </Stack>

                                            {/* Status radio */}
                                            {hasLabels ? (
                                                <RadioGroup
                                                    row
                                                    value={String(roomPage)}
                                                    onChange={(_e, value) => {
                                                        if (!isFlipping && canEdit) {
                                                            handleFlipPage(room, Number(value));
                                                        }
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="1"
                                                        disabled={isFlipping || !canEdit}
                                                        control={<Radio size="small" color="success" />}
                                                        label={
                                                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                                {t('conference.available')}
                                                            </Typography>
                                                        }
                                                        sx={{ mr: 1 }}
                                                    />
                                                    <FormControlLabel
                                                        value="2"
                                                        disabled={isFlipping || !canEdit}
                                                        control={<Radio size="small" color="error" />}
                                                        label={
                                                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                                {t('conference.inMeeting')}
                                                            </Typography>
                                                        }
                                                    />
                                                    {isFlipping && <CircularProgress size={20} sx={{ ml: 1 }} />}
                                                </RadioGroup>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('conference.noScheduledMeetings')}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                )}

                {/* Page flip snackbar */}
                <Snackbar
                    open={!!flipSnackbar}
                    autoHideDuration={4000}
                    onClose={() => setFlipSnackbar(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setFlipSnackbar(null)}
                        severity={flipSnackbar?.severity || 'info'}
                        sx={{ width: '100%' }}
                    >
                        {flipSnackbar?.message}
                    </Alert>
                </Snackbar>

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

    // ─── Full Conference Mode Rendering ────────────────────────────────────
    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction="row"
                alignItems="center"
                gap={2}
                sx={{ mb: 2 }}
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
                    disabled={!canEdit}
                    sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'inline-flex' } }}
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
                <EmptyState
                    icon={<ConferenceIcon sx={{ fontSize: 80 }} />}
                    title={searchQuery ? t('conference.noRoomsFound') : t('conference.noRoomsYet')}
                    description={searchQuery
                        ? t('conference.noRoomsMatching') + ` "${searchQuery}"`
                        : t('conference.clickAddRoom', { button: `"${t('conference.addRoom')}"` })}
                    actionLabel={!searchQuery && canEdit ? t('conference.addRoom') : undefined}
                    onAction={!searchQuery && canEdit ? handleAdd : undefined}
                />
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
                                                            <span>
                                                            <IconButton size="medium" color="primary" disabled={!canEdit} onClick={() => handleEdit(room)}>
                                                                <EditIcon />
                                                            </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('common.delete')}>
                                                            <span>
                                                            <IconButton size="medium" color="error" disabled={!canEdit} onClick={() => handleDelete(room.id)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                            </span>
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
                                                        <span>
                                                        <IconButton size="small" color="primary" disabled={!canEdit} onClick={() => handleEdit(room)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title={t('common.delete')}>
                                                        <span>
                                                        <IconButton size="small" color="error" disabled={!canEdit} onClick={() => handleDelete(room.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                        </span>
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
                    disabled={!canEdit}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1050,
                        height: 64,
                        px: 3,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                    }}
                >
                    <AddIcon sx={{ mr: 1, fontSize: '1.5rem' }} />
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
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => setDetailsOpen(false)}>{t('common.close')}</Button>
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                disabled={!canEdit}
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
