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
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

interface NavigationItem {
    label: string;
    path: string;
    icon: React.ReactElement;
}

const navigationItems: NavigationItem[] = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { label: 'Spaces', path: '/spaces', icon: <BusinessIcon /> },
    { label: 'Conference Rooms', path: '/conference', icon: <ConferenceIcon /> },
    { label: 'Sync Status', path: '/sync', icon: <SyncIcon /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

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
                                <ListItemText primary={item.label} />
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
