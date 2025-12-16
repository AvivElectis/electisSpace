import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Chip,
} from '@mui/material';
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

/**
 * Dashboard Page
 * Overview of app status and quick stats
 */
export function DashboardPage() {
    const settingsController = useSettingsController();
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
    });
    const { getLabel } = useSpaceTypeLabels();

    const totalSpaces = spaceController.spaces.length;
    const spacesWithLabels = spaceController.spaces.filter(s => s.labelCode).length;
    const spacesWithoutLabels = totalSpaces - spacesWithLabels;

    return (
        <Box>
            {/* Dashboard Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Welcome to {settingsController.settings.appName}
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 4 }}
            >
                {/* Total Spaces */}
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Total {getLabel('plural')}
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'primary.main' }}>
                            {totalSpaces}
                        </Typography>
                    </CardContent>
                </Card>

                {/* With Labels */}
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            With Labels
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'success.main' }}>
                            {spacesWithLabels}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Without Labels */}
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Without Labels
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'warning.main' }}>
                            {spacesWithoutLabels}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Working Mode */}
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Working Mode
                        </Typography>
                        <Chip
                            label={settingsController.settings.workingMode === 'SFTP' ? 'SFTP' : 'SoluM API'}
                            color="primary"
                            sx={{ mt: 1, fontSize: '1rem', height: 36 }}
                        />
                    </CardContent>
                </Card>
            </Stack>

            {/* App Info */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Application Information
                    </Typography>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Space Type
                            </Typography>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {settingsController.settings.spaceType}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Auto-Sync
                            </Typography>
                            <Typography variant="body1">
                                {settingsController.settings.autoSyncEnabled
                                    ? `Enabled (every ${settingsController.settings.autoSyncInterval}s)`
                                    : 'Disabled'
                                }
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
