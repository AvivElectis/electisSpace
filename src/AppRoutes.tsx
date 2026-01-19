import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactNode, useEffect } from 'react';
import { RouteLoadingFallback } from '@shared/presentation/components/RouteLoadingFallback';
import { logger } from '@shared/infrastructure/services/logger';

// Lazy load all page components for code splitting
const DashboardPage = lazy(() =>
    import('@features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))
);
const SpacesPage = lazy(() =>
    import('@features/space/presentation/SpacesPage').then(m => ({ default: m.SpacesPage }))
);
const ConferencePage = lazy(() =>
    import('@features/conference/presentation/ConferencePage').then(m => ({ default: m.ConferencePage }))
);
const SyncPage = lazy(() =>
    import('@features/sync/presentation/SyncPage').then(m => ({ default: m.SyncPage }))
);
const PeopleManagerView = lazy(() =>
    import('@features/people/presentation/PeopleManagerView').then(m => ({ default: m.PeopleManagerView }))
);
const NotFoundPage = lazy(() =>
    import('@shared/presentation/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
);

/**
 * Wrapper that provides isolated Suspense boundary per route
 * This ensures the loader shows immediately when navigating
 */
function SuspenseRoute({ children }: { children: ReactNode }) {
    return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}

/**
 * Hook to log navigation events
 */
function useNavigationLogger() {
    const location = useLocation();

    useEffect(() => {
        logger.info('Navigation', 'Route changed', {
            path: location.pathname,
            search: location.search || undefined,
            hash: location.hash || undefined,
        });
    }, [location]);
}

/**
 * Application routing configuration with lazy loading
 * Each route has its own Suspense boundary for immediate loader display
 */
export function AppRoutes() {
    // Log navigation events
    useNavigationLogger();

    return (
        <Routes>
            <Route path="/" element={<SuspenseRoute><DashboardPage /></SuspenseRoute>} />
            <Route path="/spaces" element={<SuspenseRoute><SpacesPage /></SuspenseRoute>} />
            <Route path="/conference" element={<SuspenseRoute><ConferencePage /></SuspenseRoute>} />
            <Route path="/sync" element={<SuspenseRoute><SyncPage /></SuspenseRoute>} />
            <Route path="/people" element={<SuspenseRoute><PeopleManagerView /></SuspenseRoute>} />
            <Route path="*" element={<SuspenseRoute><NotFoundPage /></SuspenseRoute>} />
        </Routes>
    );
}
