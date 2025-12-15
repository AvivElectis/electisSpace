import { Routes, Route } from 'react-router-dom';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { SpacesPage } from '@features/space/presentation/SpacesPage';
import { ConferencePage } from '@features/conference/presentation/ConferencePage';
import { SyncPage } from '@features/sync/presentation/SyncPage';
import { SettingsPage } from '@features/settings/presentation/SettingsPage';

/**
 * App Routes Component
 */
export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/conference" element={<ConferencePage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
        </Routes>
    );
}
