import { useEffect, useMemo, useCallback, lazy, Suspense, useState, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import LinkIcon from '@mui/icons-material/Link';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

// Data hooks — same as DashboardPage
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAimsOverview } from '@features/aims-management/application/useAimsOverview';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { logger } from '@shared/infrastructure/services/logger';

// Dashboard cards (reuse mobile layout)
import {
    DashboardSpacesCard,
    DashboardConferenceCard,
    DashboardPeopleCard,
    DashboardAimsCard,
} from '../../components';

// Native shell components
import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeFAB } from '@shared/presentation/native/NativeFAB';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { NativeSwipeCarousel } from './NativeSwipeCarousel';

// Lazy-load add dialogs (same as DashboardPage)
const SpaceDialog = lazy(() =>
    import('@features/space/presentation/SpaceDialog').then((m) => ({ default: m.SpaceDialog }))
);
const ConferenceRoomDialog = lazy(() =>
    import('@features/conference/presentation/ConferenceRoomDialog').then((m) => ({
        default: m.ConferenceRoomDialog,
    }))
);

import type { Space, ConferenceRoom } from '@shared/domain/types';

/**
 * NativeDashboardPage — Android-native dashboard with swipeable stat cards.
 * Mirrors DashboardPage data logic but renders via NativePage + NativeSwipeCarousel.
 */
