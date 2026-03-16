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
                paddingTop: 'env(safe-area-inset-top)',
            }}
        >
            <Toolbar
                sx={{
                    minHeight: '48px !important',
                    height: 48,
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* Start side: page title */}
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        color="primary.contrastText"
                        noWrap
                    >
                        {pageTitle}
                    </Typography>
                </Box>

                {/* End side: CompanyStoreSelector + Settings */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                    }}
                >
                    <CompanyStoreSelector compact />
                    <IconButton
                        size="small"
                        onClick={handleSettingsClick}
                        sx={{ color: 'primary.contrastText' }}
                        aria-label="settings"
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
