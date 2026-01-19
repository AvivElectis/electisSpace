import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object - Dashboard-specific methods
 */
export class DashboardPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to dashboard
     */
    async goto() {
        await super.goto('/');
    }

    /**
     * Get the spaces stats card
     */
    getSpacesCard(): Locator {
        return this.page.locator('[data-testid="spaces-card"], [data-testid="stats-card"]').first();
    }

    /**
     * Get the people stats card
     */
    getPeopleCard(): Locator {
        return this.page.locator('[data-testid="people-card"]');
    }

    /**
     * Get the conference stats card
     */
    getConferenceCard(): Locator {
        return this.page.locator('[data-testid="conference-card"]');
    }

    /**
     * Get the sync status card
     */
    getSyncStatusCard(): Locator {
        return this.page.locator('[data-testid="sync-status-card"]');
    }

    /**
     * Get the app info card
     */
    getAppInfoCard(): Locator {
        return this.page.locator('[data-testid="app-info-card"]');
    }

    /**
     * Navigate to spaces via card button
     */
    async navigateToSpaces() {
        const toSpacesButton = this.page.getByRole('button', { name: /spaces|rooms|chairs|to spaces/i });
        await toSpacesButton.click();
        await this.waitForReady();
    }

    /**
     * Navigate to people via card button
     */
    async navigateToPeople() {
        const toPeopleButton = this.page.getByRole('button', { name: /people|to people/i });
        await toPeopleButton.click();
        await this.waitForReady();
    }

    /**
     * Navigate to conference via card button
     */
    async navigateToConference() {
        const toConferenceButton = this.page.getByRole('button', { name: /conference|meeting|to conference/i });
        await toConferenceButton.click();
        await this.waitForReady();
    }

    /**
     * Navigate to sync page
     */
    async navigateToSync() {
        const toSyncButton = this.page.getByRole('button', { name: /sync/i });
        await toSyncButton.click();
        await this.waitForReady();
    }

    /**
     * Get all stats cards
     */
    getAllStatsCards(): Locator {
        return this.page.locator('[data-testid="stats-card"]');
    }

    /**
     * Get the space count displayed
     */
    async getSpacesCount(): Promise<number> {
        const card = this.getSpacesCard();
        const countText = await card.locator('[data-testid="count"], .MuiTypography-h4, .MuiTypography-h3').textContent();
        return parseInt(countText ?? '0', 10);
    }

    /**
     * Get the people count displayed
     */
    async getPeopleCount(): Promise<number> {
        const card = this.getPeopleCard();
        const countText = await card.locator('[data-testid="count"], .MuiTypography-h4, .MuiTypography-h3').textContent();
        return parseInt(countText ?? '0', 10);
    }

    /**
     * Get the conference room count displayed
     */
    async getConferenceCount(): Promise<number> {
        const card = this.getConferenceCard();
        const countText = await card.locator('[data-testid="count"], .MuiTypography-h4, .MuiTypography-h3').textContent();
        return parseInt(countText ?? '0', 10);
    }

    /**
     * Check if working mode is displayed
     */
    async getWorkingMode(): Promise<string | null> {
        const appInfoCard = this.getAppInfoCard();
        const modeText = await appInfoCard.locator('[data-testid="working-mode"]').textContent();
        return modeText;
    }
}
