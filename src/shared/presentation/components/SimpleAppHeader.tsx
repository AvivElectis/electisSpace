import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';

interface SimpleAppHeaderProps {
    title: string;
    subtitle?: string;
    onLanguageClick?: () => void;
    onHelpClick?: () => void;
    onSettingsClick?: () => void;
    onMenuClick?: () => void;
}

/**
 * Simple App Header Component
 * Fully responsive clean top bar with centered title and icon buttons
 */
export function SimpleAppHeader({
    title,
    subtitle,
    onLanguageClick,
    onHelpClick,
    onSettingsClick,
    onMenuClick,
}: SimpleAppHeaderProps) {
    return (
        <AppBar position="static" elevation={0}>
            <Toolbar sx={{
                justifyContent: 'space-between',
                minHeight: { xs: 56, sm: 64 },
                px: { xs: 1, sm: 2 },
            }}>
                {/* Left: Menu icon (for mobile) or spacer */}
                <Box sx={{ display: 'flex', gap: 0.5, minWidth: { xs: 40, sm: 48 } }}>
                    {onMenuClick && (
                        <IconButton
                            onClick={onMenuClick}
                            size="small"
                            color="inherit"
                            sx={{ display: { xs: 'flex', md: 'flex' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                </Box>

                {/* Center: Title and subtitle - Responsive Typography */}
                <Box sx={{
                    textAlign: 'center',
                    flexGrow: 1,
                    px: { xs: 1, sm: 2 },
                    minWidth: 0, // Allow text truncation
                }}>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                mt: -0.5,
                                fontSize: { sm: '0.75rem', md: '0.8125rem' },
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {/* Right: Action icons - Responsive sizing */}
                <Box sx={{
                    display: 'flex',
                    gap: { xs: 0.5, sm: 1 },
                    minWidth: { xs: 40, sm: 48 },
                    justifyContent: 'flex-end',
                }}>
                    {onLanguageClick && (
                        <IconButton
                            onClick={onLanguageClick}
                            size="small"
                            color="inherit"
                            sx={{ display: { xs: 'none', sm: 'flex' } }}
                        >
                            <LanguageIcon />
                        </IconButton>
                    )}
                    {onHelpClick && (
                        <IconButton
                            onClick={onHelpClick}
                            size="small"
                            color="inherit"
                            sx={{ display: { xs: 'none', sm: 'flex' } }}
                        >
                            <HelpOutlineIcon />
                        </IconButton>
                    )}
                    {onSettingsClick && (
                        <IconButton
                            onClick={onSettingsClick}
                            size="small"
                            color="inherit"
                        >
                            <SettingsIcon />
                        </IconButton>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
