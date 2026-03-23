/**
 * NativeLoginPage — Stitch-design login screen for Android native platform.
 *
 * Standalone page (no NativeShell, no app bar, no bottom nav).
 * Matches the Stitch login.html design:
 *   - Gradient background (no card wrapper for the fields section)
 *   - Logo centered in top third
 *   - EN/HE language toggle in top-right corner of screen
 *   - Email field with envelope icon (filled style, rounded)
 *   - Password field with lock icon and visibility toggle
 *   - Trust device checkbox
 *   - Blue Sign In button (full width, rounded, arrow icon)
 *   - Forgot password link
 *   - Biometric section at bottom
 *   - OTP flow when requiresVerification
 */

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    FormControlLabel,
    Checkbox,
    InputAdornment,
    alpha,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { biometricService } from '@shared/infrastructure/services/biometricService';
import { deviceTokenStorage } from '@shared/infrastructure/services/deviceTokenStorage';
import { authService } from '@shared/infrastructure/services/authService';
import { nativeColors, nativeFonts, nativeRadii } from '@shared/presentation/themes/nativeTokens';

// Design tokens from Stitch
const PRIMARY = nativeColors.primary.main;      // #005dac
const PRIMARY_LIGHT = nativeColors.primary.light; // #1976d2
const SURFACE_LOW = nativeColors.surface.low;   // #f2f3fa
const SURFACE_LOWEST = nativeColors.surface.lowest; // #ffffff
const SURFACE_HIGH = nativeColors.surface.high; // #dfe2ec

