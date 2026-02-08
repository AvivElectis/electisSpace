/**
 * Token Refresh Hook
 * 
 * Automatically refreshes SoluM API tokens via the server.
 * Server handles AIMS re-authentication using stored company credentials.
 * Checks every 5 minutes if token is nearing expiry and refreshes via server.
 */

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { refreshAimsToken, isAimsTokenExpired } from '@shared/infrastructure/services/aimsTokenManager';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Hook to automatically refresh SoluM tokens via server
 * Uses the server-side token management (aimsTokenManager) instead of
 * the deprecated direct AIMS refresh (which requires client-side refresh tokens).
 */
export function useTokenRefresh() {
    const isConnected = useSettingsStore((state) => state.settings.solumConfig?.isConnected);
    const hasTokens = useSettingsStore((state) => !!state.settings.solumConfig?.tokens?.accessToken);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        // Only run if connected to SoluM with active tokens
        if (!isConnected || !hasTokens) {
            return;
        }

        logger.info('TokenRefresh', 'Starting server-managed token refresh monitoring');

        // Check every 5 minutes if token needs refresh
        const intervalId = setInterval(async () => {
            // Skip if already refreshing or not connected
            if (isRefreshingRef.current) return;
            const settings = useSettingsStore.getState().settings;
            if (!settings.solumConfig?.isConnected || !settings.solumConfig?.tokens?.accessToken) return;

            // Check if token is expired or near expiry
            if (isAimsTokenExpired()) {
                isRefreshingRef.current = true;
                logger.info('TokenRefresh', 'Token near expiry, refreshing via server');

                try {
                    await refreshAimsToken();
                    logger.info('TokenRefresh', 'Token refreshed via server successfully');
                } catch (error) {
                    logger.warn('TokenRefresh', 'Server token refresh failed, attempting full reconnect', error);

                    // Fall back to full reconnect instead of disconnecting
                    try {
                        const success = await useAuthStore.getState().reconnectToSolum();
                        if (success) {
                            logger.info('TokenRefresh', 'Full reconnect succeeded after refresh failure');
                        } else {
                            logger.error('TokenRefresh', 'Full reconnect also failed');
                        }
                    } catch (reconnectError) {
                        logger.error('TokenRefresh', 'Reconnect threw error', reconnectError);
                    }
                } finally {
                    isRefreshingRef.current = false;
                }
            }
        }, 300000); // Check every 5 minutes

        return () => {
            logger.info('TokenRefresh', 'Stopping server-managed token refresh monitoring');
            clearInterval(intervalId);
        };
    }, [isConnected, hasTokens]);
}
