import { memo } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNativePageTitle } from './NativePageTitleContext';
import { nativeGradients, nativeSizing } from '../themes/nativeTokens';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

const appBarSx = {
    background: nativeGradients.appBar,
    paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
} as const;

const toolbarSx = {
    minHeight: `${nativeSizing.appBarHeight}px !important`,
    height: nativeSizing.appBarHeight,
    px: 1,
    gap: 0.5,
} as const;

const backButtonSx = { color: 'primary.contrastText' } as const;

const brandTextSx = {
    fontFamily: '"Manrope", sans-serif',
    fontWeight: 800,
    color: 'primary.contrastText',
    ml: 1,
    letterSpacing: '-0.3px',
    fontSize: '1.1rem',
} as const;

const brandSpanSx = { fontWeight: 400, opacity: 0.85 } as const;

const selectorWrapperSx = {
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
    '& .MuiIconButton-root svg': {
        color: '#ffffff !important',
    },
} as const;

const rightClusterSx = { display: 'flex', alignItems: 'center', gap: 0.5 } as const;

const settingsButtonSx = { color: 'primary.contrastText' } as const;

export const NativeAppBar = memo(function NativeAppBar() {
    const navigate = useNavigate();
    useNavigationType(); // ensure hook is registered; actual nav state read via window.history.state
    const { pageTitle } = useNativePageTitle();
    const { i18n } = useTranslation();
    const isRtl = i18n.dir() === 'rtl';

    const handleBack = () => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate('/', { replace: true });
        }
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={appBarSx}
        >
            <Toolbar sx={toolbarSx}>
                {pageTitle.showBackArrow ? (
                    <IconButton
                        onClick={handleBack}
                        sx={backButtonSx}
                        size="medium"
                    >
                        {isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
                    </IconButton>
                ) : (
                    <Typography
                        variant="subtitle1"
                        sx={brandTextSx}
                    >
                        electis<Box component="span" sx={brandSpanSx}>Space</Box>
                    </Typography>
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
                    <Box sx={rightClusterSx}>
                        {/* Force ALL child elements white on the blue gradient */}
                        <Box sx={selectorWrapperSx}>
                            <CompanyStoreSelector compact />
                        </Box>
                        <IconButton
                            onClick={() => navigate('/settings')}
                            sx={settingsButtonSx}
                            size="medium"
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
});
