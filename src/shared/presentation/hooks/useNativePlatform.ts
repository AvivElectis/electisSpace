import { useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

export interface NativePlatformInfo {
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    platform: 'web' | 'android' | 'ios' | 'electron';
}

export function useNativePlatform(): NativePlatformInfo {
    return useMemo(() => {
        const isNative = Capacitor.isNativePlatform();
        const capPlatform = Capacitor.getPlatform();
        const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

        const platform = isElectron ? 'electron' as const
            : capPlatform === 'android' ? 'android' as const
            : capPlatform === 'ios' ? 'ios' as const
            : 'web' as const;

        return {
            isNative,
            isAndroid: platform === 'android',
            isIOS: platform === 'ios',
            platform,
        };
    }, []);
}
