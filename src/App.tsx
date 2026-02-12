import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import { createAppTheme } from './theme';
import { AppRoutes } from './AppRoutes';
import { MainLayout } from './shared/presentation/layouts/MainLayout';
import { NotificationContainer } from './shared/presentation/components/NotificationContainer';

import { CustomTitleBar } from './shared/presentation/components/CustomTitleBar';
import { ErrorBoundary } from './shared/presentation/components/ErrorBoundary';
import { useTokenRefresh } from './features/settings/application/useTokenRefresh';
import { useAuthWatchdog } from './features/auth/application/useAuthWatchdog';
import { useSessionRestore } from './features/auth/application/useSessionRestore';
import { useAuthStore } from './features/auth/infrastructure/authStore';
import { useTranslation } from 'react-i18next';
import { useMemo, useEffect } from 'react';
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
  const { t, i18n } = useTranslation();
  const isAppReady = useAuthStore((state) => state.isAppReady);

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

  // Create theme based on direction
  const theme = useMemo(() => createAppTheme(direction), [direction]);

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
            {!isAppReady ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="100vh"
                gap={2}
              >
                <CircularProgress size={60} />
                <Typography variant="h6" color="text.secondary">
                  {t('app.loadingApplication', 'Loading application...')}
                </Typography>
              </Box>
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
