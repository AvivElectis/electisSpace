import { Box, Typography, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState, useMemo, lazy, Suspense } from 'react';

// Features
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

// Lazy load dialogs - not needed on initial render
const SpaceDialog = lazy(() => import('@features/space/presentation/SpaceDialog').then(m => ({ default: m.SpaceDialog })));
const ConferenceRoomDialog = lazy(() => import('@features/conference/presentation/ConferenceRoomDialog').then(m => ({ default: m.ConferenceRoomDialog })));

// Extracted components
import {
    DashboardSpacesCard,
    DashboardConferenceCard,
    DashboardPeopleCard,
    DashboardAppInfoCard,
    DashboardSkeleton,
} from './components';

import type { Space, ConferenceRoom } from '@shared/domain/types';

/**
 * Dashboard Page - Refactored to use extracted sub-components
 * Overview of Spaces, Conference Rooms, and App Information
 */
export function DashboardPage() {
    const { t } = useTranslation();
    const settingsController = useSettingsController();
    const { getLabel } = useSpaceTypeLabels();
    const { syncState } = useSyncContext();

    // Controllers
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
        // SFTP mode props
        workingMode: settingsController.settings.workingMode,
        sftpCredentials: settingsController.settings.sftpCredentials,
        sftpCsvConfig: settingsController.settings.sftpCsvConfig,
    });

    const conferenceController = useConferenceController({
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
        // SFTP mode props
        workingMode: settingsController.settings.workingMode,
        sftpCredentials: settingsController.settings.sftpCredentials,
        sftpCsvConfig: settingsController.settings.sftpCsvConfig,
    });

    // Stats - Spaces
    const totalSpaces = spaceController.spaces.length;
    const spacesWithLabels = spaceController.spaces.filter((s) => s.labelCode).length;
    const spacesWithoutLabels = totalSpaces - spacesWithLabels;

    // Stats - Conference
    const totalRooms = conferenceController.conferenceRooms.length;
    const roomsWithLabels = conferenceController.conferenceRooms.filter((r) => r.labelCode).length;
    const roomsWithoutLabels = totalRooms - roomsWithLabels;
    const occupiedRooms = conferenceController.conferenceRooms.filter((r) => r.hasMeeting).length;
    const availableRooms = totalRooms - occupiedRooms;

    // Stats - People Manager
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore((state) => state.settings);
    const isPeopleManagerMode = settings.peopleManagerEnabled === true;
    const totalPeople = peopleStore.people.length;
    const assignedPeople = peopleStore.people.filter((p) => p.assignedSpaceId).length;
    const unassignedPeople = totalPeople - assignedPeople;
    const savedLists = peopleStore.peopleLists.length;

    // Calculate assigned labels dynamically from actual data
    // Count total assigned labels from assignedLabels arrays (from AIMS article fetch)
    const assignedLabelsCount = useMemo(() => {
        // Count all labels from spaces
        const spaceLabelsCount = spaceController.spaces.reduce(
            (count, s) => count + (s.assignedLabels?.length || 0),
            0
        );
        // Count all labels from conference rooms
        const conferenceLabelsCount = conferenceController.conferenceRooms.reduce(
            (count, r) => count + (r.assignedLabels?.length || 0),
            0
        );
        return spaceLabelsCount + conferenceLabelsCount;
    }, [spaceController.spaces, conferenceController.conferenceRooms]);

    // Dialogs State
    const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
    const [conferenceDialogOpen, setConferenceDialogOpen] = useState(false);

    // Handlers
    const handleAddSpace = async (spaceData: Partial<Space>) => {
        await spaceController.addSpace(spaceData);
    };

    const handleAddConferenceRoom = async (roomData: Partial<ConferenceRoom>) => {
        await conferenceController.addConferenceRoom(roomData);
    };

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
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {t('dashboard.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('dashboard.overview', 'Welcome to your space management dashboard')}
                </Typography>
            </Box>

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
                            onAddSpace={() => setSpaceDialogOpen(true)}
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
                        availableRooms={availableRooms}
                        occupiedRooms={occupiedRooms}
                        onAddRoom={() => setConferenceDialogOpen(true)}
                    />
                </Grid>

                {/* App Information (Full Width) */}
                <Grid size={{ xs: 12 }}>
                    <DashboardAppInfoCard
                        workingMode={settingsController.settings.workingMode}
                        spaceType={settingsController.settings.spaceType || 'chair'}
                        spaceTypeLabel={getLabel('singular')}
                        autoSyncEnabled={settingsController.settings.autoSyncEnabled}
                        syncInterval={settingsController.settings.solumConfig?.syncInterval || 60}
                        lastSync={syncState.lastSync}
                    />
                </Grid>
            </Grid>

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
            </Suspense>
        </Box>
    );
}
