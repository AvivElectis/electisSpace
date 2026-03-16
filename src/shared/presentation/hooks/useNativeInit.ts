import { useEffect } from 'react';
import { useNativePlatform } from './useNativePlatform';

export function useNativeInit() {
    const { isNative } = useNativePlatform();

    useEffect(() => {
        if (!isNative) return;

        // Set CSS custom property for bottom nav offset — used by FABs across all pages
        document.documentElement.style.setProperty('--native-bottom-nav-offset', '88px'); // 56px nav + 32px spacing

        (async () => {
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');
                await StatusBar.setBackgroundColor({ color: '#0D47A1' });
                await StatusBar.setStyle({ style: Style.Light });
            } catch {
                // StatusBar not available
            }
        })();
    }, [isNative]);
}
