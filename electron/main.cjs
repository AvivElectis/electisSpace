/**
 * Electron Main Process
 * 
 * Manages the main application window, lifecycle events, and IPC communication.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'AvivElectis',
    repo: 'electisSpace'
});

// Auto-updater settings
autoUpdater.autoDownload = false; // Manual download control
autoUpdater.autoInstallOnAppQuit = true;

// Keep a global reference of the window object
let mainWindow = null;

/**
 * Create the main application window
 */
function createWindow() {
    log.info('Creating main window...');

    const windowConfig = {
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        backgroundColor: '#F5F5F7',
        icon: path.join(__dirname, '../public/icon.ico'),
        frame: false, // Frameless window - no default title bar
        titleBarStyle: 'hiddenInset', // For macOS compatibility
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        show: false, // Don't show until ready
    };

    // On Windows, remove titleBarStyle (it's macOS-specific)
    if (process.platform === 'win32') {
        delete windowConfig.titleBarStyle;
    }

    mainWindow = new BrowserWindow(windowConfig);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        log.info('Main window is now visible');
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        // Development mode - load from Vite dev server
        const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        log.info(`Loading development URL: ${devUrl}`);
        mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode - load from built files
        // When packaged, use process.resourcesPath to find the app resources
        // Structure: resources/app.asar/dist/index.html
        let indexPath;

        if (app.isPackaged) {
            // Packaged app: resources/app.asar (or app)/dist/index.html
            indexPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
            // Check if using app.asar or unpacked app folder
            const fs = require('fs');
            if (!fs.existsSync(indexPath)) {
                indexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
            }
        } else {
            // Unpackaged but production build
            indexPath = path.join(__dirname, '../dist/index.html');
        }

        log.info(`Loading production file: ${indexPath}`);
        log.info(`__dirname: ${__dirname}`);
        log.info(`process.resourcesPath: ${process.resourcesPath}`);
        log.info(`app.isPackaged: ${app.isPackaged}`);

        mainWindow.loadFile(indexPath);
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        log.info('Main window closed');
        mainWindow = null;
    });

    // Log errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error(`Failed to load: ${errorCode} - ${errorDescription}`);
    });
}

/**
 * App lifecycle: Ready
 */
app.whenReady().then(() => {
    log.info('App is ready');
    createWindow();

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

/**
 * App lifecycle: All windows closed
 */
app.on('window-all-closed', () => {
    log.info('All windows closed');
    // On macOS, apps typically stay open until explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * IPC Handlers for File System Operations
 */

// Read file
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        log.info(`Reading file: ${filePath}`);
        const data = await fs.readFile(filePath, 'utf-8');
        return { success: true, data };
    } catch (error) {
        log.error(`Error reading file ${filePath}:`, error);
        return { success: false, error: error.message };
    }
});

// Write file
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        log.info(`Writing file: ${filePath}`);
        await fs.writeFile(filePath, data, 'utf-8');
        return { success: true };
    } catch (error) {
        log.error(`Error writing file ${filePath}:`, error);
        return { success: false, error: error.message };
    }
});

// Select file dialog
ipcMain.handle('select-file', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: options.filters || [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            title: options.title || 'Select File'
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
        log.error('Error selecting file:', error);
        return { success: false, error: error.message };
    }
});

// Select directory dialog
ipcMain.handle('select-directory', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: options.title || 'Select Directory'
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        return { success: true, directoryPath: result.filePaths[0] };
    } catch (error) {
        log.error('Error selecting directory:', error);
        return { success: false, error: error.message };
    }
});

// Save file dialog
ipcMain.handle('save-file', async (event, options = {}) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options.defaultPath || 'export.csv',
            filters: options.filters || [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            title: options.title || 'Save File'
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        // If data is provided, write it
        if (options.data && result.filePath) {
            await fs.writeFile(result.filePath, options.data, 'utf-8');
        }

        return { success: true, filePath: result.filePath };
    } catch (error) {
        log.error('Error saving file:', error);
        return { success: false, error: error.message };
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Get platform info
ipcMain.handle('get-platform-info', () => {
    return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
    };
});

/**
 * Window Control Handlers (for frameless window)
 */

// Minimize window
ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Maximize/Unmaximize window
ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// Close window
ipcMain.handle('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// Check if window is maximized
ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

/**
 * Auto-Updater IPC Handlers
 */

// Check for updates
ipcMain.handle('check-for-updates', async () => {
    try {
        log.info('Checking for updates...');
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
        log.error('Error checking for updates:', error);
        return { success: false, error: error.message };
    }
});

// Download update
ipcMain.handle('download-update', async () => {
    try {
        log.info('Downloading update...');
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        log.error('Error downloading update:', error);
        return { success: false, error: error.message };
    }
});

// Quit and install
ipcMain.handle('quit-and-install', () => {
    log.info('Quitting and installing update...');
    // Force quit all windows and install
    // isSilent: false (show installer), forceRunAfter: true (restart app after install)
    setImmediate(() => {
        app.removeAllListeners('window-all-closed');
        if (mainWindow) {
            mainWindow.close();
        }
        autoUpdater.quitAndInstall(false, true);
    });
});

/**
 * Auto-Updater Events
 * Forward events to renderer process
 */

autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    if (mainWindow) {
        mainWindow.webContents.send('checking-for-update');
    }
});

autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes,
            platform: 'windows',
        });
    }
});

autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-not-available');
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    if (mainWindow) {
        mainWindow.webContents.send('download-progress', {
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total,
        });
    }
});

autoUpdater.on('update-downloaded', async (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded');
        
        // Show native dialog to prompt user to install
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded.`,
            detail: 'The update will be installed when you restart the application. Would you like to restart now?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        });

        if (result.response === 0) {
            // User chose to restart now
            log.info('User chose to restart and install update');
            setImmediate(() => {
                app.removeAllListeners('window-all-closed');
                autoUpdater.quitAndInstall(false, true);
            });
        } else {
            log.info('User chose to install update later');
        }
    }
});

autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    if (mainWindow) {
        mainWindow.webContents.send('update-error', error.message);
    }
});

/**
 * Error handling
 */
process.on('uncaughtException', (error) => {
    log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled promise rejection:', reason);
});

log.info(`Electron app started - Version: ${app.getVersion()}`);
