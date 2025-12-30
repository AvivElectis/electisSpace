import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.electisspace.app',
    appName: 'electisSpace',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // For development, you can enable live reload:
        // url: 'http://YOUR_LOCAL_IP:5173',
        // cleartext: true
    },
    plugins: {
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
