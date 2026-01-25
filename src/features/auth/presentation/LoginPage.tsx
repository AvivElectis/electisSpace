/**
 * Login Page Component
 */

import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    useTheme,
    alpha,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, Language as LanguageIcon } from '@mui/icons-material';
import { useAuthStore } from '../infrastructure/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login({ email, password });
        if (success) {
            navigate('/');
        }
    };

    const handleLanguageChange = (_: React.MouseEvent<HTMLElement>, newLang: string | null) => {
        if (newLang) {
            i18n.changeLanguage(newLang);
            document.dir = newLang === 'he' ? 'rtl' : 'ltr';
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.dark} 100%)`,
                p: 2,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.2)} 0%, transparent 70%)`,
                    zIndex: 0,
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-20%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 70%)`,
                    zIndex: 0,
                },
            }}
        >
            <Card
                elevation={24}
                sx={{
                    maxWidth: 440,
                    width: '100%',
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    background: alpha(theme.palette.background.paper, 0.8),
                    position: 'relative',
                    zIndex: 1,
                    overflow: 'visible',
                }}
            >
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <ToggleButtonGroup
                        value={i18n.language}
                        exclusive
                        onChange={handleLanguageChange}
                        aria-label="language"
                        size="small"
                        sx={{
                            background: alpha(theme.palette.background.default, 0.5),
                            backdropFilter: 'blur(4px)',
                            '& .MuiToggleButton-root': {
                                border: 'none',
                                borderRadius: 1,
                                px: 1.5,
                                py: 0.5,
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: 'text.secondary',
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                    },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="en">EN</ToggleButton>
                        <ToggleButton value="he">HE</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4, mt: 2 }}>
                        <Typography
                            variant="h4"
                            fontWeight={800}
                            sx={{
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px',
                                mb: 1,
                            }}
                        >
                            electisSpace
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {t('login.subtitle', 'Sign in to access your dashboard')}
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3, borderRadius: 2 }}
                            onClose={clearError}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label={t('login.email', 'Email Address')}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            autoFocus
                            placeholder="admin@electis.co.il"
                            sx={{ mb: 2.5 }}
                            InputProps={{
                                sx: { borderRadius: 2 }
                            }}
                        />

                        <TextField
                            fullWidth
                            label={t('login.password', 'Password')}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            sx={{ mb: 4 }}
                            InputProps={{
                                sx: { borderRadius: 2 },
                                endAdornment: i18n.language === 'he' ? undefined : (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                startAdornment: i18n.language === 'he' ? (
                                    <InputAdornment position="start">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="start"
                                            size="small"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isLoading || !email || !password}
                            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                            sx={{
                                py: 1.75,
                                borderRadius: 3,
                                textTransform: 'none',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                                },
                            }}
                        >
                            {isLoading ? t('login.signingIn', 'Signing in...') : t('login.signIn', 'Sign In')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}

export default LoginPage;
