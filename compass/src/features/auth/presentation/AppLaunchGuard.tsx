import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useCompassAuthStore } from '../application/useCompassAuthStore';
import {
    isNative,
    isBiometricEnabled,
    promptBiometric,
    getStoredDeviceToken,
} from '@shared/infrastructure/biometricService';
import { authApi } from '../infrastructure/authApi';
import compassApi from '@shared/api/compassApi';
import { connectCompassSocket } from '@shared/infrastructure/compassSocket';

interface AppLaunchGuardProps {
    children: React.ReactNode;
}

/**
 * On native app launch, tries:
 * 1. Refresh token (cookie-based) first
 * 2. If biometric enabled + device token stored → biometric prompt → device login
 * 3. Falls through to login page if both fail
 */
export function AppLaunchGuard({ children }: AppLaunchGuardProps) {
    const [checking, setChecking] = useState(true);
    const isAuthenticated = useCompassAuthStore((s) => s.isAuthenticated);
    const refresh = useCompassAuthStore((s) => s.refresh);

    useEffect(() => {
        let cancelled = false;

        async function tryAutoLogin() {
            // 1. Try refresh token
            try {
                await refresh();
                if (!cancelled) setChecking(false);
                return;
            } catch {
                // Refresh failed, continue
            }

            // 2. Try biometric + device token (native only)
            if (isNative) {
                try {
                    const bioEnabled = await isBiometricEnabled();
                    const deviceToken = await getStoredDeviceToken();

                    if (bioEnabled && deviceToken) {
                        const bioOk = await promptBiometric();
                        if (bioOk) {
                            const { data } = await authApi.deviceLogin(deviceToken);
                            compassApi.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
                            useCompassAuthStore.setState({
                                user: data.user,
                                accessToken: data.accessToken,
                                isAuthenticated: true,
                                loginStep: 'done',
                            });
                            connectCompassSocket();
                            if (!cancelled) setChecking(false);
                            return;
                        }
                    }
                } catch {
                    // Device login failed
                }
            }

            if (!cancelled) setChecking(false);
        }

        tryAutoLogin();
        return () => { cancelled = true; };
    }, [refresh]);

    if (checking && !isAuthenticated) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }}
            >
                <Box
                    component="img"
                    src="/logo_dark_transparent.png"
                    alt="electisCompass"
                    sx={{ width: 120, height: 'auto', mb: 2 }}
                />
                <CircularProgress size={32} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    Loading...
                </Typography>
            </Box>
        );
    }

    return <>{children}</>;
}
