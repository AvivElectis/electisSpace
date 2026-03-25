import { lazy, Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { tokenManager } from '@shared/infrastructure/services/apiClient';
import { NativeShell } from './NativeShell';

const NativeDashboardPage = lazy(() =>
    import('@features/dashboard/presentation/native/NativeDashboardPage').then((m) => ({
        default: m.NativeDashboardPage,
    }))
);

const NativePeopleListPage = lazy(() =>
    import('@features/people/presentation/native/NativePeopleListPage').then((m) => ({
        default: m.NativePeopleListPage,
    }))
);

const NativePersonFormPage = lazy(() =>
    import('@features/people/presentation/native/NativePersonFormPage').then((m) => ({
        default: m.NativePersonFormPage,
    }))
);

const NativePeopleImportPage = lazy(() =>
    import('@features/people/presentation/native/NativePeopleImportPage').then((m) => ({
        default: m.NativePeopleImportPage,
    }))
);

const NativeSpacesListPage = lazy(() =>
    import('@features/space/presentation/native/NativeSpacesListPage').then((m) => ({
        default: m.NativeSpacesListPage,
    }))
);

const NativeSpaceFormPage = lazy(() =>
    import('@features/space/presentation/native/NativeSpaceFormPage').then((m) => ({
        default: m.NativeSpaceFormPage,
    }))
);

const NativeConferencePage = lazy(() =>
    import('@features/conference/presentation/native/NativeConferencePage').then((m) => ({
        default: m.NativeConferencePage,
    }))
);

const NativeConferenceFormPage = lazy(() =>
    import('@features/conference/presentation/native/NativeConferenceFormPage').then((m) => ({
        default: m.NativeConferenceFormPage,
    }))
);

const NativeLabelsPage = lazy(() =>
    import('@features/labels/presentation/native/NativeLabelsPage').then((m) => ({
        default: m.NativeLabelsPage,
    }))
);

const NativeLinkLabelPage = lazy(() =>
    import('@features/labels/presentation/native/NativeLinkLabelPage').then((m) => ({
        default: m.NativeLinkLabelPage,
    }))
);

const NativeAimsPage = lazy(() =>
    import('@features/aims-management/presentation/native/NativeAimsPage').then((m) => ({
        default: m.NativeAimsPage,
    }))
);

const NativeSettingsPage = lazy(() =>
    import('@features/settings/presentation/native/NativeSettingsPage').then((m) => ({
        default: m.NativeSettingsPage,
    }))
);

// ---- Settings sub-pages ----

const NativeProfilePage = lazy(() =>
    import('@features/settings/presentation/native/NativeProfilePage').then((m) => ({
        default: m.NativeProfilePage,
    }))
);

const NativeUsersListPage = lazy(() =>
    import('@features/settings/presentation/native/NativeUsersListPage').then((m) => ({
        default: m.NativeUsersListPage,
    }))
);

const NativeUserFormPage = lazy(() =>
    import('@features/settings/presentation/native/NativeUserFormPage').then((m) => ({
        default: m.NativeUserFormPage,
    }))
);

const NativeElevateUserPage = lazy(() =>
    import('@features/settings/presentation/native/NativeElevateUserPage').then((m) => ({
        default: m.NativeElevateUserPage,
    }))
);

const NativeCompaniesListPage = lazy(() =>
    import('@features/settings/presentation/native/NativeCompaniesListPage').then((m) => ({
        default: m.NativeCompaniesListPage,
    }))
);

const NativeCompanyFormPage = lazy(() =>
    import('@features/settings/presentation/native/NativeCompanyFormPage').then((m) => ({
        default: m.NativeCompanyFormPage,
    }))
);

const NativeCompanyFeaturesPage = lazy(() =>
    import('@features/settings/presentation/native/NativeCompanyFeaturesPage').then((m) => ({
        default: m.NativeCompanyFeaturesPage,
    }))
);

const NativeStoresListPage = lazy(() =>
    import('@features/settings/presentation/native/NativeStoresListPage').then((m) => ({
        default: m.NativeStoresListPage,
    }))
);

const NativeStoreFormPage = lazy(() =>
    import('@features/settings/presentation/native/NativeStoreFormPage').then((m) => ({
        default: m.NativeStoreFormPage,
    }))
);

const NativeStoreFeaturesPage = lazy(() =>
    import('@features/settings/presentation/native/NativeStoreFeaturesPage').then((m) => ({
        default: m.NativeStoreFeaturesPage,
    }))
);

const NativeRolesListPage = lazy(() =>
    import('@features/settings/presentation/native/NativeRolesListPage').then((m) => ({
        default: m.NativeRolesListPage,
    }))
);

const NativeRoleFormPage = lazy(() =>
    import('@features/settings/presentation/native/NativeRoleFormPage').then((m) => ({
        default: m.NativeRoleFormPage,
    }))
);

const NativeAboutPage = lazy(() =>
    import('@features/settings/presentation/NativeAboutPage').then((m) => ({
        default: m.NativeAboutPage,
    }))
);

function ProtectedNativeShell() {
    // Inline auth check — redirect to /login if not authenticated
    const { isAuthenticated, isInitialized } = useAuthStore();
    const hasToken = tokenManager.getAccessToken();

    if (!isInitialized) return null; // Still loading
    if (!isAuthenticated && !hasToken) {
        return <Navigate to="/login" replace />;
    }
    return <NativeShell />;
}

export function getNativeRoutes() {
    return (
        <Route element={<ProtectedNativeShell />}>
            <Route index element={<Suspense fallback={null}><NativeDashboardPage /></Suspense>} />
            <Route path="people" element={<Suspense fallback={null}><NativePeopleListPage /></Suspense>} />
            <Route path="people/new" element={<Suspense fallback={null}><NativePersonFormPage /></Suspense>} />
            <Route path="people/import" element={<Suspense fallback={null}><NativePeopleImportPage /></Suspense>} />
            <Route path="people/:id/edit" element={<Suspense fallback={null}><NativePersonFormPage /></Suspense>} />
            <Route path="spaces" element={<Suspense fallback={null}><NativeSpacesListPage /></Suspense>} />
            <Route path="spaces/new" element={<Suspense fallback={null}><NativeSpaceFormPage /></Suspense>} />
            <Route path="spaces/:id/edit" element={<Suspense fallback={null}><NativeSpaceFormPage /></Suspense>} />
            <Route path="conference" element={<Suspense fallback={null}><NativeConferencePage /></Suspense>} />
            <Route path="conference/new" element={<Suspense fallback={null}><NativeConferenceFormPage /></Suspense>} />
            <Route path="conference/:id/edit" element={<Suspense fallback={null}><NativeConferenceFormPage /></Suspense>} />
            <Route path="labels" element={<Suspense fallback={null}><NativeLabelsPage /></Suspense>} />
            <Route path="labels/link" element={<Suspense fallback={null}><NativeLinkLabelPage /></Suspense>} />
            <Route path="aims-management" element={<Suspense fallback={null}><NativeAimsPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={null}><NativeSettingsPage /></Suspense>} />

            {/* Settings sub-pages */}
            <Route path="settings/profile" element={<Suspense fallback={null}><NativeProfilePage /></Suspense>} />

            {/* Users */}
            <Route path="settings/users" element={<Suspense fallback={null}><NativeUsersListPage /></Suspense>} />
            <Route path="settings/users/new" element={<Suspense fallback={null}><NativeUserFormPage /></Suspense>} />
            <Route path="settings/users/:id" element={<Suspense fallback={null}><NativeUserFormPage /></Suspense>} />
            <Route path="settings/users/:id/elevate" element={<Suspense fallback={null}><NativeElevateUserPage /></Suspense>} />

            {/* Companies */}
            <Route path="settings/companies" element={<Suspense fallback={null}><NativeCompaniesListPage /></Suspense>} />
            <Route path="settings/companies/new" element={<Suspense fallback={null}><NativeCompanyFormPage /></Suspense>} />
            <Route path="settings/companies/:id" element={<Suspense fallback={null}><NativeCompanyFormPage /></Suspense>} />
            <Route path="settings/companies/:id/features" element={<Suspense fallback={null}><NativeCompanyFeaturesPage /></Suspense>} />
            <Route path="settings/companies/:id/stores" element={<Suspense fallback={null}><NativeStoresListPage /></Suspense>} />
            <Route path="settings/companies/:id/stores/new" element={<Suspense fallback={null}><NativeStoreFormPage /></Suspense>} />
            <Route path="settings/companies/:id/stores/:sid" element={<Suspense fallback={null}><NativeStoreFormPage /></Suspense>} />
            <Route path="settings/companies/:id/stores/:sid/features" element={<Suspense fallback={null}><NativeStoreFeaturesPage /></Suspense>} />

            {/* Roles */}
            <Route path="settings/roles" element={<Suspense fallback={null}><NativeRolesListPage /></Suspense>} />
            <Route path="settings/roles/new" element={<Suspense fallback={null}><NativeRoleFormPage /></Suspense>} />
            <Route path="settings/roles/:id" element={<Suspense fallback={null}><NativeRoleFormPage /></Suspense>} />

            {/* About */}
            <Route path="settings/about" element={<Suspense fallback={null}><NativeAboutPage /></Suspense>} />
        </Route>
    );
}