export function NativeDashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Set app bar title
    useSetNativeTitle(t('navigation.dashboard'));

    const activeStoreId = useAuthStore((s) => s.activeStoreId);
    const isAppReady = useAuthStore((s) => s.isAppReady);
    const { push } = useBackendSyncContext();
    const settingsController = useSettingsController();
    const { getLabel } = useSpaceTypeLabels();

    const [isSyncing, setIsSyncing] = useState(false);
    const lastFetchedRef = useRef(0);

    // Sync push callback
    const handleSync = useCallback(async () => {
        if (!activeStoreId) return;
        try {
            await push();
        } catch (error: any) {
            logger.warn('NativeDashboardPage', 'Sync push failed', { error: error?.message });
        }
    }, [activeStoreId, push]);

    // Full sync for the dashboard quick button
    const handleSyncNow = useCallback(async () => {
        if (!activeStoreId || isSyncing) return;
        setIsSyncing(true);
        try {
            await push();
        } catch (error: any) {
            logger.warn('NativeDashboardPage', 'Quick sync failed', { error: error?.message });
        } finally {
            setIsSyncing(false);
        }
    }, [activeStoreId, isSyncing, push]);

    // Controllers
    const spaceController = useSpaceController({
        onSync: handleSync,
        csvConfig: settingsController.settings.csvConfig,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    const conferenceController = useConferenceController({
        onSync: handleSync,
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    const peopleFetchPeople = usePeopleStore((s) => s.fetchPeople);
    const people = usePeopleStore((s) => s.people);
    const peopleLists = usePeopleStore((s) => s.peopleLists);
    const activeListName = usePeopleStore((s) => s.activeListName);

    // Feature access
    const { canAccessFeature: can } = useAuthContext();
    const canAccessAims = can('aims-management');

    const { storeSummary: aimsStoreSummary, labelModels: aimsLabelModels, fetchOverview: fetchAimsOverview } =
        useAimsOverview(activeStoreId);

    // Fetch data on mount / store switch (skip if data is less than 30 seconds old)
    useEffect(() => {
        if (!isAppReady || !activeStoreId) return;
        if (Date.now() - lastFetchedRef.current < 30_000) return; // Fresh enough
        lastFetchedRef.current = Date.now();
        spaceController.fetchSpaces();
        conferenceController.fetchRooms();
        peopleFetchPeople();
        if (canAccessAims) {
            fetchAimsOverview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId, canAccessAims]);

    // --- Stats: Spaces ---
    const totalSpaces = spaceController.spaces.length;
    const spacesWithLabels = spaceController.spaces.filter(
        (s) => s.labelCode || (s.assignedLabels && s.assignedLabels.length > 0)
    ).length;
    const spacesWithoutLabels = totalSpaces - spacesWithLabels;

    const spacesAssignedLabelsCount = useMemo(
        () => spaceController.spaces.reduce((count, s) => count + (s.assignedLabels?.length || 0), 0),
        [spaceController.spaces]
    );

    // --- Stats: Conference ---
    const totalRooms = conferenceController.conferenceRooms.length;
    const roomsWithLabels = conferenceController.conferenceRooms.filter(
        (r) => r.labelCode || (r.assignedLabels && r.assignedLabels.length > 0)
    ).length;
    const roomsWithoutLabels = totalRooms - roomsWithLabels;
    const occupiedRooms = conferenceController.conferenceRooms.filter((r) => r.hasMeeting).length;
    const availableRooms = totalRooms - occupiedRooms;

    const conferenceAssignedLabelsCount = useMemo(
        () =>
            conferenceController.conferenceRooms.reduce(
                (count, r) => count + (r.assignedLabels?.length || 0),
                0
            ),
        [conferenceController.conferenceRooms]
    );

    // --- Stats: People ---
    const settings = useSettingsStore((state) => state.settings);
    const isPeopleManagerMode = settings.peopleManagerEnabled === true;
    const totalPeople = people.length;
    const assignedPeople = people.filter((p) => p.assignedSpaceId).length;
    const unassignedPeople = totalPeople - assignedPeople;
    const savedLists = peopleLists.length;

    const peopleAssignedLabelsCount = useMemo(
        () => people.reduce((count, p) => count + (p.assignedLabels?.length || 0), 0),
        [people]
    );

    const spaceTypeIcon =
        settingsController.settings.spaceType.split('.').pop()?.toLowerCase() || 'chair';

    // --- Dialog state ---
    const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
    const [conferenceDialogOpen, setConferenceDialogOpen] = useState(false);

    const handleAddSpace = async (spaceData: Partial<Space>) => {
        await spaceController.addSpace(spaceData);
    };

    const handleAddConferenceRoom = async (roomData: Partial<ConferenceRoom>) => {
        await conferenceController.addConferenceRoom(roomData);
    };

    // --- Pull-to-refresh ---
    const handleRefresh = useCallback(async () => {
        if (!isAppReady || !activeStoreId) return;
        const promises: Promise<void>[] = [
            spaceController.fetchSpaces(),
            conferenceController.fetchRooms(),
            peopleFetchPeople(),
        ];
        if (canAccessAims) {
            promises.push(fetchAimsOverview());
        }
        await Promise.all(promises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId, canAccessAims]);

    // --- Build carousel slides (respect feature flags) ---
    const slides = [
        can('spaces') && !isPeopleManagerMode && (
            <DashboardSpacesCard
                key="spaces"
                spaceTypeIcon={spaceTypeIcon}
                spaceTypeLabel={getLabel('plural')}
                totalSpaces={totalSpaces}
                spacesWithLabels={spacesWithLabels}
                spacesWithoutLabels={spacesWithoutLabels}
                assignedLabelsCount={spacesAssignedLabelsCount}
                onAddSpace={() => setSpaceDialogOpen(true)}
                hideAddButton
                isMobile
            />
        ),
        can('people') && isPeopleManagerMode && (
            <DashboardPeopleCard
                key="people"
                totalPeople={totalPeople}
                assignedPeople={assignedPeople}
                unassignedPeople={unassignedPeople}
                assignedLabelsCount={peopleAssignedLabelsCount}
                savedLists={savedLists}
                activeListName={activeListName}
                isMobile
            />
        ),
        can('conference') && (
            <DashboardConferenceCard
                key="conference"
                totalRooms={totalRooms}
                roomsWithLabels={roomsWithLabels}
                roomsWithoutLabels={roomsWithoutLabels}
                assignedLabelsCount={conferenceAssignedLabelsCount}
                availableRooms={availableRooms}
                occupiedRooms={occupiedRooms}
                onAddRoom={() => setConferenceDialogOpen(true)}
                hideAddButton
                isMobile
            />
        ),
        can('aims-management') && (
            <DashboardAimsCard
                key="aims"
                storeSummary={aimsStoreSummary}
                labelModels={aimsLabelModels}
                isMobile
                onSyncNow={handleSyncNow}
                isSyncing={isSyncing}
            />
        ),
    ].filter(Boolean) as React.ReactNode[];

    // --- FAB actions — driven by enabled features, not hardcoded ---
    const featureActions: { feature: string; icon: ReactNode; label: string; route: string }[] = useMemo(() => [
        {
            feature: isPeopleManagerMode ? 'people' : 'spaces',
            icon: isPeopleManagerMode ? <PersonAddIcon /> : <AddBusinessIcon />,
            label: isPeopleManagerMode
                ? t('dashboard.addPerson', 'Add Person')
                : t('dashboard.addSpace', 'Add Space'),
            route: isPeopleManagerMode ? '/people/new' : '/spaces/new',
        },
        {
            feature: 'conference',
            icon: <MeetingRoomIcon />,
            label: t('conference.addRoom', 'Add Room'),
            route: '/conference/new',
        },
        {
            feature: 'labels',
            icon: <LinkIcon />,
            label: t('dashboard.linkLabel'),
            route: '/labels/link',
        },
    ], [isPeopleManagerMode, t]);

    const fabActions = featureActions
        .filter(action => can(action.feature as any))
        .map(({ icon, label, route }) => ({
            icon,
            label,
            onClick: () => navigate(route),
        }));

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Carousel — slides handle their own horizontal padding */}
            <Box sx={{ pt: 1 }}>
                <NativeSwipeCarousel>
                    {slides}
                </NativeSwipeCarousel>
            </Box>

            {/* Bottom spacer so last card isn't hidden behind FAB */}
            <Box sx={{ height: 80 }} />

            {/* FAB — only show if there are actions available */}
            {fabActions.length > 0 && <NativeFAB actions={fabActions} />}

            {/* Dialogs */}
            <Suspense fallback={null}>
                {spaceDialogOpen && (
                    <SpaceDialog
                        open={spaceDialogOpen}
                        onClose={() => setSpaceDialogOpen(false)}
                        onSave={handleAddSpace}
                        workingMode={settingsController.settings.workingMode}
                        solumMappingConfig={settingsController.settings.solumMappingConfig}
                        csvConfig={settingsController.settings.csvConfig}
                        spaceTypeLabel={getLabel('singular')}
                        existingIds={spaceController.spaces.map((s) => s.id)}
                    />
                )}

                {conferenceDialogOpen && (
                    <ConferenceRoomDialog
                        open={conferenceDialogOpen}
                        onClose={() => setConferenceDialogOpen(false)}
                        onSave={handleAddConferenceRoom}
                        existingIds={conferenceController.conferenceRooms.map((r) => r.id)}
                    />
                )}
            </Suspense>
        </NativePage>
    );
}
