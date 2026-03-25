import { memo, useMemo, useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useBackendSyncController } from '@features/sync/application/useBackendSyncController';
import { SyncProvider } from '@features/sync/application/SyncContext';
import { StoreRequiredGuard } from '@features/auth/presentation/StoreRequiredGuard';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useNativeInit } from '../hooks/useNativeInit';
import { useAndroidBackButton } from '../hooks/useAndroidBackButton';
import { NativeAppBar } from './NativeAppBar';
import { NativeBottomNav } from './NativeBottomNav';
import { NativePageTitleProvider } from './NativePageTitleContext';
import { SphereLoader } from '../components/SphereLoader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { nativeSizing } from '../themes/nativeTokens';

const shellRootSx = {
    minHeight: '100vh',
    bgcolor: 'background.default',
    display: 'flex',
    flexDirection: 'column',
} as const;

const storeSwitchOverlaySx = {
    position: 'fixed',
    inset: 0,
    zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 1,
    bgcolor: 'background.default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
} as const;

const mainContentSx = { flex: 1, display: 'flex', flexDirection: 'column' } as const;

const syncIndicatorSx = {
    position: 'fixed',
    top: `calc(${nativeSizing.appBarHeight}px + max(env(safe-area-inset-top, 0px), 28px) + 8px)`,
    insetInlineStart: 12,
    zIndex: (theme: { zIndex: { appBar: number } }) => theme.zIndex.appBar - 1,
    transform: 'scale(0.85)',
    transformOrigin: 'top left',
    opacity: 0.9,
} as const;

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const NativeShell = memo(function NativeShell() {
    useNativeInit();

    // Track app background time — require re-auth after 5 minutes
    const backgroundTimeRef = useRef<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handlePause = () => {
            backgroundTimeRef.current = Date.now();
        };
        const handleResume = () => {
            if (backgroundTimeRef.current) {
                const elapsed = Date.now() - backgroundTimeRef.current;
                backgroundTimeRef.current = null;
                if (elapsed >= SESSION_TIMEOUT_MS) {
                    // Session expired — force re-login
                    navigate('/login', { replace: true });
                }
            }
        };

        const pauseListener = App.addListener('pause', handlePause);
        const resumeListener = App.addListener('resume', handleResume);

        return () => {
            pauseListener.then(h => h.remove());
            resumeListener.then(h => h.remove());
        };
    }, [navigate]);

    const { isAuthenticated } = useAuthContext();
    const isInitialized = useAuthStore(state => state.isInitialized);
    const isSwitchingStore = useAuthStore(state => state.isSwitchingStore);

    const autoSyncEnabled = useSettingsStore(state => state.settings.autoSyncEnabled);
    const autoSyncInterval = useSettingsStore(state => state.settings.autoSyncInterval);
    const activeStoreId = useSettingsStore(state => state.activeStoreId);

    const authReady = isAuthenticated && isInitialized;
    const effectiveStoreId = authReady ? activeStoreId : null;

    const syncController = useBackendSyncController({
        storeId: effectiveStoreId,
        autoSyncEnabled,
        autoSyncInterval,
    });

    const syncState = useSyncStore((s) => s.syncState);

    useAndroidBackButton({});

    const syncStatus = useMemo(() =>
        syncState.status === 'syncing' ? 'syncing' :
        syncState.status === 'error' ? 'error' :
        syncState.isConnected ? 'connected' : 'disconnected'
    , [syncState.status, syncState.isConnected]);

    const handleSyncClick = useCallback(() => {
        syncController.sync().catch(() => {/* handled in controller */});
    }, [syncController]);

    return (
        <SyncProvider value={syncController}>
            <NativePageTitleProvider>
                <Box sx={shellRootSx}>
                    {isSwitchingStore && (
                        <Box sx={storeSwitchOverlaySx}>
                            <SphereLoader />
                        </Box>
                    )}

                    <NativeAppBar />

                    <Box component="main" sx={mainContentSx}>
                        <ErrorBoundary showDetails>
                            <StoreRequiredGuard>
                                <Outlet />
                            </StoreRequiredGuard>
                        </ErrorBoundary>
                    </Box>

                    {/* Sync Status Indicator — positioned at top under app bar, not overlapping FABs */}
                    <Box sx={syncIndicatorSx}>
                        <SyncStatusIndicator
                            status={syncStatus}
                            lastSyncTime={syncState.lastSync ? new Date(syncState.lastSync).toLocaleString() : undefined}
                            errorMessage={syncState.lastError}
                            onSyncClick={handleSyncClick}
                            serverConnected={syncController.serverConnected}
                            aimsConnected={syncState.isConnected}
                            syncStartedAt={syncState.syncStartedAt}
                            autoSyncEnabled={autoSyncEnabled}
                            autoSyncInterval={autoSyncInterval}
                        />
                    </Box>

                    <NativeBottomNav />
                </Box>
            </NativePageTitleProvider>
        </SyncProvider>
    );
});
