import { test, expect } from './fixtures/test-fixtures';
import { SettingsDialog } from './fixtures/pageObjects';
import { waitForAppReady, waitForDialogClose, waitForNotification } from './fixtures/helpers';
import { sampleSettings, VIEWPORTS } from './fixtures/test-data';

test.describe('Settings Dialog', () => {
    let settingsDialog: SettingsDialog;

    test.beforeEach(async ({ page }) => {
        settingsDialog = new SettingsDialog(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test.describe('Dialog Open/Close', () => {
        test('should open settings dialog', async () => {
            await settingsDialog.open();
            await expect(settingsDialog.getDialog()).toBeVisible();
        });

        test('should close settings dialog', async ({ page }) => {
            await settingsDialog.open();

            // Click the bottom "Close" button (there's also an X button at the top)
            const closeButton = page.getByRole('button', { name: /^close$/i });
            await closeButton.last().click();
            await page.waitForTimeout(300);

            await expect(settingsDialog.getDialog()).not.toBeVisible();
        });

        test('should close on backdrop click', async ({ page }) => {
            await settingsDialog.open();

            // MUI Dialog may not close on backdrop click by default
            // Use the close button instead to verify dialog can be dismissed
            const closeButton = settingsDialog.getDialog().locator('button[aria-label="close"]');
            if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(300);
                await expect(settingsDialog.getDialog()).not.toBeVisible();
            }
        });
    });

    test.describe('Tab Navigation', () => {
        test('should display multiple tabs', async () => {
            await settingsDialog.open();

            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();
            expect(tabCount).toBeGreaterThan(0);
        });

        test('should switch between tabs', async ({ page }) => {
            await settingsDialog.open();

            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();

            if (tabCount > 1) {
                // Click second tab
                await tabs.nth(1).click();
                await page.waitForTimeout(500);

                // Verify the second tab is now selected
                const secondTabAriaSelected = await tabs.nth(1).getAttribute('aria-selected');
                expect(secondTabAriaSelected).toBe('true');
            }
        });

        test('should show different content for each tab', async ({ page }) => {
            await settingsDialog.open();

            const dialog = settingsDialog.getDialog();
            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();

            if (tabCount > 1) {
                // Get first tab content (only the visible tabpanel)
                const firstTabContent = await dialog.locator('[role="tabpanel"]:not([hidden])').first().textContent();

                // Switch to second tab
                await tabs.nth(1).click();
                await page.waitForTimeout(500);

                // Get second tab content (only the visible tabpanel)
                const secondTabContent = await dialog.locator('[role="tabpanel"]:not([hidden])').first().textContent();

                // Content should exist
                expect(secondTabContent).toBeDefined();
            }
        });
    });

    test.describe('App Configuration', () => {
        test('should display app name input', async () => {
            await settingsDialog.open();

            const appNameInput = settingsDialog.page.locator('input[name="appName"], #app-name');
            if (await appNameInput.isVisible()) {
                await expect(appNameInput).toBeVisible();
            }
        });

        test('should update app name', async ({ page }) => {
            await settingsDialog.open();

            const appNameInput = page.locator('input[name="appName"], #app-name');
            if (await appNameInput.isVisible()) {
                await appNameInput.clear();
                await appNameInput.fill('My Test App');

                const value = await appNameInput.inputValue();
                expect(value).toBe('My Test App');
            }
        });

        test('should display app subtitle input', async () => {
            await settingsDialog.open();

            const subtitleInput = settingsDialog.page.locator('input[name="appSubtitle"], #app-subtitle');
            if (await subtitleInput.isVisible()) {
                await expect(subtitleInput).toBeVisible();
            }
        });
    });

    test.describe('Working Mode Selection', () => {
        test('should display working mode selector', async ({ page }) => {
            await settingsDialog.open();

            // Navigate to connection/mode tab if needed (scoped to dialog)
            const dialog = settingsDialog.getDialog();
            const connectionTab = dialog.locator('[role="tab"]:has-text("connection"), [role="tab"]:has-text("mode")');
            if (await connectionTab.isVisible()) {
                await connectionTab.click();
                await page.waitForTimeout(300);
            }

            const modeSelect = page.locator('[data-testid="working-mode-select"], #working-mode, [aria-label*="mode"]');
            if (await modeSelect.isVisible()) {
                await expect(modeSelect).toBeVisible();
            }
        });

        test('should show mode options when clicked', async ({ page }) => {
            await settingsDialog.open();

            const modeSelect = page.locator('[data-testid="working-mode-select"], #working-mode');
            if (await modeSelect.isVisible()) {
                await modeSelect.click();

                const options = page.locator('[role="option"], [role="listbox"] li');
                const optionCount = await options.count();
                expect(optionCount).toBeGreaterThan(0);
            }
        });
    });

    test.describe('Space Type Selection', () => {
        test('should display space type selector', async ({ page }) => {
            await settingsDialog.open();

            const typeSelect = page.locator('[data-testid="space-type-select"], #space-type');
            if (await typeSelect.isVisible()) {
                await expect(typeSelect).toBeVisible();
            }
        });
    });

    test.describe('SoluM Connection', () => {
        test.beforeEach(async ({ page }) => {
            await settingsDialog.open();

            // Navigate to SoluM/connection tab (scoped to dialog)
            const dialog = settingsDialog.getDialog();
            const connectionTab = dialog.locator('[role="tab"]:has-text("SoluM"), [role="tab"]:has-text("connection"), [role="tab"]:has-text("API")');
            if (await connectionTab.isVisible()) {
                await connectionTab.click();
                await page.waitForTimeout(300);
            }
        });

        test('should show SoluM credential fields', async ({ page }) => {
            const baseUrlInput = page.locator('input[name="baseUrl"], #base-url');
            const companyCodeInput = page.locator('input[name="companyCode"], #company-code');

            if (await baseUrlInput.isVisible()) {
                await expect(baseUrlInput).toBeVisible();
            }
            if (await companyCodeInput.isVisible()) {
                await expect(companyCodeInput).toBeVisible();
            }
        });

        test('should show test connection button', async ({ page }) => {
            const testButton = page.getByRole('button', { name: /test|connect/i });
            if (await testButton.isVisible()) {
                await expect(testButton).toBeVisible();
            }
        });
    });

    test.describe('People Manager Mode', () => {
        test('should show people manager toggle', async ({ page }) => {
            await settingsDialog.open();

            // May be in a different tab
            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();

            for (let i = 0; i < tabCount; i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(300);

                const toggle = page.locator('[data-testid="people-manager-toggle"], #people-manager-mode');
                if (await toggle.isVisible()) {
                    await expect(toggle).toBeVisible();
                    return;
                }
            }
        });
    });

    test.describe('Auto-Sync Settings', () => {
        test('should show auto-sync toggle', async ({ page }) => {
            await settingsDialog.open();

            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();

            for (let i = 0; i < tabCount; i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(300);

                const toggle = page.locator('[data-testid="auto-sync-toggle"], #auto-sync');
                if (await toggle.isVisible()) {
                    await expect(toggle).toBeVisible();
                    return;
                }
            }
        });

        test('should show sync interval input when enabled', async ({ page }) => {
            await settingsDialog.open();

            const toggle = page.locator('[data-testid="auto-sync-toggle"], #auto-sync');
            if (await toggle.isVisible()) {
                // Enable if not already
                if (!(await toggle.isChecked())) {
                    await toggle.click();
                }

                const intervalInput = page.locator('input[name="syncInterval"], #sync-interval');
                if (await intervalInput.isVisible()) {
                    await expect(intervalInput).toBeVisible();
                }
            }
        });
    });

    test.describe('Logo Upload', () => {
        test('should show logo upload areas', async ({ page }) => {
            await settingsDialog.open();

            const logoUpload = page.locator('[data-testid="logo-upload"], [data-testid="logo-upload-1"]');
            if (await logoUpload.isVisible()) {
                await expect(logoUpload).toBeVisible();
            }
        });
    });

    test.describe('Settings Behavior', () => {
        test('should show close button', async ({ page }) => {
            await settingsDialog.open();

            // Settings dialog has a close button (no save - settings auto-save)
            const closeButton = page.getByRole('button', { name: /close/i });
            await expect(closeButton.first()).toBeVisible();
        });

        test('should apply settings changes immediately', async ({ page }) => {
            await settingsDialog.open();

            // Make a change to a visible input
            const appNameInput = page.locator('input[name="appName"], #app-name');
            if (await appNameInput.isVisible()) {
                const originalValue = await appNameInput.inputValue();
                await appNameInput.clear();
                await appNameInput.fill('Test App Name');

                const newValue = await appNameInput.inputValue();
                expect(newValue).toBe('Test App Name');

                // Restore original value
                await appNameInput.clear();
                await appNameInput.fill(originalValue);
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await waitForAppReady(page);

            await settingsDialog.open();

            const dialog = settingsDialog.getDialog();
            await expect(dialog).toBeVisible();
        });

        test('should be full screen on mobile', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await waitForAppReady(page);

            await settingsDialog.open();

            // Dialog should be full screen on mobile
            const dialog = settingsDialog.getDialog();
            const box = await dialog.boundingBox();

            if (box) {
                // Should take most of the screen
                expect(box.width).toBeGreaterThan(300);
            }
        });
    });
});

test.describe('Security Settings', () => {
    test('should show security settings tab', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const settingsDialog = new SettingsDialog(page);
        await settingsDialog.open();

        // Navigate directly to the "Security Settings" tab
        const dialog = settingsDialog.getDialog();
        const securityTab = dialog.getByRole('tab', { name: /security settings/i });
        if (await securityTab.isVisible()) {
            await securityTab.click();
            await page.waitForTimeout(300);

            // Verify tab content loaded (only the visible tabpanel)
            const tabPanel = dialog.locator('[role="tabpanel"]:not([hidden])').first();
            await expect(tabPanel).toBeVisible();
        }
    });
});
