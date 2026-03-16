/**
 * NativeAppHeader
 *
 * Slim AppBar for native (Android/iOS) app layout.
 * 48px height + safe-area-inset-top for notch support.
 * Shows page title (from current route), CompanyStoreSelector, and Settings icon.
 */

import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavTabs } from '../hooks/useNavTabs';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

export function NativeAppHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const navTabs = useNavTabs();

    // Derive page title from current route
    const currentTab = navTabs.find(tab => tab.value === location.pathname);
    const pageTitle = currentTab?.label ?? '';

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                bgcolor: 'primary.main',
                // Safe area for status bar — env() for notch devices, fallback 28px for standard Android status bar
                paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
            }}
        >
            <Toolbar
                sx={{
                    minHeight: '56px !important',
                    height: 56,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* Start side: page title */}
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        color="primary.contrastText"
                        noWrap
                        sx={{ fontSize: '1.2rem' }}
                    >
                        {pageTitle}
                    </Typography>
                </Box>

                {/* End side: CompanyStoreSelector + Settings */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <CompanyStoreSelector compact />
                    <IconButton
                        size="medium"
                        onClick={handleSettingsClick}
                        sx={{ color: 'primary.contrastText' }}
                        aria-label="settings"
                    >
                        <SettingsIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
