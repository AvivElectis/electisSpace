/**
 * Route prefetching utilities
 * Preloads route components on hover for instant navigation
 */

// Map of route paths to their lazy import functions
const routeImports: Record<string, () => Promise<unknown>> = {
    '/': () => import('@features/dashboard/DashboardPage'),
    '/spaces': () => import('@features/space/presentation/SpacesPage'),
    '/people': () => import('@features/people/presentation/PeopleManagerView'),
    '/conference': () => import('@features/conference/presentation/ConferencePage'),
    '/labels': () => import('@features/labels/presentation/LabelsPage'),
    '/image-labels': () => import('@features/imageLabels/presentation/ImageLabelsPage'),
};

// Track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's component
 * Call this on hover to preload the route before user clicks
 */
export function prefetchRoute(path: string): void {
    // Already prefetched or unknown route
    if (prefetchedRoutes.has(path) || !routeImports[path]) {
        return;
    }

    // Mark as prefetched immediately to avoid duplicate requests
    prefetchedRoutes.add(path);

    // Preload the module
    routeImports[path]().catch(() => {
        // If prefetch fails, remove from set so it can be retried
        prefetchedRoutes.delete(path);
    });
}

/**
 * Prefetch all routes (call on app idle)
 */
export function prefetchAllRoutes(): void {
    Object.keys(routeImports).forEach(prefetchRoute);
}
