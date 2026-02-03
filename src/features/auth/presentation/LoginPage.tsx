/**
 * Login Page Component
 */

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    useTheme,
    alpha,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useAuthStore } from '../infrastructure/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { login, verify2FA, resendCode, isLoading, error, clearError, pendingEmail } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const autoSubmitRef = useRef(false);

    // Auto-submit OTP when 6 digits are entered
    useEffect(() => {
        if (verificationCode.length === 6 && showVerification && !isLoading && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            clearError();
            verify2FA(verificationCode).then((success) => {
                if (success) {
                    navigate('/');
                }
                autoSubmitRef.current = false;
            });
        }
    }, [verificationCode, showVerification, isLoading, verify2FA, clearError, navigate]);

    // Reset autoSubmitRef when verification code changes to less than 6
    useEffect(() => {
        if (verificationCode.length < 6) {
            autoSubmitRef.current = false;
        }
    }, [verificationCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login({ email, password });
        if (success) {
            setShowVerification(true);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await verify2FA(verificationCode);
        if (success) {
            navigate('/');
        }
    };

    const handleResendCode = async () => {
        clearError();
        await resendCode();
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
                p: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: 'background.default',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    //background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.2)} 0%, transparent 70%)`,
                    zIndex: 0,
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
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
                    maxWidth: { xs: '100%', sm: 500, md: 550 },
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

                <CardContent sx={{ p: { xs: 3, sm: 5, md: 6 } }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4, mt: 2 }}>
                        <Box
                            component="img"
                            src="/logos/logo_fixed_02.png"
                            alt="electisSpace"
                            sx={{
                                height: { xs: 70, sm: 80, md: 90 },
                                width: 'auto',
                                mb: 2,
                                objectFit: 'contain',
                                imageRendering: 'smooth',
                            }}
                        />
                        <Typography variant="body1" color="text.secondary">
                            {t('login.subtitle', 'Sign in to access your dashboard')}
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ 
                                mb: 3, 
                                borderRadius: 2, 
                                p: 1,
                                '& .MuiAlert-action': {
                                    position: 'absolute',
                                    right: i18n.language === 'he' ? 'auto' : 8,
                                    left: i18n.language === 'he' ? 8 : 'auto',
                                },
                                position: 'relative',
                            }}
                            onClose={clearError}
                        >
                            {t(error, error)}
                        </Alert>
                    )}

                    {/* Login Form */}
                    {!showVerification ? (
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
                                placeholder="aviv@electis.co.il"
                                sx={{ mb: 2.5 }}
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />

                            <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
                                <TextField
                                    fullWidth
                                    label={t('login.password', 'Password')}
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    sx={{
                                        width: 45,
                                        height: 45,
                                        borderRadius: 0,
                                        borderColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
                                        color: 'action.active',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            scale: '1.1',
                                            bgcolor: 'unset'
                                        }
                                    }}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </Box>

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
                    ) : (
                        <form onSubmit={handleVerify}>
                            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                                {t('login.codeSent', { 
                                    email: pendingEmail,
                                    defaultValue: `A verification code has been sent to ${pendingEmail}`
                                })}
                            </Alert>

                            <TextField
                                fullWidth
                                label={t('login.verificationCode', 'Verification Code')}
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                autoFocus
                                placeholder="000000"
                                inputProps={{
                                    maxLength: 6,
                                    style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }
                                }}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />

                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => {
                                        setShowVerification(false);
                                        setVerificationCode('');
                                    }}
                                    disabled={isLoading}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {t('login.back', 'Back')}
                                </Button>
                                <Button
                                    fullWidth
                                    variant="text"
                                    onClick={handleResendCode}
                                    disabled={isLoading}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {t('login.resendCode', 'Resend Code')}
                                </Button>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading || verificationCode.length !== 6}
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
                                {isLoading ? t('login.verifying', 'Verifying...') : t('login.verify', 'Verify')}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

export default LoginPage;
