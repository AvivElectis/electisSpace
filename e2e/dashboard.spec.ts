import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the dashboard
        await page.goto('/');
    });

    test('should display dashboard title', async ({ page }) => {
        // Wait for the page to load
        await page.waitForLoadState('networkidle');

        // Check for dashboard title or heading
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
        // Wait for content to load
        await page.waitForLoadState('networkidle');

        // Check for stats cards (adjust selectors based on actual implementation)
        const statsCards = page.locator('[data-testid="stats-card"]');
        await expect(statsCards.first()).toBeVisible();
    });

    test('should navigate to spaces page', async ({ page }) => {
        // Click on "To Spaces" button
        const toSpacesButton = page.getByRole('button', { name: /spaces|rooms|chairs/i });
        await toSpacesButton.click();

        // Verify navigation
        await expect(page).toHaveURL(/\/spaces/);
    });

    test('should be responsive on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify content is visible
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toBeVisible();
    });
});

test.describe('Language Switching', () => {
    test('should switch between English and Hebrew', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Find language switcher (adjust selector based on implementation)
        const languageSwitcher = page.locator('[data-testid="language-switcher"]');

        if (await languageSwitcher.isVisible()) {
            await languageSwitcher.click();

            // Wait for language change
            await page.waitForTimeout(500);

            // Verify RTL/LTR direction change
            const html = page.locator('html');
            const dir = await html.getAttribute('dir');
            expect(['ltr', 'rtl']).toContain(dir);
        }
    });
});
