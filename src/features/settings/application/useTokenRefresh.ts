/**
 * Token Refresh Hook
 * 
 * Automatically refreshes SoluM API tokens every 3 hours or when near expiry
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { shouldRefreshToken, refreshToken } from '@shared/infrastructure/services/solumService';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Hook to automatically refresh SoluM tokens
 * Checks every minute if refresh is needed
 */
export function useTokenRefresh() {
    const settings = useSettingsStore((state) => state.settings);
    const updateSettings = useSettingsStore((state) => state.updateSettings);

    useEffect(() => {
        // Only run if connected to SoluM
        if (!settings.solumConfig?.isConnected || !settings.solumConfig?.tokens) {
            return;
        }

        logger.info('TokenRefresh', 'Starting automatic token refresh monitoring');

        // Check every minute if token needs refresh
        const intervalId = setInterval(async () => {
            if (!settings.solumConfig) return;

            // Check if token should be refreshed
            if (shouldRefreshToken(settings.solumConfig)) {
                logger.info('TokenRefresh', 'Token refresh needed, refreshing now');

                try {
                    const newTokens = await refreshToken(
                        settings.solumConfig,
                        settings.solumConfig.tokens!.refreshToken
                    );

                    // Update settings with new tokens
                    updateSettings({
                        solumConfig: {
                            ...settings.solumConfig,
                            tokens: newTokens,
                            lastRefreshed: Date.now(),
                        },
                    });

                    logger.info('TokenRefresh', 'Token refreshed successfully');
                } catch (error) {
                    logger.error('TokenRefresh', 'Failed to refresh token', error);

                    // Disconnect if refresh fails
                    updateSettings({
                        solumConfig: {
                            ...settings.solumConfig,
                            isConnected: false,
                            tokens: undefined,
                        },
                    });
                }
            }
        }, 60000); // Check every 60 seconds

        return () => {
            logger.info('TokenRefresh', 'Stopping automatic token refresh monitoring');
            clearInterval(intervalId);
        };
    }, [settings.solumConfig?.isConnected, settings.solumConfig?.tokens, updateSettings]);
}
