/**
 * NativeSettingsPage
 *
 * Full-page settings view for native (Android/iOS) builds.
 * Replaces SettingsDialog with a page-based layout:
 * - Blue header with back arrow, title, and LanguageSwitcher
 * - Quick actions: Profile, Help, Logout
 * - Horizontal scrollable tabs matching SettingsDialog tab structure
 * - Tab content panel with lazy-loaded settings components
 */

import {
    Box,
    Typography,
    IconButton,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tabs,
    Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudIcon from '@mui/icons-material/Cloud';
import ImageIcon from '@mui/icons-material/Image';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useState, lazy, Suspense, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsController } from '../application/useSettingsController';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { SphereLoader } from '@shared/presentation/components/SphereLoader';
import { LanguageSwitcher } from '@shared/presentation/components/LanguageSwitcher';
import { useAutoLock } from '../application/useAutoLock';

// Lazy load all tabs (same as SettingsDialog)
const AppSettingsTab = lazy(() => import('./AppSettingsTab').then(m => ({ default: m.AppSettingsTab })));
const SolumSettingsTab = lazy(() => import('./SolumSettingsTab').then(m => ({ default: m.SolumSettingsTab })));
const LogoSettingsTab = lazy(() => import('./LogoSettingsTab').then(m => ({ default: m.LogoSettingsTab })));
const SecuritySettingsTab = lazy(() => import('./SecuritySettingsTab').then(m => ({ default: m.SecuritySettingsTab })));
const LogsViewerTab = lazy(() => import('./LogsViewerTab').then(m => ({ default: m.LogsViewerTab })));
const UsersSettingsTab = lazy(() => import('./UsersSettingsTab').then(m => ({ default: m.UsersSettingsTab })));
const CompaniesTab = lazy(() => import('./CompaniesTab').then(m => ({ default: m.CompaniesTab })));
const RolesTab = lazy(() => import('./RolesTab').then(m => ({ default: m.RolesTab })));

// Lazy load EnhancedUserDialog for profile editing
const EnhancedUserDialog = lazy(() =>
    import('./EnhancedUserDialog').then(m => ({ default: m.EnhancedUserDialog }))
);

function TabLoadingFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <SphereLoader width={180} height={140} />
        </Box>
    );
}

interface TabConfig {
    label: string;
    icon: React.ReactElement;
    panel: React.ReactElement;
}

export function NativeSettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const settingsController = useSettingsController();
    const { user, logout } = useAuthStore();
    const [currentTab, setCurrentTab] = useState(0);
    const [profileOpen, setProfileOpen] = useState(false);

    // Check user roles (same logic as SettingsDialog)
    const isPlatformAdmin = user?.globalRole === 'PLATFORM_ADMIN';
    const isCompanyAdmin = user?.companies?.some(c => c.roleId === 'role-admin');
    const isAdmin = isPlatformAdmin || isCompanyAdmin ||
        user?.stores?.some(s => s.roleId === 'role-admin');

    // Build tabs array (same structure as SettingsDialog)
    const baseTabs: TabConfig[] = [
        {
            label: t('settings.appSettings'),
            icon: <SettingsIcon />,
            panel: <AppSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
        {
            label: t('settings.solumSettings'),
            icon: <CloudIcon />,
            panel: <SolumSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
        {
            label: t('settings.logoSettings'),
            icon: <ImageIcon />,
            panel: <LogoSettingsTab settings={settingsController.settings} onUpdate={(updates) => settingsController.updateSettings(updates)} />,
        },
        {
            label: t('settings.securitySettings'),
            icon: <SecurityIcon />,
            panel: (
                <SecuritySettingsTab
                    isPasswordProtected={settingsController.isPasswordProtected}
                    isLocked={settingsController.isLocked}
                    settings={settingsController.settings}
                    onSetPassword={(password) => settingsController.setPassword(password)}
                    onLock={() => settingsController.lock()}
                    onUnlock={(password) => settingsController.unlock(password)}
                    onUpdate={(updates) => settingsController.updateSettings(updates)}
                />
            ),
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
        },
    ];

    // Enable auto-lock functionality
    useAutoLock();

    const handleTabChange = useCallback((_event: SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    }, []);

    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/login', { replace: true });
    }, [logout, navigate]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            {/* Blue header with back arrow + title + LanguageSwitcher */}
            <Box
                sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    minHeight: 56,
                }}
            >
                <IconButton
                    onClick={handleBack}
                    sx={{ color: 'primary.contrastText' }}
                    size="small"
                    aria-label="back"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, mx: 1 }}>
                    {t('settings.title')}
                </Typography>
                <LanguageSwitcher />
            </Box>

            {/* Quick actions section */}
            <List disablePadding sx={{ bgcolor: 'background.paper' }}>
                <ListItemButton onClick={() => setProfileOpen(true)} sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <PersonIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={t('nativeSettings.profile')} />
                </ListItemButton>

                <ListItemButton onClick={() => navigate('/manual')} sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <HelpOutlineIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={t('nativeSettings.help')} />
                </ListItemButton>

                <ListItemButton onClick={() => navigate('/about')} sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <InfoOutlinedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={t('nativeSettings.about')} />
                </ListItemButton>

                <ListItemButton onClick={handleLogout} sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <LogoutIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={t('nativeSettings.logout')} slotProps={{ primary: { color: 'error.main' } }} />
                </ListItemButton>
            </List>

            <Divider />

            {/* Horizontal scrollable tabs */}
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

            {/* Tab content panel */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
                <Suspense fallback={<TabLoadingFallback />}>
                    {tabs[currentTab]?.panel}
                </Suspense>
            </Box>

            {/* Profile dialog (lazy loaded) */}
            {profileOpen && (
                <Suspense fallback={null}>
                    <EnhancedUserDialog
                        open={profileOpen}
                        onClose={() => setProfileOpen(false)}
                        onSave={() => setProfileOpen(false)}
                        user={user as any}
                        profileMode
                    />
                </Suspense>
            )}
        </Box>
    );
}