export function NativeLoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'he';

    const {
        login,
        verify2FA,
        resendCode,
        isLoading,
        error,
        clearError,
        pendingEmail,
        isAuthenticated,
        isInitialized,
        setUser,
    } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [showBiometric, setShowBiometric] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);

    // Track biometric availability on mount
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const autoSubmitRef = useRef(false);

    // Check biometric availability on mount (only on native)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            biometricService.isAvailable().then(setBiometricAvailable).catch(() => {
                setBiometricAvailable(false);
            });
        }
    }, []);

    // Redirect to dashboard if already authenticated
    useEffect(() => {
        if (isAuthenticated && isInitialized) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, isInitialized, navigate]);

    // Auto-submit OTP when 6 digits are entered
    useEffect(() => {
        if (verificationCode.length === 6 && showVerification && !isLoading && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            clearError();
            verify2FA(verificationCode, trustDevice).then((success) => {
                if (success) {
                    navigate('/');
                }
                autoSubmitRef.current = false;
            });
        }
    }, [verificationCode, showVerification, isLoading, verify2FA, clearError, navigate, trustDevice]);

    // Reset autoSubmitRef when code drops below 6 digits
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
            // On native: check if we can use biometric + device token auth
            if (Capacitor.isNativePlatform()) {
                const [deviceToken, isBioAvail] = await Promise.all([
                    deviceTokenStorage.getDeviceToken(),
                    biometricService.isAvailable(),
                ]);
                if (deviceToken && isBioAvail) {
                    setShowBiometric(true);
                    return;
                }
            }
            setShowVerification(true);
        }
    };

    const handleBiometricAuth = async () => {
        setBiometricLoading(true);
        clearError();
        try {
            const passed = await biometricService.authenticate(t('auth.biometric.reason'));
            if (passed) {
                const deviceToken = await deviceTokenStorage.getDeviceToken();
                const deviceId = await deviceTokenStorage.getDeviceId();
                if (deviceToken && deviceId) {
                    try {
                        await authService.deviceAuth(deviceToken, deviceId);
                        // Access token is now set by deviceAuth; fetch user info
                        const { user: freshUser } = await authService.me();
                        setUser(freshUser);
                        navigate('/');
                        return;
                    } catch {
                        // Device token expired or invalid — fall back to code input
                    }
                }
            }
            // Biometric failed or device token invalid — show normal 2FA input
            setShowBiometric(false);
            setShowVerification(true);
        } finally {
            setBiometricLoading(false);
        }
    };

    const handleBiometricQuickLogin = async () => {
        // Direct biometric login from bottom button (before email/password)
        setBiometricLoading(true);
        clearError();
        try {
            const [deviceToken, deviceId] = await Promise.all([
                deviceTokenStorage.getDeviceToken(),
                deviceTokenStorage.getDeviceId(),
            ]);
            if (!deviceToken || !deviceId) {
                // No stored device token — can't do biometric shortcut
                setBiometricLoading(false);
                return;
            }
            const passed = await biometricService.authenticate(t('auth.biometric.reason'));
            if (passed) {
                try {
                    await authService.deviceAuth(deviceToken, deviceId);
                    const { user: freshUser } = await authService.me();
                    setUser(freshUser);
                    navigate('/');
                    return;
                } catch {
                    // Token expired — fall through to password form
                }
            }
        } catch {
            // Biometric not available or failed
        } finally {
            setBiometricLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        const success = await verify2FA(verificationCode, trustDevice);
        if (success) {
            navigate('/');
        }
    };

    const handleResendCode = async () => {
        clearError();
        await resendCode();
    };

    const handleLanguageChange = async (_: React.MouseEvent<HTMLElement>, newLang: string | null) => {
        if (newLang && newLang !== i18n.language) {
            await i18n.changeLanguage(newLang);
            window.location.reload();
        }
    };

    // Shared field styles — filled variant with rounded corners
    const fieldSx = {
        '& .MuiFilledInput-root': {
            borderRadius: `${nativeRadii.input}px`,
            backgroundColor: SURFACE_LOW,
            paddingTop: '20px',
            '&:before': { display: 'none' },
            '&:after': { display: 'none' },
            '&:hover': { backgroundColor: SURFACE_LOW },
            '&.Mui-focused': {
                backgroundColor: SURFACE_LOWEST,
                outline: `2px solid ${PRIMARY}`,
                outlineOffset: '-2px',
            },
        },
        '& .MuiInputLabel-root': {
            fontFamily: nativeFonts.body,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'text.secondary',
            '&.Mui-focused': { color: PRIMARY },
        },
        '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            transform: 'translate(12px, 4px) scale(0.75)',
        },
        '& .MuiInputAdornment-root': {
            marginTop: '0 !important',
        },
        '& .MuiInputAdornment-root svg': {
            color: 'text.secondary',
            fontSize: '1.25rem',
        },
        '& .MuiFilledInput-root.Mui-focused .MuiInputAdornment-root svg': {
            color: PRIMARY,
        },
    };

    return (
        <Box
            dir={isRtl ? 'rtl' : 'ltr'}
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #f7fafd 0%, #ffffff 100%)',
                fontFamily: nativeFonts.body,
                // Safe area padding for Android status bar
                paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
            }}
        >
            {/* Top bar — language toggle */}
            <Box
                component="header"
                sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: isRtl ? 'flex-start' : 'flex-end',
                    alignItems: 'center',
                    px: 3,
                    pt: 4,
                    pb: 2,
                }}
            >
                <ToggleButtonGroup
                    value={i18n.language}
                    exclusive
                    onChange={handleLanguageChange}
                    aria-label="language"
                    size="small"
                    sx={{
                        border: `1px solid ${SURFACE_HIGH}`,
                        borderRadius: '999px',
                        p: '2px',
                        bgcolor: SURFACE_LOW,
                        '& .MuiToggleButtonGroup-grouped': {
                            border: 'none',
                            borderRadius: '999px !important',
                            mx: '1px',
                            px: 2,
                            py: 0.5,
                            textTransform: 'uppercase',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: nativeFonts.body,
                            color: 'text.secondary',
                            transition: 'all 0.2s',
                            '&.Mui-selected': {
                                bgcolor: PRIMARY,
                                color: '#fff',
                                '&:hover': {
                                    bgcolor: PRIMARY_LIGHT,
                                },
                            },
                        },
                    }}
                >
                    <ToggleButton value="en">EN</ToggleButton>
                    <ToggleButton value="he">HE</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 3,
                    maxWidth: 448,
                    width: '100%',
                    mx: 'auto',
                }}
            >
                {/* Logo & Branding */}
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <Box
                        component="img"
                        src={`${import.meta.env.BASE_URL}logos/logo_fixed_02.png`}
                        alt="electisSpace"
                        sx={{
                            height: 80,
                            width: 'auto',
                            mb: 1,
                            objectFit: 'contain',
                            imageRendering: 'smooth',
                        }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        {t('login.subtitle', 'Sign in to access your dashboard')}
                    </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert
                        severity="error"
                        onClose={clearError}
                        sx={{
                            mb: 3,
                            borderRadius: `${nativeRadii.card}px`,
                            width: '100%',
                            '& .MuiAlert-action': {
                                position: 'absolute',
                                right: isRtl ? 'auto' : 8,
                                left: isRtl ? 8 : 'auto',
                            },
                            position: 'relative',
                        }}
                    >
                        {t(error, error)}
                    </Alert>
                )}

                {/* === BIOMETRIC PROMPT (after password login, device token exists) === */}
                {showBiometric ? (
                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                        <FingerprintIcon sx={{ fontSize: 80, color: PRIMARY, mb: 2 }} />
                        <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ fontFamily: nativeFonts.heading, fontWeight: 700 }}
                        >
                            {t('auth.biometric.loginWithBiometric')}
                        </Typography>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleBiometricAuth}
                            disabled={biometricLoading}
                            startIcon={
                                biometricLoading
                                    ? <CircularProgress size={20} color="inherit" />
                                    : <FingerprintIcon />
                            }
                            sx={{
                                mt: 2,
                                mb: 2,
                                py: 1.75,
                                borderRadius: `${nativeRadii.button}px`,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 700,
                                fontFamily: nativeFonts.body,
                                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_LIGHT} 100%)`,
                                boxShadow: `0 8px 20px ${alpha(PRIMARY, 0.3)}`,
                            }}
                        >
                            {biometricLoading
                                ? t('login.verifying', 'Verifying...')
                                : t('auth.biometric.loginWithBiometric')}
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                                setShowBiometric(false);
                                setShowVerification(true);
                            }}
                            disabled={biometricLoading}
                            sx={{
                                borderRadius: `${nativeRadii.button}px`,
                                textTransform: 'none',
                                fontFamily: nativeFonts.body,
                            }}
                        >
                            {t('login.useCode', 'Use verification code instead')}
                        </Button>
                    </Box>

                ) : !showVerification ? (
                    /* === LOGIN FORM === */
                    <Box
                        component="section"
                        sx={{
                            width: '100%',
                            bgcolor: SURFACE_LOWEST,
                            borderRadius: `${nativeRadii.card}px`,
                            p: 4,
                            boxShadow: '0 4px 40px rgba(24,28,30,0.06)',
                            border: `1px solid ${SURFACE_LOW}`,
                        }}
                    >
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Email Field */}
                            <TextField
                                fullWidth
                                variant="filled"
                                name="email"
                                label={t('login.email', 'Email Address')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                                placeholder="name@company.com"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    disableUnderline: true,
                                }}
                                sx={fieldSx}
                            />

                            {/* Password Field */}
                            <TextField
                                fullWidth
                                variant="filled"
                                name="password"
                                label={t('login.password', 'Password')}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                                tabIndex={-1}
                                                sx={{ color: 'text.secondary' }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    disableUnderline: true,
                                }}
                                sx={fieldSx}
                            />

                            {/* Trust Device */}
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={trustDevice}
                                        onChange={(e) => setTrustDevice(e.target.checked)}
                                        size="small"
                                        sx={{
                                            color: SURFACE_HIGH,
                                            '&.Mui-checked': { color: PRIMARY },
                                        }}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600, fontFamily: nativeFonts.body, lineHeight: 1.3 }}
                                        >
                                            {t('login.trustDeviceLabel', 'Trust this device')}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary', lineHeight: 1.2, fontFamily: nativeFonts.body }}
                                        >
                                            {t('login.trustDeviceHint', 'Skip verification next time')}
                                        </Typography>
                                    </Box>
                                }
                                sx={{ ml: 0, alignItems: 'flex-start', py: 0.5 }}
                            />

                            {/* Sign In Button */}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading || !email || !password}
                                endIcon={
                                    isLoading
                                        ? <CircularProgress size={18} color="inherit" />
                                        : <ArrowForwardIcon sx={isRtl ? { transform: 'scaleX(-1)' } : {}} />
                                }
                                sx={{
                                    height: 52,
                                    borderRadius: '999px',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    fontFamily: nativeFonts.body,
                                    background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_LIGHT} 100%)`,
                                    boxShadow: `0 8px 20px ${alpha(PRIMARY, 0.3)}`,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        filter: 'brightness(1.1)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    },
                                    '&.Mui-disabled': {
                                        background: SURFACE_HIGH,
                                        boxShadow: 'none',
                                        color: 'text.disabled',
                                    },
                                }}
                            >
                                {isLoading
                                    ? t('login.signingIn', 'Signing in...')
                                    : t('login.signIn', 'Sign In')}
                            </Button>

                            {/* Forgot Password */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography
                                    component="a"
                                    href="#"
                                    onClick={(e) => e.preventDefault()}
                                    variant="body2"
                                    sx={{
                                        color: PRIMARY,
                                        fontWeight: 600,
                                        fontFamily: nativeFonts.body,
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    {t('login.forgotPassword', 'Forgot password?')}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                ) : (
                    /* === OTP / VERIFICATION FORM === */
                    <Box
                        component="section"
                        sx={{
                            width: '100%',
                            bgcolor: SURFACE_LOWEST,
                            borderRadius: `${nativeRadii.card}px`,
                            p: 4,
                            boxShadow: '0 4px 40px rgba(24,28,30,0.06)',
                            border: `1px solid ${SURFACE_LOW}`,
                        }}
                    >
                        <Alert
                            severity="info"
                            sx={{ mb: 3, borderRadius: `${nativeRadii.card}px` }}
                        >
                            {t('login.codeSent', {
                                email: pendingEmail,
                                defaultValue: `A verification code has been sent to ${pendingEmail}`,
                            })}
                        </Alert>

                        <Box component="form" onSubmit={handleVerify} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                fullWidth
                                variant="filled"
                                label={t('login.verificationCode', 'Verification Code')}
                                type="text"
                                value={verificationCode}
                                onChange={(e) =>
                                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                }
                                required
                                autoFocus
                                placeholder="000000"
                                inputProps={{
                                    maxLength: 6,
                                    style: {
                                        textAlign: 'center',
                                        fontSize: '1.75rem',
                                        letterSpacing: '12px',
                                        fontFamily: nativeFonts.body,
                                        fontWeight: 700,
                                    },
                                }}
                                InputProps={{ disableUnderline: true }}
                                sx={fieldSx}
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => {
                                        setShowVerification(false);
                                        setVerificationCode('');
                                    }}
                                    disabled={isLoading}
                                    sx={{
                                        borderRadius: `${nativeRadii.button}px`,
                                        textTransform: 'none',
                                        fontFamily: nativeFonts.body,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t('login.back', 'Back')}
                                </Button>
                                <Button
                                    fullWidth
                                    variant="text"
                                    onClick={handleResendCode}
                                    disabled={isLoading}
                                    sx={{
                                        borderRadius: `${nativeRadii.button}px`,
                                        textTransform: 'none',
                                        fontFamily: nativeFonts.body,
                                        fontWeight: 600,
                                        color: PRIMARY,
                                    }}
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
                                startIcon={
                                    isLoading
                                        ? <CircularProgress size={20} color="inherit" />
                                        : <LoginIcon />
                                }
                                sx={{
                                    height: 52,
                                    borderRadius: '999px',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    fontFamily: nativeFonts.body,
                                    background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_LIGHT} 100%)`,
                                    boxShadow: `0 8px 20px ${alpha(PRIMARY, 0.3)}`,
                                    transition: 'all 0.2s',
                                    '&.Mui-disabled': {
                                        background: SURFACE_HIGH,
                                        boxShadow: 'none',
                                        color: 'text.disabled',
                                    },
                                }}
                            >
                                {isLoading
                                    ? t('login.verifying', 'Verifying...')
                                    : t('login.verify', 'Verify')}
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Biometric Quick Login (bottom, only when biometric is available) */}
                {biometricAvailable && !showVerification && !showBiometric && (
                    <Box sx={{ mt: 6, pb: 4, textAlign: 'center' }}>
                        <Box
                            component="button"
                            onClick={handleBiometricQuickLogin}
                            disabled={biometricLoading}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1.5,
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                p: 0,
                                transition: 'transform 0.15s',
                                '&:active': { transform: 'scale(0.95)' },
                                '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    bgcolor: SURFACE_HIGH,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: PRIMARY,
                                    transition: 'background-color 0.2s',
                                    '&:hover': { bgcolor: alpha(PRIMARY, 0.1) },
                                }}
                            >
                                {biometricLoading
                                    ? <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                    : <FingerprintIcon sx={{ fontSize: 32 }} />
                                }
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: nativeFonts.body,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: 'text.secondary',
                                    fontSize: '0.7rem',
                                }}
                            >
                                {t('login.biometricLogin', 'Biometric Login')}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Bottom spacer */}
            <Box sx={{ height: 32 }} />
        </Box>
    );
}

export default NativeLoginPage;
