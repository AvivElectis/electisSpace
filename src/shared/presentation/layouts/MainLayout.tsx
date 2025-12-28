import { Box, Container, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import SyncIcon from '@mui/icons-material/Sync';
import { AppHeader } from './AppHeader';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { SettingsDialog } from '../../../features/settings/presentation/SettingsDialog';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useSyncController } from '@features/sync/application/useSyncController';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface MainLayoutProps {
    children: ReactNode;
}

interface NavTab {
    labelKey: string;
    value: string;
    icon: React.ReactElement;
}

const navTabs: NavTab[] = [
    { labelKey: 'navigation.dashboard', value: '/', icon: <DashboardIcon fontSize="small" /> },
    { labelKey: 'navigation.spaces', value: '/spaces', icon: <BusinessIcon fontSize="small" /> },
    { labelKey: 'navigation.conference', value: '/conference', icon: <ConferenceIcon fontSize="small" /> },
    { labelKey: 'navigation.sync', value: '/sync', icon: <SyncIcon fontSize="small" /> },
];

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
    const { syncState, workingMode, setWorkingMode } = useSyncStore();
    const settings = useSettingsStore(state => state.settings);
    const setSpaces = useSpacesStore(state => state.setSpaces);

    console.log('[DEBUG MainLayout] settings:', {
        hasSolumConfig: !!settings.solumConfig,
        hasMappingConfig: !!settings.solumMappingConfig,
        mappingFields: settings.solumMappingConfig?.fields ? Object.keys(settings.solumMappingConfig.fields).length : 0
    });

    // Initialize global sync controller
    const syncController = useSyncController({
        sftpCredentials: settings.sftpCredentials,
        solumConfig: settings.solumConfig,
        csvConfig: settings.sftpCsvConfig as any, // Cast for legacy compatibility
        autoSyncEnabled: settings.autoSyncEnabled,
        onSpaceUpdate: setSpaces,
        solumMappingConfig: settings.solumMappingConfig,
    });

    // Get active list name for tab label

    const { getLabel } = useSpaceTypeLabels();

    const { sync } = syncController;

    // Force migration from SFTP to SoluM since SFTP is disabled
    useEffect(() => {
        if (workingMode === 'SFTP') {
            setWorkingMode('SOLUM_API');
        }
    }, [workingMode, setWorkingMode]);

    const currentTab = navTabs.find(tab => tab.value === location.pathname)?.value || false;

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        navigate(newValue);
    };

    const handleMobileNavClick = (value: string) => {
        navigate(value);
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
                    settingsOpen={settingsOpen}
                />

                {/* Navigation - Tabs for desktop, Drawer for mobile */}
                {isMobile ? (
                    <Drawer
                        anchor="left"
                        open={mobileMenuOpen}
                        onClose={() => setMobileMenuOpen(false)}
                    >
                        <Box sx={{ width: 250 }}>
                            <List>
                                {navTabs.map(tab => (
                                    <ListItem key={tab.value} disablePadding>
                                        <ListItemButton
                                            selected={currentTab === tab.value}
                                            onClick={() => handleMobileNavClick(tab.value)}
                                        >
                                            <ListItemIcon>
                                                {tab.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    tab.value === '/spaces'
                                                        ? getLabel('plural')
                                                        : t(tab.labelKey)
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Drawer>
                ) : (
                    <Box sx={{
                        bgcolor: 'transparent',
                        borderColor: 'divider',
                        px: { xs: 2, sm: 3, md: 4 },
                        py: 2,

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
                                    '&.Mui-selected': {
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                    }
                                }
                            }}
                            TabIndicatorProps={{ sx: { display: 'none' } }}

                        >
                            {navTabs.map(tab => (
                                <Tab
                                    key={tab.value}
                                    label={
                                        tab.value === '/spaces'
                                            ? getLabel('plural')
                                            : t(tab.labelKey)
                                    }
                                    value={tab.value}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    sx={{ p: 1, paddingInlineEnd: 2 }}
                                />
                            ))}
                        </Tabs>
                    </Box>
                )}

                {/* Main Content */}
                <Box
                    component="main"
                    sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                    <Container maxWidth={false} sx={{ flex: 1, py: 3 }}>
                        {children}
                    </Container>
                </Box>

                {/* Sync Status Indicator - Fixed at bottom left (End in RTL) */}
                <Box sx={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1200 }}>
                    <SyncStatusIndicator
                        status={
                            syncState.status === 'syncing' ? 'syncing' :
                                syncState.status === 'error' ? 'error' :
                                    syncState.isConnected ? 'connected' : 'disconnected'
                        }
                        lastSyncTime={syncState.lastSync ? new Date(syncState.lastSync).toLocaleString() : undefined}
                        workingMode="SoluM"
                        errorMessage={syncState.lastError}
                        onSyncClick={() => sync().catch(console.error)}
                    />
                </Box>

                {/* Settings Dialog */}
                <SettingsDialog
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />
            </Box>
        </SyncProvider>
    );
}
