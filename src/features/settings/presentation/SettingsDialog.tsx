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
import { useSettingsController } from '../application/useSettingsController';

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
    const [currentTab, setCurrentTab] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);

    const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleSave = () => {
        try {
            // Settings are saved in real-time through controller
            // This just confirms and closes
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert(`Failed to save settings: ${error}`);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                setHasChanges(false);
                onClose();
            }
        } else {
            onClose();
        }
    };

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
                        onUpdate={(updates) => {
                            settingsController.updateSettings(updates);
                            setHasChanges(true);
                        }}
                        onNavigateToTab={(tabIndex) => setCurrentTab(tabIndex)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    <SFTPSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => {
                            settingsController.updateSettings(updates);
                            setHasChanges(true);
                        }}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    <SolumSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => {
                            settingsController.updateSettings(updates);
                            setHasChanges(true);
                        }}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={3}>
                    <LogoSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => {
                            settingsController.updateSettings(updates);
                            setHasChanges(true);
                        }}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={4}>
                    <SecuritySettingsTab
                        isPasswordProtected={settingsController.isPasswordProtected}
                        isLocked={settingsController.isLocked}
                        onSetPassword={(password) => {
                            settingsController.setPassword(password);
                            setHasChanges(true);
                        }}
                        onLock={() => settingsController.lock()}
                        onUnlock={(password) => settingsController.unlock(password)}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={5}>
                    <LogsViewerTab />
                </TabPanel>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>
                    {hasChanges ? t('common.cancel') : t('common.close')}
                </Button>
                {hasChanges && (
                    <Button variant="contained" onClick={handleSave}>
                        {t('settings.saveSettings')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
