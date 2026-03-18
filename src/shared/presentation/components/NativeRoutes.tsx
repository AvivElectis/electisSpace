/**
 * NativeRoutes
 *
 * Native-only route definitions. These routes don't exist on web.
 * Rendered inside <Routes> only when isNative is true.
 */

import { Route } from 'react-router-dom';
import { lazy } from 'react';

// Lazy-load native page wrappers
const NativePersonPage = lazy(() =>
    import('@features/people/presentation/NativePersonPage').then(m => ({ default: m.NativePersonPage }))
);

export function NativeRoutes() {
    return (
        <>
            <Route path="/people/new" element={<NativePersonPage />} />
            <Route path="/people/:id/edit" element={<NativePersonPage />} />
        </>
    );
}
