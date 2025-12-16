import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import theme from './theme';
import { AppRoutes } from './AppRoutes';
import { MainLayout } from './shared/presentation/layouts/MainLayout';

/**
 * Main App Component with Theme and Header
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
