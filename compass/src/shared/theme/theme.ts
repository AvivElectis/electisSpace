import { createTheme, type ThemeOptions } from '@mui/material/styles';

const sharedTypography: ThemeOptions['typography'] = {
    fontFamily: [
        '"Assistant"',
        '-apple-system',
        'BlinkMacSystemFont',
        '"SF Pro Display"',
        '"SF Pro Text"',
        '"Helvetica Neue"',
        'Arial',
    ].join(','),
    body1: { letterSpacing: '0.02em' },
    body2: { letterSpacing: '0.02em' },
    button: { letterSpacing: '0.03em' },
};

const sharedComponents: ThemeOptions['components'] = {
    MuiButton: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 600,
                gap: 6,
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 16,
            },
        },
    },
    MuiCardContent: {
        styleOverrides: {
            root: {
                '&:last-child': {
                    paddingBottom: 12,
                },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            sizeSmall: {
                paddingInline: 4,
            },
        },
    },
    MuiToggleButtonGroup: {
        styleOverrides: {
            grouped: {
                // Use logical properties so border-radius flips correctly in RTL
                borderRadius: 0,
                '&:first-of-type': {
                    borderStartStartRadius: 8,
                    borderEndStartRadius: 8,
                },
                '&:last-of-type': {
                    borderStartEndRadius: 8,
                    borderEndEndRadius: 8,
                },
            },
        },
    },
};

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
        },
        secondary: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
        },
        background: {
            default: '#0f172a',
            paper: '#1e293b',
        },
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: sharedComponents,
});

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#4f46e5',
            light: '#6366f1',
            dark: '#3730a3',
        },
        secondary: {
            main: '#059669',
            light: '#10b981',
            dark: '#047857',
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: sharedComponents,
});

export type ThemeMode = 'light' | 'dark' | 'system';

export function getActiveTheme(mode: ThemeMode, fontSize: number, highContrast: boolean) {
    const systemDark = typeof window !== 'undefined'
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && systemDark);
    const basePalette = isDark ? darkTheme.palette : lightTheme.palette;

    // Build theme from scratch so fontSize properly recalculates all typography variants
    return createTheme({
        palette: basePalette,
        typography: {
            ...sharedTypography,
            fontSize: 14 * (fontSize / 100),
        },
        shape: { borderRadius: 12 },
        components: {
            ...sharedComponents,
            ...(highContrast && {
                MuiButton: {
                    styleOverrides: {
                        root: {
                            ...sharedComponents!.MuiButton!.styleOverrides!.root as object,
                        },
                        outlined: {
                            borderWidth: 2,
                            '&:hover': { borderWidth: 2 },
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            borderRadius: 16,
                            border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.3)',
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
                        },
                    },
                },
            }),
        },
    });
}

// Keep backward-compatible export for any imports using `theme`
export const theme = darkTheme;
