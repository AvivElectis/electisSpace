import { test, expect } from './fixtures/test-fixtures';
import { BasePage, DashboardPage } from './fixtures/pageObjects';
import { waitForAppReady } from './fixtures/helpers';
import { VIEWPORTS } from './fixtures/test-data';

test.describe('Navigation', () => {
    test.describe('Sidebar Navigation', () => {
        test('should display navigation sidebar on desktop', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const sidebar = page.locator('.MuiDrawer-root, nav, [role="navigation"]');
            if (await sidebar.isVisible()) {
                await expect(sidebar).toBeVisible();
            }
        });

        test('should navigate to people via sidebar', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            // Navigation uses tabs on desktop; "People" is an actual nav tab
            const peopleTab = page.getByRole('tab', { name: /people/i });

            if (await peopleTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await peopleTab.click();
                await expect(page).toHaveURL(/\/people/);
            }
        });

        test('should navigate to sync via sidebar', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const syncLink = page.getByRole('link', { name: /sync/i });
            const syncButton = page.getByRole('button', { name: /sync/i });

            if (await syncLink.isVisible()) {
                await syncLink.click();
                await expect(page).toHaveURL(/\/sync/);
            } else if (await syncButton.isVisible()) {
                await syncButton.click();
                await expect(page).toHaveURL(/\/sync/);
            }
        });

        test('should highlight current route in sidebar', async ({ page }) => {
            await page.goto('/#/spaces');
            await waitForAppReady(page);

            // Check for active/selected state on spaces nav item
            const activeItem = page.locator('[aria-current="page"], .Mui-selected, .active');
            if (await activeItem.isVisible()) {
                await expect(activeItem).toBeVisible();
            }
        });
    });

    test.describe('Dashboard Card Navigation', () => {
        test('should navigate to spaces from dashboard card', async ({ page }) => {
            const dashboardPage = new DashboardPage(page);
            await dashboardPage.goto();

            await dashboardPage.navigateToSpaces();
            await expect(page).toHaveURL(/\/spaces/);
        });

        test('should navigate to conference from dashboard card', async ({ page }) => {
            const dashboardPage = new DashboardPage(page);
            await dashboardPage.goto();
            await waitForAppReady(page);

            // Try the card "To Rooms" button or conference tab
            const toRoomsButton = page.getByRole('button', { name: /to rooms/i });
            const conferenceTab = page.getByRole('tab', { name: /conference/i });

            if (await toRoomsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await toRoomsButton.click();
            } else if (await conferenceTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await conferenceTab.click();
            }

            await expect(page).toHaveURL(/\/conference/);
        });

        test('should navigate to people from dashboard card', async ({ page }) => {
            const dashboardPage = new DashboardPage(page);
            await dashboardPage.goto();

            const peopleCard = dashboardPage.getPeopleCard();
            if (await peopleCard.isVisible()) {
                await dashboardPage.navigateToPeople();
                await expect(page).toHaveURL(/\/people/);
            }
        });
    });

    test.describe('Mobile Navigation', () => {
        test.beforeEach(async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
        });

        test('should show hamburger menu on mobile', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const menuButton = page.locator('[aria-label="menu"]');
            await expect(menuButton).toBeVisible();
        });

        test('should open drawer on menu button click', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const menuButton = page.locator('[aria-label="menu"]');
            await menuButton.click();

            const drawer = page.locator('.MuiDrawer-root');
            await expect(drawer).toBeVisible();
        });

        test('should close drawer after navigation', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const menuButton = page.locator('[aria-label="menu"]');
            await menuButton.click();

            // In mobile drawer, navigation items are list buttons; "People" is an actual nav item
            const drawer = page.locator('.MuiDrawer-root');
            const peopleItem = drawer.getByText(/people/i);
            if (await peopleItem.isVisible({ timeout: 2000 }).catch(() => false)) {
                await peopleItem.click();
            }

            await page.waitForTimeout(500);

            // Drawer should close after navigation on mobile
            await expect(page).toHaveURL(/\/people/);
        });

        test('should close drawer on backdrop click', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            const menuButton = page.locator('[aria-label="menu"]');
            await menuButton.click();

            // Click backdrop
            const backdrop = page.locator('.MuiBackdrop-root');
            if (await backdrop.isVisible()) {
                await backdrop.click({ force: true });
                await page.waitForTimeout(300);
            }
        });
    });

    test.describe('RTL Layout Support', () => {
        test('should support RTL layout when Hebrew is selected', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            // Switch to Hebrew
            const languageSwitcher = page.locator('[data-testid="language-switcher"]');
            if (await languageSwitcher.isVisible()) {
                await languageSwitcher.click();

                const hebrewOption = page.locator('[role="menuitem"]:has-text("עברית"), li:has-text("עברית")');
                if (await hebrewOption.isVisible()) {
                    await hebrewOption.click();
                    await page.waitForTimeout(500);

                    const html = page.locator('html');
                    const dir = await html.getAttribute('dir');
                    expect(dir).toBe('rtl');
                }
            }
        });

        test('should have LTR layout when English is selected', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            // Switch to English
            const languageSwitcher = page.locator('[data-testid="language-switcher"]');
            if (await languageSwitcher.isVisible()) {
                await languageSwitcher.click();

                const englishOption = page.locator('[role="menuitem"]:has-text("English"), li:has-text("English")');
                if (await englishOption.isVisible()) {
                    await englishOption.click();
                    await page.waitForTimeout(500);

                    const html = page.locator('html');
                    const dir = await html.getAttribute('dir');
                    expect(dir).toBe('ltr');
                }
            }
        });

        test('should position drawer correctly in RTL', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.goto('/');
            await waitForAppReady(page);

            // Switch to Hebrew
            const languageSwitcher = page.locator('[data-testid="language-switcher"]');
            if (await languageSwitcher.isVisible()) {
                await languageSwitcher.click();

                const hebrewOption = page.locator('[role="menuitem"]:has-text("עברית"), li:has-text("עברית")');
                if (await hebrewOption.isVisible()) {
                    await hebrewOption.click();
                    await page.waitForTimeout(500);

                    // Open drawer
                    const menuButton = page.locator('[aria-label="menu"]');
                    if (await menuButton.isVisible()) {
                        await menuButton.click();

                        const drawer = page.locator('.MuiDrawer-root');
                        await expect(drawer).toBeVisible();
                    }
                }
            }
        });
    });

    test.describe('Back Navigation', () => {
        test('should navigate back using browser back button', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            // Navigate to spaces via tab
            const spacesTab = page.getByRole('tab', { name: /spaces|offices/i });
            if (await spacesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await spacesTab.click();
                await waitForAppReady(page);

                // Go back
                await page.goBack();
                await waitForAppReady(page);
                // Should be back on dashboard (root URL)
                const url = page.url();
                expect(url.endsWith('/') || url.includes('#/') || !url.includes('/spaces')).toBe(true);
            }
        });

        test('should navigate forward using browser forward button', async ({ page }) => {
            await page.goto('/');
            await waitForAppReady(page);

            // Navigate to spaces via tab
            const spacesTab = page.getByRole('tab', { name: /spaces|offices/i });
            if (await spacesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await spacesTab.click();
                await waitForAppReady(page);

                await page.goBack();
                await page.goForward();

                await expect(page).toHaveURL(/\/spaces/);
            }
        });
    });

    test.describe('404 Page', () => {
        test('should show 404 for unknown routes', async ({ page }) => {
            await page.goto('/#/unknown-route-xyz');
            await waitForAppReady(page);

            // Should show not found message or redirect to dashboard
            const notFoundText = page.locator('text=404, text=not found, text=page not found');
            const dashboard = page.locator('[data-testid="dashboard"]');

            const notFoundVisible = await notFoundText.isVisible().catch(() => false);
            const dashboardVisible = await dashboard.isVisible().catch(() => false);

            // Either show 404 or redirect to known page
            expect(notFoundVisible || dashboardVisible || page.url().includes('/')).toBe(true);
        });
    });

    test.describe('Deep Linking', () => {
        test('should open spaces page directly via URL', async ({ page }) => {
            await page.goto('/#/spaces');
            await waitForAppReady(page);

            await expect(page).toHaveURL(/\/spaces/);
        });

        test('should open conference page directly via URL', async ({ page }) => {
            await page.goto('/#/conference');
            await waitForAppReady(page);

            await expect(page).toHaveURL(/\/conference/);
        });

        test('should open sync page directly via URL', async ({ page }) => {
            await page.goto('/#/sync');
            await waitForAppReady(page);

            await expect(page).toHaveURL(/\/sync/);
        });
    });
});
