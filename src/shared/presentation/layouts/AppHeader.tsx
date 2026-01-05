import { AppBar, Toolbar, Box, IconButton, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

// import { useSyncStore } from '@features/sync/infrastructure/syncStore';
// import { SyncStatusIndicator } from '@shared/presentation/components/SyncStatusIndicator';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface AppHeaderProps {
    onSettingsClick?: () => void;
    onMenuClick?: () => void;
    settingsOpen?: boolean;
}

/**
 * Global Application Header
 * Displays logos, app title (centered), language switcher, and settings icon
 * Title and subtitle are configurable through app settings
 */
export function AppHeader({ onSettingsClick, onMenuClick, settingsOpen }: AppHeaderProps) {
    // Get settings from store
    // Get settings from store
    const settings = useSettingsStore((state) => state.settings);
    const isLocked = useSettingsStore((state) => state.isLocked);
    // Sync state moved to MainLayout

    // Use dynamic logos or fall back to defaults
    const leftLogo = settings.logos.logo1 || '/logos/CI_SOLUMLogo_WithClaim-Blue.png';
    const rightLogo = settings.logos.logo2 || '/logos/logo_fixed_02.png';

    // Icon color: blue only when dialog is open AND unlocked, otherwise default
    const iconColor = (settingsOpen || !isLocked) ? 'primary' : 'default';


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
                        height: { xs: 140, sm: 80 },
                        maxWidth: { xs: 180, sm: 250 },
                        objectFit: 'contain',
                    }}
                />

                {/* Centered App Title (Dynamic from Settings) */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 2,
                    }}

                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            fontSize: { xs: '2rem', sm: '2.25rem' },
                        }}
                    >
                        {settings.appName}
                    </Typography>
                    {settings.appSubtitle && (
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                display: { xs: 'none', sm: 'block' },
                            }}
                        >
                            {settings.appSubtitle}
                        </Typography>
                    )}

                </Box>

                {/* Right Logo + Language Switcher + Settings */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        component="img"
                        src={rightLogo}
                        alt="Right Logo"
                        sx={{
                            height: { xs: 140, sm: 80 },
                            maxWidth: { xs: 180, sm: 250 },
                            objectFit: 'contain',
                        }}
                    />
                    {/* Sync Indicator moved to MainLayout */}
                    <LanguageSwitcher />
                    <IconButton
                        color={iconColor}
                        onClick={onSettingsClick}
                        sx={{ mx: .5, boxShadow: '0 0 3px rgba(0, 0, 0, 0.51)' }}
                    >
                        <SettingsIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
