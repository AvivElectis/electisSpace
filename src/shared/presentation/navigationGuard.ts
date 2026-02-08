/**
 * Global Navigation Guard
 *
 * A simple callback registry that MainLayout checks before navigating.
 * This works with any router type (including HashRouter which doesn't
 * support useBlocker).
 *
 * Usage:
 *   - Components register a guard via registerNavigationGuard()
 *   - MainLayout calls checkNavigationGuard() before navigate()
 *   - The guard returns a promise that resolves to true (proceed) or false (cancel)
 */

type NavigationGuardFn = () => Promise<boolean>;

let _activeGuard: NavigationGuardFn | null = null;

/**
 * Register a navigation guard. Only one guard can be active at a time.
 * Returns an unregister function.
 */
export function registerNavigationGuard(guard: NavigationGuardFn): () => void {
    _activeGuard = guard;
    return () => {
        if (_activeGuard === guard) {
            _activeGuard = null;
        }
    };
}

/**
 * Unregister the current navigation guard.
 */
export function unregisterNavigationGuard(): void {
    _activeGuard = null;
}

/**
 * Check the active navigation guard.
 * Returns true if navigation should proceed, false if it should be blocked.
 * If no guard is registered, always returns true.
 */
export async function checkNavigationGuard(): Promise<boolean> {
    if (!_activeGuard) return true;
    return _activeGuard();
}
