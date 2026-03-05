import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from '@shared/theme/theme';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';
import { LoginPage } from '@features/auth/presentation/LoginPage';
import { BiometricEnrollDialog } from '@features/auth/presentation/BiometricEnrollDialog';
import { HomePage } from '@features/booking/presentation/HomePage';
import { FindPage } from '@features/booking/presentation/FindPage';
import { BookingsPage } from '@features/booking/presentation/BookingsPage';
import { ProfilePage } from '@features/profile/presentation/ProfilePage';
import { FriendsPage } from '@features/friends/presentation/FriendsPage';
import { BottomNav } from '@shared/components/BottomNav';
import { LanguageToggle } from '@shared/components/LanguageToggle';
import { AppLaunchGuard } from '@features/auth/presentation/AppLaunchGuard';
import {
    isNative,
    isBiometricAvailable,
    isBiometricEnabled,
    setBiometricEnabled,
    storeDeviceToken,
} from '@shared/infrastructure/biometricService';
import { authApi } from '@features/auth/infrastructure/authApi';
import { Capacitor } from '@capacitor/core';
import '@shared/i18n/i18n';

function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useCompassAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function AppShell() {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Top bar with language toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 0.5 }}>
                <LanguageToggle />
            </Box>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/find" element={<FindPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
        </Box>
    );
}

function BiometricEnrollment() {
    const loginStep = useCompassAuthStore((s) => s.loginStep);
    const [showEnroll, setShowEnroll] = useState(false);

    useEffect(() => {
        if (loginStep !== 'done') return;
        // After first successful login on native, offer biometric enrollment
        if (!isNative) return;

        (async () => {
            const alreadyEnabled = await isBiometricEnabled();
            if (alreadyEnabled) return;
            const available = await isBiometricAvailable();
            if (available) setShowEnroll(true);
        })();
    }, [loginStep]);

    const handleEnable = async () => {
        try {
            const platform = Capacitor.getPlatform();
            const { data } = await authApi.registerDevice(
                `${platform}-${Date.now()}`,
                platform,
            );
            await storeDeviceToken(data.deviceToken);
            await setBiometricEnabled(true);
        } catch {
            // Silently fail — user can enable later in settings
        }
        setShowEnroll(false);
    };

    return (
        <BiometricEnrollDialog
            open={showEnroll}
            onEnable={handleEnable}
            onSkip={() => setShowEnroll(false)}
        />
    );
}

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppLaunchGuard>
                <HashRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/*"
                            element={
                                <AuthGuard>
                                    <AppShell />
                                </AuthGuard>
                            }
                        />
                    </Routes>
                    <BiometricEnrollment />
                </HashRouter>
            </AppLaunchGuard>
        </ThemeProvider>
    );
}
