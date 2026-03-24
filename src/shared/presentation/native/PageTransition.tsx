import { useLocation } from 'react-router-dom';
import { useRef, useEffect, type ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        if (prevPathRef.current === location.pathname) return;
        prevPathRef.current = location.pathname;

        if ('startViewTransition' in document) {
            try {
                (document as any).startViewTransition(() => {});
            } catch {
                // View Transition may throw "InvalidStateError" on some Android devices
            }
        }
    }, [location.pathname]);

    return <>{children}</>;
}
