import { Box, Container, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import SyncIcon from '@mui/icons-material/Sync';
import { AppHeader } from './AppHeader';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { SettingsDialog } from '../../../features/settings/presentation/SettingsDialog';

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
export function MainLayout({ children }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { t } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

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
                                        <ListItemText primary={t(tab.labelKey)} />
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
                                label={t(tab.labelKey)}
                                value={tab.value}
                                icon={tab.icon}
                                iconPosition="start"
                                sx={{p: 1, paddingInlineEnd: 2}}
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

            {/* Settings Dialog */}
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </Box>
    );
}
