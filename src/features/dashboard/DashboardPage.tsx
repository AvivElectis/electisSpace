import { Box, Typography, Grid, Stack, useMediaQuery, useTheme, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PullToRefresh } from '@shared/presentation/components/PullToRefresh';
import { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react';

// Features
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAimsOverview } from '@features/aims-management/application/useAimsOverview';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
import { syncApi } from '@shared/infrastructure/services/syncApi';
import { logger } from '@shared/infrastructure/services/logger';

// Lazy load dialogs - not needed on initial render
const SpaceDialog = lazy(() => import('@features/space/presentation/SpaceDialog').then(m => ({ default: m.SpaceDialog })));
const ConferenceRoomDialog = lazy(() => import('@features/conference/presentation/ConferenceRoomDialog').then(m => ({ default: m.ConferenceRoomDialog })));
const LinkLabelDialog = lazy(() => import('@features/labels/presentation/LinkLabelDialog').then(m => ({ default: m.LinkLabelDialog })));

// Extracted components
import {
    DashboardSpacesCard,
    DashboardConferenceCard,
    DashboardPeopleCard,
    DashboardAimsCard,
    DashboardSkeleton,
    QuickActionsPanel,
} from './components';

import type { Space, ConferenceRoom } from '@shared/domain/types';

// ======================
// Mobile Carousel — horizontal swipe with dot indicators
// ======================

function DashboardMobileCarousel({ sections }: { sections: (React.ReactNode | false)[] }) {
    const theme = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartX = useRef(0);

    // Filter out false/null sections
    const validSections = sections.filter(Boolean) as React.ReactNode[];
    const isRtl = theme.direction === 'rtl';

    const goTo = (index: number) => {
        setActiveIndex(Math.max(0, Math.min(index, validSections.length - 1)));
    };

    // Swipe detection via touch events
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        const threshold = 50; // minimum swipe distance
        if (Math.abs(delta) < threshold) return;

        // In RTL, swipe directions are reversed
        const swipedLeft = isRtl ? delta > 0 : delta < 0;
        if (swipedLeft) {
            goTo(activeIndex + 1);
        } else {
            goTo(activeIndex - 1);
        }
    };

    if (validSections.length === 0) return null;
    if (validSections.length === 1) return <Box>{validSections[0]}</Box>;

    return (
        <Box>
            {/* Dot indicators with counter */}
            <Stack direction="row" justifyContent="center" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ minWidth: 32, textAlign: 'end' }}>
                    {activeIndex + 1}/{validSections.length}
                </Typography>
                {validSections.map((_, i) => (
                    <Box
                        key={i}
                        onClick={() => goTo(i)}
                        sx={{
                            width: activeIndex === i ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: activeIndex === i
                                ? 'primary.main'
                                : (t) => alpha(t.palette.text.primary, 0.2),
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                        }}
                    />
                ))}
            </Stack>

            {/* Slide container — state-driven, no scroll needed */}
            <Box
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                sx={{ overflow: 'hidden' }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        width: `${validSections.length * 100}%`,
                        transition: 'transform 0.3s ease',
                        // In RTL the track starts on the right, so translate positively to move left
                        // In LTR the track starts on the left, so translate negatively to move left
                        transform: `translateX(${isRtl ? '' : '-'}${activeIndex * (100 / validSections.length)}%)`,
                    }}
                >
                    {validSections.map((section, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: `${100 / validSections.length}%`,
                                flexShrink: 0,
                                boxSizing: 'border-box',
                            }}
                        >
                            {section}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}

/**
 * Dashboard Page - Refactored to use extracted sub-components
 * Overview of Spaces, Conference Rooms, and App Information
 */
