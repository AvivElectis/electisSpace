import { waitFor as rtlWaitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Wait for a condition to be true with custom timeout
 */
export async function waitForCondition(
    condition: () => boolean,
    timeout = 3000
): Promise<void> {
    await rtlWaitFor(() => {
        if (!condition()) {
            throw new Error('Condition not met');
        }
    }, { timeout });
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock file for file upload testing
 */
export function createMockFile(
    name: string,
    content: string,
    type = 'text/plain'
): File {
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
}

/**
 * Create a mock FileList for file input testing
 */
export function createMockFileList(files: File[]): FileList {
    const fileList: any = files;
    fileList.item = (index: number) => files[index];
    return fileList as FileList;
}

/**
 * Simulate a file drop event
 */
export function createDropEvent(files: File[]) {
    return {
        dataTransfer: {
            files: createMockFileList(files),
            items: files.map(file => ({
                kind: 'file',
                type: file.type,
                getAsFile: () => file,
            })),
            types: ['Files'],
        },
    };
}

/**
 * Reset all Zustand stores (useful for test isolation)
 */
export function resetAllStores() {
    // This will be implemented when we add store reset methods
    // For now, it's a placeholder
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
    const originalConsole = { ...console };

    beforeEach(() => {
        global.console = {
            ...console,
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
        } as any;
    });

    afterEach(() => {
        global.console = originalConsole;
    });
}

/**
 * Create a mock localStorage for testing
 */
export function createMockLocalStorage() {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] || null,
    };
}
