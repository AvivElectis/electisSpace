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
import { useState, lazy, Suspense, type SyntheticEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useSettingsController } from '../application/useSettingsController';
import { useAutoLock } from '../application/useAutoLock';
import { useSettingsStore } from '../infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

// Lazy load all tabs - they have heavy dependencies
const AppSettingsTab = lazy(() => import('./AppSettingsTab').then(m => ({ default: m.AppSettingsTab })));
const SFTPSettingsTab = lazy(() => import('./SFTPSettingsTab').then(m => ({ default: m.SFTPSettingsTab })));
const SolumSettingsTab = lazy(() => import('./SolumSettingsTab').then(m => ({ default: m.SolumSettingsTab })));
const LogoSettingsTab = lazy(() => import('./LogoSettingsTab').then(m => ({ default: m.LogoSettingsTab })));
const SecuritySettingsTab = lazy(() => import('./SecuritySettingsTab').then(m => ({ default: m.SecuritySettingsTab })));
const LogsViewerTab = lazy(() => import('./LogsViewerTab').then(m => ({ default: m.LogsViewerTab })));
const UnlockDialog = lazy(() => import('./UnlockDialog').then(m => ({ default: m.UnlockDialog })));
const UsersSettingsTab = lazy(() => import('./UsersSettingsTab').then(m => ({ default: m.UsersSettingsTab })));

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
    const { user } = useAuthStore(); // Get current user
    const [currentTab, setCurrentTab] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Check if user is platform admin or has store admin role
    const isAdmin = user?.globalRole === 'PLATFORM_ADMIN' || 
        user?.stores?.some(s => s.role === 'STORE_ADMIN');

    // Define Tabs Configuration
    const tabs = [
        { label: t('settings.appSettings'), panel: <AppSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} /> },
        { label: t('settings.sftpSettings'), panel: <SFTPSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} onHasUnsavedChanges={setHasUnsavedChanges} />, hidden: true }, // Keep hidden
        { label: t('settings.solumSettings'), panel: <SolumSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} /> },
        { label: t('settings.logoSettings'), panel: <LogoSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} /> },
        { label: t('settings.securitySettings'), panel: <SecuritySettingsTab isPasswordProtected={settingsController.isPasswordProtected} isLocked={settingsController.isLocked} settings={settingsController.settings} onSetPassword={(password) => settingsController.setPassword(password)} onLock={() => settingsController.lock()} onUnlock={(password) => settingsController.unlock(password)} onUpdate={(updates) => settingsController.updateSettings(updates)} /> },
        { label: t('settings.logViewer'), panel: <LogsViewerTab />, noPadding: isMobile },
    ];

    // Add Users Tab for Admins
    if (isAdmin) {
        tabs.splice(5, 0, { // Insert before LogViewer
            label: t('settings.users.title'),
            panel: <UsersSettingsTab />
        });
    }

    // Enable auto-lock functionality
    useAutoLock();

    // Check for unsaved changes before tab switch
    const handleTabChange = useCallback(async (_event: SyntheticEvent, newValue: number) => {
        // Validation logic for SFTP tab (if it were visible/active) would go here
        // Since we are using a robust config now, we could check if tabs[currentTab] has unsaved changes logic
        // But for now, preserving existing SFTPSettingsTab specific check requires knowing if we are leaving that specific tab.
        // Given SFTP tab is hidden (`hidden: true`), this check might be redundant or needs adaptation.
        // For safety, I'll clear unsaved changes on switch if we aren't careful.
        // Actually, the previous code hardcoded `currentTab === 1`. 
        // With dynamic tabs, `1` might not be SFTP.
        // However, looking at the code, SFTP is hidden/disabled anyway. So I'll simplify.

        setCurrentTab(newValue);
    }, []);

    // Track when dialog closes to update last access time
    const handleClose = useCallback(async () => {
        // Check for unsaved changes before closing
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: t('common.dialog.warning'),
                message: t('settings.unsavedChangesWarning'),
                confirmLabel: t('settings.discardChanges'),
                cancelLabel: t('common.cancel'),
                severity: 'warning',
            });

            if (!confirmed) {
                return; // Don't close
            }
        }
        // Update last access timestamp when closing settings
        updateSettings({ lastSettingsAccess: Date.now() });
        onClose();
    }, [hasUnsavedChanges, confirm, t, updateSettings, onClose]);

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
                    {tabs.map((tab, index) => (
                        <Tab
                            key={index}
                            label={tab.label}
                            sx={tab.hidden ? { display: 'none' } : {}}
                            disabled={tab.hidden}
                        />
                    ))}
                </Tabs>
            </Box>

            <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
                <Suspense fallback={<TabLoadingFallback />}>
                    {tabs.map((tab, index) => (
                        <TabPanel key={index} value={currentTab} index={index} noPadding={tab.noPadding}>
                            {tab.panel}
                        </TabPanel>
                    ))}
                </Suspense>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {t('common.close')}
                </Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
