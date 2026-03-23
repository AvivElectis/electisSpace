import { useEffect, useMemo, useState, useDeferredValue, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

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

    // Fetch rooms on mount / store switch
    useEffect(() => {
        if (isAppReady && activeStoreId && settings.workingMode === 'SOLUM_API' && settings.solumConfig) {
            conferenceController.fetchRooms().catch(() => {
                if (solumToken && settings.solumMappingConfig) {
                    conferenceController.fetchFromSolum().catch(() => {});
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const rooms = conferenceController.conferenceRooms;

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

    const handleRefresh = useCallback(async () => {
        await conferenceController.fetchRooms();
    }, [conferenceController]);

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
                renderItem={(room) => (
                    <NativeRoomCard
                        roomName={room.roomName || room.data?.roomName || room.id}
                        status={getRoomStatus(room)}
                        meetingInfo={getMeetingInfo(room)}
                        participants={room.participants || []}
                    />
                )}
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
        </NativePage>
    );
}
