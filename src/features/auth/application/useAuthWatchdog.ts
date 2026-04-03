/**
 * Auth Watchdog Hook
 * 
 * Monitors authentication status in the background and redirects to login
 * if the session becomes invalid.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../infrastructure/authStore';
import { logger } from '../../../shared/infrastructure/services/logger';

// Validation interval: 60 seconds
const VALIDATION_INTERVAL_MS = 60 * 1000;

// Minimum time between validations: 30 seconds
const MIN_VALIDATION_INTERVAL_MS = 30 * 1000;

export const useAuthWatchdog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, validateSession, logout } = useAuthStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const locationRef = useRef(location.pathname);
    locationRef.current = location.pathname;

    // performValidation reads location via ref so it doesn't restart the interval on navigation
    const performValidation = useCallback(async () => {
        // Skip validation if not authenticated or on login page
        const { isAuthenticated: currentAuth, lastValidation } = useAuthStore.getState();
        if (!currentAuth || locationRef.current === '/login') {
            return;
        }

        // Skip if we validated recently — read from store snapshot, not a
        // reactive dependency, so updating lastValidation won't restart the interval.
        const now = Date.now();
        if (lastValidation && (now - lastValidation) < MIN_VALIDATION_INTERVAL_MS) {
            return;
        }

        logger.debug('AuthWatchdog', 'Validating session...');

        const result = await validateSession();

        if (result.valid) {
            logger.debug('AuthWatchdog', 'Session valid');
            return;
        }

        if (result.networkError) {
            logger.warn('AuthWatchdog', 'Network error during validation, will retry later');
            return; // Do NOT logout — session may still be valid
        }

        // Auth truly failed — try device token re-auth before giving up
        logger.warn('AuthWatchdog', 'Session invalid, attempting device token re-auth');
        try {
            const { deviceTokenStorage } = await import('@shared/infrastructure/services/deviceTokenStorage');
            const deviceToken = await deviceTokenStorage.getDeviceToken();
            const deviceId = await deviceTokenStorage.getDeviceId();

            if (deviceToken && deviceId) {
                const { authService } = await import('../../../shared/infrastructure/services/authService');
                const authResult = await authService.deviceAuth(deviceToken, deviceId);
                if (authResult.accessToken) {
                    logger.info('AuthWatchdog', 'Device token re-auth successful');
                    await validateSession(); // Re-validate to update user state
                    return;
                }
            }
        } catch (deviceErr) {
            logger.warn('AuthWatchdog', 'Device token re-auth failed', {
                error: deviceErr instanceof Error ? deviceErr.message : 'Unknown',
            });
        }

        // All auth methods exhausted — redirect to login
        logger.warn('AuthWatchdog', 'All auth methods failed, redirecting to login');
        await logout();
        navigate('/login', { replace: true });
    }, [validateSession, logout, navigate]);

    // Set up periodic validation
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Only start watchdog if authenticated and not on login page
        if (!isAuthenticated || locationRef.current === '/login') {
            return;
        }

        // Perform initial validation
        performValidation();

        // Set up periodic validation
        intervalRef.current = setInterval(performValidation, VALIDATION_INTERVAL_MS);

        logger.info('AuthWatchdog', 'Watchdog started', { interval: VALIDATION_INTERVAL_MS });

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                logger.info('AuthWatchdog', 'Watchdog stopped');
            }
        };
    }, [isAuthenticated, performValidation]);

    // Validate on window focus (user returns to app)
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated && locationRef.current !== '/login') {
                logger.debug('AuthWatchdog', 'Window focused, validating session');
                performValidation();
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAuthenticated, performValidation]);

    // Validate on online event (network reconnected) with a small delay
    // to allow the network stack to fully stabilize before making API calls
    useEffect(() => {
        let onlineTimer: ReturnType<typeof setTimeout> | null = null;

        const handleOnline = () => {
            if (isAuthenticated && locationRef.current !== '/login') {
                logger.debug('AuthWatchdog', 'Network reconnected, validating session after delay');
                onlineTimer = setTimeout(() => performValidation(), 3000);
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
            if (onlineTimer) {
                clearTimeout(onlineTimer);
            }
        };
    }, [isAuthenticated, performValidation]);
};
