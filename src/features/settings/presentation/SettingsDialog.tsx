import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    IconButton,
    useMediaQuery,
    useTheme,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Tabs,
    Tab,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
// CloudIcon removed — SoluM Settings tab consolidated into Company Settings
import ImageIcon from '@mui/icons-material/Image';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useState, lazy, Suspense, type SyntheticEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useSettingsController } from '../application/useSettingsController';
import { useAutoLock } from '../application/useAutoLock';
import { useSettingsStore } from '../infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { SphereLoader } from '@shared/presentation/components/SphereLoader';

// Lazy load all tabs - they have heavy dependencies
const AppSettingsTab = lazy(() => import('./AppSettingsTab').then(m => ({ default: m.AppSettingsTab })));
// SolumSettingsTab removed — AIMS settings consolidated into Company Settings dialog
const LogoSettingsTab = lazy(() => import('./LogoSettingsTab').then(m => ({ default: m.LogoSettingsTab })));
const SecuritySettingsTab = lazy(() => import('./SecuritySettingsTab').then(m => ({ default: m.SecuritySettingsTab })));
const LogsViewerTab = lazy(() => import('./LogsViewerTab').then(m => ({ default: m.LogsViewerTab })));
const UnlockDialog = lazy(() => import('./UnlockDialog').then(m => ({ default: m.UnlockDialog })));
const UsersSettingsTab = lazy(() => import('./UsersSettingsTab').then(m => ({ default: m.UsersSettingsTab })));
const CompaniesTab = lazy(() => import('./CompaniesTab').then(m => ({ default: m.CompaniesTab })));
const RolesTab = lazy(() => import('./RolesTab').then(m => ({ default: m.RolesTab })));

// Tab loading fallback
function TabLoadingFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <SphereLoader width={180} height={140} />
        </Box>
    );
}

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

interface TabConfig {
    label: string;
    icon: React.ReactElement;
    panel: React.ReactElement;
    noPadding?: boolean;
}

