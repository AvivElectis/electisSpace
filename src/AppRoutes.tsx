import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactNode, useEffect } from 'react';
import { RouteLoadingFallback } from '@shared/presentation/components/RouteLoadingFallback';
import { logger } from '@shared/infrastructure/services/logger';
import { ProtectedRoute } from '@features/auth/presentation/ProtectedRoute';
import { ProtectedFeature } from '@features/auth/presentation/ProtectedFeature';

// Lazy load all page components for code splitting
const LoginPage = lazy(() =>
    import('@features/auth/presentation/LoginPage').then(m => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
    import('@features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))
);
const SpacesPage = lazy(() =>
    import('@features/space/presentation/SpacesPage').then(m => ({ default: m.SpacesPage }))
);
const ConferencePage = lazy(() =>
    import('@features/conference/presentation/ConferencePage').then(m => ({ default: m.ConferencePage }))
);
const PeopleManagerView = lazy(() =>
    import('@features/people/presentation/PeopleManagerView').then(m => ({ default: m.PeopleManagerView }))
);
const LabelsPage = lazy(() =>
    import('@features/labels/presentation/LabelsPage').then(m => ({ default: m.LabelsPage }))
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
            {/* Public Routes */}
            <Route path="/login" element={<SuspenseRoute><LoginPage /></SuspenseRoute>} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><SuspenseRoute><DashboardPage /></SuspenseRoute></ProtectedRoute>} />
            <Route path="/spaces" element={<ProtectedRoute><ProtectedFeature feature="spaces" fallback={<Navigate to="/" replace />}><SuspenseRoute><SpacesPage /></SuspenseRoute></ProtectedFeature></ProtectedRoute>} />
            <Route path="/conference" element={<ProtectedRoute><ProtectedFeature feature="conference" fallback={<Navigate to="/" replace />}><SuspenseRoute><ConferencePage /></SuspenseRoute></ProtectedFeature></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><ProtectedFeature feature="people" fallback={<Navigate to="/" replace />}><SuspenseRoute><PeopleManagerView /></SuspenseRoute></ProtectedFeature></ProtectedRoute>} />
            <Route path="/labels" element={<ProtectedRoute><ProtectedFeature feature="labels" fallback={<Navigate to="/" replace />}><SuspenseRoute><LabelsPage /></SuspenseRoute></ProtectedFeature></ProtectedRoute>} />
            <Route path="*" element={<SuspenseRoute><NotFoundPage /></SuspenseRoute>} />
        </Routes>
    );
}

