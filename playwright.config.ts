import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load e2e credentials from e2e/.env
dotenv.config({ path: resolve(__dirname, 'e2e', '.env') });

const AUTH_FILE = resolve(__dirname, 'e2e', '.auth', 'user.json');

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Limit workers to avoid overwhelming the local dev server */
    workers: process.env.CI ? 1 : 4,

    /* Global test timeout - session restore + page load needs time */
    timeout: 60_000,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        /* Auth setup - runs once before all browser tests */
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },

        /* Auth tests run WITHOUT saved auth state (they test the login page) */
        {
            name: 'auth',
            testMatch: /auth\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },

        /* Authenticated tests use saved auth state */
        {
            name: 'chromium',
            testIgnore: /auth\.(spec|setup)\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: AUTH_FILE,
            },
            dependencies: ['setup'],
        },

        // {
        //     name: 'firefox',
        //     testIgnore: /auth\.(spec|setup)\.ts/,
        //     use: {
        //         ...devices['Desktop Firefox'],
        //         storageState: AUTH_FILE,
        //     },
        //     dependencies: ['setup'],
        // },

        // {
        //     name: 'webkit',
        //     testIgnore: /auth\.(spec|setup)\.ts/,
        //     use: {
        //         ...devices['Desktop Safari'],
        //         storageState: AUTH_FILE,
        //     },
        //     dependencies: ['setup'],
        // },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
