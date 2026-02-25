import { Page } from '@playwright/test';
import { TIMEOUTS } from './test-data';

/**
 * Common E2E Test Helpers
 */

/**
 * Intercept the refresh token API to bypass token rotation.
 *
 * The server revokes old refresh tokens on each refresh (token rotation).
 * With parallel Playwright workers sharing the same storageState, only the
 * first worker's refresh succeeds — all others get TOKEN_NOT_FOUND.
 *
 * This helper intercepts the refresh call and returns the cached access token
 * from auth setup, allowing all workers to authenticate independently.
 */
export async function setupAuthBypass(page: Page) {
    await page.route('**/api/v1/auth/refresh', async (route) => {
        const token = await page.evaluate(() => localStorage.getItem('_e2eAccessToken'));
        if (token) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: token,
                    refreshToken: 'e2e-mock-refresh-token',
                    expiresIn: 900,
                }),
            });
        } else {
            // No cached token — let it through (auth setup or unauthenticated tests)
            await route.continue();
        }
    });
}

/**
 * Wait for the application to be fully ready.
 *
 * The app shows a full-page "Loading application..." screen while
 * useSessionRestore completes (isAppReady=false). Once ready, it renders
 * MainLayout. On desktop the header tablist is visible; on mobile a
 * hamburger menu button is shown instead.
 */
export async function waitForAppReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    // Wait for either desktop tablist OR mobile menu button (both render after isAppReady=true)
    // Use Promise.race because .first() picks DOM order which may select a hidden element
    await Promise.race([
        page.locator('[role="tablist"]').waitFor({ state: 'visible', timeout: 30000 }),
        page.locator('[aria-label="menu"]').waitFor({ state: 'visible', timeout: 30000 }),
    ]).catch(() => {});
    // Brief settle time for remaining React state updates / route resolution
    await page.waitForTimeout(TIMEOUTS.long);
}

/**
 * Clear all localStorage data before tests
 */
export async function clearLocalStorage(page: Page) {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/**
 * Clear IndexedDB data
 */
export async function clearIndexedDB(page: Page) {
    await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
            }
        }
    });
}

/**
 * Setup clean test environment
 */
export async function setupCleanEnvironment(page: Page) {
    await clearLocalStorage(page);
    await clearIndexedDB(page);
}

/**
 * Wait for a toast/snackbar notification
 */
export async function waitForNotification(page: Page) {
    const notification = page.locator('.MuiSnackbar-root, [role="alert"]');
    await notification.waitFor({ state: 'visible', timeout: 5000 }).catch(() => { });
    return notification;
}

/**
 * Dismiss any visible notification
 */
export async function dismissNotification(page: Page) {
    const closeButton = page.locator('.MuiSnackbar-root button, [role="alert"] button');
    if (await closeButton.isVisible()) {
        await closeButton.click();
    }
}

/**
 * Wait for a dialog to close
 */
export async function waitForDialogClose(page: Page) {
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
    return page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }, selector);
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
    await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, selector);
    await page.waitForTimeout(TIMEOUTS.medium);
}

/**
 * Create a test CSV file in temp directory
 */
export async function createTestCSVFile(page: Page, content: string, filename: string = 'test.csv'): Promise<string> {
    // For Playwright, we use a data URL or inline file handling
    // This creates a blob URL that can be used for file input
    const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
    return dataUrl;
}

/**
 * Get all visible table rows
 */
export async function getVisibleTableRows(page: Page) {
    return page.locator('table tbody tr:visible, [role="row"]:visible').all();
}

/**
 * Wait for table to load data
 */
export async function waitForTableData(page: Page) {
    // Wait for either table rows or empty state
    await Promise.race([
        page.locator('table tbody tr').first().waitFor({ timeout: 5000 }),
        page.locator('[data-testid="empty-state"]').waitFor({ timeout: 5000 }),
    ]).catch(() => { });
}

/**
 * Mock API response for testing
 */
export async function mockAPIResponse(page: Page, urlPattern: string, response: unknown) {
    await page.route(urlPattern, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
        });
    });
}

/**
 * Mock API error for testing error handling
 */
export async function mockAPIError(page: Page, urlPattern: string, statusCode: number = 500) {
    await page.route(urlPattern, async (route) => {
        await route.fulfill({
            status: statusCode,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Mock error' }),
        });
    });
}

/**
 * Get current route/URL path
 */
export async function getCurrentPath(page: Page): Promise<string> {
    const url = new URL(page.url());
    return url.pathname;
}

/**
 * Assert URL contains expected path
 */
export async function assertUrlContains(page: Page, expectedPath: string): Promise<boolean> {
    const currentPath = await getCurrentPath(page);
    return currentPath.includes(expectedPath);
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `e2e/screenshots/${name}-${timestamp}.png` });
}

/**
 * Log current page state for debugging
 */
export async function logPageState(page: Page) {
    const url = page.url();
    const title = await page.title();
    console.log(`Page State: URL=${url}, Title=${title}`);
}
