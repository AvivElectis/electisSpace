/**
 * PageTransition
 *
 * Triggers CSS View Transitions on route changes for native-feeling page animations.
 * Falls back gracefully on older WebViews that don't support the View Transitions API.
 * Place this component inside the Router, wrapping route content.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        if (prevPathRef.current === location.pathname) return;

        const supportsViewTransitions = 'startViewTransition' in document;

        if (supportsViewTransitions) {
            (document as any).startViewTransition(() => {
                // DOM already updated by React — this captures the "after" snapshot
                return Promise.resolve();
            });
        }

        prevPathRef.current = location.pathname;
    }, [location.pathname]);

    return <>{children}</>;
}
