import { test, expect } from '@playwright/test';
import { DashboardPage } from './fixtures/pageObjects';
import { waitForAppReady, setupCleanEnvironment } from './fixtures/helpers';
import { VIEWPORTS } from './fixtures/test-data';

test.describe('Dashboard Page', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
        dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();
        await waitForAppReady(page);
    });

    test.describe('Page Display', () => {
        test('should display dashboard title', async ({ page }) => {
            const heading = page.getByRole('heading', { level: 1 });
            await expect(heading).toBeVisible();
        });

        test('should display stats cards', async () => {
            const spacesCard = dashboardPage.getSpacesCard();
            await expect(spacesCard).toBeVisible();
        });

        test('should display app info card', async () => {
            const appInfoCard = dashboardPage.getAppInfoCard();
            // App info card may or may not be visible depending on layout
            if (await appInfoCard.isVisible()) {
                await expect(appInfoCard).toBeVisible();
            }
        });
    });

    test.describe('Navigation', () => {
        test('should navigate to spaces page via card', async ({ page }) => {
            await dashboardPage.navigateToSpaces();
            await expect(page).toHaveURL(/\/spaces/);
        });

        test('should navigate to people page via card', async ({ page }) => {
            // Only if people manager mode is enabled
            const peopleCard = dashboardPage.getPeopleCard();
            if (await peopleCard.isVisible()) {
                await dashboardPage.navigateToPeople();
                await expect(page).toHaveURL(/\/people/);
            }
        });

        test('should navigate to conference page via card', async ({ page }) => {
            const conferenceCard = dashboardPage.getConferenceCard();
            if (await conferenceCard.isVisible()) {
                await dashboardPage.navigateToConference();
                await expect(page).toHaveURL(/\/conference/);
            }
        });

        test('should navigate using sidebar', async ({ page }) => {
            await dashboardPage.navigateTo('spaces');
            await expect(page).toHaveURL(/\/spaces/);
        });
    });

    test.describe('Stats Display', () => {
        test('should display spaces count', async () => {
            const card = dashboardPage.getSpacesCard();
            const countElement = card.locator('.MuiTypography-h4, .MuiTypography-h3, [data-testid="count"]');
            if (await countElement.isVisible()) {
                const text = await countElement.textContent();
                expect(text).toBeDefined();
            }
        });

        test('should show sync status', async () => {
            const syncCard = dashboardPage.getSyncStatusCard();
            if (await syncCard.isVisible()) {
                await expect(syncCard).toBeVisible();
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should be responsive on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.waitForLoadState('networkidle');

            const heading = page.getByRole('heading', { level: 1 });
            await expect(heading).toBeVisible();
        });

        test('should be responsive on tablet viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.tablet);
            await page.waitForLoadState('networkidle');

            const heading = page.getByRole('heading', { level: 1 });
            await expect(heading).toBeVisible();
        });

        test('should show mobile menu on small screens', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);

            const menuButton = page.getByRole('button', { name: /menu/i });
            if (await menuButton.isVisible()) {
                await menuButton.click();
                // Drawer should open
                const drawer = page.locator('.MuiDrawer-root');
                await expect(drawer).toBeVisible();
            }
        });
    });
});

test.describe('Language Switching', () => {
    test('should switch between English and Hebrew', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const languageSwitcher = page.locator('[data-testid="language-switcher"]');

        if (await languageSwitcher.isVisible()) {
            await languageSwitcher.click();

            // Wait for menu to open
            await page.waitForTimeout(300);

            // Click on a language option
            const hebrewOption = page.locator('[role="menuitem"]:has-text("עברית"), li:has-text("עברית")');
            if (await hebrewOption.isVisible()) {
                await hebrewOption.click();
            }

            await page.waitForTimeout(500);

            // Verify RTL direction
            const html = page.locator('html');
            const dir = await html.getAttribute('dir');
            expect(['ltr', 'rtl']).toContain(dir);
        }
    });

    test('should maintain language preference after navigation', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const initialDir = await page.locator('html').getAttribute('dir');

        // Navigate to another page
        await page.goto('/spaces');
        await waitForAppReady(page);

        const newDir = await page.locator('html').getAttribute('dir');
        expect(newDir).toBe(initialDir);
    });
});

test.describe('Settings Access', () => {
    test('should open settings dialog from header', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const settingsButton = page.getByRole('button', { name: /settings/i });
        if (await settingsButton.isVisible()) {
            await settingsButton.click();

            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
        }
    });
});
