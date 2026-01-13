/**
 * Platform Detector Tests
 * Phase 10.22 - Deep Testing System
 * 
 * Tests platform detection utilities for web, electron, and android
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    detectPlatform,
    isElectron,
    isAndroid,
    isWeb,
    getPlatformInfo,
} from '../platformDetector';

describe('Platform Detector', () => {
    const originalWindow = global.window;

    beforeEach(() => {
        // Reset window to clean state
        (global as any).window = {};
    });

    afterEach(() => {
        (global as any).window = originalWindow;
    });

    describe('detectPlatform', () => {
        it('should return "web" by default', () => {
            const platform = detectPlatform();
            expect(platform).toBe('web');
        });

        it('should return "electron" when electronAPI is present', () => {
            (global as any).window = {
                electronAPI: {},
            };

            const platform = detectPlatform();
            expect(platform).toBe('electron');
        });

        it('should return "android" when Capacitor is present and native', () => {
            (global as any).window = {
                Capacitor: {
                    isNativePlatform: () => true,
                },
            };

            const platform = detectPlatform();
            expect(platform).toBe('android');
        });

        it('should prioritize electron over capacitor', () => {
            (global as any).window = {
                electronAPI: {},
                Capacitor: {
                    isNativePlatform: () => true,
                },
            };

            const platform = detectPlatform();
            expect(platform).toBe('electron');
        });

        it('should return "web" when Capacitor is not native', () => {
            (global as any).window = {
                Capacitor: {
                    isNativePlatform: () => false,
                },
            };

            const platform = detectPlatform();
            expect(platform).toBe('web');
        });
    });

    describe('isElectron', () => {
        it('should return true when on electron', () => {
            (global as any).window = { electronAPI: {} };

            expect(isElectron()).toBe(true);
        });

        it('should return false when on web', () => {
            (global as any).window = {};

            expect(isElectron()).toBe(false);
        });

        it('should return false when on android', () => {
            (global as any).window = {
                Capacitor: { isNativePlatform: () => true },
            };

            expect(isElectron()).toBe(false);
        });
    });

    describe('isAndroid', () => {
        it('should return true when on android', () => {
            (global as any).window = {
                Capacitor: { isNativePlatform: () => true },
            };

            expect(isAndroid()).toBe(true);
        });

        it('should return false when on web', () => {
            (global as any).window = {};

            expect(isAndroid()).toBe(false);
        });

        it('should return false when on electron', () => {
            (global as any).window = { electronAPI: {} };

            expect(isAndroid()).toBe(false);
        });
    });

    describe('isWeb', () => {
        it('should return true when on web', () => {
            (global as any).window = {};

            expect(isWeb()).toBe(true);
        });

        it('should return false when on electron', () => {
            (global as any).window = { electronAPI: {} };

            expect(isWeb()).toBe(false);
        });

        it('should return false when on android', () => {
            (global as any).window = {
                Capacitor: { isNativePlatform: () => true },
            };

            expect(isWeb()).toBe(false);
        });
    });

    describe('getPlatformInfo', () => {
        it('should return basic info for web platform', async () => {
            (global as any).window = {};

            const info = await getPlatformInfo();

            expect(info.platform).toBe('web');
            expect(info.version).toBeUndefined();
        });

        it('should return version and details for electron', async () => {
            (global as any).window = {
                electronAPI: {
                    getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
                    getPlatformInfo: vi.fn().mockResolvedValue({
                        os: 'win32',
                        arch: 'x64',
                    }),
                },
            };

            const info = await getPlatformInfo();

            expect(info.platform).toBe('electron');
            expect(info.version).toBe('1.0.0');
            expect(info.details).toEqual({ os: 'win32', arch: 'x64' });
        });

        it('should return details for android', async () => {
            (global as any).window = {
                Capacitor: {
                    isNativePlatform: () => true,
                    getPlatform: () => 'android',
                },
            };

            const info = await getPlatformInfo();

            expect(info.platform).toBe('android');
            expect(info.details).toEqual({
                platform: 'android',
                isNative: true,
            });
        });

        it('should handle electron API errors gracefully', async () => {
            (global as any).window = {
                electronAPI: {
                    getAppVersion: vi.fn().mockRejectedValue(new Error('API error')),
                    getPlatformInfo: vi.fn().mockRejectedValue(new Error('API error')),
                },
            };

            const info = await getPlatformInfo();

            expect(info.platform).toBe('electron');
            expect(info.version).toBeUndefined();
        });

        it('should handle Capacitor API errors gracefully', async () => {
            (global as any).window = {
                Capacitor: {
                    isNativePlatform: () => true,
                    getPlatform: () => { throw new Error('API error'); },
                },
            };

            const info = await getPlatformInfo();

            expect(info.platform).toBe('android');
            // Details may be undefined or partial
        });
    });
});
