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
    const { isAuthenticated, validateSession, lastValidation, logout, isSwitchingStore } = useAuthStore();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const performValidation = useCallback(async () => {
        // Skip validation if not authenticated, on login page, or during store switch
        if (!isAuthenticated || location.pathname === '/login' || isSwitchingStore) {
            return;
        }

        // Skip if we validated recently
        const now = Date.now();
        if (lastValidation && (now - lastValidation) < MIN_VALIDATION_INTERVAL_MS) {
            return;
        }

        logger.debug('AuthWatchdog', 'Validating session...');
        
        const isValid = await validateSession();
        
        if (!isValid) {
            logger.warn('AuthWatchdog', 'Session invalid, redirecting to login');
            // Session is invalid, redirect to login
            await logout();
            navigate('/login', { replace: true });
        } else {
            logger.debug('AuthWatchdog', 'Session valid');
        }
    }, [isAuthenticated, validateSession, lastValidation, logout, navigate, location.pathname, isSwitchingStore]);

    // Set up periodic validation
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Only start watchdog if authenticated and not on login page
        if (!isAuthenticated || location.pathname === '/login') {
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
    }, [isAuthenticated, location.pathname, performValidation]);

    // Validate on window focus (user returns to app)
    useEffect(() => {
        const handleFocus = () => {
            if (isAuthenticated && location.pathname !== '/login') {
                logger.debug('AuthWatchdog', 'Window focused, validating session');
                performValidation();
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAuthenticated, location.pathname, performValidation]);

    // Validate on online event (network reconnected)
    useEffect(() => {
        const handleOnline = () => {
            if (isAuthenticated && location.pathname !== '/login') {
                logger.debug('AuthWatchdog', 'Network reconnected, validating session');
                performValidation();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [isAuthenticated, location.pathname, performValidation]);
};
