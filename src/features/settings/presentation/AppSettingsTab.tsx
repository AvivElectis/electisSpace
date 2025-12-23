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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    return (
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* Application Info */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.applicationInfo')}
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label={t('settings.applicationName')}
                            value={settings.appName}
                            onChange={(e) => onUpdate({ appName: e.target.value })}
                            helperText={t('settings.displayedInHeader')}
                        />
                        <TextField
                            fullWidth
                            label={t('settings.applicationSubtitle')}
                            value={settings.appSubtitle}
                            onChange={(e) => onUpdate({ appSubtitle: e.target.value })}
                            helperText={t('settings.displayedBelowAppName')}
                        />
                    </Stack>
                </Box>

                <Divider />

                {/* Space Type */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.spaceTypeConfig')}
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>{t('settings.spaceType')}</InputLabel>
                        <Select
                            value={settings.spaceType}
                            label={t('settings.spaceType')}
                            onChange={(e) => onUpdate({ spaceType: e.target.value as any })}
                        >
                            <MenuItem value="office">{t('settings.offices')}</MenuItem>
                            <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                            <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                            <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('settings.affectsLabels')}
                    </Typography>
                </Box>

                <Divider />

                {/* Working Mode */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.syncMode')}
                    </Typography>

                    <FormControl fullWidth>
                        <InputLabel>{t('settings.workingMode')}</InputLabel>
                        <Select
                            value={settings.workingMode}
                            label={t('settings.workingMode')}
                            onChange={(e) => onUpdate({ workingMode: e.target.value as any })}
                        >
                            <MenuItem value="SFTP">{t('sync.sftpMode')}</MenuItem>
                            <MenuItem value="SOLUM_API">{t('sync.solumMode')}</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Mode Info Alert */}
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>
                            {settings.workingMode === 'SFTP' ? t('settings.sftpModeActive') : t('settings.solumModeActive')}
                        </strong>
                        <br />
                        {settings.workingMode === 'SFTP'
                            ? t('settings.usingCsvSync')
                            : t('settings.usingSolumApi')
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
                            {t('settings.goToSettings').replace('{mode}', settings.workingMode === 'SFTP' ? 'SFTP' : 'SoluM')}
                        </Button>
                    )}
                </Box>

                <Divider />

                {/* Auto-Sync */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.autoSyncSettings')}
                    </Typography>
                    <Stack spacing={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.autoSyncEnabled}
                                    onChange={(e) => onUpdate({ autoSyncEnabled: e.target.checked })}
                                />
                            }
                            label={t('settings.enableAutoSync')}
                        />
                        {settings.autoSyncEnabled && (
                            <TextField
                                fullWidth
                                type="number"
                                label={t('settings.autoSyncInterval')}
                                value={settings.autoSyncInterval}
                                onChange={(e) => onUpdate({ autoSyncInterval: Number(e.target.value) })}
                                inputProps={{ min: 30, max: 3600 }}
                                helperText={t('settings.syncFrequency')}
                            />
                        )}
                    </Stack>
                </Box>

                <Divider />

                {/* Update Settings */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('update.updateSettings')}
                    </Typography>
                    <Stack spacing={2}>
                        {/* Current Version */}
                        <TextField
                            fullWidth
                            label={t('update.currentVersion')}
                            value="v0.1.0"
                            InputProps={{
                                readOnly: true,
                            }}
                            variant="filled"
                        />

                        {/* Auto-Update Toggle */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.autoUpdateEnabled ?? true}
                                    onChange={(e) => onUpdate({ autoUpdateEnabled: e.target.checked })}
                                />
                            }
                            label={t('update.autoUpdate')}
                        />

                        {/* Check Interval */}
                        {(settings.autoUpdateEnabled ?? true) && (
                            <TextField
                                fullWidth
                                type="number"
                                label={t('update.checkInterval')}
                                value={settings.updateCheckInterval ?? 24}
                                onChange={(e) => onUpdate({ updateCheckInterval: Number(e.target.value) })}
                                inputProps={{ min: 12, max: 168 }}
                                helperText={t('update.checkIntervalHelper')}
                            />
                        )}

                        {/* Manual Check Button */}
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                                // Manual check will be triggered via useUpdateController
                                // For now, just show a notification
                                console.log('Manual update check triggered');
                            }}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {t('update.checkForUpdates')}
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
