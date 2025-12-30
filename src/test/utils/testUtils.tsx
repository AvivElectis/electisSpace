import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import i18n from './i18nForTests';
import { createAppTheme } from '../../theme';

interface AllTheProvidersProps {
    children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
    const theme = createAppTheme('ltr');

    return (
        <I18nextProvider i18n={i18n}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter>{children}</BrowserRouter>
            </ThemeProvider>
        </I18nextProvider>
    );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    wrapper?: React.ComponentType<{ children: ReactNode }>;
}

function renderWithProviders(
    ui: ReactElement,
    options?: CustomRenderOptions
) {
    return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method
export { renderWithProviders as render };
