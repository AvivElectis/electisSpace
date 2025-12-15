import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Switch,
    FormControlLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { useState } from 'react';
import { useSettingsController } from '../application/useSettingsController';

/**
 * Settings Page - Application Configuration
 */
export function SettingsPage() {
    const settingsController = useSettingsController();
    const [appName, setAppName] = useState(settingsController.settings.appName);
    const [appSubtitle, setAppSubtitle] = useState(settingsController.settings.appSubtitle);
    const [spaceType, setSpaceType] = useState(settingsController.settings.spaceType);
    const [workingMode, setWorkingMode] = useState(settingsController.settings.workingMode);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(settingsController.settings.autoSyncEnabled);
    const [autoSyncInterval, setAutoSyncInterval] = useState(settingsController.settings.autoSyncInterval);

    const handleSave = () => {
        try {
            settingsController.updateSettings({
                appName,
                appSubtitle,
                spaceType,
                workingMode,
                autoSyncEnabled,
                autoSyncInterval,
            });
            alert('Settings saved successfully!');
        } catch (error) {
            alert(`Failed to save settings: ${error}`);
        }
    };

    const handleExport = async () => {
        try {
            const password = window.prompt('Enter a password to encrypt the export (optional):');
            await settingsController.exportSettings(password || undefined);
            alert('Settings exported successfully!');
        } catch (error) {
            alert(`Export failed: ${error}`);
        }
    };

    const handleImport = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.zip';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const password = window.prompt('Enter the password if the file is encrypted (leave empty if not):');
                    await settingsController.importSettings(file, password || undefined);
                    alert('Settings imported successfully!');
                    // Reload state
                    setAppName(settingsController.settings.appName);
                    setAppSubtitle(settingsController.settings.appSubtitle);
                    setSpaceType(settingsController.settings.spaceType);
                    setWorkingMode(settingsController.settings.workingMode);
                    setAutoSyncEnabled(settingsController.settings.autoSyncEnabled);
                    setAutoSyncInterval(settingsController.settings.autoSyncInterval);
                } catch (error) {
                    alert(`Import failed: ${error}`);
                }
            }
        };
        input.click();
    };

    return (
        <Box>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configure application settings and preferences
                </Typography>
            </Box>

            {/* App Information */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Application Information
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Application Name"
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="Application Subtitle"
                            value={appSubtitle}
                            onChange={(e) => setAppSubtitle(e.target.value)}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Space Type</InputLabel>
                            <Select
                                value={spaceType}
                                label="Space Type"
                                onChange={(e) => setSpaceType(e.target.value as any)}
                            >
                                <MenuItem value="office">Offices</MenuItem>
                                <MenuItem value="room">Rooms</MenuItem>
                                <MenuItem value="chair">Chairs</MenuItem>
                                <MenuItem value="person-tag">Person Tags</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Sync Settings */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Synchronization Settings
                    </Typography>
                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>Working Mode</InputLabel>
                            <Select
                                value={workingMode}
                                label="Working Mode"
                                onChange={(e) => setWorkingMode(e.target.value as any)}
                            >
                                <MenuItem value="SFTP">SFTP</MenuItem>
                                <MenuItem value="SOLUM_API">SoluM API</MenuItem>
                            </Select>
                        </FormControl>

                        <Divider />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={autoSyncEnabled}
                                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                                />
                            }
                            label="Enable Auto-Sync"
                        />

                        {autoSyncEnabled && (
                            <TextField
                                fullWidth
                                type="number"
                                label="Auto-Sync Interval (seconds)"
                                value={autoSyncInterval}
                                onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                                inputProps={{ min: 30 }}
                            />
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Actions */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    sx={{ flex: 1 }}
                >
                    Save Settings
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    sx={{ flex: 1 }}
                >
                    Export Settings
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={handleImport}
                    sx={{ flex: 1 }}
                >
                    Import Settings
                </Button>
            </Stack>
        </Box>
    );
}