/**
 * Settings Dialog with responsive layout
 * Desktop/Tablet: Vertical sidebar navigation + content area
 * Mobile: Horizontal scrollable tabs + full-screen content
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const settingsController = useSettingsController();
    const { updateSettings } = useSettingsStore();
    const { user } = useAuthStore();
    const [currentTab, setCurrentTab] = useState(0);
    const [hasUnsavedChanges] = useState(false);
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Check if user is platform admin or has admin role
    const isPlatformAdmin = user?.globalRole === 'PLATFORM_ADMIN';
    const isCompanyAdmin = user?.companies?.some(c => c.roleId === 'role-admin');
    const isAdmin = isPlatformAdmin || isCompanyAdmin ||
        user?.stores?.some(s => s.roleId === 'role-admin');

    // Build tabs array
    const baseTabs: TabConfig[] = [
        {
            label: t('settings.appSettings'),
            icon: <SettingsIcon />,
            panel: <AppSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
        // SoluM Settings tab removed — AIMS settings are now in Company Settings dialog
        {
            label: t('settings.logoSettings'),
            icon: <ImageIcon />,
            panel: <LogoSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
        {
            label: t('settings.securitySettings'),
            icon: <SecurityIcon />,
            panel: <SecuritySettingsTab isPasswordProtected={settingsController.isPasswordProtected} isLocked={settingsController.isLocked} settings={settingsController.settings} onSetPassword={(password) => settingsController.setPassword(password)} onLock={() => settingsController.lock()} onUnlock={(password) => settingsController.unlock(password)} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
    ];

    const adminTabs: TabConfig[] = [];
    if (isAdmin) {
        adminTabs.push({
            label: t('settings.users.title'),
            icon: <PeopleIcon />,
            panel: <UsersSettingsTab />,
        });
    }
    if (isPlatformAdmin || isCompanyAdmin) {
        adminTabs.push({
            label: t('settings.companies.title'),
            icon: <BusinessIcon />,
            panel: <CompaniesTab />,
        });
        adminTabs.push({
            label: t('settings.roles.title'),
            icon: <AdminPanelSettingsIcon />,
            panel: <RolesTab />,
        });
    }

    const tabs: TabConfig[] = [
        ...baseTabs,
        ...adminTabs,
        {
            label: t('settings.logViewer'),
            icon: <TerminalIcon />,
            panel: <LogsViewerTab />,
            noPadding: isMobile,
        },
    ];

    // Enable auto-lock functionality
    useAutoLock();

    const handleTabChange = useCallback((_event: SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    }, []);

    const handleSidebarTabChange = useCallback((index: number) => {
        setCurrentTab(index);
    }, []);

    const handleClose = useCallback(async () => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: t('common.dialog.warning'),
                message: t('settings.unsavedChangesWarning'),
                confirmLabel: t('settings.discardChanges'),
                cancelLabel: t('common.cancel'),
                severity: 'warning',
            });
            if (!confirmed) return;
        }
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
                            updateSettings({ lastSettingsAccess: Date.now() });
                        }
                        return success;
                    }}
                />
            </Suspense>
        );
    }

    // Sidebar width for desktop/tablet
    const sidebarWidth = isTablet ? 180 : 220;

    return (
        <Dialog
            open={open}
            onClose={(_event, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
                handleClose();
            }}
            maxWidth="lg"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    height: isMobile ? '100%' : '85vh',
                    maxHeight: isMobile ? '100%' : 900,
                    borderRadius: isMobile ? 0 : 3,
                    overflow: 'hidden',
                },
            }}
        >
            {/* ── Header ── */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    borderBottom: 1,
                    borderColor: 'divider',
                    minHeight: 56,
                }}
            >
                <SettingsIcon color="primary" />
                <Typography variant="h6" component="span" fontWeight={600} sx={{ flex: 1 }}>
                    {t('settings.title')}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    size="small"
                    sx={{
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            {/* ── Mobile: Horizontal tabs + content ── */}
            {isMobile && (
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons
                            allowScrollButtonsMobile
                            sx={{
                                minHeight: 44,
                                '& .MuiTab-root': {
                                    minHeight: 44,
                                    py: 0.5,
                                    px: 1.5,
                                    fontSize: '0.8rem',
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                },
                            }}
                        >
                            {tabs.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    label={tab.label}
                                    sx={{
                                        '& .MuiTab-iconWrapper': { fontSize: '1.1rem', mr: 0.5 },
                                    }}
                                />
                            ))}
                        </Tabs>
                    </Box>
                    <DialogContent sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 2 }}>
                        <Suspense fallback={<TabLoadingFallback />}>
                            {tabs[currentTab]?.panel}
                        </Suspense>
                    </DialogContent>
                </Box>
            )}

            {/* ── Desktop/Tablet: Sidebar + content ── */}
            {!isMobile && (
                <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <Box
                        sx={{
                            width: sidebarWidth,
                            flexShrink: 0,
                            borderInlineEnd: 1,
                            borderColor: 'divider',
                            bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                            overflow: 'auto',
                            py: 1,
                        }}
                    >
                        <List disablePadding>
                            {/* General section */}
                            <Typography
                                variant="overline"
                                sx={{
                                    px: 2,
                                    pt: 1,
                                    pb: 0.5,
                                    display: 'block',
                                    fontSize: '0.65rem',
                                    color: 'text.disabled',
                                    letterSpacing: 1.2,
                                }}
                            >
                                {t('settings.general', 'General')}
                            </Typography>
                            {baseTabs.map((tab, index) => (
                                <ListItemButton
                                    key={index}
                                    selected={currentTab === index}
                                    onClick={() => handleSidebarTabChange(index)}
                                    sx={{
                                        py: 1,
                                        px: 2,
                                        mx: 1,
                                        borderRadius: 1.5,
                                        mb: 0.25,
                                        '&.Mui-selected': {
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            color: 'primary.main',
                                            '& .MuiListItemIcon-root': { color: 'primary.main' },
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                                        {tab.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={tab.label}
                                        slotProps={{
                                            primary: { fontSize: '0.85rem', fontWeight: currentTab === index ? 600 : 400 },
                                        }}
                                    />
                                </ListItemButton>
                            ))}

                            {/* Admin section */}
                            {adminTabs.length > 0 && (
                                <>
                                    <Divider sx={{ my: 1, mx: 2 }} />
                                    <Typography
                                        variant="overline"
                                        sx={{
                                            px: 2,
                                            pt: 0.5,
                                            pb: 0.5,
                                            display: 'block',
                                            fontSize: '0.65rem',
                                            color: 'text.disabled',
                                            letterSpacing: 1.2,
                                        }}
                                    >
                                        {t('settings.administration', 'Administration')}
                                    </Typography>
                                    {adminTabs.map((tab, idx) => {
                                        const tabIndex = baseTabs.length + idx;
                                        return (
                                            <ListItemButton
                                                key={tabIndex}
                                                selected={currentTab === tabIndex}
                                                onClick={() => handleSidebarTabChange(tabIndex)}
                                                sx={{
                                                    py: 1,
                                                    px: 2,
                                                    mx: 1,
                                                    borderRadius: 1.5,
                                                    mb: 0.25,
                                                    '&.Mui-selected': {
                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                        color: 'primary.main',
                                                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                                                        '&:hover': {
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                                        },
                                                    },
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                                                    {tab.icon}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={tab.label}
                                                    slotProps={{
                                                        primary: { fontSize: '0.85rem', fontWeight: currentTab === tabIndex ? 600 : 400 },
                                                    }}
                                                />
                                            </ListItemButton>
                                        );
                                    })}
                                </>
                            )}

                            {/* System section */}
                            <Divider sx={{ my: 1, mx: 2 }} />
                            <Typography
                                variant="overline"
                                sx={{
                                    px: 2,
                                    pt: 0.5,
                                    pb: 0.5,
                                    display: 'block',
                                    fontSize: '0.65rem',
                                    color: 'text.disabled',
                                    letterSpacing: 1.2,
                                }}
                            >
                                {t('settings.system', 'System')}
                            </Typography>
                            {(() => {
                                const logsIndex = tabs.length - 1;
                                const logsTab = tabs[logsIndex];
                                return (
                                    <ListItemButton
                                        selected={currentTab === logsIndex}
                                        onClick={() => handleSidebarTabChange(logsIndex)}
                                        sx={{
                                            py: 1,
                                            px: 2,
                                            mx: 1,
                                            borderRadius: 1.5,
                                            mb: 0.25,
                                            '&.Mui-selected': {
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                color: 'primary.main',
                                                '& .MuiListItemIcon-root': { color: 'primary.main' },
                                                '&:hover': {
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                                },
                                            },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                                            {logsTab.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={logsTab.label}
                                            slotProps={{
                                                primary: { fontSize: '0.85rem', fontWeight: currentTab === logsIndex ? 600 : 400 },
                                            }}
                                        />
                                    </ListItemButton>
                                );
                            })()}
                        </List>
                    </Box>

                    {/* Content area */}
                    <Box sx={{ flex: 1, overflow: 'auto', py: 2, px: { sm: 2, md: 3 } }}>
                        <Suspense fallback={<TabLoadingFallback />}>
                            {tabs[currentTab]?.panel}
                        </Suspense>
                    </Box>
                </Box>
            )}

            <ConfirmDialog />
        </Dialog>
    );
}
