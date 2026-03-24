import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HashRouter } from 'react-router-dom';
import { createAppTheme } from './theme';
import { createNativeTheme } from '@shared/presentation/themes/nativeTheme';
import { AppRoutes } from './AppRoutes';
import { MainLayout } from './shared/presentation/layouts/MainLayout';
import { NotificationContainer } from './shared/presentation/components/NotificationContainer';

import { CustomTitleBar } from './shared/presentation/components/CustomTitleBar';
import { ErrorBoundary } from './shared/presentation/components/ErrorBoundary';
import { AppLoadingScreen } from './shared/presentation/components/AppLoadingScreen';
import { useTokenRefresh } from './features/settings/application/useTokenRefresh';
import { useAuthWatchdog } from './features/auth/application/useAuthWatchdog';
import { useSessionRestore } from './features/auth/application/useSessionRestore';
import { useAuthStore } from './features/auth/infrastructure/authStore';
import { useTranslation } from 'react-i18next';
import { useMemo, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { logger } from './shared/infrastructure/services/logger';


/**
 * Auth Watchdog Wrapper - Must be inside HashRouter
 * Also handles session restoration on app startup
 */
function AuthWatchdogWrapper({ children }: { children: React.ReactNode }) {
  useSessionRestore(); // Restore session on app startup
  useAuthWatchdog();
  return <>{children}</>;
}

/**
 * Main App Component with Theme, Layout, and Global Notifications
 * Supports dynamic RTL/LTR switching based on language
 */
function App() {
  const { i18n } = useTranslation();
  const isAppReady = useAuthStore((state) => state.isAppReady);
  const isSwitchingStore = useAuthStore((state) => state.isSwitchingStore);

  // Log app initialization
  useEffect(() => {
    logger.info('App', 'Application initialized', {
      language: i18n.language,
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
      environment: import.meta.env.MODE,
    });
  }, []);

  // Determine text direction based on language
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  // Detect native platform (Capacitor Android/iOS)
  const isNative = Capacitor.isNativePlatform();

  // Create theme based on direction and platform
  const theme = useMemo(
    () => (isNative ? createNativeTheme(direction) : createAppTheme(direction, isNative)),
    [direction, isNative]
  );

  // Update document direction
  useEffect(() => {
    document.dir = direction;
    document.documentElement.setAttribute('lang', i18n.language);
    logger.debug('App', 'Language/direction changed', { language: i18n.language, direction });
  }, [direction, i18n.language]);

  // Initialize automatic token refresh for SoluM API
  useTokenRefresh();

  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CustomTitleBar />
        <HashRouter>
          <AuthWatchdogWrapper>
            {!isAppReady || isSwitchingStore ? (
              <AppLoadingScreen />
            ) : (
              <>
                <MainLayout>
                  <AppRoutes />
                </MainLayout>
                <NotificationContainer />
              </>
            )}
          </AuthWatchdogWrapper>
        </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
