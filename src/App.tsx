import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import { Suspense } from 'react';
import theme from './theme';
import { MainLayout } from './shared/presentation/layouts/MainLayout';
import { LoadingFallback } from './shared/presentation/components/LoadingFallback';
import { AppRoutes } from './AppRoutes';
import './index.css';

/**
 * Main App Component
 * 
 * Wraps the application with:
 * - Theme provider for Material-UI
 * - Router for navigation
 * - Main layout with header and navigation
 * - Suspense boundary for lazy-loaded routes
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout>
          <Suspense fallback={<LoadingFallback />}>
            <AppRoutes />
          </Suspense>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
