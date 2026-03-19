import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_ENV === 'dev';

const config: CapacitorConfig = {
    appId: 'com.electisspace.app',
    appName: 'electisSpace',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // Allow cleartext HTTP for dev server access from emulator
        allowNavigation: isDev ? ['10.0.2.2:*'] : undefined,
        // For dev on emulator: point API to host machine's Docker backend
        ...(isDev ? { cleartext: true } : {}),
    },
    plugins: {
        CapacitorHttp: {
            // Route all HTTP requests through native layer
            // This bypasses WebView CORS restrictions and enables httpOnly cookies
            // Disabled in dev mode — interferes with Vite dev server live reload
            enabled: !isDev,
        },
        CapacitorCookies: {
            // Enable native cookie handling for httpOnly cookies (refresh tokens)
            // Disabled in dev mode — cookies work via Vite proxy
            enabled: !isDev,
        },
        Filesystem: {
            // File system plugin configuration
        },
        Preferences: {
            // Preferences plugin will use platform defaults
        },
        Network: {
            // Network plugin configuration
        },
        StatusBar: {
            style: 'LIGHT',
            backgroundColor: '#0D47A1',
        },
    },
};

export default config;
