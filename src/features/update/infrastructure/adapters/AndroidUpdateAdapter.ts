/**
 * Android Update Adapter
 * 
 * Handles updates for Android (Capacitor) by opening browser to download APK.
 */

import type { UpdateInfo } from '../../domain/types';
import { githubUpdateAdapter } from './GitHubUpdateAdapter';

export class AndroidUpdateAdapter {
    /**
     * Check if running on Android
     */
    isAvailable(): boolean {
        return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform();
    }

    /**
     * Check for updates using GitHub API
     */
    async checkForUpdates(currentVersion: string): Promise<UpdateInfo | null> {
        try {
            return await githubUpdateAdapter.checkForUpdate(currentVersion, 'android');
        } catch (error) {
            // console.error('Error checking for Android updates:', error);
            return null;
        }
    }

    /**
     * Open browser to download APK
     * 
     * Note: Android cannot auto-install APKs for security reasons.
     * User must manually download and install from their downloads folder.
     */
    async downloadUpdate(downloadUrl: string): Promise<void> {
        if (!downloadUrl) {
            throw new Error('No download URL provided');
        }

        try {
            // Open browser to download the APK
            if ((window as any).Capacitor?.Plugins?.Browser) {
                const Browser = (window as any).Capacitor.Plugins.Browser;
                await Browser.open({ url: downloadUrl });
            } else {
                // Fallback to window.open
                window.open(downloadUrl, '_blank');
            }
        } catch (error) {
            // console.error('Error opening browser for APK download:', error);
            throw error;
        }
    }
}

export const androidUpdateAdapter = new AndroidUpdateAdapter();
