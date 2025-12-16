import {
    Box,
    TextField,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Typography,
    Divider,
    Button,
    Alert,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { SettingsData } from '../domain/types';

interface AppSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
    onNavigateToTab?: (tabIndex: number) => void;
}

/**
 * App Settings Tab
 * General application configuration with mode navigation
 */
export function AppSettingsTab({ settings, onUpdate, onNavigateToTab }: AppSettingsTabProps) {
    return (
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* Application Info */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Application Information
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Application Name"
                            value={settings.appName}
                            onChange={(e) => onUpdate({ appName: e.target.value })}
                            helperText="Displayed in header and title bar"
                        />
                        <TextField
                            fullWidth
                            label="Application Subtitle"
                            value={settings.appSubtitle}
                            onChange={(e) => onUpdate({ appSubtitle: e.target.value })}
                            helperText="Displayed below app name"
                        />
                    </Stack>
                </Box>

                <Divider />

                {/* Space Type */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Space Type Configuration
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Space Type</InputLabel>
                        <Select
                            value={settings.spaceType}
                            label="Space Type"
                            onChange={(e) => onUpdate({ spaceType: e.target.value as any })}
                        >
                            <MenuItem value="office">Offices</MenuItem>
                            <MenuItem value="room">Rooms</MenuItem>
                            <MenuItem value="chair">Chairs</MenuItem>
                            <MenuItem value="person-tag">Person Tags</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        This affects labels throughout the application (e.g., "Add Room" vs "Add Chair")
                    </Typography>
                </Box>

                <Divider />

                {/* Working Mode */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Synchronization Mode
                    </Typography>

                    <FormControl fullWidth>
                        <InputLabel>Working Mode</InputLabel>
                        <Select
                            value={settings.workingMode}
                            label="Working Mode"
                            onChange={(e) => onUpdate({ workingMode: e.target.value as any })}
                        >
                            <MenuItem value="SFTP">SFTP (CSV Files)</MenuItem>
                            <MenuItem value="SOLUM_API">SoluM API</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Mode Info Alert */}
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>
                            {settings.workingMode === 'SFTP' ? 'SFTP Mode Active' : 'SoluM API Mode Active'}
                        </strong>
                        <br />
                        {settings.workingMode === 'SFTP'
                            ? 'Using CSV file synchronization via SFTP server. SoluM settings are disabled.'
                            : 'Using SoluM ESL API integration. SFTP settings are disabled.'
                        }
                    </Alert>

                    {/* Navigate to Mode Settings */}
                    {onNavigateToTab && (
                        <Button
                            variant="text"
                            color="primary"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => onNavigateToTab(settings.workingMode === 'SFTP' ? 1 : 2)}
                            sx={{ mt: 2 }}
                        >
                            Go to {settings.workingMode === 'SFTP' ? 'SFTP' : 'SoluM'} Settings
                        </Button>
                    )}
                </Box>

                <Divider />

                {/* Auto-Sync */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Auto-Sync Settings
                    </Typography>
                    <Stack spacing={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.autoSyncEnabled}
                                    onChange={(e) => onUpdate({ autoSyncEnabled: e.target.checked })}
                                />
                            }
                            label="Enable Auto-Sync"
                        />
                        {settings.autoSyncEnabled && (
                            <TextField
                                fullWidth
                                type="number"
                                label="Auto-Sync Interval (seconds)"
                                value={settings.autoSyncInterval}
                                onChange={(e) => onUpdate({ autoSyncInterval: Number(e.target.value) })}
                                inputProps={{ min: 30, max: 3600 }}
                                helperText="Frequency of automatic synchronization (30-3600 seconds)"
                            />
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
