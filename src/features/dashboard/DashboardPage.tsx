import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    Grid,
    Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

// Icons
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

import ErrorIcon from '@mui/icons-material/Error';
import BusinessIcon from '@mui/icons-material/Business';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // For time

// Features
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { SpaceDialog } from '@features/space/presentation/SpaceDialog';
import { ConferenceRoomDialog } from '@features/conference/presentation/ConferenceRoomDialog';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import type { Space, ConferenceRoom } from '@shared/domain/types';

/**
 * Dashboard Page
 * Overview of Spaces, Conference Rooms, and App Information
 */
export function DashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const settingsController = useSettingsController();
    const { getLabel } = useSpaceTypeLabels();
    const { syncState } = useSyncContext();

    // Controllers
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    const conferenceController = useConferenceController({
        solumConfig: settingsController.settings.solumConfig,
        solumToken: settingsController.settings.solumConfig?.tokens?.accessToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    // Stats - Spaces
    const totalSpaces = spaceController.spaces.length;
    const spacesWithLabels = spaceController.spaces.filter(s => s.labelCode).length;
    const spacesWithoutLabels = totalSpaces - spacesWithLabels;

    // Stats - Conference
    const totalRooms = conferenceController.conferenceRooms.length;
    const roomsWithLabels = conferenceController.conferenceRooms.filter(r => r.labelCode).length;
    const roomsWithoutLabels = totalRooms - roomsWithLabels;
    // const occupiedRooms = conferenceController.conferenceRooms.filter(r => r.hasMeeting).length; // Kept for future reference if layout changes
    // const availableRooms = totalRooms - occupiedRooms;

    // Stats - People Manager
    const peopleStore = usePeopleStore();
    const settings = useSettingsStore(state => state.settings);
    const isPeopleManagerMode = settings.peopleManagerEnabled === true;
    const totalPeople = peopleStore.people.length;
    const assignedPeople = peopleStore.people.filter(p => p.assignedSpaceId).length;
    const unassignedPeople = totalPeople - assignedPeople;
    //const totalPeopleSpaces = settings.peopleManagerConfig?.totalSpaces || 0;
    const savedLists = peopleStore.peopleLists.length;
    // Assigned labels from SoluM API store summary
    const assignedLabelsCount = settings.solumConfig?.storeSummary?.labelCount || 0;

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

    const StatusChip = ({ label, color, icon, ...props }: { label: string, color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning', icon?: React.ReactElement } & import('@mui/material').ChipProps) => (
        <Chip
            label={label}
            color={color}
            variant="filled" // Ensure visibility
            size="small"
            icon={icon}
            sx={{ fontWeight: 500, ...props.sx }}
            {...props}
        />
    );

    const getSpaceIcon = (type: string) => {
        switch (type) {
            case 'office': return <BusinessIcon />;
            case 'room': return <MeetingRoomIcon />;
            case 'chair': return <EventSeatIcon />;
            case 'person-tag': return <PersonIcon />;
            default: return <SettingsIcon />; // Fallback
        }
    };

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
                    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Stack direction="row" gap={1} alignItems="center">
                                    <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 28 } }}>
                                        {getSpaceIcon(settingsController.settings.spaceType.split('.').pop()?.toLowerCase() || 'chair')}
                                    </Box>
                                    <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                                        {getLabel('plural')}
                                    </Typography>
                                </Stack>
                                <Button
                                    variant="text"
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/spaces')}
                                >
                                    {t('dashboard.toSpaceType', { type: getLabel('plural') })}
                                </Button>
                            </Stack>

                            <Stack gap={3}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        {t('dashboard.totalSpaces', 'Total Spaces')}
                                    </Typography>
                                    <Typography variant="h3" fontWeight={600} color="primary.main">
                                        {totalSpaces}
                                    </Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('dashboard.withLabels')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500}>
                                                {spacesWithLabels}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('dashboard.withoutLabels')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="warning.main">
                                                {spacesWithoutLabels}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setSpaceDialogOpen(true)}
                                    sx={{ mt: 2, width: 'fit-content' }}
                                >
                                    {t('dashboard.addSpace', 'Add Space')}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                )}

                {/* People Manager Area - Only show when People Manager mode is ON */}
                {isPeopleManagerMode && (
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Stack direction="row" gap={1} alignItems="center">
                                    <PeopleIcon color="primary" sx={{ fontSize: 28 }} />
                                    <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                                        {t('people.title')}
                                    </Typography>
                                    {peopleStore.activeListName && (
                                        <Chip
                                            label={peopleStore.activeListName}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                                <Button
                                    variant="text"
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/people')}
                                >
                                    {t('dashboard.toPeople')}
                                </Button>
                            </Stack>

                            <Stack gap={3}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        {t('people.total')}
                                    </Typography>
                                    <Typography variant="h3" fontWeight={600} color="primary.main">
                                        {totalPeople}
                                    </Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('dashboard.assignedLabels')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="info.main">
                                                {assignedLabelsCount}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Stack direction="row" alignItems="center" gap={0.5}>
                                                <AssignmentIndIcon color="success" fontSize="small" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('people.assigned')}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="h5" fontWeight={500} color="success.main">
                                                {assignedPeople}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('people.unassigned')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="warning.main">
                                                {unassignedPeople}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    {savedLists > 0 && (
                                    <Grid size={{ xs: 6 }}>
                                        <Box>

                                            <Typography variant="h6" fontWeight={500}>
                                                {t('dashboard.savedLists', { count: savedLists })}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    )}
                                </Grid>

                                <Button
                                    variant="contained"
                                    startIcon={<PeopleIcon />}
                                    onClick={() => navigate('/people')}
                                    sx={{ mt: 2, width: 'fit-content' }}
                                >
                                    {t('dashboard.managePeople')}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                )}

                {/* Conference Area */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                                <Stack direction="row" gap={1} alignItems="center">
                                    <GroupsIcon color="primary" sx={{ fontSize: 28 }} />
                                    <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                                        {t('conference.title')}
                                    </Typography>
                                </Stack>
                                <Button
                                    variant="text"
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/conference')}
                                >
                                    {t('dashboard.toRooms', 'To Rooms')}
                                </Button>
                            </Stack>

                            <Stack gap={3}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        {t('dashboard.totalRooms', 'Total Rooms')}
                                    </Typography>
                                    <Typography variant="h3" fontWeight={600} color="primary.main">
                                        {totalRooms}
                                    </Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('dashboard.withLabels')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500}>
                                                {roomsWithLabels}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('dashboard.withoutLabels')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="warning.main">
                                                {roomsWithoutLabels}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('conference.available')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="success.main">
                                                {/* Calculate available rooms here or use variable if strictly defined above */}
                                                {totalRooms - conferenceController.conferenceRooms.filter(r => r.hasMeeting).length}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('conference.occupied')}
                                            </Typography>
                                            <Typography variant="h5" fontWeight={500} color="error.main">
                                                {conferenceController.conferenceRooms.filter(r => r.hasMeeting).length}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setConferenceDialogOpen(true)}
                                    sx={{ 
                                        mt: 2, 
                                        width: 'fit-content'
                                     }}
                                >
                                    {t('conference.addRoom')}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* App Information (Full Width) */}
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 3 }}>
                                <SettingsIcon color="action" />
                                <Typography variant="h6" fontWeight={600}>
                                    {t('dashboard.applicationInfo')}
                                </Typography>
                            </Stack>

                            <Grid container spacing={4}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Stack gap={1}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {t('sync.workingMode')}
                                        </Typography>
                                        <Box>
                                            {settingsController.settings.workingMode === 'SFTP' ? (
                                                <StatusChip label={t('sync.sftpMode')} color="info" icon={<SyncIcon />} />
                                            ) : (
                                                <StatusChip label={t('sync.solumMode')} color="primary" icon={<SyncIcon />} sx={{ bgcolor: 'primary.main', p: 1 }} />
                                            )}
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Stack gap={1}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {t('dashboard.spaceType')}
                                        </Typography>
                                        <Stack direction="row" alignItems="center" gap={1}>
                                            <Box sx={{ color: 'action.active', display: 'flex' }}>
                                                {getSpaceIcon(settingsController.settings.spaceType || 'chair')}
                                            </Box>
                                            <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                                                {getLabel('singular')}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Stack gap={1}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {t('dashboard.autoSync')}
                                        </Typography>
                                        <Stack direction="row" gap={1} alignItems="center">
                                            {settingsController.settings.autoSyncEnabled ? (
                                                <StatusChip
                                                    label={`${t('dashboard.every')} ${settingsController.settings.solumConfig?.syncInterval || 60}s`}
                                                    color="success"
                                                    icon={<AccessTimeIcon sx={{ width: 20, height: 20 }} />}
                                                    sx={{ px: .5, paddingInlineStart: 1 }}
                                                />
                                            ) : (
                                                <StatusChip
                                                    label={t('dashboard.disabled')}
                                                    color="default"
                                                    icon={<ErrorIcon />}
                                                />
                                            )}
                                            {syncState.lastSync && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mx: 2 }}>
                                                    (Last: {new Date(syncState.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialogs */}
            <SpaceDialog
                open={spaceDialogOpen}
                onClose={() => setSpaceDialogOpen(false)}
                onSave={handleAddSpace}
                workingMode={settingsController.settings.workingMode}
                solumMappingConfig={settingsController.settings.solumMappingConfig}
                csvConfig={settingsController.settings.csvConfig}
                spaceTypeLabel={getLabel('singular')}
                existingIds={spaceController.spaces.map(s => s.id)}
            />

            <ConferenceRoomDialog
                open={conferenceDialogOpen}
                onClose={() => setConferenceDialogOpen(false)}
                onSave={handleAddConferenceRoom}
                existingIds={conferenceController.conferenceRooms.map(r => r.id)}
            />
        </Box>
    );
}
