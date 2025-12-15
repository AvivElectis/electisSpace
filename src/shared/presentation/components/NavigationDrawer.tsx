import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Divider,
    Box,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChairIcon from '@mui/icons-material/Chair';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SyncIcon from '@mui/icons-material/Sync';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

interface NavigationItem {
    label: string;
    path: string;
    icon: React.ReactElement;
}

const navigationItems: NavigationItem[] = [
    { label: 'Dashboard', path: '/', icon: <HomeIcon /> },
    { label: 'Spaces', path: '/spaces', icon: <ChairIcon /> },
    { label: 'Conference Rooms', path: '/conference', icon: <MeetingRoomIcon /> },
    { label: 'Sync', path: '/sync', icon: <SyncIcon /> },
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
