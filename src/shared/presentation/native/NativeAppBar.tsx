import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useNativePageTitle } from './NativePageTitleContext';
import { nativeGradients, nativeSizing } from '../themes/nativeTokens';
import { CompanyStoreSelector } from '@features/auth/presentation/CompanyStoreSelector';

export function NativeAppBar() {
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
                {pageTitle.showBackArrow && (
                    <IconButton
                        onClick={() => navigate(-1)}
                        sx={{ color: 'primary.contrastText' }}
                        size="small"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                )}

                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.contrastText"
                    noWrap
                    sx={{ flex: 1, ml: pageTitle.showBackArrow ? 0 : 1 }}
                >
                    {pageTitle.title}
                </Typography>

                {pageTitle.actions}

                {!pageTitle.showBackArrow && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{
                            '& .MuiButton-root, & .MuiTypography-root, & .MuiSvgIcon-root': {
                                color: 'primary.contrastText !important',
                            },
                            '& .MuiButton-root': {
                                borderColor: 'rgba(255,255,255,0.3)',
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
}
