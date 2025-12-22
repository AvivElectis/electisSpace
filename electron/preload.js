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
     * Platform Detection
     */
    isElectron: () => true,

    platform: process.platform,
});

/**
 * Log that preload script has loaded
 */
console.log('Electron preload script loaded successfully');
