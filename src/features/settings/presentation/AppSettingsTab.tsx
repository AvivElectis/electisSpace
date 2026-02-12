import {
    Box,
    TextField,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Divider,
    Button,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../infrastructure/settingsStore';
import { logger } from '@shared/infrastructure/services/logger';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import type { SettingsData } from '../domain/types';
import type { WorkingMode } from '@shared/domain/types';

interface AppSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * Helper function to clear all data stores
 * Uses static imports
 */
function clearAllDataStores(): void {
    useSpacesStore.getState().clearAllData();
    usePeopleStore.getState().clearAllData();
    useConferenceStore.getState().clearAllData();
}

/**
 * App Settings Tab
 * General application configuration with mode navigation
 */
export function AppSettingsTab({ settings, onUpdate }: AppSettingsTabProps) {
    const { t } = useTranslation();
    const { clearModeCredentials } = useSettingsStore();
    const [pendingMode, setPendingMode] = useState<WorkingMode | null>(null);
    const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    // Mode switching logic removed/deprecated
    /*
    const handleModeChange = (newMode: WorkingMode) => {
        if (newMode !== settings.workingMode) {
             // ...
        }
    };
    */

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

                {/* Working Mode (Hidden/Deprecated - SoluM API Only) */}
                {/* 
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.syncMode')}
                    </Typography>
                     ... Removed selector ...
                </Box>
                */}

            </Stack>
        </Box>
    );
}
