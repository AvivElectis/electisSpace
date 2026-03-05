import { Box, Typography, Grid, Stack, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';

// Features
import api from '@shared/infrastructure/services/apiClient';
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
    DashboardCompassCard,
    DashboardSkeleton,
    QuickActionsPanel,
} from './components';

import type { Space, ConferenceRoom } from '@shared/domain/types';

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

    // Controllers
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    const conferenceController = useConferenceController({
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    // People store (before useEffect so fetchPeople is available)
    const peopleStore = usePeopleStore();

    // Feature access — dashboard only shows enabled sections
    const { canAccessFeature: can } = useAuthContext();
    const { activeCompanyId } = useAuthStore();
    const { storeSummary: aimsStoreSummary, labelModels: aimsLabelModels, fetchOverview: fetchAimsOverview } = useAimsOverview(activeStoreId);

    // Compass dashboard summary
    const [compassSummary, setCompassSummary] = useState<any>(null);
    const [compassLoading, setCompassLoading] = useState(false);

    // Fetch all data from server on mount / store switch so dashboard shows real counts
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            spaceController.fetchSpaces();
            conferenceController.fetchRooms();
            peopleStore.fetchPeople();
            if (can('aims-management')) {
                fetchAimsOverview();
            }
            if (can('compass') && activeCompanyId) {
                setCompassLoading(true);
                api.get(`/v2/admin/compass/dashboard/summary/${activeCompanyId}`)
                    .then(res => setCompassSummary(res.data.data))
                    .catch(() => setCompassSummary(null))
                    .finally(() => setCompassLoading(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId, can('aims-management'), can('compass')]);

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

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: isMobile ? 2 : 1.5 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                        {t('dashboard.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {t('dashboard.overview', 'Welcome to your space management dashboard')}
                    </Typography>
                </Box>
            </Stack>

            {/* Quick Actions — inline row on desktop/tablet */}
            {!isMobile && (
                <Box sx={{ mb: 3 }}>
                    <QuickActionsPanel
                        isPeopleManagerMode={isPeopleManagerMode}
                        onLinkLabel={() => setLinkLabelDialogOpen(true)}
                        onAddSpace={() => setSpaceDialogOpen(true)}
                        onAddConferenceRoom={() => setConferenceDialogOpen(true)}
                        showLabels={can('labels')}
                        showSpaces={can('spaces') || can('people')}
                        showConference={can('conference')}
                    />
                </Box>
            )}

            <Grid container spacing={{ xs: 1.5, md: 3 }}>
                {/* Spaces Area - Only show when feature enabled and People Manager mode is OFF */}
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

                {/* People Manager Area - Only show when feature enabled and People Manager mode is ON */}
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

                {/* Conference Area - Only show when feature is enabled */}
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

                {/* Compass Area - Only show when feature is enabled */}
                {can('compass') && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <DashboardCompassCard
                            summary={compassSummary}
                            loading={compassLoading}
                        />
                    </Grid>
                )}

                {/* AIMS Area - Only show when feature is enabled */}
                {can('aims-management') && (
                    <Grid size={{ xs: 12 }}>
                        <DashboardAimsCard
                            storeSummary={aimsStoreSummary}
                            labelModels={aimsLabelModels}
                            isMobile={isMobile}
                        />
                    </Grid>
                )}

            </Grid>

            {/* Bottom spacer so content isn't hidden behind the fixed FAB on mobile */}
            {isMobile && <Box sx={{ height: 104 }} />}

            {/* Mobile FAB Quick Actions — fixed position */}
            {isMobile && (
                <Box sx={{
                    position: 'fixed',
                    bottom: 16,
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
    );
}
