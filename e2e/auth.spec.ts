/**
 * E2E Tests - Authentication Flow
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display login page with email field', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
        await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show password field after email entry', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
        await emailInput.first().fill('test@electis.co.il');
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.first().isVisible()) await submitBtn.first().click();
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput.first()).toBeVisible({ timeout: 5000 });
    });

    test('should stay on login page with invalid credentials', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
        await emailInput.first().fill('invalid@test.com');
        const passwordInput = page.locator('input[type="password"]');
        if (await passwordInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await passwordInput.first().fill('wrongpassword');
        }
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.first().isVisible()) await submitBtn.first().click();
        const isStillLogin = await emailInput.first().isVisible({ timeout: 5000 }).catch(() => true);
        expect(isStillLogin).toBe(true);
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]');
        await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Protected Routes', () => {
    test('should redirect unauthenticated user to login', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForTimeout(2000);
        const hasLogin = await page.locator('input[type="email"], input[name="email"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasLogin || page.url().includes('login') || page.url() === '/').toBeTruthy();
    });
});
