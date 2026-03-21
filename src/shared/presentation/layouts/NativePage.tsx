/**
 * NativePage
 *
 * Full-page wrapper for native (Android/iOS) screens.
 * Provides consistent blue AppBar with back arrow + title + optional actions,
 * safe-area padding, and scroll container with bottom nav offset.
 */

import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NATIVE_BOTTOM_NAV_HEIGHT } from './NativeBottomNav';

interface NativePageProps {
    title: string;
    children: React.ReactNode;
    onBack?: () => void;
    actions?: React.ReactNode;
    noPadding?: boolean;
    hideBottomNavPadding?: boolean;
    viewTransitionName?: string;
}

export function NativePage({
    title,
    children,
    onBack,
    actions,
    noPadding = false,
    hideBottomNavPadding = false,
    viewTransitionName,
}: NativePageProps) {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'he';

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
                    backgroundColor: 'primary.dark',
                }}
            >
                <Toolbar sx={{ minHeight: '56px !important', height: 56, gap: 1 }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        aria-label="back"
                    >
                        <ArrowBackIcon sx={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
                    </IconButton>
                    <Typography
                        variant="h6"
                        component="h1"
                        sx={{
                            flex: 1,
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            textAlign: isRtl ? 'right' : 'left',
                        }}
                        style={viewTransitionName ? { viewTransitionName: `title-${viewTransitionName}` } as React.CSSProperties : undefined}
                    >
                        {title}
                    </Typography>
                    {actions}
                </Toolbar>
            </AppBar>

            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    backgroundColor: '#f8f9fa',
                    ...(noPadding ? {} : { px: 2, py: 1.5 }),
                    ...(hideBottomNavPadding ? {} : {
                        pb: `calc(${NATIVE_BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom, 0px))`,
                    }),
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
