/**
 * File System Adapter
 * 
 * Provides a unified file system API that works across web, Electron, and Android platforms.
 */

import { isElectron, isAndroid } from './platformDetector';

export interface FileSystemAdapter {
    readFile(path: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    selectFile(options?: FileSelectOptions): Promise<string | null>;
    selectDirectory(options?: DirectorySelectOptions): Promise<string | null>;
    saveFile(options: FileSaveOptions): Promise<string | null>;
}

export interface FileSelectOptions {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}

export interface DirectorySelectOptions {
    title?: string;
}

export interface FileSaveOptions {
    title?: string;
    defaultPath?: string;
    data?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Web implementation using File API
 */
class WebFileSystemAdapter implements FileSystemAdapter {
    async readFile(_path: string): Promise<string> {
        throw new Error('Direct file path reading not supported in web browser');
    }

    async writeFile(_path: string, _data: string): Promise<void> {
        throw new Error('Direct file path writing not supported in web browser');
    }

    async selectFile(options?: FileSelectOptions): Promise<string | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';

            if (options?.filters) {
                const extensions = options.filters.flatMap(f => f.extensions.map(e => `.${e}`));
                input.accept = extensions.join(',');
            }

            input.addEventListener('change', async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const text = await file.text();
                    resolve(text);
                } else {
                    resolve(null);
                }
            });

            input.click();
        });
    }

    async selectDirectory(_options?: DirectorySelectOptions): Promise<string | null> {
        throw new Error('Directory selection not supported in web browser');
    }

    async saveFile(options: FileSaveOptions): Promise<string | null> {
        if (!options.data) {
            throw new Error('Data must be provided for web file save');
        }

        const blob = new Blob([options.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = options.defaultPath || 'export.csv';
        link.click();
        URL.revokeObjectURL(url);

        return options.defaultPath || 'export.csv';
    }
}

/**
 * Electron implementation using IPC
 */
class ElectronFileSystemAdapter implements FileSystemAdapter {
    private get api() {
        return (window as any).electronAPI;
    }

    async readFile(path: string): Promise<string> {
        const result = await this.api.readFile(path);
        if (!result.success) {
            throw new Error(result.error || 'Failed to read file');
        }
        return result.data;
    }

    async writeFile(path: string, data: string): Promise<void> {
        const result = await this.api.writeFile(path, data);
        if (!result.success) {
            throw new Error(result.error || 'Failed to write file');
        }
    }

    async selectFile(options?: FileSelectOptions): Promise<string | null> {
        const result = await this.api.selectFile(options);
        if (result.canceled) {
            return null;
        }
        if (!result.success) {
            throw new Error(result.error || 'Failed to select file');
        }
        return result.filePath;
    }

    async selectDirectory(options?: DirectorySelectOptions): Promise<string | null> {
        const result = await this.api.selectDirectory(options);
        if (result.canceled) {
            return null;
        }
        if (!result.success) {
            throw new Error(result.error || 'Failed to select directory');
        }
        return result.directoryPath;
    }

    async saveFile(options: FileSaveOptions): Promise<string | null> {
        const result = await this.api.saveFile(options);
        if (result.canceled) {
            return null;
        }
        if (!result.success) {
            throw new Error(result.error || 'Failed to save file');
        }
        return result.filePath;
    }
}

/**
 * Android implementation using Capacitor Filesystem
 */
class AndroidFileSystemAdapter implements FileSystemAdapter {
    private get Filesystem() {
        return (window as any).Capacitor.Plugins.Filesystem;
    }

    async readFile(path: string): Promise<string> {
        const result = await this.Filesystem.readFile({
            path,
            encoding: 'utf8',
        });
        return result.data;
    }

    async writeFile(path: string, data: string): Promise<void> {
        await this.Filesystem.writeFile({
            path,
            data,
            encoding: 'utf8',
        });
    }

    async selectFile(_options?: FileSelectOptions): Promise<string | null> {
        // Android file picker implementation would go here
        // For now, return null (would need additional Capacitor plugin)
        // console.warn('File selection not yet implemented for Android');
        throw new Error('File selection not yet implemented for Android');
    }

    async selectDirectory(): Promise<string> {
        // console.warn('Directory selection not yet implemented for Android');
        throw new Error('Directory selection not yet implemented for Android');
    }

    async saveFile(options: FileSaveOptions): Promise<string | null> {
        if (!options.data) {
            throw new Error('Data must be provided for file save');
        }

        const filename = options.defaultPath || 'export.csv';
        await this.Filesystem.writeFile({
            path: filename,
            data: options.data,
            directory: (window as any).Capacitor.Plugins.Filesystem.Directory.Documents,
            encoding: 'utf8',
        });

        return filename;
    }
}

/**
 * Get the appropriate file system adapter for the current platform
 */
export function getFileSystemAdapter(): FileSystemAdapter {
    if (isElectron()) {
        return new ElectronFileSystemAdapter();
    } else if (isAndroid()) {
        return new AndroidFileSystemAdapter();
    } else {
        return new WebFileSystemAdapter();
    }
}

/**
 * Singleton instance
 */
let fileSystemInstance: FileSystemAdapter | null = null;

export function useFileSystem(): FileSystemAdapter {
    if (!fileSystemInstance) {
        fileSystemInstance = getFileSystemAdapter();
    }
    return fileSystemInstance;
}
