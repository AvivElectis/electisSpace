// ... imports
import { AppBar, Toolbar, Box, IconButton, Typography, Tooltip, Avatar, Menu, MenuItem, Divider, ListItemIcon } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore'; // Import Auth Store
import { useTranslation } from 'react-i18next';
import { useState } from 'react'; // Import useState

// ... existing imports
// import { useSyncStore } from '@features/sync/infrastructure/syncStore';
// import { SyncStatusIndicator } from '@shared/presentation/components/SyncStatusIndicator';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

interface AppHeaderProps {
    onSettingsClick?: () => void;
    onMenuClick?: () => void;
    onManualClick?: () => void;
    onEditProfile?: () => void;  // Callback to open user profile editor
    settingsOpen?: boolean;
}

/**
 * Global Application Header
 * Displays logos, app title (centered), language switcher, settings icon, and user menu
 * Title and subtitle are configurable through app settings
 */
export function AppHeader({ onSettingsClick, onMenuClick, onManualClick, onEditProfile, settingsOpen }: AppHeaderProps) {
    // Get settings from store
    const settings = useSettingsStore((state) => state.settings);
    const isLocked = useSettingsStore((state) => state.isLocked);
    const { user, logout } = useAuthStore(); // Auth
    const { t } = useTranslation();

    // User Menu State
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

    // Use dynamic logos or fall back to defaults
    const leftLogo = settings.logos.logo1 || `${import.meta.env.BASE_URL}logos/CI_SOLUMLogo_WithClaim-Blue.png`;
    const rightLogo = settings.logos.logo2 || `${import.meta.env.BASE_URL}logos/logo_fixed_02.png`;

    // Icon color: blue only when dialog is open AND unlocked, otherwise default
    const iconColor = (settingsOpen || !isLocked) ? 'primary' : 'default';

    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setUserMenuAnchor(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setUserMenuAnchor(null);
    };

    const handleLogout = async () => {
        handleUserMenuClose();
        await logout();
        // Redirect is handled by ProtectedRoute / AuthStore listener usually, or we might need to navigate
        // But ProtectedRoute watches 'isAuthenticated', so it should auto-redirect.
    };

    // Get initials for avatar
    const getInitials = () => {
        if (!user) return '?';
        if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        return user.email.substring(0, 2).toUpperCase();
    };

    return (
        <AppBar
            position="fixed"
            color="default"
            elevation={0}
            sx={{
                top: 0,
                left: 0,
                right: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
            }}
        >
            {/* Main toolbar with logos and buttons */}
            <Toolbar sx={{
                justifyContent: 'space-between',
                minHeight: { xs: 48, sm: 64 },
                px: { xs: .5, sm: 3 },
            }}>
                {/* Mobile Menu Button (left side on mobile) */}
                {onMenuClick && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={onMenuClick}
                        sx={{ display: { xs: 'flex', md: 'none' }, mx: .5 }}
                    >
                        <MenuIcon sx={{ fontSize: '40px', padding: 0, borderRadius: .5, boxShadow: '0 0 3px rgba(0, 0, 0, 0.51)' }} />
                    </IconButton>
                )}

                {/* Left Logo */}
                <Box
                    component="img"
                    src={leftLogo}
                    alt="Left Logo"
                    sx={{
                        height: { xs: 40, sm: 60, md: 80 },
                        maxWidth: { xs: 100, sm: 180, md: 250 },
                        objectFit: 'contain',
                    }}
                />

                {/* Centered App Title - DESKTOP ONLY */}
                <Box
                    sx={{
                        flex: 1,
                        display: { xs: 'none', sm: 'flex' },
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
                            fontSize: { sm: '1.75rem', md: '2.25rem' },
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
                                fontSize: { sm: '0.875rem' },
                            }}
                        >
                            {settings.appSubtitle}
                        </Typography>
                    )}
                </Box>

                {/* Right Logo + Language Switcher + Manual + Settings + User Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>

                    <Box
                        component="img"
                        src={rightLogo}
                        alt="Right Logo"
                        sx={{
                            height: { xs: 40, sm: 60, md: 80 },
                            maxWidth: { xs: 100, sm: 180, md: 250 },
                            objectFit: 'contain',
                            display: { xs: 'none', sm: 'block' },
                        }}
                    />

                    {/* Company/Store Context Selector - hidden on xs, compact on sm */}
                    {user && (
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <CompanyStoreSelector compact />
                        </Box>
                    )}

                    <Tooltip title={t('manual.title')}>
                        <IconButton
                            color="default"
                            onClick={onManualClick}
                            sx={{ mx: .5, boxShadow: '0 0 3px rgba(0, 0, 0, 0.51)' }}
                        >
                            <HelpOutlineIcon />
                        </IconButton>
                    </Tooltip>
                    <LanguageSwitcher />

                    {user && (user.globalRole === 'PLATFORM_ADMIN' || 
                        user.companies?.some(c => c.role === 'COMPANY_ADMIN') ||
                        user.stores?.some(s => s.role === 'STORE_ADMIN' || s.role === 'STORE_MANAGER')) && (
                        <IconButton
                            color={iconColor}
                            onClick={onSettingsClick}
                            sx={{ mx: .5, boxShadow: '0 0 3px rgba(0, 0, 0, 0.51)' }}
                        >
                            <SettingsIcon />
                        </IconButton>
                    )}

                    {/* User Menu */}
                    {user && (
                        <>
                            <Tooltip title={user.firstName ? `${user.firstName} ${user.lastName}` : user.email}>
                                <IconButton
                                    onClick={handleUserMenuOpen}
                                    sx={{ ml: 1, p: 0 }}
                                >
                                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: '0.875rem' }}>
                                        {getInitials()}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={userMenuAnchor}
                                open={Boolean(userMenuAnchor)}
                                onClose={handleUserMenuClose}
                                PaperProps={{
                                    elevation: 0,
                                    sx: {
                                        overflow: 'visible',
                                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                        mt: 1.5,
                                        '& .MuiAvatar-root': {
                                            width: 32,
                                            height: 32,
                                            ml: -0.5,
                                            mr: 1,
                                        },
                                        '&::before': {
                                            content: '""',
                                            display: 'block',
                                            position: 'absolute',
                                            top: 0,
                                            right: 14,
                                            width: 10,
                                            height: 10,
                                            bgcolor: 'background.paper',
                                            transform: 'translateY(-50%) rotate(45deg)',
                                            zIndex: 0,
                                        },
                                    },
                                }}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <Box sx={{ px: 2, py: 1 }}>
                                    <Typography variant="subtitle2">
                                        {user.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {user.email}
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                bgcolor: 'primary.light',
                                                color: 'primary.contrastText',
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: 1,
                                                fontSize: '0.65rem'
                                            }}
                                        >
                                            {user.globalRole || user.stores?.[0]?.role || 'User'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Divider />
                                {onEditProfile && (
                                    <MenuItem onClick={() => { handleUserMenuClose(); onEditProfile(); }}>
                                        <ListItemIcon>
                                            <PersonIcon fontSize="small" />
                                        </ListItemIcon>
                                        {t('settings.users.editProfile')}
                                    </MenuItem>
                                )}
                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon>
                                        <LogoutIcon fontSize="small" />
                                    </ListItemIcon>
                                    {t('auth.logout')}
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                </Box>
            </Toolbar>

            {/* Mobile App Title + Store Selector - Second row on small screens */}
            <Box
                sx={{
                    display: { xs: 'flex', sm: 'none' },
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1,
                    px: 2,
                    gap: 1,
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h1"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            fontSize: '1.25rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
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
                                fontSize: '0.75rem',
                            }}
                        >
                            {settings.appSubtitle}
                        </Typography>
                    )}
                </Box>
                {user && <CompanyStoreSelector compact />}
            </Box>
        </AppBar>
    );
}
