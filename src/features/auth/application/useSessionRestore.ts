/**
 * Session Restore Hook
 * 
 * Attempts to restore the user session on app startup by refreshing
 * the access token using the httpOnly refresh token cookie.
 * 
 * This is necessary because the access token is stored in memory only
 * (for security), so it's lost on page refresh.
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../infrastructure/authStore';
import { authService } from '../../../shared/infrastructure/services/authService';
import { tokenManager } from '../../../shared/infrastructure/services/apiClient';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { logger } from '../../../shared/infrastructure/services/logger';

export const useSessionRestore = () => {
    const { user, setUser, isInitialized, setInitialized, setAppReady } = useAuthStore();

    const restoreSession = useCallback(async () => {
        // Skip if already initialized
        if (isInitialized) {
            return;
        }

        // Check if we have a token already (shouldn't happen on fresh load)
        const hasToken = tokenManager.getAccessToken();
        if (hasToken) {
            logger.debug('SessionRestore', 'Access token already present');
            setInitialized(true);
            setAppReady(true); // Token exists, assume app is ready
            return;
        }

        // If we have a persisted user, try to restore the session
        if (user) {
            logger.info('SessionRestore', 'Found persisted user, attempting to restore session');
            
            try {
                // Try to refresh the token using httpOnly cookie
                const result = await authService.refreshToken();
                
                if (result.accessToken) {
                    logger.info('SessionRestore', 'Session restored successfully');
                    // Validate the session by calling /me to get fresh user data
                    try {
                        const { user: freshUser } = await authService.me();
                        setUser(freshUser);

                        // CRITICAL: Await settings fetch before marking app as ready
                        const activeStoreId = freshUser.activeStoreId || freshUser.stores?.[0]?.id;
                        const activeCompanyId = freshUser.activeCompanyId || freshUser.companies?.[0]?.id;
                        if (activeStoreId && activeCompanyId) {
                            try {
                                // Fetch settings sequentially (must complete before app is ready)
                                await useSettingsStore.getState().fetchSettingsFromServer(activeStoreId, activeCompanyId);
                                logger.info('SessionRestore', 'Settings loaded successfully');

                                // Auto-connect to SOLUM (non-blocking)
                                const { reconnectToSolum } = useAuthStore.getState();
                                reconnectToSolum().catch((err) => {
                                    logger.warn('SessionRestore', 'Auto SOLUM connect after restore failed', {
                                        error: err instanceof Error ? err.message : String(err),
                                    });
                                });

                                // Mark app as ready only after settings are loaded
                                setAppReady(true);
                                logger.info('SessionRestore', 'Session and settings restored successfully');
                            } catch (err) {
                                logger.error('SessionRestore', 'Failed to fetch settings', {
                                    error: err instanceof Error ? err.message : String(err),
                                });
                                // On settings fetch failure, still mark as ready to prevent infinite loading
                                setAppReady(true);
                            }
                        } else {
                            // No active store/company - mark as ready anyway
                            logger.warn('SessionRestore', 'No active store or company, skipping settings fetch');
                            setAppReady(true);
                        }
                    } catch {
                        // Token refresh worked but /me failed - use existing user data
                        logger.warn('SessionRestore', 'Could not fetch fresh user data, using cached');
                        setAppReady(true); // Still mark as ready to prevent infinite loading
                    }
                }
            } catch (error) {
                // Refresh token is invalid or expired - clear the session
                logger.warn('SessionRestore', 'Session restoration failed, clearing auth state', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                setUser(null);
                setAppReady(true); // Allow login screen to show
            }
        } else {
            logger.debug('SessionRestore', 'No persisted user found');
            setAppReady(true); // No user to restore, show login screen
        }

        setInitialized(true);
    }, [user, setUser, isInitialized, setInitialized, setAppReady]);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    return { isInitialized };
};

export default useSessionRestore;
