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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateController } from '@features/update/application/useUpdateController';
import { useSettingsStore } from '../infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import type { SettingsData } from '../domain/types';
import type { WorkingMode } from '@shared/domain/types';

interface AppSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
    onNavigateToTab?: (tabIndex: number) => void;
}

/**
 * Helper function to clear all data stores
 * Uses dynamic imports to avoid circular dependencies
 */
async function clearAllDataStores(): Promise<void> {
    const { useSpacesStore } = await import('@features/space/infrastructure/spacesStore');
    const { usePeopleStore } = await import('@features/people/infrastructure/peopleStore');
    const { useConferenceStore } = await import('@features/conference/infrastructure/conferenceStore');
    
    useSpacesStore.getState().clearAllData();
    usePeopleStore.getState().clearAllData();
    useConferenceStore.getState().clearAllData();
}

/**
 * App Settings Tab
 * General application configuration with mode navigation
 */
export function AppSettingsTab({ settings, onUpdate, onNavigateToTab }: AppSettingsTabProps) {
    const { t } = useTranslation();
    const { clearModeCredentials } = useSettingsStore();
    const [pendingMode, setPendingMode] = useState<WorkingMode | null>(null);
    const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const {
        currentVersion,
        checking,
        checkForUpdates,
        updateInfo,
    } = useUpdateController();

    const handleCheckForUpdates = async () => {
        await checkForUpdates();
    };

    const handleModeChange = (newMode: WorkingMode) => {
        if (newMode !== settings.workingMode) {
            // Show confirmation dialog for mode switch
            setPendingMode(newMode);
            setShowModeSwitchDialog(true);
            logger.info('Settings', `Mode switch requested: ${settings.workingMode} → ${newMode}`);
        }
    };

    const handleConfirmModeSwitch = async () => {
        if (pendingMode) {
            setIsSwitching(true);
            const currentMode = settings.workingMode;
            
            logger.info('Settings', `Switching working mode from ${currentMode} to ${pendingMode}`);
            
            // Clear all data stores using async helper
            await clearAllDataStores();
            logger.info('Settings', 'Cleared all data stores (spaces, people, conference rooms)');
            
            // Clear old mode credentials and mappings
            clearModeCredentials(currentMode);
            logger.info('Settings', `Cleared credentials for ${currentMode} mode`);
            
            // Switch to new mode
            onUpdate({ workingMode: pendingMode });
            logger.info('Settings', `Successfully switched to ${pendingMode} mode`);
            
            setIsSwitching(false);
        }
        setShowModeSwitchDialog(false);
        setPendingMode(null);
    };

    const handleCancelModeSwitch = () => {
        setShowModeSwitchDialog(false);
        setPendingMode(null);
    };

    return (
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            {/* Mode Switch Confirmation Dialog */}
            <Dialog
                open={showModeSwitchDialog}
                onClose={isSwitching ? undefined : handleCancelModeSwitch}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    {t('settings.switchModeTitle')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('settings.switchModeWarning')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelModeSwitch} disabled={isSwitching}>
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        onClick={handleConfirmModeSwitch} 
                        color="warning" 
                        variant="contained"
                        autoFocus
                        disabled={isSwitching}
                        startIcon={isSwitching ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {isSwitching ? t('common.loading') : t('settings.switchMode')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Stack gap={2}>
                {/* Application Info */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.applicationInfo')}
                    </Typography>
                    <Stack gap={1.5}>
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
                            onChange={(e) => handleModeChange(e.target.value as WorkingMode)}
                        >
                            <MenuItem value="SFTP">{t('sync.sftpMode')}</MenuItem>
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



                {/* Update Settings */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('update.updateSettings')}
                    </Typography>
                    <Stack gap={1.5}>
                        {/* Current Version */}
                        <TextField
                            size="small"
                            label={t('update.currentVersion')}
                            value={`v${currentVersion}`}
                            InputProps={{
                                readOnly: true,
                               
                            }}
                            sx={{ width: 'fit-content'}}
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

                        {/* Manual Check Button */}
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={
                                checking ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : (
                                    <CloudDownloadIcon />
                                )
                            }
                            onClick={handleCheckForUpdates}
                            disabled={checking}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {checking
                                ? t('update.checking')
                                : t('update.checkForUpdates')}
                        </Button>

                        {/* Update Status */}
                        {updateInfo && (
                            <Alert severity="info" icon={<CheckCircleIcon />} sx={{ py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {t('update.newVersion', { version: updateInfo.version })}
                                </Typography>
                            </Alert>
                        )}

                        {!checking && !updateInfo && currentVersion && (
                            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {t('update.upToDate')}
                                </Typography>
                            </Alert>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
