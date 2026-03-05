import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.electiscompass.app',
    appName: 'electisCompass',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // For development, you can enable live reload:
        // url: 'http://YOUR_LOCAL_IP:3002',
        // cleartext: true
    },
    plugins: {
        Preferences: {
            // Will use EncryptedSharedPreferences on Android
        },
    },
};

export default config;
