import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@features': resolve(__dirname, 'src/features'),
            '@shared': resolve(__dirname, 'src/shared'),
            '@electis/shared': resolve(__dirname, '../shared'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts'],
    },
});
