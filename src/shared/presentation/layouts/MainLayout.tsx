import { Box, Container, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppHeader } from '../layouts/AppHeader';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SyncIcon from '@mui/icons-material/Sync';

interface MainLayoutProps {
    children: ReactNode;
}

interface NavTab {
    label: string;
    value: string;
    icon: React.ReactElement;
}

const navTabs: NavTab[] = [
    { label: 'Dashboard', value: '/', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Spaces', value: '/spaces', icon: <BusinessIcon fontSize="small" /> },
    { label: 'Conference', value: '/conference', icon: <MeetingRoomIcon fontSize="small" /> },
    { label: 'Sync', value: '/sync', icon: <SyncIcon fontSize="small" /> },
];

/**
 * Main Layout Component
 * 
 * Provides the main application layout with:
 * - App header with title and actions
 * - Tab/drawer navigation
 * - Responsive design (drawer on mobile, tabs on desktop)
 * - Content area
 */
export function MainLayout({ children }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* Header */}
            <AppHeader onMenuClick={isMobile ? handleMenuClick : undefined} />

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
                                        <ListItemText primary={tab.label} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Drawer>
            ) : (
                <Box sx={{
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    px: { xs: 2, sm: 3, md: 4 },
                }}>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {navTabs.map(tab => (
                            <Tab
                                key={tab.value}
                                label={tab.label}
                                value={tab.value}
                                icon={tab.icon}
                                iconPosition="start"
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
                    py: { xs: 2, sm: 3, md: 4 },
                    px: { xs: 2, sm: 3, md: 4 },
                    width: '100%',
                }}
            >
                <Container maxWidth="xl" disableGutters>
                    {children}
                </Container>
            </Box>
        </Box>
    );
}
