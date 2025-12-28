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
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            <Stack spacing={2}>
                {/* Application Info */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.applicationInfo')}
                    </Typography>
                    <Stack spacing={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.applicationName')}
                            value={settings.appName}
                            onChange={(e) => onUpdate({ appName: e.target.value })}
                            helperText={t('settings.displayedInHeader')}
                        />
                        <TextField
                            fullWidth
                            size="small"
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.spaceTypeConfig')}
                    </Typography>
                    <FormControl fullWidth size="small">
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
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {t('settings.affectsLabels')}
                    </Typography>
                </Box>

                <Divider />

                {/* Working Mode */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.syncMode')}
                    </Typography>

                    <FormControl fullWidth size="small">
                        <InputLabel>{t('settings.workingMode')}</InputLabel>
                        <Select
                            value={settings.workingMode}
                            label={t('settings.workingMode')}
                            onChange={(e) => onUpdate({ workingMode: e.target.value as any })}
                        >
                            {/* <MenuItem value="SFTP">{t('sync.sftpMode')}</MenuItem> */}
                            <MenuItem value="SOLUM_API">{t('sync.solumMode')}</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Mode Info Alert */}
                    <Alert severity="info" sx={{ mt: 1.5, py: 0, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            <strong>
                                {settings.workingMode === 'SFTP' ? t('settings.sftpModeActive') : t('settings.solumModeActive')}
                            </strong>
                            {' - '}
                            {settings.workingMode === 'SFTP'
                                ? t('settings.usingCsvSync')
                                : t('settings.usingSolumApi')
                            }
                        </Typography>
                    </Alert>

                    {/* Navigate to Mode Settings */}
                    {onNavigateToTab && (
                        <Button
                            variant="text"
                            color="primary"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => onNavigateToTab(settings.workingMode === 'SFTP' ? 1 : 2)}
                            sx={{ mt: 1, width: 'fit-content' }}
                        >
                            {t('settings.goToSettings').replace('{mode}', settings.workingMode === 'SFTP' ? 'SFTP' : 'SoluM')}
                        </Button>
                    )}
                </Box>

                <Divider />

                {/* Auto-Sync */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.autoSyncSettings')}
                    </Typography>
                    <Stack spacing={1.5}>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={settings.autoSyncEnabled}
                                    onChange={(e) => onUpdate({ autoSyncEnabled: e.target.checked })}
                                />
                            }
                            label={<Typography variant="body2">{t('settings.enableAutoSync')}</Typography>}
                        />
                        {settings.autoSyncEnabled && (
                            <TextField
                                fullWidth
                                size="small"
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('update.updateSettings')}
                    </Typography>
                    <Stack spacing={1.5}>
                        {/* Current Version */}
                        <TextField
                            fullWidth
                            size="small"
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
                                    size="small"
                                    checked={settings.autoUpdateEnabled ?? true}
                                    onChange={(e) => onUpdate({ autoUpdateEnabled: e.target.checked })}
                                />
                            }
                            label={<Typography variant="body2">{t('update.autoUpdate')}</Typography>}
                        />

                        {/* Check Interval - Removed as we only check on load */}


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
