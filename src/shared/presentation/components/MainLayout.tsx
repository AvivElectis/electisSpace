import { useState } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import { AppHeader } from './AppHeader';
import { NavigationDrawer, DRAWER_WIDTH } from './NavigationDrawer';
import type { ReactNode } from 'react';

interface MainLayoutProps {
    title: string;
    children: ReactNode;
    onSyncClick?: () => void;
    isSyncing?: boolean;
}

/**
 * Main Layout Component
 * Provides the overall app structure with header and navigation
 */
export function MainLayout({
    title,
    children,
    onSyncClick,
    isSyncing = false,
}: MainLayoutProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppHeader
                title={title}
                onMenuClick={handleDrawerToggle}
                onSyncClick={onSyncClick}
                isSyncing={isSyncing}
                showMenuButton={isMobile}
            />

            {/* Navigation Drawer */}
            {isMobile ? (
                <NavigationDrawer
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    variant="temporary"
                />
            ) : (
                <NavigationDrawer
                    open={true}
                    onClose={() => { }}
                    variant="permanent"
                />
            )}

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                }}
            >
                <Toolbar /> {/* Spacer for fixed header */}
                {children}
            </Box>
        </Box>
    );
}
