/**
 * Custom Playwright Test Fixtures
 *
 * Extends the base `test` with an auth bypass that intercepts
 * the refresh token API. This prevents failures from refresh token
 * rotation when parallel workers share the same storageState.
 */
import { test as base } from '@playwright/test';
import { setupAuthBypass } from './helpers';

/**
 * Extended test fixture that automatically installs auth bypass
 * before any page navigation. Use this instead of the default
 * `test` import from '@playwright/test' in authenticated specs.
 */
export const test = base.extend({
    page: async ({ page }, use) => {
        await setupAuthBypass(page);
        await use(page);
    },
});

export { expect } from '@playwright/test';
