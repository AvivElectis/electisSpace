import { memo } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useNativePageTitle } from './NativePageTitleContext';
import { nativeGradients, nativeSizing } from '../themes/nativeTokens';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

export const NativeAppBar = memo(function NativeAppBar() {
    const navigate = useNavigate();
    const { pageTitle } = useNativePageTitle();

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                background: nativeGradients.appBar,
                paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
            }}
        >
            <Toolbar
                sx={{
                    minHeight: `${nativeSizing.appBarHeight}px !important`,
                    height: nativeSizing.appBarHeight,
                    px: 1,
                    gap: 0.5,
                }}
            >
                {pageTitle.showBackArrow ? (
                    <IconButton
                        onClick={() => navigate(-1)}
                        sx={{ color: 'primary.contrastText' }}
                        size="small"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                ) : (
                    <Box
                        component="img"
                        src="/logos/logo_fixed_02.png"
                        alt="electisSpace"
                        sx={{
                            height: 34,
                            width: 'auto',
                            objectFit: 'contain',
                            ml: 0.5,
                            filter: 'brightness(0) invert(1) drop-shadow(0 0 1px rgba(255,255,255,0.5))',
                        }}
                    />
                )}

                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.contrastText"
                    noWrap
                    sx={{ flex: 1, ml: pageTitle.showBackArrow ? 0 : 0.5 }}
                >
                    {pageTitle.title}
                </Typography>

                {pageTitle.actions}

                {!pageTitle.showBackArrow && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{
                            // Force ALL child elements white on the blue gradient
                            '& *': {
                                color: '#ffffff !important',
                                borderColor: 'rgba(255,255,255,0.4) !important',
                            },
                            '& .MuiIconButton-root': {
                                background: 'rgba(255,255,255,0.15) !important',
                                '&:hover': { background: 'rgba(255,255,255,0.25) !important' },
                            },
                            '& .MuiButton-root': {
                                background: 'rgba(255,255,255,0.15) !important',
                                '&:hover': { background: 'rgba(255,255,255,0.25) !important' },
                            },
                            // Force the icon-only mobile button to show
                            '& .MuiIconButton-root svg': {
                                color: '#ffffff !important',
                            },
                        }}>
                            <CompanyStoreSelector compact />
                        </Box>
                        <IconButton
                            onClick={() => navigate('/settings')}
                            sx={{ color: 'primary.contrastText' }}
                            size="small"
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
});
