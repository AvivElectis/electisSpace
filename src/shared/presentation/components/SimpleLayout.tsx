import { Box, Tabs, Tab, useMediaQuery, useTheme, Drawer, List, ListItem, ListItemText, ListItemButton, ListItemIcon } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SimpleAppHeader } from './SimpleAppHeader';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SyncIcon from '@mui/icons-material/Sync';
import type { ReactNode } from 'react';

interface SimpleLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    onLanguageClick?: () => void;
    onHelpClick?: () => void;
    onSettingsClick?: () => void;
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
 * Simple Layout Component
 * Fully responsive layout with top bar and tab/drawer navigation
 */
export function SimpleLayout({
    title,
    subtitle,
    children,
    onLanguageClick,
    onHelpClick,
    onSettingsClick,
}: SimpleLayoutProps) {
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

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <SimpleAppHeader
                title={title}
                subtitle={subtitle}
                onLanguageClick={onLanguageClick}
                onHelpClick={onHelpClick}
                onSettingsClick={onSettingsClick}
                onMenuClick={isMobile ? () => setMobileMenuOpen(!mobileMenuOpen) : undefined}
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

            {/* Main Content - Full Width */}
            <Box
                sx={{
                    flex: 1,
                    py: { xs: 2, sm: 3, md: 4 },
                    px: { xs: 2, sm: 3, md: 4 },
                    width: '100%',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
