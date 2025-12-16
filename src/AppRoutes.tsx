import { Routes, Route } from 'react-router-dom';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { SpacesPage } from '@features/space/presentation/SpacesPage';
import { ConferencePage } from '@features/conference/presentation/ConferencePage';
import { SyncPage } from '@features/sync/presentation/SyncPage';
import { NotFoundPage } from '@shared/presentation/pages/NotFoundPage';

/**
 * Application routing configuration  
 * Settings dialog is opened via icon in Dashboard/header, not a separate route
 */
export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/conference" element={<ConferencePage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
