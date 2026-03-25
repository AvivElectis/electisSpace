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
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: nativeRadii.chip,
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
                            '&::before, &::after': { display: 'none' },
                        },
                    },
                },
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        borderRadius: '50%', // Keep FABs circular (don't apply nativeRadii)
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
