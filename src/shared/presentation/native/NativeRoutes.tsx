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
            <Route path="spaces" element={<NativePlaceholder name="Spaces" />} />
            <Route path="spaces/new" element={<NativePlaceholder name="Add Space" />} />
            <Route path="spaces/:id/edit" element={<NativePlaceholder name="Edit Space" />} />
            <Route path="conference" element={<NativePlaceholder name="Conference" />} />
            <Route path="conference/new" element={<NativePlaceholder name="Add Room" />} />
            <Route path="conference/:id/edit" element={<NativePlaceholder name="Edit Room" />} />
            <Route path="labels" element={<NativePlaceholder name="Labels" />} />
            <Route path="labels/link" element={<NativePlaceholder name="Link Label" />} />
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
