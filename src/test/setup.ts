import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        getPlatform: () => 'web',
        isNativePlatform: () => false,
        isPluginAvailable: () => false,
    },
}));

vi.mock('@capacitor/preferences', () => ({
    Preferences: {
        get: vi.fn().mockResolvedValue({ value: null }),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@capacitor/filesystem', () => ({
    Filesystem: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
    },
    Directory: {
        Documents: 'DOCUMENTS',
        Data: 'DATA',
    },
    Encoding: {
        UTF8: 'utf8',
    },
}));

vi.mock('@capacitor/network', () => ({
    Network: {
        getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
        addListener: vi.fn(),
    },
}));

// Mock Electron
global.window = global.window || {};
(global.window as any).electron = {
    platform: 'web',
    readFile: vi.fn(),
    writeFile: vi.fn(),
    selectFile: vi.fn(),
    selectDirectory: vi.fn(),
    getPlatformInfo: vi.fn().mockResolvedValue({ platform: 'web' }),
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return [];
    }
    unobserve() { }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
} as any;

// Suppress console errors in tests (optional)
global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
};
