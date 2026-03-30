import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { nativeColors, nativeFonts, nativeRadii, nativeShadows } from './nativeTokens';

export function createNativeTheme(direction: 'ltr' | 'rtl') {
    const themeOptions: ThemeOptions = {
        direction,
        palette: {
            mode: 'light',
            primary: nativeColors.primary,
            success: { main: nativeColors.status.success },
            warning: { main: nativeColors.status.warning },
            error: { main: nativeColors.status.error },
            info: { main: nativeColors.status.info },
            background: {
                default: nativeColors.surface.base,
                paper: nativeColors.surface.lowest,
            },
        },
        typography: {
            fontFamily: nativeFonts.body,
            h1: { fontFamily: nativeFonts.heading, fontWeight: 800 },
            h2: { fontFamily: nativeFonts.heading, fontWeight: 700 },
            h3: { fontFamily: nativeFonts.heading, fontWeight: 700 },
            h4: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            h5: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            h6: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            subtitle1: { fontFamily: nativeFonts.heading, fontWeight: 600 },
            subtitle2: { fontFamily: nativeFonts.heading, fontWeight: 500 },
            body1: { fontFamily: nativeFonts.body },
            body2: { fontFamily: nativeFonts.body },
            button: { fontFamily: nativeFonts.body, fontWeight: 600 },
            caption: { fontFamily: nativeFonts.body },
            overline: {
                fontFamily: nativeFonts.body,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                fontSize: '0.6875rem',
            },
        },
        shape: {
            borderRadius: nativeRadii.card,
        },
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.card,
                        boxShadow: nativeShadows.card,
                        border: 'none',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.button,
                        minHeight: 48,
                        textTransform: 'none' as const,
                        fontWeight: 600,
                        gap: 8,
                    },
                    startIcon: {
                        marginInlineEnd: 4,
                    },
                    endIcon: {
                        marginInlineStart: 4,
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.chip,
                        gap: 4,
                    },
                    icon: {
                        marginInlineStart: 4,
                        marginInlineEnd: -2,
                    },
                    deleteIcon: {
                        marginInlineStart: -2,
                        marginInlineEnd: 4,
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        minWidth: 40,
                    },
                },
            },
            MuiBottomNavigationAction: {
                styleOverrides: {
                    root: {
                        gap: 2,
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    variant: 'filled' as const,
                },
                styleOverrides: {
                    root: {
                        '& .MuiFilledInput-root': {
                            borderRadius: nativeRadii.input,
                            gap: 8,
                            alignItems: 'center',
                            '&::before, &::after': { display: 'none' },
                        },
                        '& .MuiInputAdornment-root': {
                            marginTop: '0 !important',
                            display: 'flex',
                            alignItems: 'center',
                        },
                    },
                },
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        borderRadius: '50%',
                    },
                },
            },
            MuiBottomNavigation: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'transparent',
                    },
                },
            },
        },
    };

    return createTheme(themeOptions);
}
