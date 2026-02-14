import { Box, Typography, Grid, Button, Stack, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';

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
    const { activeStoreId } = useAuthStore();

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
                <Stack
                    direction="column"
                    spacing={1.5}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        background: (theme) =>
                            theme.palette.mode === 'dark'
                                ? `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.25)} 100%)`
                                : `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
                        backdropFilter: 'blur(40px) saturate(2)',
                        WebkitBackdropFilter: 'blur(40px) saturate(2)',
                        border: (theme) =>
                            theme.palette.mode === 'dark'
                                ? `1px solid ${alpha(theme.palette.primary.light, 0.2)}`
                                : `1.5px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        boxShadow: (theme) =>
                            theme.palette.mode === 'dark'
                                ? `0 12px 40px ${alpha(theme.palette.common.black, 0.45)}, inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.1)}, inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.2)}`
                                : `0 12px 40px ${alpha(theme.palette.primary.main, 0.12)}, 0 4px 12px ${alpha(theme.palette.common.black, 0.06)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.9)}`,
                    }}
                >
                    <Button
                        variant="contained"
                        startIcon={<LinkIcon />}
                        onClick={() => setLinkLabelDialogOpen(true)}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1.2,
                            fontSize: '0.9rem',
                            boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                        }}
                    >
                        {t('dashboard.linkLabel', 'Link Label')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setSpaceDialogOpen(true)}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3,
                            py: 1,
                            fontSize: '0.85rem',
                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderColor: 'primary.main',
                            },
                        }}
                    >
                        {isPeopleManagerMode
                            ? t('dashboard.addPerson', 'Add Person')
                            : t('dashboard.addSpace', 'Add Space')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<GroupsIcon />}
                        onClick={() => setConferenceDialogOpen(true)}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3,
                            py: 1,
                            fontSize: '0.85rem',
                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                borderColor: 'primary.main',
                            },
                        }}
                    >
                        {t('conference.addRoom')}
                    </Button>
                </Stack>
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
