/**
 * Update Controller
 * 
 * Application layer hook for managing updates across all platforms.
 */

import { useEffect, useCallback } from 'react';
import { useUpdateStore } from '../infrastructure/updateStore';
import { electronUpdateAdapter } from '../infrastructure/adapters/ElectronUpdateAdapter';
import { androidUpdateAdapter } from '../infrastructure/adapters/AndroidUpdateAdapter';
import { githubUpdateAdapter } from '../infrastructure/adapters/GitHubUpdateAdapter';
import { detectPlatform } from '@shared/infrastructure/platform/platformDetector';
import { shouldSkipVersion } from '../domain/versionComparison';

// Get current version from package.json (you may need to configure Vite to expose this)
const CURRENT_VERSION = '0.1.0'; // This should be dynamically imported

export function useUpdateController() {
    const {
        available,
        checking,
        downloading,
        installing,
        progress,
        error,
        updateInfo,
        skippedVersion,
        settings,
        setChecking,
        setUpdateAvailable,
        setDownloading,
        setProgress,
        setInstalling,
        setError,
        skipVersion,
        clearUpdate,
        updateSettings,
        markCheckTime,
    } = useUpdateStore();

    /**
     * Check for updates based on current platform
     */
    const checkForUpdates = useCallback(async (): Promise<boolean> => {
        if (!settings.enabled) {
            console.log('Auto-update is disabled');
            return false;
        }

        setChecking(true);

        try {
            const platform = detectPlatform();
            let updateInfo = null;

            if (platform === 'electron' && electronUpdateAdapter.isAvailable()) {
                // Use Electron's built-in updater
                updateInfo = await electronUpdateAdapter.checkForUpdates();
            } else if (platform === 'android' && androidUpdateAdapter.isAvailable()) {
                // Use GitHub API for Android
                updateInfo = await androidUpdateAdapter.checkForUpdates(CURRENT_VERSION);
            } else if (platform === 'web') {
                // Use GitHub API for web (can show update notification)
                updateInfo = await githubUpdateAdapter.checkForUpdate(CURRENT_VERSION, 'windows');
            }

            markCheckTime();

            if (updateInfo && !shouldSkipVersion(updateInfo.version, skippedVersion)) {
                setUpdateAvailable(updateInfo);
                return true;
            } else {
                setChecking(false);
                return false;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            return false;
        }
    }, [settings.enabled, skippedVersion, setChecking, setUpdateAvailable, setError, markCheckTime]);

    /**
     * Download the update
     */
    const downloadUpdate = useCallback(async (): Promise<void> => {
        if (!updateInfo) {
            throw new Error('No update info available');
        }

        setDownloading(true);

        try {
            const platform = detectPlatform();

            if (platform === 'electron' && electronUpdateAdapter.isAvailable()) {
                await electronUpdateAdapter.downloadUpdate();
                // Progress is handled by event listeners
            } else if (platform === 'android' && androidUpdateAdapter.isAvailable()) {
                if (!updateInfo.downloadUrl) {
                    throw new Error('No download URL available');
                }
                await androidUpdateAdapter.downloadUpdate(updateInfo.downloadUrl);
                setDownloading(false);
            } else {
                // Web platform: open download link
                if (updateInfo.downloadUrl) {
                    window.open(updateInfo.downloadUrl, '_blank');
                }
                setDownloading(false);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Download failed';
            setError(errorMessage);
            setDownloading(false);
        }
    }, [updateInfo, setDownloading, setError]);

    /**
     * Install the update (Electron only)
     */
    const installUpdate = useCallback((): void => {
        const platform = detectPlatform();

        if (platform === 'electron' && electronUpdateAdapter.isAvailable()) {
            setInstalling(true);
            electronUpdateAdapter.quitAndInstall();
        } else {
            console.warn('Install update is only available on Electron');
        }
    }, [setInstalling]);

    /**
     * Skip this version
     */
    const skipThisVersion = useCallback((): void => {
        if (updateInfo) {
            skipVersion(updateInfo.version);
        }
    }, [updateInfo, skipVersion]);

    /**
     * Dismiss the update notification
     */
    const dismissUpdate = useCallback((): void => {
        clearUpdate();
    }, [clearUpdate]);



    /**
     * Auto-check on startup and periodically
     */
    useEffect(() => {
        if (!settings.enabled) return;

        const platform = detectPlatform();

        // Setup Electron-specific event listeners
        if (platform === 'electron' && electronUpdateAdapter.isAvailable()) {
            const unsubscribeProgress = electronUpdateAdapter.onDownloadProgress((progressInfo) => {
                setProgress(progressInfo);
            });

            const unsubscribeDownloaded = electronUpdateAdapter.onUpdateDownloaded(() => {
                setDownloading(false);
                // Optionally auto-install based on policy
                if (settings.policy === 'auto') {
                    installUpdate();
                }
            });

            return () => {
                unsubscribeProgress();
                unsubscribeDownloaded();
            };
        }
    }, [settings.enabled, settings.policy, setProgress, setDownloading, installUpdate]);

    /**
     * Check on mount if needed
     */
    /**
     * Check on mount
     * Requirement: Check only when app loads, ignoring intervals
     */
    useEffect(() => {
        if (settings.enabled) {
            checkForUpdates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    return {
        // State
        available,
        checking,
        downloading,
        installing,
        progress,
        error,
        updateInfo,
        settings,

        // Actions
        checkForUpdates,
        downloadUpdate,
        installUpdate,
        skipThisVersion,
        dismissUpdate,
        updateSettings,
    };
}
