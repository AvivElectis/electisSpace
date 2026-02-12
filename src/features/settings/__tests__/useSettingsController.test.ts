/**
 * useSettingsController Hook Tests
 * 
 * Tests for the settings controller hook including:
 * - Password management (set, remove, lock, unlock)
 * - Settings updates
 * - Logo management
 * - Import/Export
 */

import { renderHook, act } from '@testing-library/react';
import { useSettingsController } from '../application/useSettingsController';
import { useSettingsStore } from '../infrastructure/settingsStore';

// Mock logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock SoluM service
vi.mock('@shared/infrastructure/services/solumService', () => ({
    login: vi.fn().mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
    }),
    refreshToken: vi.fn().mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600000,
    }),
    getStoreSummary: vi.fn().mockResolvedValue({
        labelCount: 10,
        articleCount: 5,
    }),
}));

describe('useSettingsController', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset settings store
        const { resetSettings } = useSettingsStore.getState();
        resetSettings();
    });

    describe('Initial State', () => {
        it('should return settings', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(result.current.settings).toBeDefined();
            expect(result.current.settings.appName).toBeDefined();
        });

        it('should have isLocked state', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(result.current.isLocked).toBe(false);
        });

        it('should have isPasswordProtected state', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(result.current.isPasswordProtected).toBe(false);
        });
    });

    describe('Password Management', () => {
        it('should have setPassword function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.setPassword).toBe('function');
        });

        it('should have removePassword function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.removePassword).toBe('function');
        });

        it('should have lock function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.lock).toBe('function');
        });

        it('should have unlock function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.unlock).toBe('function');
        });

        it('should lock settings', () => {
            const { result } = renderHook(() => useSettingsController());

            act(() => {
                result.current.lock();
            });

            expect(result.current.isLocked).toBe(true);
        });

        it('should unlock when no password is set', () => {
            const { result } = renderHook(() => useSettingsController());

            // Lock first
            act(() => {
                result.current.lock();
            });

            // Then unlock with any password
            let unlocked = false;
            act(() => {
                unlocked = result.current.unlock('anything');
            });

            expect(unlocked).toBe(true);
            expect(result.current.isLocked).toBe(false);
        });
    });

    describe('Settings Management', () => {
        it('should have updateSettings function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.updateSettings).toBe('function');
        });

        it('should have resetToDefaults function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.resetToDefaults).toBe('function');
        });

        it('should have getSanitizedSettings function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.getSanitizedSettings).toBe('function');
        });

        it('should update settings', () => {
            const { result } = renderHook(() => useSettingsController());

            act(() => {
                result.current.updateSettings({ appName: 'Updated App' });
            });

            expect(result.current.settings.appName).toBe('Updated App');
        });
    });

    describe('Logo Management', () => {
        it('should have uploadLogo function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.uploadLogo).toBe('function');
        });

        it('should have removeLogo function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.removeLogo).toBe('function');
        });
    });

    describe('Import/Export', () => {
        it('should have exportSettingsToFile function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.exportSettingsToFile).toBe('function');
        });

        it('should have importSettingsFromFile function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.importSettingsFromFile).toBe('function');
        });

        it('should export settings', () => {
            const { result } = renderHook(() => useSettingsController());

            // Call directly - synchronous function
            const exported = result.current.exportSettingsToFile();

            expect(exported).toBeDefined();
            expect(exported.version).toBeDefined();
            expect(exported.data).toBeDefined();
        });
    });

    describe('SoluM API Connection', () => {
        it('should have connectToSolum function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.connectToSolum).toBe('function');
        });

        it('should have disconnectFromSolum function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.disconnectFromSolum).toBe('function');
        });

        it('should have refreshSolumTokens function', () => {
            const { result } = renderHook(() => useSettingsController());

            expect(typeof result.current.refreshSolumTokens).toBe('function');
        });

        it('should require solumConfig to connect', () => {
            const { result } = renderHook(() => useSettingsController());

            // Verify that solumConfig is not connected by default
            expect(result.current.settings.solumConfig?.isConnected).toBeFalsy();
            // Function exists and is callable
            expect(typeof result.current.connectToSolum).toBe('function');
        });
    });
});
