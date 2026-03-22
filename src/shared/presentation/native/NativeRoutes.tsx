import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { NativeShell } from './NativeShell';
import { Box, Typography } from '@mui/material';

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

function NativePlaceholder({ name }: { name: string }) {
    return (
        <Box sx={{ p: 2, textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">{name}</Typography>
            <Typography variant="body2" color="text.secondary">Coming soon</Typography>
        </Box>
    );
}

export function getNativeRoutes() {
    return (
        <Route element={<NativeShell />}>
            <Route index element={<Suspense fallback={null}><NativeDashboardPage /></Suspense>} />
            <Route path="people" element={<Suspense fallback={null}><NativePeopleListPage /></Suspense>} />
            <Route path="people/new" element={<Suspense fallback={null}><NativePersonFormPage /></Suspense>} />
            <Route path="people/:id/edit" element={<Suspense fallback={null}><NativePersonFormPage /></Suspense>} />
            <Route path="spaces" element={<Suspense fallback={null}><NativeSpacesListPage /></Suspense>} />
            <Route path="spaces/new" element={<Suspense fallback={null}><NativeSpaceFormPage /></Suspense>} />
            <Route path="spaces/:id/edit" element={<Suspense fallback={null}><NativeSpaceFormPage /></Suspense>} />
            <Route path="conference" element={<Suspense fallback={null}><NativeConferencePage /></Suspense>} />
            <Route path="conference/new" element={<Suspense fallback={null}><NativeConferenceFormPage /></Suspense>} />
            <Route path="conference/:id/edit" element={<Suspense fallback={null}><NativeConferenceFormPage /></Suspense>} />
            <Route path="labels" element={<Suspense fallback={null}><NativeLabelsPage /></Suspense>} />
            <Route path="labels/link" element={<Suspense fallback={null}><NativeLinkLabelPage /></Suspense>} />
            <Route path="aims-management" element={<NativePlaceholder name="AIMS" />} />
            <Route path="settings" element={<NativePlaceholder name="Settings" />} />
            <Route path="settings/profile" element={<NativePlaceholder name="Profile" />} />
            <Route path="settings/users" element={<NativePlaceholder name="Users" />} />
            <Route path="settings/users/new" element={<NativePlaceholder name="Add User" />} />
            <Route path="settings/users/:id" element={<NativePlaceholder name="Edit User" />} />
            <Route path="settings/companies" element={<NativePlaceholder name="Companies" />} />
            <Route path="settings/companies/new" element={<NativePlaceholder name="Add Company" />} />
            <Route path="settings/companies/:id" element={<NativePlaceholder name="Edit Company" />} />
            <Route path="settings/roles" element={<NativePlaceholder name="Roles" />} />
            <Route path="settings/roles/new" element={<NativePlaceholder name="Add Role" />} />
            <Route path="settings/roles/:id" element={<NativePlaceholder name="Edit Role" />} />
            <Route path="settings/about" element={<NativePlaceholder name="About" />} />
        </Route>
    );
}
