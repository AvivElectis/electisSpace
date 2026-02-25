/**
 * E2E Tests - Authentication Flow
 *
 * These tests run WITHOUT saved auth state to test the login page itself.
 */
import { test, expect } from '@playwright/test';

/** Wait for the login form to be ready (SPA needs time to initialize and determine auth state) */
async function waitForLoginForm(page: import('@playwright/test').Page) {
    await page.waitForLoadState('domcontentloaded');
    // The SPA initializes, checks auth state, then renders login form
    // Give extra time for session restore + redirect flow
    await page.getByRole('textbox', { name: /email/i }).waitFor({ state: 'visible', timeout: 45000 });
}

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForLoginForm(page);
    });

    test('should display login page with email field', async ({ page }) => {
        const emailInput = page.getByRole('textbox', { name: /email/i });
        await expect(emailInput).toBeVisible();
    });

    test('should display password field alongside email field', async ({ page }) => {
        const emailInput = page.getByRole('textbox', { name: /email/i });
        const passwordInput = page.getByRole('textbox', { name: /password/i });

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
    });

    test('should stay on login page with invalid credentials', async ({ page }) => {
        const emailInput = page.getByRole('textbox', { name: /email/i });
        await emailInput.fill('invalid@test.com');

        const passwordInput = page.getByRole('textbox', { name: /password/i });
        if (await passwordInput.isVisible()) {
            await passwordInput.fill('wrongpassword');
        }

        const submitBtn = page.getByRole('button', { name: /sign in/i });
        if (await submitBtn.isVisible()) await submitBtn.click();

        // Should remain on login page (email field still visible)
        await expect(emailInput).toBeVisible({ timeout: 5000 });
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await waitForLoginForm(page);

        const emailInput = page.getByRole('textbox', { name: /email/i });
        await expect(emailInput).toBeVisible();
    });
});

test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user to login', async ({ page }) => {
        // Navigate to a protected route (/#/dashboard doesn't exist → 404)
        await page.goto('/#/spaces');
        await page.waitForLoadState('domcontentloaded');

        // App needs time: session restore → determine not authenticated → redirect to login
        await waitForLoginForm(page);

        const emailInput = page.getByRole('textbox', { name: /email/i });
        await expect(emailInput).toBeVisible();
    });
});
