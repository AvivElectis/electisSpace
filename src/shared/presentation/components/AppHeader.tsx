import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SyncIcon from '@mui/icons-material/Sync';
import { DRAWER_WIDTH } from './NavigationDrawer';

interface AppHeaderProps {
    title: string;
    onMenuClick: () => void;
    onSyncClick?: () => void;
    isSyncing?: boolean;
    showMenuButton?: boolean;
}

/**
 * App Header Component
 * Top application bar with title and actions
 */
export function AppHeader({
    title,
    onMenuClick,
    onSyncClick,
    isSyncing = false,
    showMenuButton = false,
}: AppHeaderProps) {
    return (
        <AppBar
            position="fixed"
            sx={{
                width: showMenuButton ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
                ml: showMenuButton ? 0 : `${DRAWER_WIDTH}px`,
            }}
        >
            <Toolbar>
                {showMenuButton && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={onMenuClick}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    {title}
                </Typography>

                {onSyncClick && (
                    <IconButton
                        color="inherit"
                        onClick={onSyncClick}
                        disabled={isSyncing}
                    >
                        <SyncIcon
                            sx={{
                                animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                },
                            }}
                        />
                    </IconButton>
                )}
            </Toolbar>
        </AppBar>
    );
}
