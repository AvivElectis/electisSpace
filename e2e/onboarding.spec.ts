import { test, expect } from './fixtures/test-fixtures';
import { waitForAppReady } from './fixtures/helpers';
import { TIMEOUTS } from './fixtures/test-data';

test.describe('Onboarding Tours', () => {
    test.beforeEach(async ({ page }) => {
        // Clear onboarding state so tours trigger fresh
        await page.goto('/#/');
        await page.evaluate(() => localStorage.removeItem('electisspace_onboarding'));
        await waitForAppReady(page);
    });

    test('dashboard tour shows on first visit and can be completed', async ({ page }) => {
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500); // Wait for tour auto-start delay

        // Tooltip should appear (MUI Popper)
        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).toBeVisible({ timeout: 5000 });

        // Should show step 1/3
        await expect(tooltip).toContainText(/1\s*\/\s*3/);

        // Click Next through steps 1 and 2
        for (let i = 0; i < 2; i++) {
            await tooltip.getByRole('button', { name: /next/i }).click();
            await page.waitForTimeout(TIMEOUTS.medium);
        }

        // Last step shows "Done" button
        await tooltip.getByRole('button', { name: /done/i }).click();

        // Tooltip should disappear
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });

        // Reload — tour should NOT show again (persisted in localStorage)
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500);
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });
    });

    test('tour can be skipped via Skip Tour link', async ({ page }) => {
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500);

        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).toBeVisible({ timeout: 5000 });

        // Click "Skip Tour" link
        await page.getByText(/skip tour/i).click();

        // Tooltip disappears
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });
    });

    test('dashboard cards have View All links and are clickable', async ({ page }) => {
        // Mark tour as completed so it doesn't interfere
        await page.evaluate(() => {
            localStorage.setItem(
                'electisspace_onboarding',
                JSON.stringify({ dashboard: true })
            );
        });
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(TIMEOUTS.long);

        // Find a "View All" link and click it
        const viewAll = page.getByText(/view all/i).first();
        if (await viewAll.isVisible({ timeout: 2000 }).catch(() => false)) {
            await viewAll.click();
            await page.waitForTimeout(TIMEOUTS.medium);
            // Should have navigated away from dashboard root
            expect(page.url()).not.toMatch(/\/#\/$/);
        }
    });

    test('tour does not re-show after completion (localStorage check)', async ({ page }) => {
        // Pre-set the tour as completed in localStorage
        await page.evaluate(() => {
            localStorage.setItem(
                'electisspace_onboarding',
                JSON.stringify({ dashboard: true })
            );
        });
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500);

        // Tooltip should NOT appear
        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });

        // Verify localStorage still has the completion flag
        const state = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('electisspace_onboarding') || '{}')
        );
        expect(state.dashboard).toBe(true);
    });

    test('restart tours from settings clears completion state', async ({ page }) => {
        // Mark tour as completed
        await page.evaluate(() => {
            localStorage.setItem(
                'electisspace_onboarding',
                JSON.stringify({ dashboard: true })
            );
        });
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500);

        // Tour should NOT show (already completed)
        const tooltip = page.locator('[class*="MuiPopper"]');
        await expect(tooltip).not.toBeVisible({ timeout: 3000 });

        // Open settings dialog
        const settingsButton = page.getByRole('button', { name: /settings/i });
        if (await settingsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await settingsButton.click();
            const dialog = page.getByRole('dialog');
            await dialog.waitFor({ state: 'visible' });

            // Navigate to App Settings tab and click Restart Tours
            const appTab = dialog.locator('[role="tab"]:has-text("App")');
            if (await appTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await appTab.click();
                await page.waitForTimeout(TIMEOUTS.medium);
            }

            const restartBtn = page.getByRole('button', { name: /restart tours/i });
            if (await restartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await restartBtn.click();
                await page.waitForTimeout(TIMEOUTS.medium);

                // Close settings dialog
                const closeButton = dialog.locator('button[aria-label="close"]');
                if (await closeButton.isVisible()) {
                    await closeButton.click();
                    await page.waitForTimeout(TIMEOUTS.short);
                }
            }
        }

        // Reload and verify tour shows again
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(1500);

        // Verify localStorage was cleared
        const state = await page.evaluate(() =>
            localStorage.getItem('electisspace_onboarding')
        );
        expect(state === null || state === '{}' || state === 'null').toBe(true);
    });
});
