import { useEffect } from 'react';
import { useNativePlatform } from './useNativePlatform';

export function useNativeInit() {
    const { isNative } = useNativePlatform();

    useEffect(() => {
        if (!isNative) return;

        // Set CSS custom properties for native layout adjustments
        document.documentElement.style.setProperty('--native-bottom-nav-offset', '88px'); // 56px nav + 32px spacing
        document.documentElement.style.setProperty('--native-page-header-display', 'none'); // hide page headers (shown in app header)

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
