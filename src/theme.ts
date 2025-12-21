import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

/**
 * Create theme with RTL support based on language direction
 */
export function createAppTheme(direction: 'ltr' | 'rtl') {
    const themeOptions: ThemeOptions = {
        direction,

        palette: {
            mode: 'light',
            primary: {
                main: '#007AFF', // Apple Blue
                light: '#5AC8FA',
                dark: '#0051D5',
                contrastText: '#fff',
            },
            secondary: {
                main: '#5856D6', // Apple Purple
                light: '#AF52DE',
                dark: '#3634A3',
                contrastText: '#fff',
            },
            error: {
                main: '#FF3B30', // Apple Red
                light: '#FF6961',
                dark: '#D70015',
            },
            warning: {
                main: '#FF9500', // Apple Orange
                light: '#FFCC00',
                dark: '#C93400',
            },
            success: {
                main: '#34C759', // Apple Green
                light: '#30D158',
                dark: '#248A3D',
            },
            info: {
                main: '#007AFF',
                light: '#5AC8FA',
                dark: '#0051D5',
            },
            background: {
                default: '#F5F5F7', // Apple gentle gray
                paper: '#FFFFFF',
            },
            text: {
                primary: '#3C3C3E', // Dark gray
                secondary: '#86868B', // Medium gray
                disabled: 'rgba(0, 0, 0, 0.26)',
            },
            divider: 'rgba(0, 0, 0, 0.08)',
        },

        typography: {
            fontFamily: [
                'Assistant',  // Hebrew font
                '-apple-system',
                'BlinkMacSystemFont',
                'SF Pro Display',
                'SF Pro Text',
                'Helvetica Neue',
                'sans-serif',
            ].join(','),

            h1: {
                fontSize: '2.5rem',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
            },
            h2: {
                fontSize: '2rem',
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
            },
            h3: {
                fontSize: '1.75rem',
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
            },
            h4: {
                fontSize: '1.5rem',
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.005em',
            },
            h5: {
                fontSize: '1.25rem',
                fontWeight: 600,
                lineHeight: 1.4,
            },
            h6: {
                fontSize: '1.05rem',
                fontWeight: 600,
                lineHeight: 1.4,
            },
            body1: {
                fontSize: '1rem',
                lineHeight: 1.47,
                letterSpacing: '-0.005em',
            },
            body2: {
                fontSize: '0.875rem',
                lineHeight: 1.43,
                letterSpacing: '-0.005em',
            },
            button: {
                fontSize: '0.9375rem',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                textTransform: 'none',
            },
        },

        shape: {
            borderRadius: 12, // Default radius
        },

        shadows: [
            'none',
            '0px 2px 4px rgba(0, 0, 0, 0.04)',
            '0px 2px 8px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.04)',
            '0px 4px 16px rgba(0, 0, 0, 0.06), 0px 4px 8px rgba(0, 0, 0, 0.06)',
            '0px 2px 4px rgba(0, 0, 0, 0.2)', // Elevated shadow for buttons
            '0px 8px 24px rgba(90, 200, 250, 0.3)', // FAB shadow
            '0px 12px 32px rgba(90, 200, 250, 0.4)', // FAB hover shadow
            '0px 12px 40px rgba(0, 0, 0, 0.12), 0px 12px 24px rgba(0, 0, 0, 0.08)', // Dialog shadow
            ...Array(17).fill('none'),
        ] as any,

        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '10px',
                        padding: '10px 20px',
                        minHeight: '44px',
                        minWidth: '100px',
                        marginInline: '8px',
                        fontWeight: 500,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:active': {
                            transform: 'scale(0.97)',
                        },
                    },
                    startIcon: {
                        paddingInlineEnd: '8px',
                        '& > *': {
                            filter: 'drop-shadow(0 0px 3px rgba(0, 0, 0, 0.5))',
                        },
                    },
                    endIcon: {
                        paddingInlineStart: '8px',
                        '& > *': {
                            filter: 'drop-shadow(0 0px 3px rgba(0, 0, 0, 0.5))',
                        },
                    },
                    contained: {
                        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
                            transform: 'translateY(-1px)',
                        },
                    },
                    containedPrimary: {
                        background: 'linear-gradient(135deg, #007AFF 0%, #6cc9ffd7 50%, #007AFF 100%)',
                        backgroundSize: '200% auto',
                        color: '#FFFFFF',
                        textShadow: '0 0px 3px rgba(0, 0, 0, 1)',
                        animation: 'gradientAnimation 20s ease infinite',
                        '&:hover': {
                            backgroundPosition: 'right center',
                            animation: 'gradientAnimation 5s ease infinite',
                            transform: 'translateY(-1px)',
                            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
                        },
                        '&:disabled': {
                            background: 'rgba(0, 0, 0, 0.12) !important',
                            color: 'rgba(0, 0, 0, 0.26) !important',
                            boxShadow: 'none !important',
                            animation: 'none',
                        },
                    },
                    containedSecondary: {
                        // Styled as outlined for secondary
                        background: 'transparent',
                        border: '2px solid #5856D6',
                        color: '#5856D6',
                        boxShadow: 'none',
                        '&:hover': {
                            backgroundColor: 'rgba(88, 86, 214, 0.04)',
                            borderColor: '#3634A3',
                            boxShadow: 'none',
                        },
                        '&:disabled': {
                            background: 'transparent !important',
                            borderColor: 'rgba(0, 0, 0, 0.12) !important',
                            color: 'rgba(0, 0, 0, 0.26) !important',
                        },
                    },
                    text: {
                        fontWeight: 700,
                        padding: '8px 12px',
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            width: '100%',
                            height: '2px',
                            bottom: 0,
                            left: 0,
                            backgroundColor: 'currentColor',
                            transform: 'scaleX(0)',
                            transformOrigin: 'bottom right',
                            transition: 'transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1)',
                        },
                        '&:hover': {
                            background: 'transparent !important',
                            transform: 'scale(1.02)',
                            '&::after': {
                                transform: 'scaleX(1.02)',
                                transformOrigin: 'bottom left',
                            },
                        },
                        '&:disabled': {
                            background: 'transparent',
                            color: 'rgba(0, 0, 0, 0.26) !important',
                        },
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            backgroundColor: '#FFFFFF',
                            transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '& fieldset': {
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                borderWidth: '1px',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(0, 0, 0, 0.2)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#007AFF',
                                borderWidth: '2px',
                            },
                        },
                        '& .MuiInputBase-input': {
                            padding: '12px 14px',
                            fontSize: '1rem',
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: '16px',
                        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.04)',
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06), 0px 4px 8px rgba(0, 0, 0, 0.06)',
                        },
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                    rounded: {
                        borderRadius: '16px',
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: '20px',
                        boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.12), 0px 12px 24px rgba(0, 0, 0, 0.08)',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                        },
                        '&:active': {
                            transform: 'scale(0.96)',
                        },
                    },
                },
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        background: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)',
                        boxShadow: '0 8px 24px rgba(90, 200, 250, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            boxShadow: '0 12px 32px rgba(90, 200, 250, 0.4)',
                            transform: 'translateY(-2px) scale(1.05)',
                        },
                        '&:active': {
                            transform: 'translateY(0) scale(0.98)',
                        },
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 500,
                        minHeight: '48px',
                        padding: '12px 12px',
                        gap: 8,
                        transition: 'all 0.2s ease-in-out',
                        '&.Mui-selected': {
                            fontWeight: 600,
                        },
                        '&:hover': {
                            fontWeight: 600,
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: '8px',
                        fontWeight: 500,
                    },
                },
            },
        },
    };

    return createTheme(themeOptions);
}

// Export RTL cache configuration for use with Emotion
export const cacheRtl = {
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
};

// Default LTR theme
export default createAppTheme('ltr');
