import {
    Box,
    TextField,
    Stack,
    Typography,
    Button,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Paper,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../infrastructure/settingsStore';
import { useOnboardingStore } from '@shared/application/onboardingStore';
import { useNotifications } from '@shared/infrastructure/store/notificationStore';
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

function clearAllDataStores(): void {
    useSpacesStore.getState().clearAllData();
    usePeopleStore.getState().clearAllData();
    useConferenceStore.getState().clearAllData();
}

/**
 * App Settings Tab
 * General application configuration
 */
export function AppSettingsTab({ settings, onUpdate }: AppSettingsTabProps) {
    const { t } = useTranslation();
    const { clearModeCredentials } = useSettingsStore();
    const resetAllTours = useOnboardingStore((s) => s.resetAllTours);
    const { showSuccess } = useNotifications();
    const [pendingMode, setPendingMode] = useState<WorkingMode | null>(null);
    const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    const handleConfirmModeSwitch = async () => {
        if (pendingMode) {
            setIsSwitching(true);
            const currentMode = settings.workingMode;

            logger.info('Settings', `Switching working mode from ${currentMode} to ${pendingMode}`);
            await clearAllDataStores();
            logger.info('Settings', 'Cleared all data stores (spaces, people, conference rooms)');

            clearModeCredentials(currentMode);
            logger.info('Settings', `Cleared credentials for ${currentMode} mode`);

            onUpdate({ workingMode: pendingMode });
            logger.info('Settings', `Successfully switched to ${pendingMode} mode`);

            setIsSwitching(false);
        }
        setShowModeSwitchDialog(false);
        setPendingMode(null);
    };

    const handleRestartTours = () => {
        resetAllTours();
        showSuccess(t('onboarding.settings.restartToursSuccess'));
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
                <DialogActions sx={{ px: 3, py: 2 }}>
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

            <Stack gap={2.5}>
                {/* Application Info Section */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                        {t('settings.applicationInfo')}
                    </Typography>
                    <Stack gap={2}>
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
                </Paper>

                {/* Guided Tours Section */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {t('onboarding.settings.restartTours')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('onboarding.settings.restartToursDescription')}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={handleRestartTours} sx={{ borderRadius: '24px' }}>
                        {t('onboarding.settings.restartTours')}
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
}
