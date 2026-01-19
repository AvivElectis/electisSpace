/**
 * Root Store Tests
 * Phase 10.23 - Deep Testing System
 * 
 * Tests the root store utilities for unified state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    useRootStore,
    useStoreHydration,
    clearAllStores,
    useSettingsStore,
    useSpacesStore,
    useSyncStore,
    useConferenceStore,
    useNotificationStore,
} from '../rootStore';

describe('Root Store', () => {
    beforeEach(() => {
        // Reset all stores to clean state
        useSettingsStore.setState({
            settings: {
                appName: 'Test App',
                appSubtitle: 'Test Subtitle',
                spaceType: 'office',
                workingMode: 'SFTP',
                csvConfig: {
                    delimiter: ';',
                    columns: [],
                    mapping: {},
                    conferenceEnabled: false,
                },
                logos: {},
                autoSyncEnabled: false,
                autoSyncInterval: 300,
            },
        });

        useSpacesStore.setState({
            spaces: [
                { id: 'S01', data: {} },
                { id: 'S02', data: {} },
            ],
        });

        useSyncStore.setState({
            workingMode: 'SFTP',
            syncState: {
                isConnected: true,
                status: 'idle',
            },
        });

        useConferenceStore.setState({
            conferenceRooms: [
                { id: 'C01', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
            ],
        });

        useNotificationStore.setState({
            notifications: [],
        });
    });

    describe('Re-exports', () => {
        it('should export useSettingsStore', () => {
            expect(useSettingsStore).toBeDefined();
            expect(typeof useSettingsStore).toBe('function');
        });

        it('should export useSpacesStore', () => {
            expect(useSpacesStore).toBeDefined();
            expect(typeof useSpacesStore).toBe('function');
        });

        it('should export useSyncStore', () => {
            expect(useSyncStore).toBeDefined();
            expect(typeof useSyncStore).toBe('function');
        });

        it('should export useConferenceStore', () => {
            expect(useConferenceStore).toBeDefined();
            expect(typeof useConferenceStore).toBe('function');
        });

        it('should export useNotificationStore', () => {
            expect(useNotificationStore).toBeDefined();
            expect(typeof useNotificationStore).toBe('function');
        });
    });

    describe('useRootStore', () => {
        it('should return appName from settings', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.appName).toBe('Test App');
        });

        it('should return appSubtitle from settings', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.appSubtitle).toBe('Test Subtitle');
        });

        it('should return spaceType from settings', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.spaceType).toBe('office');
        });

        it('should return workingMode from sync store', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.workingMode).toBe('SFTP');
        });

        it('should return isConnected from sync state', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.isConnected).toBe(true);
        });

        it('should return syncStatus from sync state', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.syncStatus).toBe('idle');
        });

        it('should return spacesCount', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.spacesCount).toBe(2);
        });

        it('should return conferenceRoomCount', () => {
            const { result } = renderHook(() => useRootStore());

            expect(result.current.conferenceRoomCount).toBe(1);
        });

        it('should update when underlying stores change', () => {
            const { result, rerender } = renderHook(() => useRootStore());

            expect(result.current.spacesCount).toBe(2);

            useSpacesStore.setState({
                spaces: [{ id: 'S01', data: {} }],
            });

            rerender();

            expect(result.current.spacesCount).toBe(1);
        });
    });

    describe('useStoreHydration', () => {
        it('should return hydration status for settings', () => {
            const { result } = renderHook(() => useStoreHydration());

            // In test environment, persist may not be available
            expect(result.current.settingsHydrated).toBeDefined();
        });

        it('should return hydration status for spaces', () => {
            const { result } = renderHook(() => useStoreHydration());

            expect(result.current.spacesHydrated).toBeDefined();
        });

        it('should return hydration status for sync', () => {
            const { result } = renderHook(() => useStoreHydration());

            expect(result.current.syncHydrated).toBeDefined();
        });

        it('should return overall isHydrated status', () => {
            const { result } = renderHook(() => useStoreHydration());

            expect(result.current.isHydrated).toBeDefined();
        });
    });

    describe('clearAllStores', () => {
        it('should be a function', () => {
            expect(typeof clearAllStores).toBe('function');
        });

        it('should reset settings store', () => {
            // Set custom app name
            useSettingsStore.setState({
                settings: {
                    ...useSettingsStore.getState().settings,
                    appName: 'Custom App',
                },
            });

            expect(useSettingsStore.getState().settings.appName).toBe('Custom App');

            // The function calls resetSettings which should reset to defaults
            clearAllStores();

            // After reset, appName should be the default value
            expect(useSettingsStore.getState().settings.appName).toBe('electis Space');
        });

        it('should not throw when called multiple times', () => {
            expect(() => {
                clearAllStores();
                clearAllStores();
                clearAllStores();
            }).not.toThrow();
        });
    });
});
