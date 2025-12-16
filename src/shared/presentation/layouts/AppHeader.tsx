import { AppBar, Toolbar, Box, IconButton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

interface AppHeaderProps {
    onSettingsClick?: () => void;
    onMenuClick?: () => void;
}

/**
 * Global Application Header
 * Displays logos, app title (centered), and settings icon
 */
export function AppHeader({ onSettingsClick, onMenuClick }: AppHeaderProps) {
    // Get logos from settings store
    const logos = useSettingsStore((state) => state.settings.logos);

    // Use dynamic logos or fall back to defaults
    const leftLogo = logos.logo1 || '/solum.png';
    const rightLogo = logos.logo2 || '/electis.png';

    // Debug: Log logo values
    console.log('AppHeader logos:', { logo1: logos.logo1 ? 'exists' : 'not set', logo2: logos.logo2 ? 'exists' : 'not set' });

    return (
        <AppBar
            position="static"
            color="default"
            elevation={0}
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
            }}
        >
            <Toolbar sx={{
                justifyContent: 'space-between',
                minHeight: { xs: 56, sm: 64 },
                px: { xs: 2, sm: 3 },
            }}>
                {/* Mobile Menu Button (left side on mobile) */}
                {onMenuClick && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={onMenuClick}
                        sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                {/* Left Logo */}
                <Box
                    component="img"
                    src={leftLogo}
                    alt="Left Logo"
                    sx={{
                        height: { xs: 140, sm: 120 },
                        maxWidth: { xs: 180, sm: 200 },
                        objectFit: 'contain',
                    }}
                />

                {/* Centered App Title */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 2,
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: { xs: '2rem', sm: '2.25rem' },
                        }}
                    >
                        electis Space
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: { xs: 'none', sm: 'block' },
                        }}
                    >
                        ESL Management System
                    </Typography>
                </Box>

                {/* Right Logo + Settings */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        component="img"
                        src={rightLogo}
                        alt="Right Logo"
                        sx={{
                            height: { xs: 140, sm: 120 },
                            maxWidth: { xs: 180, sm: 200 },
                            objectFit: 'contain',
                        }}
                    />
                    <IconButton
                        color="primary"
                        onClick={onSettingsClick}
                        sx={{ ml: 1 }}
                    >
                        <SettingsIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
