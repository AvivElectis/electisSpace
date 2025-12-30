import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HashRouter } from 'react-router-dom';
import { createAppTheme } from './theme';
import { AppRoutes } from './AppRoutes';
import { MainLayout } from './shared/presentation/layouts/MainLayout';
import { NotificationContainer } from './shared/presentation/components/NotificationContainer';
import { UpdateNotification } from './features/update/presentation/UpdateNotification';
import { CustomTitleBar } from './shared/presentation/components/CustomTitleBar';
import { useTokenRefresh } from './features/settings/application/useTokenRefresh';
import { useTranslation } from 'react-i18next';
import { useMemo, useEffect } from 'react';


/**
 * Main App Component with Theme, Layout, and Global Notifications
 * Supports dynamic RTL/LTR switching based on language
 */
function App() {
  const { i18n } = useTranslation();

  // Determine text direction based on language
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  // Create theme based on direction
  const theme = useMemo(() => createAppTheme(direction), [direction]);

  // Update document direction
  useEffect(() => {
    document.dir = direction;
    document.documentElement.setAttribute('lang', i18n.language);
  }, [direction, i18n.language]);

  // Initialize automatic token refresh for SoluM API
  useTokenRefresh();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomTitleBar />
      <HashRouter>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
        <NotificationContainer />
        <UpdateNotification />
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
