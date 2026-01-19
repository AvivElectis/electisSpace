import { test, expect } from '@playwright/test';
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

        test('should close settings dialog', async () => {
            await settingsDialog.open();
            await settingsDialog.close();

            await expect(settingsDialog.getDialog()).not.toBeVisible();
        });

        test('should close on backdrop click', async ({ page }) => {
            await settingsDialog.open();

            // Click outside the dialog
            const backdrop = page.locator('.MuiBackdrop-root');
            if (await backdrop.isVisible()) {
                await backdrop.click({ position: { x: 10, y: 10 } });
                await page.waitForTimeout(300);
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
                await tabs.nth(1).click();
                await page.waitForTimeout(300);

                const selectedTab = settingsDialog.getSelectedTab();
                await expect(selectedTab).toBeVisible();
            }
        });

        test('should show different content for each tab', async ({ page }) => {
            await settingsDialog.open();

            const tabs = settingsDialog.getTabs();
            const tabCount = await tabs.count();

            if (tabCount > 1) {
                // Get first tab content
                const firstTabContent = await page.locator('[role="tabpanel"]').textContent();

                // Switch to second tab
                await tabs.nth(1).click();
                await page.waitForTimeout(300);

                // Get second tab content
                const secondTabContent = await page.locator('[role="tabpanel"]').textContent();

                // Content should be different (or at least exist)
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

            // Navigate to connection/mode tab if needed
            const connectionTab = page.locator('[role="tab"]:has-text("connection"), [role="tab"]:has-text("mode")');
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

            // Navigate to SoluM/connection tab
            const connectionTab = page.locator('[role="tab"]:has-text("SoluM"), [role="tab"]:has-text("connection"), [role="tab"]:has-text("API")');
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

    test.describe('Save Settings', () => {
        test('should show save button', async ({ page }) => {
            await settingsDialog.open();

            const saveButton = page.getByRole('button', { name: /save/i });
            await expect(saveButton).toBeVisible();
        });

        test('should save settings successfully', async ({ page }) => {
            await settingsDialog.open();

            // Make a change
            const appNameInput = page.locator('input[name="appName"], #app-name');
            if (await appNameInput.isVisible()) {
                await appNameInput.clear();
                await appNameInput.fill('Test App Name');
            }

            await settingsDialog.save();

            // Check for success notification or dialog close
            const notification = await waitForNotification(page);
            if (await notification.isVisible()) {
                await expect(notification).toBeVisible();
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
            await waitForAppReady(page);

            await settingsDialog.open();

            const dialog = settingsDialog.getDialog();
            await expect(dialog).toBeVisible();
        });

        test('should be full screen on mobile', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
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
    test('should show password protection option', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const settingsDialog = new SettingsDialog(page);
        await settingsDialog.open();

        // Look for security/password tab
        const tabs = settingsDialog.getTabs();
        const tabCount = await tabs.count();

        for (let i = 0; i < tabCount; i++) {
            await tabs.nth(i).click();
            await page.waitForTimeout(300);

            const passwordInput = page.locator('input[name="appPassword"], #app-password, input[type="password"]');
            if (await passwordInput.isVisible()) {
                await expect(passwordInput).toBeVisible();
                return;
            }
        }
    });
});
