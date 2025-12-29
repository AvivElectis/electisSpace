/**
 * Electron Update Adapter
 * 
 * Handles auto-updates for Electron using IPC communication with the main process.
 */

import type { UpdateInfo, DownloadProgress } from '../../domain/types';

export class ElectronUpdateAdapter {
    private get api() {
        if (typeof window === 'undefined' || !(window as any).electronAPI) {
            throw new Error('Electron API not available');
        }
        return (window as any).electronAPI;
    }

    /**
     * Check if running in Electron
     */
    isAvailable(): boolean {
        return typeof window !== 'undefined' && !!(window as any).electronAPI?.checkForUpdates;
    }

    /**
     * Check for updates
     */
    async checkForUpdates(): Promise<UpdateInfo | null> {
        if (!this.isAvailable()) {
            throw new Error('Electron update API not available');
        }

        try {
            const result = await this.api.checkForUpdates();
            return result?.updateInfo || null;
        } catch (error) {
            // console.error('Error checking for updates:', error);
            throw error;
        }
    }

    /**
     * Download the update
     */
    async downloadUpdate(): Promise<void> {
        if (!this.isAvailable()) {
            throw new Error('Electron update API not available');
        }

        try {
            await this.api.downloadUpdate();
        } catch (error) {
            // console.error('Error downloading update:', error);
            throw error;
        }
    }

    /**
     * Quit and install the update
     */
    quitAndInstall(): void {
        if (!this.isAvailable()) {
            throw new Error('Electron update API not available');
        }

        this.api.quitAndInstall();
    }

    /**
     * Listen for update available event
     */
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void {
        if (!this.isAvailable()) {
            return () => { };
        }

        return this.api.onUpdateAvailable(callback);
    }

    /**
     * Listen for download progress
     */
    onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void {
        if (!this.isAvailable()) {
            return () => { };
        }

        return this.api.onDownloadProgress(callback);
    }

    /**
     * Listen for update downloaded event
     */
    onUpdateDownloaded(callback: () => void): () => void {
        if (!this.isAvailable()) {
            return () => { };
        }

        return this.api.onUpdateDownloaded(callback);
    }
}

export const electronUpdateAdapter = new ElectronUpdateAdapter();
