import { Box, Container, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Paper, Typography, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type ReactNode, useState, useEffect, useCallback, lazy, Suspense, useTransition, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkNavigationGuard } from '../navigationGuard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import SyncIcon from '@mui/icons-material/Sync';
import LabelIcon from '@mui/icons-material/Label';
import { AppHeader } from './AppHeader';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';

import { useBackendSyncController } from '@features/sync/application/useBackendSyncController';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { logger } from '@shared/infrastructure/services/logger';
import { prefetchRoute, prefetchAllRoutes } from '../utils/routePrefetch';
import { StoreRequiredGuard } from '@features/auth/presentation/StoreRequiredGuard';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

// Lazy load SettingsDialog - not needed on initial render
const SettingsDialog = lazy(() => 
    import('../../../features/settings/presentation/SettingsDialog').then(m => ({ default: m.SettingsDialog }))
);

// Lazy load ManualDialog - not needed on initial render
const ManualDialog = lazy(() =>
    import('../../../features/manual/presentation/ManualDialog').then(m => ({ default: m.ManualDialog }))
);

// Lazy load EnhancedUserDialog for profile editing from header
const EnhancedUserDialog = lazy(() =>
    import('../../../features/settings/presentation/EnhancedUserDialog').then(m => ({ default: m.EnhancedUserDialog }))
);

interface MainLayoutProps {
    children: ReactNode;
}

interface NavTab {
    labelKey: string;
    value: string;
    icon: React.ReactElement;
    dynamicLabel?: boolean;
    feature?: string;  // Feature key for permission filtering
}

/**
 * Main Layout Component
 * 
 * Provides the main application layout with:
 * - Tab/drawer navigation
 * - Responsive design (drawer on mobile, tabs on desktop)
 * - Content area
 */
import { SyncProvider } from '@features/sync/application/SyncContext';

// ... imports remain the same in file content, just adding provider import logic if needed or assuming file has imports. 
// Wait, I need to add import.

