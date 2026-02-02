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
import { logger } from '../../../shared/infrastructure/services/logger';

export const useSessionRestore = () => {
    const { user, setUser, isInitialized, setInitialized } = useAuthStore();

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
                    } catch {
                        // Token refresh worked but /me failed - use existing user data
                        logger.warn('SessionRestore', 'Could not fetch fresh user data, using cached');
                    }
                }
            } catch (error) {
                // Refresh token is invalid or expired - clear the session
                logger.warn('SessionRestore', 'Session restoration failed, clearing auth state', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                setUser(null);
            }
        } else {
            logger.debug('SessionRestore', 'No persisted user found');
        }

        setInitialized(true);
    }, [user, setUser, isInitialized, setInitialized]);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    return { isInitialized };
};

export default useSessionRestore;
