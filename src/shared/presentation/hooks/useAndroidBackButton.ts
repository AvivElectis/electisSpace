/**
 * useAndroidBackButton
 *
 * Handles the Android hardware back button with smart priority:
 * 1. Close dialog (if onCloseDialog callback returns true)
 * 2. Navigate back if not on root route
 * 3. Double-tap to exit (shows toast, second press exits app)
 *
 * Only active when running on Android.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useTranslation } from 'react-i18next';
import { useNativePlatform } from './useNativePlatform';

interface UseAndroidBackButtonOptions {
    /** Return true if a dialog was closed (suppresses further back navigation) */
    onCloseDialog?: () => boolean;
    /** Skip listener registration (e.g., MainLayout skips when NativeShell handles it) */
    disabled?: boolean;
}

export function useAndroidBackButton({ onCloseDialog, disabled }: UseAndroidBackButtonOptions = {}) {
    const { isAndroid } = useNativePlatform();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // Track last back-press time for double-tap exit detection
    const lastBackPressRef = useRef<number>(0);

    // Use refs to avoid re-registering the listener on every navigation/callback change
    const locationRef = useRef(location.pathname);
    locationRef.current = location.pathname;

    const onCloseDialogRef = useRef(onCloseDialog);
    onCloseDialogRef.current = onCloseDialog;

    const handleBackButton = useCallback(() => {
        // Priority 1: Close open dialog
        if (onCloseDialogRef.current && onCloseDialogRef.current()) {
            return;
        }

        // Priority 2: Navigate back if not on root
        const isRoot =
            locationRef.current === '/' || locationRef.current === '';

        if (!isRoot) {
            navigate(-1);
            return;
        }

        // Priority 3: Double-tap to exit
        const now = Date.now();
        const DOUBLE_TAP_WINDOW = 2000; // ms

        if (now - lastBackPressRef.current < DOUBLE_TAP_WINDOW) {
            App.exitApp();
            return;
        }

        lastBackPressRef.current = now;
        showExitToast(t('app.pressAgainToExit'));
    }, [navigate, t]);

    useEffect(() => {
        if (!isAndroid || disabled) return;

        const handle = App.addListener('backButton', handleBackButton);

        return () => {
            handle.then(h => h.remove());
        };
    }, [isAndroid, disabled, handleBackButton]);
}

/**
 * Creates a temporary DOM toast element (dark pill, white text, fades after 1.7s).
 * Positioned above the bottom nav bar.
 */
function showExitToast(message: string) {
    const existing = document.getElementById('android-exit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'android-exit-toast';
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff',
        padding: '8px 20px',
        borderRadius: '24px',
        fontSize: '14px',
        fontFamily: 'inherit',
        zIndex: '9999',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        opacity: '1',
        transition: 'opacity 0.3s ease',
    });

    document.body.appendChild(toast);

    // Fade out and remove after 1.7s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 1700);
}
