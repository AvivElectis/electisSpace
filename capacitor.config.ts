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
    },
    plugins: {
        CapacitorHttp: {
            // Route all HTTP requests through native layer
            // This bypasses WebView CORS restrictions and enables httpOnly cookies
            enabled: true,
        },
        CapacitorCookies: {
            // Enable native cookie handling for httpOnly cookies (refresh tokens)
            enabled: true,
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
    },
};

export default config;
