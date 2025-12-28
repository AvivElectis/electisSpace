import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Box,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettingsTab } from './AppSettingsTab';
import { SFTPSettingsTab } from './SFTPSettingsTab';
import { SolumSettingsTab } from './SolumSettingsTab';
import { LogoSettingsTab } from './LogoSettingsTab';
import { SecuritySettingsTab } from './SecuritySettingsTab';
import { LogsViewerTab } from './LogsViewerTab';
import { UnlockDialog } from './UnlockDialog';
import { useSettingsController } from '../application/useSettingsController';
import { useAutoLock } from '../application/useAutoLock';
import { useSettingsStore } from '../infrastructure/settingsStore';

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

/**
 * Settings Dialog with Tabs
 * Comprehensive settings UI for all app configuration
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
    const { t } = useTranslation();
    const settingsController = useSettingsController();
    const { updateSettings } = useSettingsStore();
    const [currentTab, setCurrentTab] = useState(0);

    // Enable auto-lock functionality
    useAutoLock();

    const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    // Track when dialog closes to update last access time
    const handleClose = () => {
        // Update last access timestamp when closing settings
        updateSettings({ lastSettingsAccess: Date.now() });
        onClose();
    };

    // If locked, show unlock dialog instead
    if (settingsController.isLocked) {
        return (
            <UnlockDialog
                open={open}
                onClose={handleClose}
                onUnlock={(password) => {
                    const success = settingsController.unlock(password);
                    if (success) {
                        // Update last access time on successful unlock
                        updateSettings({ lastSettingsAccess: Date.now() });
                    }
                    return success;
                }}
            />
        );
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    height: '80vh',
                    maxHeight: '800px'
                }
            }}
        >
            <DialogTitle>
                {t('settings.title')}
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        insetInlineEnd: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label={t('settings.appSettings')} />
                    <Tab
                        label={t('settings.sftpSettings')}
                        disabled={settingsController.settings.workingMode !== 'SFTP'}
                    />
                    <Tab
                        label={t('settings.solumSettings')}
                        disabled={settingsController.settings.workingMode !== 'SOLUM_API'}
                    />
                    <Tab label={t('settings.logoSettings')} />
                    <Tab label={t('settings.securitySettings')} />
                    <Tab label={t('settings.logViewer')} />
                </Tabs>
            </Box>

            <DialogContent dividers sx={{ p: 0 }}>
                <TabPanel value={currentTab} index={0}>
                    <AppSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                        onNavigateToTab={(tabIndex) => setCurrentTab(tabIndex)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    <SFTPSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    <SolumSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={3}>
                    <LogoSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={4}>
                    <SecuritySettingsTab
                        isPasswordProtected={settingsController.isPasswordProtected}
                        isLocked={settingsController.isLocked}
                        settings={settingsController.settings}
                        onSetPassword={(password) => settingsController.setPassword(password)}
                        onLock={() => settingsController.lock()}
                        onUnlock={(password) => settingsController.unlock(password)}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={5}>
                    <LogsViewerTab />
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
