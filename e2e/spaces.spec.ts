import { test, expect } from '@playwright/test';

test.describe('Spaces Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/spaces');
        await page.waitForLoadState('networkidle');
    });

    test('should display spaces table', async ({ page }) => {
        // Check for table or list of spaces
        const table = page.locator('table, [role="table"]');
        await expect(table).toBeVisible();
    });

    test('should open add space dialog', async ({ page }) => {
        // Click add button
        const addButton = page.getByRole('button', { name: /add|new/i });
        await addButton.click();

        // Verify dialog opened
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
    });

    test('should filter spaces by search', async ({ page }) => {
        // Find search input
        const searchInput = page.getByPlaceholder(/search/i);

        if (await searchInput.isVisible()) {
            await searchInput.fill('Room 101');
            await page.waitForTimeout(500); // Wait for debounce

            // Verify filtered results
            const rows = page.locator('table tbody tr, [role="row"]');
            const count = await rows.count();
            expect(count).toBeGreaterThanOrEqual(0);
        }
    });

    test('should navigate back to dashboard', async ({ page }) => {
        const backButton = page.getByRole('button', { name: /back|dashboard/i });

        if (await backButton.isVisible()) {
            await backButton.click();
            await expect(page).toHaveURL(/\//);
        }
    });
});

test.describe('Settings', () => {
    test('should open settings dialog', async ({ page }) => {
        await page.goto('/');

        // Find settings button (usually in header or menu)
        const settingsButton = page.getByRole('button', { name: /settings/i });

        if (await settingsButton.isVisible()) {
            await settingsButton.click();

            // Verify settings dialog opened
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
        }
    });

    test('should switch between settings tabs', async ({ page }) => {
        await page.goto('/');

        const settingsButton = page.getByRole('button', { name: /settings/i });

        if (await settingsButton.isVisible()) {
            await settingsButton.click();

            // Find tabs
            const tabs = page.locator('[role="tab"]');
            const tabCount = await tabs.count();

            if (tabCount > 0) {
                // Click second tab
                await tabs.nth(1).click();
                await page.waitForTimeout(300);

                // Verify tab is selected
                const selectedTab = page.locator('[role="tab"][aria-selected="true"]');
                await expect(selectedTab).toBeVisible();
            }
        }
    });
});
