import { Page, Locator } from '@playwright/test';

/**
 * Settings Dialog Page Object - Settings dialog methods
 */
export class SettingsDialog {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Open the settings dialog
     */
    async open(): Promise<Locator> {
        const settingsButton = this.page.getByRole('button', { name: /settings/i });
        await settingsButton.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Close the settings dialog
     */
    async close() {
        const closeButton = this.page.getByRole('button', { name: /close|cancel/i });
        if (await closeButton.isVisible()) {
            await closeButton.click();
            await this.page.waitForTimeout(300);
        }
    }

    /**
     * Get the dialog element
     */
    getDialog(): Locator {
        return this.page.getByRole('dialog');
    }

    /**
     * Select a tab by name or index
     */
    async selectTab(tabName: string) {
        const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`);
        await tab.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Get all tabs
     */
    getTabs(): Locator {
        return this.page.locator('[role="tab"]');
    }

    /**
     * Get the selected tab
     */
    getSelectedTab(): Locator {
        return this.page.locator('[role="tab"][aria-selected="true"]');
    }

    /**
     * Set app name
     */
    async setAppName(name: string) {
        const appNameInput = this.page.locator('input[name="appName"], #app-name');
        await appNameInput.clear();
        await appNameInput.fill(name);
    }

    /**
     * Get current app name
     */
    async getAppName(): Promise<string> {
        const appNameInput = this.page.locator('input[name="appName"], #app-name');
        return appNameInput.inputValue();
    }

    /**
     * Set app subtitle
     */
    async setAppSubtitle(subtitle: string) {
        const subtitleInput = this.page.locator('input[name="appSubtitle"], #app-subtitle');
        await subtitleInput.clear();
        await subtitleInput.fill(subtitle);
    }

    /**
     * Set working mode
     */
    async setWorkingMode(mode: 'sftp' | 'solumapi') {
        const modeSelect = this.page.locator('[data-testid="working-mode-select"], #working-mode');
        await modeSelect.click();

        const modeOption = this.page.locator(`[role="option"]:has-text("${mode}"), li:has-text("${mode}")`);
        await modeOption.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Set space type
     */
    async setSpaceType(type: 'room' | 'office' | 'chair' | 'person-tag') {
        const typeSelect = this.page.locator('[data-testid="space-type-select"], #space-type');
        await typeSelect.click();

        const typeOption = this.page.locator(`[role="option"]:has-text("${type}"), li:has-text("${type}")`);
        await typeOption.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Enable/disable People Manager mode
     */
    async setPeopleManagerMode(enabled: boolean) {
        const toggle = this.page.locator('[data-testid="people-manager-toggle"], #people-manager-mode');
        const isChecked = await toggle.isChecked();

        if (isChecked !== enabled) {
            await toggle.click();
        }
    }

    /**
     * Fill SoluM API credentials
     */
    async fillSolumCredentials(credentials: {
        baseUrl?: string;
        companyCode?: string;
        storeNumber?: string;
        username?: string;
        password?: string;
    }) {
        if (credentials.baseUrl) {
            const baseUrlInput = this.page.locator('input[name="baseUrl"], #base-url');
            await baseUrlInput.fill(credentials.baseUrl);
        }

        if (credentials.companyCode) {
            const companyCodeInput = this.page.locator('input[name="companyCode"], #company-code');
            await companyCodeInput.fill(credentials.companyCode);
        }

        if (credentials.storeNumber) {
            const storeInput = this.page.locator('input[name="storeNumber"], #store-number');
            await storeInput.fill(credentials.storeNumber);
        }

        if (credentials.username) {
            const usernameInput = this.page.locator('input[name="username"], #username');
            await usernameInput.fill(credentials.username);
        }

        if (credentials.password) {
            const passwordInput = this.page.locator('input[name="password"], #password, input[type="password"]');
            await passwordInput.fill(credentials.password);
        }
    }

    /**
     * Test SoluM connection
     */
    async testConnection() {
        const testButton = this.page.getByRole('button', { name: /test|connect/i });
        await testButton.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Get connection status
     */
    async getConnectionStatus(): Promise<string | null> {
        const statusIndicator = this.page.locator('[data-testid="connection-status"]');
        return statusIndicator.textContent();
    }

    /**
     * Save settings
     */
    async save() {
        const saveButton = this.page.getByRole('button', { name: /save/i });
        await saveButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Set password protection
     */
    async setPassword(password: string) {
        const passwordInput = this.page.locator('input[name="appPassword"], #app-password');
        await passwordInput.fill(password);

        const confirmInput = this.page.locator('input[name="confirmPassword"], #confirm-password');
        if (await confirmInput.isVisible()) {
            await confirmInput.fill(password);
        }
    }

    /**
     * Unlock app with password
     */
    async unlock(password: string) {
        const passwordInput = this.page.locator('input[name="password"], #unlock-password');
        await passwordInput.fill(password);

        const unlockButton = this.page.getByRole('button', { name: /unlock|submit/i });
        await unlockButton.click();
    }

    /**
     * Enable/disable auto-sync
     */
    async setAutoSync(enabled: boolean, intervalSeconds?: number) {
        const toggle = this.page.locator('[data-testid="auto-sync-toggle"], #auto-sync');
        const isChecked = await toggle.isChecked();

        if (isChecked !== enabled) {
            await toggle.click();
        }

        if (enabled && intervalSeconds) {
            const intervalInput = this.page.locator('input[name="syncInterval"], #sync-interval');
            await intervalInput.fill(intervalSeconds.toString());
        }
    }

    /**
     * Upload logo
     */
    async uploadLogo(logoPath: string, index: 1 | 2 = 1) {
        const uploadButton = this.page.locator(`[data-testid="logo-upload-${index}"]`);
        await uploadButton.click();

        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.setInputFiles(logoPath);
    }
}
