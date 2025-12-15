import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import theme from './theme';
import { SimpleLayout } from './shared/presentation/components/SimpleLayout';
import { AppRoutes } from './AppRoutes';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import './index.css';

function AppContent() {
  const settingsController = useSettingsController();
  const navigate = useNavigate();

  return (
    <SimpleLayout
      title={settingsController.settings.appName}
      subtitle={settingsController.settings.appSubtitle}
      onLanguageClick={() => console.log('Language clicked')}
      onHelpClick={() => console.log('Help clicked')}
      onSettingsClick={() => navigate('/settings')}
    >
      <AppRoutes />
    </SimpleLayout>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
