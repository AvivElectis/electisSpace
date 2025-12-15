import { createTheme } from '@mui/material/styles';

/**
 * electis Space Theme - Minimal Clean Design
 * Based on conference-manager style
 */

declare module '@mui/material/styles' {
    interface Theme {
        custom: {
            spacing: {
                page: string;
                section: string;
            };
        };
    }
    interface ThemeOptions {
        custom?: {
            spacing?: {
                page?: string;
                section?: string;
            };
        };
    }
}

const theme = createTheme({
    direction: 'ltr',

    palette: {
        mode: 'light',
        primary: {
            main: '#2196F3', // Simple blue
            light: '#64B5F6',
            dark: '#1976D2',
            contrastText: '#fff',
        },
        secondary: {
            main: '#FF9800', // Orange for warnings/alerts
            light: '#FFB74D',
            dark: '#F57C00',
            contrastText: '#fff',
        },
        error: {
            main: '#F44336',
        },
        warning: {
            main: '#FF9800',
        },
        success: {
            main: '#4CAF50',
        },
        background: {
            default: '#F5F5F5', // Light gray background
            paper: '#FFFFFF',
        },
        text: {
            primary: '#212121',
            secondary: '#757575',
        },
        divider: '#E0E0E0',
    },

    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),

        h1: {
            fontSize: '2rem',
            fontWeight: 500,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '1.75rem',
            fontWeight: 500,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 500,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 500,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.125rem',
            fontWeight: 500,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.8125rem',
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },

    shape: {
        borderRadius: 8, // Slightly less rounded
    },

    shadows: [
        'none',
        '0px 1px 3px rgba(0, 0, 0, 0.05)',
        '0px 2px 4px rgba(0, 0, 0, 0.06)',
        '0px 3px 6px rgba(0, 0, 0, 0.08)',
        '0px 4px 8px rgba(0, 0, 0, 0.10)',
        '0px 6px 12px rgba(0, 0, 0, 0.10)',
        '0px 8px 16px rgba(0, 0, 0, 0.12)',
        '0px 12px 24px rgba(0, 0, 0, 0.14)',
        ...Array(17).fill('none'),
    ] as any,

    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E0E0E0',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 6,
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
                    borderRadius: 8,
                },
                elevation1: {
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
                    backgroundColor: '#FFFFFF',
                    color: '#212121',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #E0E0E0',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                },
            },
        },
    },

    custom: {
        spacing: {
            page: '24px',
            section: '16px',
        },
    },
});

export default theme;
