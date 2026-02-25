import { Page, Locator } from '@playwright/test';
import { setupAuthBypass } from '../helpers';

/**
 * Base Page Object - Common methods for all pages
 */
export class BasePage {
    readonly page: Page;
    private _authBypassInstalled = false;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to a specific path
     */
    async goto(path: string = '/') {
        if (!this._authBypassInstalled) {
            await setupAuthBypass(this.page);
            this._authBypassInstalled = true;
        }
        // App uses HashRouter — paths must include the hash prefix
        const hashPath = path.startsWith('/#') ? path : `/#${path}`;
        await this.page.goto(hashPath);
        await this.waitForReady();
    }

    /**
     * Wait for the page to be fully loaded
     */
    async waitForReady() {
        await this.page.waitForLoadState('domcontentloaded');
        // Wait for either desktop tablist OR mobile menu button (both render after isAppReady=true)
        await Promise.race([
            this.page.locator('[role="tablist"]').waitFor({ state: 'visible', timeout: 30000 }),
            this.page.locator('[aria-label="menu"]').waitFor({ state: 'visible', timeout: 30000 }),
        ]).catch(() => {});
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
     * Navigate using header tabs or sidebar
     */
    async navigateTo(pageName: 'dashboard' | 'spaces' | 'people' | 'conference' | 'sync') {
        // Map page names to possible tab labels (translations may differ)
        const labelMap: Record<string, RegExp> = {
            dashboard: /dashboard/i,
            spaces: /spaces|offices/i,
            people: /people/i,
            conference: /conference/i,
            sync: /sync/i,
        };
        const pattern = labelMap[pageName] || new RegExp(pageName, 'i');

        // Try header tab navigation first (the primary nav on desktop)
        const tab = this.page.getByRole('tab', { name: pattern });
        if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tab.click();
            await this.waitForReady();
            return;
        }

        // Fall back to sidebar link/button
        const navItem = this.page.getByRole('link', { name: pattern });
        if (await navItem.isVisible({ timeout: 2000 }).catch(() => false)) {
            await navItem.click();
        } else {
            const navButton = this.page.getByRole('button', { name: pattern });
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
