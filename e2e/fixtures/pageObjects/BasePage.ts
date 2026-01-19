import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object - Common methods for all pages
 */
export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to a specific path
     */
    async goto(path: string = '/') {
        await this.page.goto(path);
        await this.waitForReady();
    }

    /**
     * Wait for the page to be fully loaded
     */
    async waitForReady() {
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Get the page title/heading
     */
    async getTitle(): Promise<string | null> {
        const heading = this.page.getByRole('heading', { level: 1 });
        return heading.textContent();
    }

    /**
     * Open settings dialog
     */
    async openSettings(): Promise<Locator> {
        const settingsButton = this.page.getByRole('button', { name: /settings/i });
        await settingsButton.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Close any open dialog
     */
    async closeDialog() {
        const closeButton = this.page.getByRole('button', { name: /close|cancel/i });
        if (await closeButton.isVisible()) {
            await closeButton.click();
        }
    }

    /**
     * Switch language using the language switcher
     */
    async switchLanguage() {
        const languageSwitcher = this.page.locator('[data-testid="language-switcher"]');
        if (await languageSwitcher.isVisible()) {
            await languageSwitcher.click();
            await this.page.waitForTimeout(300);
        }
    }

    /**
     * Get the current document direction (ltr/rtl)
     */
    async getDirection(): Promise<string | null> {
        const html = this.page.locator('html');
        return html.getAttribute('dir');
    }

    /**
     * Navigate using sidebar
     */
    async navigateTo(pageName: 'dashboard' | 'spaces' | 'people' | 'conference' | 'sync') {
        const navItem = this.page.getByRole('link', { name: new RegExp(pageName, 'i') });
        if (await navItem.isVisible()) {
            await navItem.click();
        } else {
            // Try button variant for navigation
            const navButton = this.page.getByRole('button', { name: new RegExp(pageName, 'i') });
            await navButton.click();
        }
        await this.waitForReady();
    }

    /**
     * Open mobile navigation drawer
     */
    async openMobileNav() {
        const menuButton = this.page.getByRole('button', { name: /menu/i });
        if (await menuButton.isVisible()) {
            await menuButton.click();
            await this.page.waitForTimeout(300);
        }
    }

    /**
     * Set viewport for mobile testing
     */
    async setMobileViewport() {
        await this.page.setViewportSize({ width: 375, height: 667 });
    }

    /**
     * Set viewport for desktop testing
     */
    async setDesktopViewport() {
        await this.page.setViewportSize({ width: 1280, height: 720 });
    }

    /**
     * Take a screenshot for debugging
     */
    async screenshot(name: string) {
        await this.page.screenshot({ path: `e2e/screenshots/${name}.png` });
    }
}
