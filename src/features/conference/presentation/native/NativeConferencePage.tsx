import { useEffect, useMemo, useState, useDeferredValue, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Snackbar, Alert } from '@mui/material';

import { useConferenceController } from '@features/conference/application/useConferenceController';
import { NativeListSkeleton } from '@shared/presentation/native/NativeListSkeleton';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { conferenceApi } from '@features/conference/infrastructure/conferenceApi';

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import FlipIcon from '@mui/icons-material/Flip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeRoomCard } from '@shared/presentation/native/NativeRoomCard';
import { NativeStatBar } from '@shared/presentation/native/NativeStatBar';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';

import type { ConferenceRoom } from '@shared/domain/types';

type StatusFilter = 'all' | 'available' | 'occupied';

/**
 * NativeConferencePage — Android-native Conference Rooms list.
 * Shows room cards with availability status, meeting info, participants.
 * Mirrors data logic of ConferencePage.
 */
export function NativeConferencePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useSetNativeTitle(t('navigation.conferenceRooms'));

    const isAppReady = useAuthStore((state) => state.isAppReady);
    const activeStoreId = useAuthStore((state) => state.activeStoreId);
    const settings = useSettingsStore((state) => state.settings);
    const solumToken = settings.solumConfig?.tokens?.accessToken;

    const { push } = useBackendSyncContext();

    const conferenceController = useConferenceController({
        onSync: settings.workingMode === 'SOLUM_API' ? async () => { await push(); } : undefined,
        solumConfig: settings.solumConfig,
        solumToken,
        solumMappingConfig: settings.solumMappingConfig,
    });

    // Fetch rooms on mount / store switch — regardless of working mode
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            conferenceController.fetchRooms().catch(() => {
                if (solumToken && settings.solumMappingConfig) {
                    conferenceController.fetchFromSolum().catch(() => {});
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    // Simple conference mode — feature flag driven (same logic as web ConferencePage)
    const { activeStoreEffectiveFeatures } = useAuthContext();
    const isSimpleMode = activeStoreEffectiveFeatures?.simpleConferenceMode ?? false;

    const [labelPages, setLabelPages] = useState<Record<string, number>>({});
    const [flippingRoomId, setFlippingRoomId] = useState<string | null>(null);
    const [flipSnackbar, setFlipSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
    const labelPagesFetchedRef = useRef(false);

    // Fetch label pages from AIMS when simple mode is active
    useEffect(() => {
        if (!isSimpleMode || !isAppReady || !activeStoreId || labelPagesFetchedRef.current) return;
        labelPagesFetchedRef.current = true;
        conferenceApi.getLabelPages(activeStoreId)
            .then((pages) => setLabelPages(pages))
            .catch(() => {});
    }, [isSimpleMode, isAppReady, activeStoreId]);

    // Reset label pages fetch ref when store or mode changes
    useEffect(() => {
        labelPagesFetchedRef.current = false;
    }, [activeStoreId, isSimpleMode]);

    // Get the current label page for a room (used to derive occupied/available in simple mode)
    const getRoomPage = useCallback((room: ConferenceRoom): number => {
        const codes: string[] = [];
        if (room.labelCode) codes.push(room.labelCode);
        if (room.assignedLabels?.length) {
            for (const lc of room.assignedLabels) {
                if (!codes.includes(lc)) codes.push(lc);
            }
        }
        if (codes.length === 0) return 1;
        for (const code of codes) {
            if (labelPages[code] !== undefined) return labelPages[code];
        }
        return 1;
    }, [labelPages]);

    // Flip to the opposite page (1=available, 2=occupied)
    const handleFlipPage = useCallback(async (room: ConferenceRoom) => {
        if (flippingRoomId) return; // Prevent concurrent flips
        const serverId = room.serverId || room.id;
        const currentPage = getRoomPage(room);
        const targetPage = currentPage === 2 ? 1 : 2;
        setFlippingRoomId(room.id);
        try {
            const result = await conferenceApi.flipPage(serverId, targetPage);
            if (result.labelCodes) {
                setLabelPages((prev) => {
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
    }, [flippingRoomId, getRoomPage, t]);

    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const rooms = conferenceController.conferenceRooms;
    const isFetching = conferenceController.isFetching;

    // Stats
    const occupiedCount = useMemo(() => rooms.filter((r) => r.hasMeeting).length, [rooms]);
    const availableCount = rooms.length - occupiedCount;

    const stats = useMemo(() => [
        { label: t('conference.totalRooms'), value: rooms.length },
        { label: t('conference.occupied'), value: occupiedCount, color: nativeColors.status.error },
        { label: t('conference.available'), value: availableCount, color: nativeColors.status.success },
    ], [t, rooms.length, occupiedCount, availableCount]);

    const filterChips = useMemo(() => [
        { label: t('conference.native.all', 'All'), value: 'all' },
        { label: t('conference.available'), value: 'available' },
        { label: t('conference.occupied'), value: 'occupied' },
    ], [t]);

    // Filter rooms
    const filteredRooms = useMemo(() => {
        let result = [...rooms];
        if (deferredSearch) {
            const q = deferredSearch.toLowerCase();
            result = result.filter((r) => {
                const name = r.roomName || r.data?.roomName || '';
                return r.id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
            });
        }
        if (statusFilter === 'available') result = result.filter((r) => !r.hasMeeting);
        else if (statusFilter === 'occupied') result = result.filter((r) => r.hasMeeting);
        return result;
    }, [rooms, deferredSearch, statusFilter]);

    const getRoomStatus = (room: ConferenceRoom): 'available' | 'occupied' | 'upcoming' => {
        if (room.hasMeeting) return 'occupied';
        return 'available';
    };

    const getMeetingInfo = (room: ConferenceRoom): string | undefined => {
        if (!room.hasMeeting || !room.meetingName) return undefined;
        const time = room.startTime && room.endTime
            ? ` (${room.startTime} – ${room.endTime})`
            : '';
        return `${room.meetingName}${time}`;
    };

    // Sections: occupied first, then available
    const occupiedRooms = useMemo(() => filteredRooms.filter((r) => r.hasMeeting), [filteredRooms]);
    const availableRooms = useMemo(() => filteredRooms.filter((r) => !r.hasMeeting), [filteredRooms]);

    const sections = useMemo(() => [
        {
            title: t('conference.occupied'),
            count: occupiedRooms.length,
            color: 'error' as const,
            items: occupiedRooms,
        },
        {
            title: t('conference.available'),
            count: availableRooms.length,
            color: 'success' as const,
            items: availableRooms,
        },
    ], [t, occupiedRooms, availableRooms]);

    const handleFilterChange = useCallback((v: string) => {
        setStatusFilter(v as StatusFilter);
    }, []);

    const handleItemTap = useCallback((room: ConferenceRoom) => {
        navigate(`/conference/${room.id}/edit`);
    }, [navigate]);

    const fetchRooms = conferenceController.fetchRooms;
    const handleRefresh = useCallback(async () => {
        await fetchRooms();
    }, [fetchRooms]);

    const renderRoomItem = useCallback((room: ConferenceRoom) => {
        if (!isSimpleMode) {
            return (
                <NativeRoomCard
                    roomName={room.roomName || room.data?.roomName || room.id}
                    status={getRoomStatus(room)}
                    meetingInfo={getMeetingInfo(room)}
                    participants={room.participants || []}
                />
            );
        }

        // Simple mode: show flip button alongside the room card
        const currentPage = getRoomPage(room);
        const isOccupied = currentPage === 2;
        const isFlipping = flippingRoomId === room.id;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <NativeRoomCard
                        roomName={room.roomName || room.data?.roomName || room.id}
                        status={isOccupied ? 'occupied' : 'available'}
                        meetingInfo={getMeetingInfo(room)}
                        participants={room.participants || []}
                    />
                </Box>
                <Tooltip title={isOccupied ? t('conference.setAvailable', 'Set Available') : t('conference.setOccupied', 'Set Occupied')}>
                    <span>
                        <IconButton
                            size="medium"
                            color={isOccupied ? 'success' : 'error'}
                            disabled={isFlipping}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFlipPage(room);
                            }}
                            sx={{ flexShrink: 0 }}
                        >
                            {isFlipping ? <CircularProgress size={20} /> : <FlipIcon />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSimpleMode, flippingRoomId, labelPages, handleFlipPage, t]);

    // Show skeleton on first load (no cached data yet)
    if (isFetching && rooms.length === 0) {
        return (
            <NativePage>
                <NativeListSkeleton showStatBar showChipBar />
            </NativePage>
        );
    }

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Stat bar */}
            <NativeStatBar stats={stats} />

            {/* Search row */}
            <Box sx={{ px: 1, py: 0.5 }}>
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('conference.searchPlaceholder')}
                />
            </Box>

            {/* Status filter chips */}
            <NativeChipBar
                chips={filterChips}
                activeValue={statusFilter}
                onChange={handleFilterChange}
            />

            {/* Grouped list */}
            <NativeGroupedList<ConferenceRoom>
                sections={sections}
                renderItem={renderRoomItem}
                onItemTap={handleItemTap}
                keyExtractor={(room) => room.id}
                emptyState={
                    <NativeEmptyState
                        icon={<MeetingRoomIcon />}
                        title={
                            searchQuery || statusFilter !== 'all'
                                ? t('conference.noRoomsMatching')
                                : t('conference.noRoomsYet')
                        }
                    />
                }
                fab={{ onClick: () => navigate('/conference/new') }}
            />

            {/* Flip page feedback snackbar (simple mode) */}
            <Snackbar
                open={!!flipSnackbar}
                autoHideDuration={3000}
                onClose={() => setFlipSnackbar(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setFlipSnackbar(null)}
                    severity={flipSnackbar?.severity ?? 'success'}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {flipSnackbar?.message}
                </Alert>
            </Snackbar>
        </NativePage>
    );
}
