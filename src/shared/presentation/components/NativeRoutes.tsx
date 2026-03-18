/**
 * NativeRoutes
 *
 * Native-only route definitions. These don't exist on web.
 * Returns an array of Route elements to be spread inside <Routes>.
 * (React Router requires direct <Route> children — no wrapper components.)
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';
import type { ReactNode } from 'react';

// Lazy-load native page wrappers
const NativePersonPage = lazy(() =>
    import('@features/people/presentation/NativePersonPage').then(m => ({ default: m.NativePersonPage }))
);

export function getNativeRoutes(): ReactNode[] {
    return [
        <Route key="people-new" path="/people/new" element={<NativePersonPage />} />,
        <Route key="people-edit" path="/people/:id/edit" element={<NativePersonPage />} />,
    ];
}
