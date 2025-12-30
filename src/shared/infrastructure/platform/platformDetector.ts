/**
 * Platform Detection
 * 
 * Detects the current platform (web, electron, or android)
 * to enable platform-specific functionality.
 */

export type Platform = 'web' | 'electron' | 'android';

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
    // Check for Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return 'electron';
    }

    // Check for Capacitor (Android/iOS)
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        return 'android';
    }

    // Default to web
    return 'web';
}

/**
 * Check if running on Electron
 */
export function isElectron(): boolean {
    return detectPlatform() === 'electron';
}

/**
 * Check if running on Android (Capacitor)
 */
export function isAndroid(): boolean {
    return detectPlatform() === 'android';
}

/**
 * Check if running in web browser
 */
export function isWeb(): boolean {
    return detectPlatform() === 'web';
}

/**
 * Get platform information
 */
export async function getPlatformInfo(): Promise<{
    platform: Platform;
    version?: string;
    details?: any;
}> {
    const platform = detectPlatform();
    const info: any = { platform };

    if (isElectron()) {
        try {
            const electronAPI = (window as any).electronAPI;
            const version = await electronAPI.getAppVersion();
            const details = await electronAPI.getPlatformInfo();
            info.version = version;
            info.details = details;
        } catch (error) {
            // console.error('Error getting Electron platform info:', error);
        }
    } else if (isAndroid()) {
        try {
            const Capacitor = (window as any).Capacitor;
            info.details = {
                platform: Capacitor.getPlatform(),
                isNative: Capacitor.isNativePlatform(),
            };
        } catch (error) {
            // console.error('Error getting Capacitor platform info:', error);
        }
    }

    return info;
}
