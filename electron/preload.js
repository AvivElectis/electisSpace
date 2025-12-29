/**
 * Electron Preload Script
 * 
 * Exposes safe APIs to the renderer process through contextBridge.
 * This provides a secure way for the web app to access native features.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose Electron API to renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * File System Operations
     */
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

    selectFile: (options) => ipcRenderer.invoke('select-file', options),

    selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),

    saveFile: (options) => ipcRenderer.invoke('save-file', options),

    /**
     * Platform Information
     */
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

    /**
   * Auto-Update APIs
   */
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    downloadUpdate: () => ipcRenderer.invoke('download-update'),

    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Update event listeners
    onUpdateAvailable: (callback) => {
        const listener = (_event, info) => callback(info);
        ipcRenderer.on('update-available', listener);
        return () => ipcRenderer.removeListener('update-available', listener);
    },

    onDownloadProgress: (callback) => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on('download-progress', listener);
        return () => ipcRenderer.removeListener('download-progress', listener);
    },

    onUpdateDownloaded: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('update-downloaded', listener);
        return () => ipcRenderer.removeListener('update-downloaded', listener);
    },

    onUpdateError: (callback) => {
        const listener = (_event, error) => callback(error);
        ipcRenderer.on('update-error', listener);
        return () => ipcRenderer.removeListener('update-error', listener);
    },

    /**
     * Platform Detection
     */
    isElectron: () => true,

    platform: process.platform,

    /**
     * Window Controls (for frameless window)
     */
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),

    windowMaximize: () => ipcRenderer.invoke('window-maximize'),

    windowClose: () => ipcRenderer.invoke('window-close'),

    windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});

/**
 * Log that preload script has loaded
 */
console.log('Electron preload script loaded successfully');
