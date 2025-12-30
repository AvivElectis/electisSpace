import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import SyncIcon from '@mui/icons-material/Sync';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

const DRAWER_WIDTH = 240;

interface NavigationItem {
    labelKey: string;
    path: string;
    icon: React.ReactElement;
}

interface NavigationDrawerProps {
    open: boolean;
    onClose: () => void;
    variant?: 'permanent' | 'temporary';
}

/**
 * Navigation Drawer Component
 * Main navigation sidebar for the application
 */
export function NavigationDrawer({ open, onClose, variant = 'permanent' }: NavigationDrawerProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const settings = useSettingsStore((state) => state.settings);

    // Determine if People Manager mode is enabled
    const isPeopleManagerMode = settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API';

    // Build navigation items dynamically based on mode
    const navigationItems: NavigationItem[] = [
        { labelKey: 'navigation.dashboard', path: '/', icon: <DashboardIcon /> },
        { 
            labelKey: isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces', 
            path: '/spaces', 
            icon: isPeopleManagerMode ? <PeopleIcon /> : <BusinessIcon /> 
        },
        { labelKey: 'navigation.conference', path: '/conference', icon: <ConferenceIcon /> },
        { labelKey: 'navigation.sync', path: '/sync', icon: <SyncIcon /> },
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        if (variant === 'temporary') {
            onClose();
        }
    };

    return (
        <Drawer
            variant={variant}
            open={open}
            onClose={onClose}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                },
            }}
        >
            <Toolbar />

            <Box sx={{ overflow: 'auto' }}>
                <List>
                    {navigationItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                selected={location.pathname === item.path}
                                onClick={() => handleNavigate(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={t(item.labelKey)} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                <Divider sx={{ my: 1 }} />
            </Box>
        </Drawer>
    );
}

export { DRAWER_WIDTH };
