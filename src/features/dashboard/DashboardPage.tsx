import { Box, Typography, Grid, Stack, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';

// Features
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
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

    // Fetch all data from server on mount / store switch so dashboard shows real counts
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            spaceController.fetchSpaces();
            conferenceController.fetchRooms();
            peopleStore.fetchPeople();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

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

    const conferenceAssignedLabelsCount = useMemo(() =>
        conferenceController.conferenceRooms.reduce((count, r) => count + (r.assignedLabels?.length || 0), 0),
        [conferenceController.conferenceRooms]
    );

    const assignedLabelsCount = spacesAssignedLabelsCount + conferenceAssignedLabelsCount;

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
        
        await labelsApi.link(activeStoreId, labelCode, articleId, templateName);
    }, [activeStoreId]);

    // Extract space type for icons
    const spaceTypeIcon = settingsController.settings.spaceType.split('.').pop()?.toLowerCase() || 'chair';

    // Show skeleton while initial sync is in progress
    const isInitialLoading = syncState.status === 'syncing' && !syncState.lastSync;

    if (isInitialLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: isMobile ? 2 : 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                        {t('dashboard.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {t('dashboard.overview', 'Welcome to your space management dashboard')}
                    </Typography>
                </Box>
            </Stack>

            <Grid container spacing={3}>
                {/* Spaces Area - Only show when People Manager mode is OFF */}
                {!isPeopleManagerMode && (
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
                        />
                    </Grid>
                )}

                {/* People Manager Area - Only show when People Manager mode is ON */}
                {isPeopleManagerMode && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <DashboardPeopleCard
                            totalPeople={totalPeople}
                            assignedPeople={assignedPeople}
                            unassignedPeople={unassignedPeople}
                            assignedLabelsCount={assignedLabelsCount}
                            savedLists={savedLists}
                            activeListName={peopleStore.activeListName}
                        />
                    </Grid>
                )}

                {/* Conference Area */}
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
                    />
                </Grid>

            </Grid>

            {/* Floating Quick Actions — liquid glass box, opposite side of sync indicator */}
            <Box sx={{
                position: 'fixed',
                bottom: { xs: 16, sm: 24 },
                insetInlineStart: { xs: 16, sm: 24 },
                zIndex: (theme) => theme.zIndex.fab,
            }}>
                <QuickActionsPanel
                    isPeopleManagerMode={isPeopleManagerMode}
                    onLinkLabel={() => setLinkLabelDialogOpen(true)}
                    onAddSpace={() => setSpaceDialogOpen(true)}
                    onAddConferenceRoom={() => setConferenceDialogOpen(true)}
                />
            </Box>

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