export function DashboardPage() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const settingsController = useSettingsController();
    const { getLabel } = useSpaceTypeLabels();
    const { syncState } = useSyncContext();
    const { activeStoreId, isAppReady } = useAuthStore();

    // Sync push callback for CRUD operations
    const handleSync = useCallback(async () => {
        if (!activeStoreId) return;
        try {
            await syncApi.push(activeStoreId);
        } catch (error: any) {
            logger.warn('DashboardPage', 'Sync push failed', { error: error?.message });
        }
    }, [activeStoreId]);

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

    // People store (before useEffect so fetchPeople is available)
    const peopleStore = usePeopleStore();

    // Feature access — dashboard only shows enabled sections
    const { canAccessFeature: can } = useAuthContext();
    const canAccessAims = can('aims-management');
    const { storeSummary: aimsStoreSummary, labelModels: aimsLabelModels, fetchOverview: fetchAimsOverview } = useAimsOverview(activeStoreId);

    // Fetch all data from server on mount / store switch so dashboard shows real counts
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            spaceController.fetchSpaces();
            conferenceController.fetchRooms();
            peopleStore.fetchPeople();
            if (canAccessAims) {
                fetchAimsOverview();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId, canAccessAims]);

    // Stats - Spaces
    const totalSpaces = spaceController.spaces.length;
    const spacesWithLabels = spaceController.spaces.filter((s) => s.labelCode || (s.assignedLabels && s.assignedLabels.length > 0)).length;
    const spacesWithoutLabels = totalSpaces - spacesWithLabels;

    // Stats - Conference
    const totalRooms = conferenceController.conferenceRooms.length;
    const roomsWithLabels = conferenceController.conferenceRooms.filter((r) => r.labelCode || (r.assignedLabels && r.assignedLabels.length > 0)).length;
    const roomsWithoutLabels = totalRooms - roomsWithLabels;
    const occupiedRooms = conferenceController.conferenceRooms.filter((r) => r.hasMeeting).length;
    const availableRooms = totalRooms - occupiedRooms;

    // Stats - People Manager
    const settings = useSettingsStore((state) => state.settings);
    const isPeopleManagerMode = settings.peopleManagerEnabled === true;
    const totalPeople = peopleStore.people.length;
    const assignedPeople = peopleStore.people.filter((p) => p.assignedSpaceId).length;
    const unassignedPeople = totalPeople - assignedPeople;
    const savedLists = peopleStore.peopleLists.length;

    // Calculate assigned labels dynamically from actual data
    // Count total assigned labels from assignedLabels arrays (from AIMS article fetch)
    const spacesAssignedLabelsCount = useMemo(() =>
        spaceController.spaces.reduce((count, s) => count + (s.assignedLabels?.length || 0), 0),
        [spaceController.spaces]
    );

    const peopleAssignedLabelsCount = useMemo(() =>
        peopleStore.people.reduce((count, p) => count + (p.assignedLabels?.length || 0), 0),
        [peopleStore.people]
    );

    const conferenceAssignedLabelsCount = useMemo(() =>
        conferenceController.conferenceRooms.reduce((count, r) => count + (r.assignedLabels?.length || 0), 0),
        [conferenceController.conferenceRooms]
    );

    // Dialogs State
    const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
    const [conferenceDialogOpen, setConferenceDialogOpen] = useState(false);
    const [linkLabelDialogOpen, setLinkLabelDialogOpen] = useState(false);

    // Handlers
    const handleAddSpace = async (spaceData: Partial<Space>) => {
        await spaceController.addSpace(spaceData);
    };

    const handleAddConferenceRoom = async (roomData: Partial<ConferenceRoom>) => {
        await conferenceController.addConferenceRoom(roomData);
    };

    // Link label handler - uses server API with company credentials
    const handleLinkLabel = useCallback(async (labelCode: string, articleId: string, templateName?: string) => {
        if (!activeStoreId) return;

        try {
            await labelsApi.link(activeStoreId, labelCode, articleId, templateName);
        } catch (error: any) {
            // Extract the server error message from the axios response
            const serverMessage = error.response?.data?.error?.message
                || error.response?.data?.message
                || error.message
                || 'Failed to link label';
            throw new Error(serverMessage);
        }
    }, [activeStoreId]);

    // Extract space type for icons
    const spaceTypeIcon = settingsController.settings.spaceType.split('.').pop()?.toLowerCase() || 'chair';

    // Show skeleton while initial sync is in progress
    const isInitialLoading = syncState.status === 'syncing' && !syncState.lastSync;

    if (isInitialLoading) {
        return <DashboardSkeleton isMobile={isMobile} />;
    }

    const handleRefresh = async () => {
        if (!isAppReady || !activeStoreId) return;
        spaceController.fetchSpaces();
        conferenceController.fetchRooms();
        peopleStore.fetchPeople();
        if (canAccessAims) {
            await fetchAimsOverview();
        }
    };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
        <Box>
            {/* Header + Quick Actions inline */}
            <Stack direction="row" alignItems="center" gap={2} sx={{ mb: { xs: 2, md: 2 } }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                        {t('dashboard.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {t('dashboard.overview', 'Welcome to your space management dashboard')}
                    </Typography>
                </Box>
                {!isMobile && (
                    <QuickActionsPanel
                        isPeopleManagerMode={isPeopleManagerMode}
                        onLinkLabel={() => setLinkLabelDialogOpen(true)}
                        onAddSpace={() => setSpaceDialogOpen(true)}
                        onAddConferenceRoom={() => setConferenceDialogOpen(true)}
                        showLabels={can('labels')}
                        showSpaces={can('spaces') || can('people')}
                        showConference={can('conference')}
                    />
                )}
            </Stack>

            {/* Dashboard Sections */}
            {isMobile ? (
                <DashboardMobileCarousel
                    sections={[
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
                                hideAddButton={isMobile}
                                isMobile={isMobile}
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
                                activeListName={peopleStore.activeListName}
                                isMobile={isMobile}
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
                                hideAddButton={isMobile}
                                isMobile={isMobile}
                            />
                        ),
                        can('aims-management') && (
                            <DashboardAimsCard
                                key="aims"
                                storeSummary={aimsStoreSummary}
                                labelModels={aimsLabelModels}
                                isMobile={isMobile}
                            />
                        ),
                    ]}
                />
            ) : (
                <Grid container spacing={3}>
                    {can('spaces') && !isPeopleManagerMode && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardSpacesCard
                                spaceTypeIcon={spaceTypeIcon}
                                spaceTypeLabel={getLabel('plural')}
                                totalSpaces={totalSpaces}
                                spacesWithLabels={spacesWithLabels}
                                spacesWithoutLabels={spacesWithoutLabels}
                                assignedLabelsCount={spacesAssignedLabelsCount}
                                onAddSpace={() => setSpaceDialogOpen(true)}
                                hideAddButton={isMobile}
                                isMobile={isMobile}
                            />
                        </Grid>
                    )}
                    {can('people') && isPeopleManagerMode && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardPeopleCard
                                totalPeople={totalPeople}
                                assignedPeople={assignedPeople}
                                unassignedPeople={unassignedPeople}
                                assignedLabelsCount={peopleAssignedLabelsCount}
                                savedLists={savedLists}
                                activeListName={peopleStore.activeListName}
                                isMobile={isMobile}
                            />
                        </Grid>
                    )}
                    {can('conference') && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardConferenceCard
                                totalRooms={totalRooms}
                                roomsWithLabels={roomsWithLabels}
                                roomsWithoutLabels={roomsWithoutLabels}
                                assignedLabelsCount={conferenceAssignedLabelsCount}
                                availableRooms={availableRooms}
                                occupiedRooms={occupiedRooms}
                                onAddRoom={() => setConferenceDialogOpen(true)}
                                hideAddButton={isMobile}
                                isMobile={isMobile}
                            />
                        </Grid>
                    )}
                    {can('aims-management') && (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <DashboardAimsCard
                                storeSummary={aimsStoreSummary}
                                labelModels={aimsLabelModels}
                                isMobile={isMobile}
                            />
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Bottom spacer so content isn't hidden behind the fixed FAB on mobile */}
            {isMobile && <Box sx={{ height: 104 }} />}

            {/* Mobile FAB Quick Actions — fixed position */}
            {isMobile && (
                <Box sx={{
                    position: 'fixed',
                    bottom: 'calc(16px + var(--native-bottom-nav-offset, 0px))',
                    insetInlineStart: 16,
                    zIndex: (theme) => theme.zIndex.fab,
                }}>
                    <QuickActionsPanel
                        isPeopleManagerMode={isPeopleManagerMode}
                        onLinkLabel={() => setLinkLabelDialogOpen(true)}
                        onAddSpace={() => setSpaceDialogOpen(true)}
                        onAddConferenceRoom={() => setConferenceDialogOpen(true)}
                        showLabels={can('labels')}
                        showSpaces={can('spaces') || can('people')}
                        showConference={can('conference')}
                        isMobile
                    />
                </Box>
            )}

            {/* Dialogs - Lazy loaded */}
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

                {linkLabelDialogOpen && (
                    <LinkLabelDialog
                        open={linkLabelDialogOpen}
                        onClose={() => setLinkLabelDialogOpen(false)}
                        onLink={handleLinkLabel}
                    />
                )}
            </Suspense>
        </Box>
        </PullToRefresh>
    );
}
