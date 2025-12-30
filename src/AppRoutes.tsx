import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RouteLoadingFallback } from '@shared/presentation/components/RouteLoadingFallback';

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
 * Application routing configuration with lazy loading
 * Settings dialog is opened via icon in Dashboard/header, not a separate route
 */
export function AppRoutes() {
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/spaces" element={<SpacesPage />} />
                <Route path="/conference" element={<ConferencePage />} />
                <Route path="/sync" element={<SyncPage />} />
                <Route path="/people" element={<PeopleManagerView />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}
