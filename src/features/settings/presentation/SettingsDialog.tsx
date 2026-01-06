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
    CircularProgress,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, lazy, Suspense, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsController } from '../application/useSettingsController';
import { useAutoLock } from '../application/useAutoLock';
import { useSettingsStore } from '../infrastructure/settingsStore';

// Lazy load all tabs - they have heavy dependencies
const AppSettingsTab = lazy(() => import('./AppSettingsTab').then(m => ({ default: m.AppSettingsTab })));
const SolumSettingsTab = lazy(() => import('./SolumSettingsTab').then(m => ({ default: m.SolumSettingsTab })));
const LogoSettingsTab = lazy(() => import('./LogoSettingsTab').then(m => ({ default: m.LogoSettingsTab })));
const SecuritySettingsTab = lazy(() => import('./SecuritySettingsTab').then(m => ({ default: m.SecuritySettingsTab })));
const LogsViewerTab = lazy(() => import('./LogsViewerTab').then(m => ({ default: m.LogsViewerTab })));
const UnlockDialog = lazy(() => import('./UnlockDialog').then(m => ({ default: m.UnlockDialog })));

// Tab loading fallback
function TabLoadingFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
        </Box>
    );
}

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
    noPadding?: boolean;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, noPadding, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            style={{ height: noPadding ? '100%' : 'auto' }}
            {...other}
        >
            {value === index && <Box sx={{ py: noPadding ? 0 : 3, height: noPadding ? '100%' : 'auto' }}>{children}</Box>}
        </div>
    );
}

/**
 * Settings Dialog with Tabs
 * Comprehensive settings UI for all app configuration
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
            <Suspense fallback={<TabLoadingFallback />}>
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
            </Suspense>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    height: isMobile ? '100%' : '80vh',
                    maxHeight: isMobile ? '100%' : '800px',
                    px: { xs: 0.5, sm: 1 },
                    borderRadius: isMobile ? 0 : undefined,
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

            <Box>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 0,
                        '& .MuiTab-root': {
                            border: '1px solid transparent',
                            borderRadius: 2,
                            '&.Mui-selected': {
                                border: '1px solid',
                                borderColor: 'primary',
                                boxShadow: '2px 0 1px 1px rgba(68, 68, 68, 0.09)',
                            }
                        }
                    }}
                    TabIndicatorProps={{ sx: { display: 'none' } }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label={t('settings.appSettings')} />
                    <Tab
                        label={t('settings.sftpSettings')}
                        disabled={true} // {settingsController.settings.workingMode !== 'SFTP'}
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

            <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
                <Suspense fallback={<TabLoadingFallback />}>
                    <TabPanel value={currentTab} index={0}>
                        <AppSettingsTab
                            settings={settingsController.settings}
                            onUpdate={(updates) => settingsController.updateSettings(updates)}
                            onNavigateToTab={(tabIndex) => setCurrentTab(tabIndex)}
                        />
                    </TabPanel>

                    {/* SFTP Panel Disabled
                    <TabPanel value={currentTab} index={1}>
                        <SFTPSettingsTab
                            settings={settingsController.settings}
                            onUpdate={(updates) => settingsController.updateSettings(updates)}
                        />
                    </TabPanel>
                    */}

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

                    <TabPanel value={currentTab} index={5} noPadding={isMobile}>
                        <LogsViewerTab />
                    </TabPanel>
                </Suspense>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
