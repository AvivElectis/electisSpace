import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';
import { logger } from '@shared/infrastructure/services/logger';

interface StoreHydrationGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    /**
     * Maximum time to wait for hydration before proceeding (ms)
     * Default: 5000ms (5 seconds)
     */
    timeout?: number;
}

/**
 * StoreHydrationGuard
 * 
 * Ensures all Zustand stores with persistence have been hydrated from
 * localStorage/IndexedDB before rendering children. This prevents the
 * UI from showing empty tables when data hasn't loaded yet.
 * 
 * Common causes of "empty table" issues:
 * 1. Component renders before IndexedDB data loads (async hydration)
 * 2. Race condition between store hydration and component mount
 * 3. Stale closure capturing empty initial state
 * 
 * This guard solves #1 and #2 by delaying render until hydration completes.
 */
export function StoreHydrationGuard({
    children,
    fallback,
    timeout = 5000,
}: StoreHydrationGuardProps) {
    const [isHydrated, setIsHydrated] = useState(false);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const startTime = Date.now();

        // Check hydration status of all persisted stores
        const checkHydration = async () => {
            // Zustand persist middleware exposes hasHydrated() on the persist API
            const stores = [
                { name: 'settings', persist: useSettingsStore.persist },
                { name: 'spaces', persist: useSpacesStore.persist },
                { name: 'sync', persist: useSyncStore.persist },
                { name: 'people', persist: usePeopleStore.persist },
                { name: 'conference', persist: useConferenceStore.persist },
            ];

            // Wait for all stores to hydrate
            const allHydrated = stores.every(store => {
                const hydrated = store.persist?.hasHydrated?.() ?? true;
                if (!hydrated) {
                    logger.debug('StoreHydrationGuard', `Waiting for ${store.name} store to hydrate`);
                }
                return hydrated;
            });

            if (allHydrated) {
                const duration = Date.now() - startTime;
                logger.info('StoreHydrationGuard', 'All stores hydrated', { duration });
                setIsHydrated(true);
                return;
            }

            // Check timeout
            if (Date.now() - startTime > timeout) {
                logger.warn('StoreHydrationGuard', 'Hydration timeout - proceeding anyway', {
                    timeout,
                    stores: stores.map(s => ({
                        name: s.name,
                        hydrated: s.persist?.hasHydrated?.() ?? true
                    }))
                });
                setTimedOut(true);
                setIsHydrated(true);
                return;
            }

            // Poll again in 50ms
            setTimeout(checkHydration, 50);
        };

        checkHydration();

        // Subscribe to rehydration events for stores that support it
        const unsubscribes: (() => void)[] = [];

        [
            useSettingsStore.persist,
            useSpacesStore.persist,
            useSyncStore.persist,
            usePeopleStore.persist,
            useConferenceStore.persist,
        ].forEach(persist => {
            if (persist?.onFinishHydration) {
                const unsub = persist.onFinishHydration(() => {
                    // Re-trigger check when any store finishes hydrating
                    checkHydration();
                });
                if (unsub) unsubscribes.push(unsub);
            }
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [timeout]);

    if (!isHydrated) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    gap: 2,
                }}
            >
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                    Loading data...
                </Typography>
            </Box>
        );
    }

    // Log warning if we timed out
    if (timedOut) {
        logger.warn('StoreHydrationGuard', 'Rendered children after timeout - some data may be missing');
    }

    return <>{children}</>;
}

/**
 * Hook to check if stores are hydrated
 * Use this in components that need to know hydration status
 */
export function useStoresHydrated(): boolean {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const checkHydration = () => {
            const allHydrated = [
                useSettingsStore.persist?.hasHydrated?.() ?? true,
                useSpacesStore.persist?.hasHydrated?.() ?? true,
                useSyncStore.persist?.hasHydrated?.() ?? true,
                usePeopleStore.persist?.hasHydrated?.() ?? true,
                useConferenceStore.persist?.hasHydrated?.() ?? true,
            ].every(Boolean);

            if (allHydrated) {
                setHydrated(true);
            } else {
                setTimeout(checkHydration, 50);
            }
        };

        checkHydration();
    }, []);

    return hydrated;
}
