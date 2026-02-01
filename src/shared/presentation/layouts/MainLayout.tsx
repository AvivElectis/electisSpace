import { Box, Container, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { type ReactNode, useState, useEffect, useCallback, lazy, Suspense, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { convertSpacesToPeopleWithVirtualPool } from '@features/people/infrastructure/peopleService';
import { useSyncController } from '@features/sync/application/useSyncController';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { logger } from '@shared/infrastructure/services/logger';
import { prefetchRoute, prefetchAllRoutes } from '../utils/routePrefetch';

// Lazy load SettingsDialog - not needed on initial render
const SettingsDialog = lazy(() => 
    import('../../../features/settings/presentation/SettingsDialog').then(m => ({ default: m.SettingsDialog }))
);

// Lazy load ManualDialog - not needed on initial render
const ManualDialog = lazy(() =>
    import('../../../features/manual/presentation/ManualDialog').then(m => ({ default: m.ManualDialog }))
);

interface MainLayoutProps {
    children: ReactNode;
}

interface NavTab {
    labelKey: string;
    value: string;
    icon: React.ReactElement;
    dynamicLabel?: boolean;  // Whether to use dynamic label (for spaces/people toggle)
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
    const { t, i18n } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const { syncState, setWorkingMode } = useSyncStore();
    
    // Determine drawer direction based on current language (more reliable than theme.direction)
    const isRtl = i18n.language === 'he';
    const settings = useSettingsStore(state => state.settings);
    const setSpaces = useSpacesStore(state => state.setSpaces);
    const setPeople = usePeopleStore(state => state.setPeople);
    const extractListsFromPeople = usePeopleStore(state => state.extractListsFromPeople);
    const setConferenceRooms = useConferenceStore(state => state.setConferenceRooms);

    // Sync settings.workingMode to syncStore.workingMode
    useEffect(() => {
        setWorkingMode(settings.workingMode);
    }, [settings.workingMode, setWorkingMode]);

    // Determine if People Manager mode is enabled
    const isPeopleManagerMode = settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API';

    /**
     * Combined space update handler
     * When People Manager mode is enabled, also updates the people store
     * This enables cross-device sync via AIMS metadata
     */
    const handleSpaceUpdate = useCallback((spaces: any[]) => {
        // Always update spaces store
        setSpaces(spaces);
        
        // If People Manager mode is enabled, also update people store
        if (settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API') {
            try {
                const people = convertSpacesToPeopleWithVirtualPool(spaces, settings.solumMappingConfig);
                setPeople(people);
                // Extract list names from people's listMemberships to populate peopleLists
                extractListsFromPeople();
                logger.info('MainLayout', 'Synced spaces to people store', { 
                    spacesCount: spaces.length, 
                    peopleCount: people.length 
                });
            } catch (error: any) {
                logger.error('MainLayout', 'Failed to convert spaces to people', { error: error.message });
            }
        }
    }, [setSpaces, setPeople, extractListsFromPeople, settings.peopleManagerEnabled, settings.workingMode, settings.solumMappingConfig]);

    /**
     * Conference rooms update handler for SFTP mode
     */
    const handleConferenceUpdate = useCallback((conferenceRooms: any[]) => {
        setConferenceRooms(conferenceRooms);
        logger.info('MainLayout', 'Synced conference rooms from SFTP', { 
            count: conferenceRooms.length 
        });
    }, [setConferenceRooms]);

    // Build navigation tabs dynamically
    const navTabs: NavTab[] = [
        { labelKey: 'navigation.dashboard', value: '/', icon: <DashboardIcon fontSize="small" /> },
        { 
            labelKey: isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces', 
            value: isPeopleManagerMode ? '/people' : '/spaces', 
            icon: isPeopleManagerMode ? <PeopleIcon fontSize="small" /> : <BusinessIcon fontSize="small" />,
            dynamicLabel: true
        },
        { labelKey: 'navigation.conference', value: '/conference', icon: <ConferenceIcon fontSize="small" /> },
        { labelKey: 'navigation.labels', value: '/labels', icon: <LabelIcon fontSize="small" /> },
        { labelKey: 'navigation.sync', value: '/sync', icon: <SyncIcon fontSize="small" /> },
    ];

    // Initialize global sync controller
    // Determine connection status based on working mode
    const isConnected = settings.workingMode === 'SFTP' 
        ? settings.sftpCredentials?.isConnected || false
        : settings.solumConfig?.isConnected || false;
        
    const syncController = useSyncController({
        sftpCredentials: settings.sftpCredentials,
        solumConfig: settings.solumConfig,
        csvConfig: settings.csvConfig,
        sftpCsvConfig: settings.sftpCsvConfig as any,  // Enhanced CSV config for SFTP mode
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSyncInterval: settings.autoSyncInterval,  // Pass interval from settings
        onSpaceUpdate: handleSpaceUpdate,  // Use combined handler for People Mode support
        onConferenceUpdate: handleConferenceUpdate,  // Conference rooms update for SFTP mode
        solumMappingConfig: settings.solumMappingConfig,
        isConnected,
    });

    // Get active list name for tab label

    const { getLabel } = useSpaceTypeLabels();

    const { sync } = syncController;

    // SFTP mode is now enabled - no force migration needed

    // Prefetch all routes when app is idle for instant navigation
    useEffect(() => {
        const idleTimeout = setTimeout(() => {
            prefetchAllRoutes();
        }, 2000); // Wait 2 seconds after mount, then prefetch all
        return () => clearTimeout(idleTimeout);
    }, []);

    // Auto-sync on app load when connected
    useEffect(() => {
        if (isConnected && sync) {
            logger.info('MainLayout', 'Auto-syncing on app load (connected)');
            // Small delay to ensure stores are ready
            const syncTimeout = setTimeout(() => {
                sync().catch((err) => {
                    logger.warn('MainLayout', 'Initial sync failed', { error: err instanceof Error ? err.message : 'Unknown' });
                });
            }, 500);
            return () => clearTimeout(syncTimeout);
        }
    }, []); // Run only once on mount

    const currentTab = navTabs.find(tab => tab.value === location.pathname)?.value || false;

    // Use transition for non-blocking navigation - UI updates instantly
    const [isPending, startTransition] = useTransition();

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        startTransition(() => {
            navigate(newValue);
        });
    };

    const handleMobileNavClick = (value: string) => {
        startTransition(() => {
            navigate(value);
        });
        setMobileMenuOpen(false);
    };

    const handleMenuClick = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

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
                    settingsOpen={settingsOpen}
                />

                {/* Navigation - Tabs for desktop, Drawer for mobile */}
                {isMobile ? (
                    <Drawer
                        anchor={isRtl ? 'right' : 'left'}
                        open={mobileMenuOpen}
                        onClose={() => setMobileMenuOpen(false)}
                        slotProps={{
                            transition: { direction: isRtl ? 'left' : 'right' }
                        }}

                    >
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
                        py: 0,
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
                        {children}
                    </Container>
                </Box>

                {/* Sync Status Indicator - Fixed at bottom left (End in RTL) */}
                <Box sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 }, zIndex: 1200 }}>
                    <SyncStatusIndicator
                        status={
                            syncState.status === 'syncing' ? 'syncing' :
                                syncState.status === 'error' ? 'error' :
                                    isConnected ? 'connected' : 'disconnected'
                        }
                        lastSyncTime={syncState.lastSync ? new Date(syncState.lastSync).toLocaleString() : undefined}
                        workingMode={settings.workingMode === 'SFTP' ? 'SFTP' : 'SoluM'}
                        errorMessage={syncState.lastError}
                        onSyncClick={() => sync().catch(() => {/* console.error */ })}
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
            </Box>
        </SyncProvider>
    );
}
