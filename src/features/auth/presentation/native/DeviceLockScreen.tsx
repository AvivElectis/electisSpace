/**
 * DeviceLockScreen
 *
 * Full-screen lock screen for Android native app.
 * Shown when session expires (>1hr background) and device lock is enrolled.
 * User taps to unlock via device security (fingerprint/face/PIN/pattern).
 * Falls back to full login form via "Use password" link.
 *
 * IMPORTANT: No auto-trigger on mount — avoids Android AuthActivity recreation issue.
 * User must tap the unlock button to initiate device auth.
 */

import { useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { biometricService } from '@shared/infrastructure/services/biometricService';
import { deviceTokenStorage } from '@shared/infrastructure/services/deviceTokenStorage';
import { authService } from '@shared/infrastructure/services/authService';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';
import { logger } from '@shared/infrastructure/services/logger';

const PRIMARY = nativeColors.primary.main;

export function DeviceLockScreen() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setUser, setInitialized } = useAuthStore();

    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = useCallback(async () => {
        setIsUnlocking(true);
        setError(null);
        try {
            const passed = await biometricService.authenticate(
                t('auth.deviceLock.reason', 'Verify your identity')
            );
            if (!passed) {
                setError(t('auth.deviceLock.failed', 'Verification failed. Try again.'));
                return;
            }

            const [deviceToken, deviceId] = await Promise.all([
                deviceTokenStorage.getDeviceToken(),
                deviceTokenStorage.getDeviceId(),
            ]);

            if (!deviceToken || !deviceId) {
                // Token was cleared — fall back to login
                navigate('/login', { replace: true });
                return;
            }

            await authService.deviceAuth(deviceToken, deviceId);
            const { user: freshUser } = await authService.me();
            setUser(freshUser);
            setInitialized(true);
            navigate('/', { replace: true });
        } catch (err: any) {
            logger.error('Auth', 'Device lock auth failed', { error: err?.message });
            setError(t('auth.deviceLock.expired', 'Session expired. Please log in with your password.'));
            // Token may be expired — send to login after a moment
            setTimeout(() => navigate('/login', { replace: true }), 2000);
        } finally {
            setIsUnlocking(false);
        }
    }, [t, navigate, setUser, setInitialized]);

    const handleUsePassword = useCallback(() => {
        navigate('/login', { replace: true });
    }, [navigate]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                px: 4,
                gap: 4,
            }}
        >
            {/* App logo */}
            <Box
                component="img"
                src="/logos/logo_fixed_02.png"
                alt="electisSpace"
                sx={{ width: 120, height: 'auto', mb: 1 }}
            />

            {/* Lock icon button */}
            <Box
                component="button"
                onClick={handleUnlock}
                disabled={isUnlocking}
                sx={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    border: `3px solid ${PRIMARY}`,
                    bgcolor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:active': { transform: 'scale(0.92)', bgcolor: `${PRIMARY}15` },
                    '&:disabled': { opacity: 0.5 },
                }}
            >
                {isUnlocking ? (
                    <CircularProgress size={40} sx={{ color: PRIMARY }} />
                ) : (
                    <LockOpenIcon sx={{ fontSize: 44, color: PRIMARY }} />
                )}
            </Box>

            {/* Text */}
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                    {t('auth.deviceLock.title', 'Tap to Unlock')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('auth.deviceLock.subtitle', 'Use your fingerprint, face, or PIN to continue')}
                </Typography>
            </Box>

            {/* Error message */}
            {error && (
                <Typography variant="body2" color="error" sx={{ textAlign: 'center', px: 2 }}>
                    {error}
                </Typography>
            )}

            {/* Use password fallback */}
            <Button
                variant="text"
                onClick={handleUsePassword}
                sx={{
                    textTransform: 'none',
                    color: 'text.secondary',
                    mt: 2,
                }}
            >
                {t('auth.deviceLock.usePassword', 'Use password instead')}
            </Button>
        </Box>
    );
}
