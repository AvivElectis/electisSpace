import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useCompassAuthStore } from '../application/useCompassAuthStore';
import { LanguageToggle } from '@shared/components/LanguageToggle';

export function LoginPage() {
    const { t, i18n } = useTranslation();
    const muiTheme = useTheme();
    const isRtl = i18n.dir() === 'rtl';
    const {
        loginStep,
        loginEmail,
        isLoading,
        isAuthenticated,
        error,
        sendLoginCode,
        verifyCode,
        resetLoginFlow,
        setError,
    } = useCompassAuthStore();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [codeExpiryMinutes, setCodeExpiryMinutes] = useState<number | null>(null);

    // Redirect to home after successful login
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const logoSrc = muiTheme.palette.mode === 'dark'
        ? '/logo_dark_transparent.png'
        : '/logo_bright_transparent.png';

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        await sendLoginCode(email.trim().toLowerCase());
        // Read expiry from store after sendLoginCode completes
        const state = useCompassAuthStore.getState();
        setCodeExpiryMinutes(state.codeExpiryMinutes);
    };

    const handleCodeSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (code.length !== 6) return;
        await verifyCode(code);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
        >
            <Box sx={{ maxWidth: 400, width: '100%' }}>
                {/* Language toggle */}
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <LanguageToggle />
                </Box>

                {/* Large logo as page header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                        component="img"
                        src={logoSrc}
                        alt="electisCompass"
                        sx={{ width: '70%', maxWidth: 280, height: 'auto' }}
                    />
                </Box>

                <Card>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                        {t('auth.welcome')}
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {loginStep === 'email' && (
                        <Box component="form" onSubmit={handleEmailSubmit}>
                            <TextField
                                fullWidth
                                placeholder={t('auth.emailPlaceholder')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                                disabled={isLoading}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={isLoading || !email.trim()}
                                size="large"
                            >
                                {isLoading ? <CircularProgress size={24} /> : t('auth.sendCode')}
                            </Button>
                        </Box>
                    )}

                    {loginStep === 'code' && (
                        <Box component="form" onSubmit={handleCodeSubmit}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                                <IconButton
                                    onClick={resetLoginFlow}
                                    size="small"
                                    sx={isRtl ? { transform: 'scaleX(-1)' } : undefined}
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                                <Typography variant="body2" color="text.secondary">
                                    {t('auth.codeSentTo', { email: loginEmail })}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                {t('auth.codeExpiresIn', { minutes: codeExpiryMinutes ?? 15 })}
                            </Typography>

                            <TextField
                                fullWidth
                                label={t('auth.codeLabel')}
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setCode(val);
                                    if (val.length === 6) {
                                        setTimeout(() => verifyCode(val), 100);
                                    }
                                }}
                                autoFocus
                                disabled={isLoading}
                                inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={isLoading || code.length !== 6}
                                size="large"
                            >
                                {isLoading ? <CircularProgress size={24} /> : t('auth.verify')}
                            </Button>
                        </Box>
                    )}
                </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
