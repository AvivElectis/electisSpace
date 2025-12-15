import { AppBar, Toolbar, Typography, IconButton, Box, Tooltip, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import SyncIcon from '@mui/icons-material/Sync';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { useRootStore } from '@shared/infrastructure/store/rootStore';

interface AppHeaderProps {
    onMenuClick?: () => void;
}

/**
 * App Header Component
 * 
 * Main application header with:
 * - App title and subtitle from settings
 * - Quick actions (sync, language, settings, help)  
 * - Sync status indicator
 * - Mobile menu toggle
 */
export function AppHeader({ onMenuClick }: AppHeaderProps) {
    const navigate = useNavigate();
    const { appName, appSubtitle, isConnected, syncStatus } = useRootStore();

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    const handleLanguageClick = () => {
        // TODO: Implement language toggle
        console.log('Language toggle - to be implemented');
    };

    const handleHelpClick = () => {
        // TODO: Implement help dialog
        console.log('Help - to be implemented');
    };

    const handleSyncClick = () => {
        // TODO: Trigger manual sync
        console.log('Manual sync - to be implemented');
    };

    const getSyncStatusColor = () => {
        if (syncStatus === 'syncing') return 'warning';
        if (syncStatus === 'error') return 'error';
        if (isConnected) return 'success';
        return 'default';
    };

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar sx={{ gap: 2 }}>
                {/* Mobile Menu Button */}
                {onMenuClick && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={onMenuClick}
                        sx={{ display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                {/* App Title */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        {appName}
                    </Typography>
                    {appSubtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {appSubtitle}
                        </Typography>
                    )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Sync Status & Button */}
                    <Tooltip title={isConnected ? 'Connected - Click to sync' : 'Disconnected'}>
                        <IconButton
                            color="inherit"
                            onClick={handleSyncClick}
                            disabled={!isConnected}
                        >
                            <Badge
                                variant="dot"
                                color={getSyncStatusColor()}
                                overlap="circular"
                            >
                                <SyncIcon />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    {/* Language Switcher */}
                    <Tooltip title="Change language">
                        <IconButton color="inherit" onClick={handleLanguageClick}>
                            <LanguageIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Help */}
                    <Tooltip title="Help">
                        <IconButton color="inherit" onClick={handleHelpClick}>
                            <HelpOutlineIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Settings */}
                    <Tooltip title="Settings">
                        <IconButton color="inherit" onClick={handleSettingsClick}>
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