export function MainLayout({ children }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { t } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const { syncState, setWorkingMode } = useSyncStore();
    const { canAccessFeature, isAuthenticated } = useAuthContext();
    const isInitialized = useAuthStore(state => state.isInitialized);
    
    // Determine drawer direction based on current language (more reliable than theme.direction)
    const settings = useSettingsStore(state => state.settings);
    const activeStoreId = useSettingsStore(state => state.activeStoreId);
    
    // Only allow sync when auth session is fully restored and valid
    const authReady = isAuthenticated && isInitialized;
    const effectiveStoreId = authReady ? activeStoreId : null;
    const setSpaces = useSpacesStore(state => state.setSpaces);

    // Sync settings.workingMode to syncStore.workingMode
    useEffect(() => {
        setWorkingMode(settings.workingMode);
    }, [settings.workingMode, setWorkingMode]);

    // Determine if People Manager mode is enabled
    const isPeopleManagerMode = settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API';

    /**
     * Combined space update handler
     * In People Manager mode, people data comes from the server DB (loaded by PeopleManagerView),
     * NOT from AIMS articles. So we skip overwriting the people store here.
     * AIMS sync only updates the spaces store.
     */
    const handleSpaceUpdate = useCallback((spaces: any[]) => {
        // Always update spaces store
        setSpaces(spaces);
        
        // In People Manager mode, the server DB is source of truth for people.
        // PeopleManagerView fetches people from server on mount.
        // Do NOT overwrite people store with AIMS article data.
        if (settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API') {
            logger.info('MainLayout', 'Spaces updated from AIMS (people managed by server)', { 
                spacesCount: spaces.length 
            });
            return;
        }
    }, [setSpaces, settings.peopleManagerEnabled, settings.workingMode]);

    // Build navigation tabs dynamically
    const allNavTabs: NavTab[] = [
        { labelKey: 'navigation.dashboard', value: '/', icon: <DashboardIcon fontSize="small" />, feature: 'dashboard' },
        { 
            labelKey: isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces', 
            value: isPeopleManagerMode ? '/people' : '/spaces', 
            icon: isPeopleManagerMode ? <PeopleIcon fontSize="small" /> : <BusinessIcon fontSize="small" />,
            dynamicLabel: true,
            feature: isPeopleManagerMode ? 'people' : 'spaces',
        },
        { labelKey: 'navigation.conference', value: '/conference', icon: <ConferenceIcon fontSize="small" />, feature: 'conference' },
        { labelKey: 'navigation.labels', value: '/labels', icon: <LabelIcon fontSize="small" />, feature: 'labels' },
        { labelKey: 'navigation.sync', value: '/sync', icon: <SyncIcon fontSize="small" />, feature: 'sync' },
    ];

    // Filter tabs by user permissions
    const navTabs = allNavTabs.filter(tab => 
        !tab.feature || canAccessFeature(tab.feature as any)
    );

    // Initialize backend sync controller (all AIMS communication goes through server)
    const syncController = useBackendSyncController({
        storeId: effectiveStoreId,
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSyncInterval: settings.autoSyncInterval,
        onSpaceUpdate: handleSpaceUpdate,
        onError: (error) => {
            logger.error('MainLayout', 'Backend sync error', { error: error.message });
        },
    });

    // Get active list name for tab label

    const { getLabel } = useSpaceTypeLabels();

    const { sync } = syncController;

    // Prefetch all routes when app is idle for instant navigation
    useEffect(() => {
        const idleTimeout = setTimeout(() => {
            prefetchAllRoutes();
        }, 2000); // Wait 2 seconds after mount, then prefetch all
        return () => clearTimeout(idleTimeout);
    }, []);

    // Auto-sync on app load when store is selected AND auth is ready
    // Fires once when both conditions are first met
    const hasSyncedOnLoad = useRef(false);
    useEffect(() => {
        if (activeStoreId && authReady && sync && !hasSyncedOnLoad.current) {
            hasSyncedOnLoad.current = true;
            logger.info('MainLayout', 'Auto-syncing on app load', { storeId: activeStoreId });
            const syncTimeout = setTimeout(() => {
                sync().catch((err) => {
                    logger.warn('MainLayout', 'Initial sync failed', { error: err instanceof Error ? err.message : 'Unknown' });
                });
            }, 500);
            return () => clearTimeout(syncTimeout);
        }
    }, [activeStoreId, authReady, sync]);

    const currentTab = navTabs.find(tab => tab.value === location.pathname)?.value || false;

    // Check if we're on the login page - don't show layout chrome
    const isLoginPage = location.pathname === '/login';

    // Use transition for non-blocking navigation - UI updates instantly
    const [isPending, startTransition] = useTransition();

    const handleTabChange = async (_event: React.SyntheticEvent, newValue: string) => {
        const canProceed = await checkNavigationGuard();
        if (!canProceed) return;
        startTransition(() => {
            navigate(newValue);
        });
    };

    const handleMobileNavClick = async (value: string) => {
        const canProceed = await checkNavigationGuard();
        if (!canProceed) return;
        startTransition(() => {
            navigate(value);
        });
        setMobileMenuOpen(false);
    };

    const handleMenuClick = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // For login page, render children directly without layout chrome
    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <SyncProvider value={syncController}>
            <Box sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header with mobile menu support */}
                <AppHeader
                    onMenuClick={isMobile ? handleMenuClick : undefined}
                    onSettingsClick={() => setSettingsOpen(true)}
                    onManualClick={() => setManualOpen(true)}
                    onEditProfile={() => setProfileOpen(true)}
                    settingsOpen={settingsOpen}
                />

                {/* Spacer for fixed header (taller on mobile due to 2-row layout, taller on md+ due to 80px logos) */}
                <Box sx={{ height: { xs: 100, sm: 64, md: 100 } }} />

                {/* Navigation - Tabs for desktop, Drawer for mobile */}
                {isMobile ? (
                    <Drawer
                        anchor="top"
                        open={mobileMenuOpen}
                        onClose={() => setMobileMenuOpen(false)}
                        slotProps={{
                            paper: {
                                sx: {
                                    top: { xs: 0, sm: 64 }, // Below fixed header
                                    borderRadius: '0px 0px 16px 16px',
                                }
                            }
                        }}
                    >
                            {/* Close button at top */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start', p: 2, pb: 0 }}>
                                <IconButton
                                    onClick={() => setMobileMenuOpen(false)}
                                    sx={{ 
                                        boxShadow: 1,
                                        scale: 1.5,
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                            <List>
                                {navTabs.map(tab => (
                                    <ListItem key={tab.value} disablePadding sx={{py: 2}}>
                                        <ListItemButton
                                            selected={currentTab === tab.value}
                                            onClick={() => handleMobileNavClick(tab.value)}
                                            onMouseEnter={() => prefetchRoute(tab.value)}
                                        >
                                            <ListItemIcon>
                                                {tab.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    tab.dynamicLabel && !isPeopleManagerMode
                                                        ? getLabel('plural')
                                                        : t(tab.labelKey)
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                    </Drawer>
                ) : (
                    <Box sx={{
                        bgcolor: 'transparent',
                        borderColor: 'divider',
                        px: { xs: 2, sm: 3, md: 4 },
                        py: 1,
                    }}>
                        <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                borderBottom: 0,
                                '& .MuiTab-root': {
                                    border: '1px solid transparent',
                                    borderRadius: 2,
                                    my: 2,
                                    '&.Mui-selected': {
                                        boxShadow: 2,
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                    }
                                }
                            }}
                            slotProps={{
                                indicator: { sx: { display: 'none' } }
                            }}

                        >
                            {navTabs.map(tab => (
                                <Tab
                                    key={tab.value}
                                    label={
                                        tab.dynamicLabel && !isPeopleManagerMode
                                            ? getLabel('plural')
                                            : t(tab.labelKey)
                                    }
                                    value={tab.value}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    sx={{ p: 1, paddingInlineEnd: 2 }}
                                    onMouseEnter={() => prefetchRoute(tab.value)}
                                />
                            ))}
                        </Tabs>
                    </Box>
                )}

                {/* Main Content */}
                <Box
                    component="main"
                    sx={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        opacity: isPending ? 0.7 : 1,
                        transition: 'opacity 0.15s ease-in-out',
                    }}
                >
                    <Container maxWidth={false} sx={{ flex: 1, py: 3 }}>
                        <StoreRequiredGuard>
                            {children}
                        </StoreRequiredGuard>
                    </Container>
                </Box>

                {/* BETA Version Badge - Fixed at bottom start (opposite of sync indicator) */}
                <Paper
                    elevation={2}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 16, sm: 24 },
                        insetInlineStart: { xs: 16, sm: 24 },
                        zIndex: (theme) => theme.zIndex.fab,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: '28px',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.warning.main, 0.4),
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>
                        {`v${__APP_VERSION__} - BETA - For Internal Use`}
                    </Typography>
                </Paper>

                {/* Sync Status Indicator - Fixed at bottom end (RTL-aware) */}
                <Box sx={{ 
                    position: 'fixed', 
                    bottom: { xs: 16, sm: 24 }, 
                    insetInlineEnd: { xs: 16, sm: 24 },
                    zIndex: (theme) => theme.zIndex.fab,
                }}>
                    <SyncStatusIndicator
                        status={
                            syncState.status === 'syncing' ? 'syncing' :
                                syncState.status === 'error' ? 'error' :
                                    syncState.isConnected ? 'connected' : 'disconnected'
                        }
                        lastSyncTime={syncState.lastSync ? new Date(syncState.lastSync).toLocaleString() : undefined}
                        errorMessage={syncState.lastError}
                        onSyncClick={() => sync().catch(() => {/* handled in controller */})}
                        serverConnected={syncController.serverConnected}
                        aimsConnected={syncState.isConnected}
                        syncStartedAt={syncState.syncStartedAt}
                    />
                </Box>

                {/* Settings Dialog - Lazy loaded */}
                {settingsOpen && (
                    <Suspense fallback={null}>
                        <SettingsDialog
                            open={settingsOpen}
                            onClose={() => setSettingsOpen(false)}
                        />
                    </Suspense>
                )}

                {/* Manual Dialog - Lazy loaded */}
                {manualOpen && (
                    <Suspense fallback={null}>
                        <ManualDialog
                            open={manualOpen}
                            onClose={() => setManualOpen(false)}
                        />
                    </Suspense>
                )}

                {/* Profile Dialog - Lazy loaded */}
                {profileOpen && (
                    <Suspense fallback={null}>
                        <EnhancedUserDialog
                            open={profileOpen}
                            onClose={() => setProfileOpen(false)}
                            onSave={() => setProfileOpen(false)}
                            profileMode={true}
                        />
                    </Suspense>
                )}
            </Box>
        </SyncProvider>
    );
}
