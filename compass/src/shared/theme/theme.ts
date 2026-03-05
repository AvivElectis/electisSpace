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
    const base = isDark ? darkTheme : lightTheme;

    // Apply accessibility overrides if needed
    if (fontSize === 100 && !highContrast) return base;

    return createTheme(base, {
        typography: {
            fontSize: 14 * (fontSize / 100),
        },
        ...(highContrast && {
            components: {
                MuiButton: {
                    styleOverrides: {
                        outlined: {
                            borderWidth: 2,
                            '&:hover': { borderWidth: 2 },
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            borderWidth: 2,
                        },
                    },
                },
            },
        }),
    });
}

// Keep backward-compatible export for any imports using `theme`
export const theme = darkTheme;
