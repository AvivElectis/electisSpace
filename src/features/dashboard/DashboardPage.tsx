import { Grid, Card, CardContent, Typography, Box, Stack } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSyncController } from '@features/sync/application/useSyncController';
import { useSettingsController } from '@features/settings/application/useSettingsController';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactElement;
    color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <Card sx={{
            height: '100%',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3,
            }
        }}>
            <CardContent>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                backgroundColor: color,
                                borderRadius: 2,
                                p: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {icon}
                        </Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 500 }}>
                            {value}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {title}
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
}

/**
 * Dashboard Page - Fully Responsive
 */
export function DashboardPage() {
    const settingsController = useSettingsController();
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
    });
    const conferenceController = useConferenceController({});
    const syncController = useSyncController({
        csvConfig: settingsController.settings.csvConfig,
        onSpaceUpdate: (spaces) => spaceController.importFromSync(spaces),
    });

    const occupiedRooms = conferenceController.conferenceRooms.filter(r => r.hasMeeting).length;
    const syncStatus = syncController.syncState.isConnected ? 'Connected' : 'Disconnected';

    // Map space type to display label
    const spaceTypeLabels: Record<string, string> = {
        'office': 'Offices',
        'room': 'Rooms',
        'chair': 'Chairs',
        'person-tag': 'Person Tags',
    };
    const spaceTypeLabel = spaceTypeLabels[settingsController.settings.spaceType] || 'Spaces';

    return (
        <Box>
            {/* Stats Cards - Fully Responsive Grid with wider spacing */}
            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        title="Total Spaces"
                        value={spaceController.spaces.length}
                        icon={<BusinessIcon sx={{ color: 'white', fontSize: { xs: 28, sm: 32, md: 36 } }} />}
                        color="#2196F3"
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        title="Conference Rooms"
                        value={conferenceController.conferenceRooms.length}
                        icon={<MeetingRoomIcon sx={{ color: 'white', fontSize: { xs: 28, sm: 32, md: 36 } }} />}
                        color="#4CAF50"
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        title="Occupied Rooms"
                        value={occupiedRooms}
                        icon={<CheckCircleIcon sx={{ color: 'white', fontSize: { xs: 28, sm: 32, md: 36 } }} />}
                        color="#FF9800"
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        title="Sync Status"
                        value={syncStatus}
                        icon={<SyncIcon sx={{ color: 'white', fontSize: { xs: 28, sm: 32, md: 36 } }} />}
                        color={syncController.syncState.isConnected ? '#4CAF50' : '#F44336'}
                    />
                </Grid>
            </Grid>

            {/* System Information Card - Responsive */}
            <Box sx={{ mt: { xs: 3, md: 4 } }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            System Information
                        </Typography>

                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, minWidth: { xs: '100%', sm: '150px' } }}
                                >
                                    Working Mode:
                                </Typography>
                                <Typography variant="body2">
                                    {settingsController.settings.workingMode}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, minWidth: { xs: '100%', sm: '150px' } }}
                                >
                                    Space Type:
                                </Typography>
                                <Typography variant="body2">
                                    {spaceTypeLabel}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, minWidth: { xs: '100%', sm: '150px' } }}
                                >
                                    Auto-sync:
                                </Typography>
                                <Typography variant="body2">
                                    {settingsController.settings.autoSyncEnabled ?
                                        `Enabled (${settingsController.settings.autoSyncInterval}s)` :
                                        'Disabled'}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500, minWidth: { xs: '100%', sm: '150px' } }}
                                >
                                    Last Sync:
                                </Typography>
                                <Typography variant="body2">
                                    {syncController.syncState.lastSync
                                        ? new Date(syncController.syncState.lastSync).toLocaleString()
                                        : 'Never'}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
