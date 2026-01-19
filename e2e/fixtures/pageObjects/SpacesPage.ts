import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Spaces Page Object - Spaces management methods
 */
export class SpacesPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to spaces page
     */
    async goto() {
        await super.goto('/spaces');
    }

    /**
     * Get the spaces table
     */
    getSpaceTable(): Locator {
        return this.page.locator('table, [role="table"]');
    }

    /**
     * Get all space rows
     */
    getSpaceRows(): Locator {
        return this.page.locator('table tbody tr, [role="row"]');
    }

    /**
     * Get the number of spaces displayed
     */
    async getSpaceCount(): Promise<number> {
        const rows = this.getSpaceRows();
        return rows.count();
    }

    /**
     * Open the add space dialog
     */
    async openAddDialog(): Promise<Locator> {
        const addButton = this.page.getByRole('button', { name: /add|new/i });
        await addButton.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Fill space form fields
     */
    async fillSpaceForm(data: { id?: string; name?: string;[key: string]: string | undefined }) {
        const dialog = this.page.getByRole('dialog');

        if (data.id) {
            const idInput = dialog.locator('input[name="id"], #space-id');
            if (await idInput.isVisible()) {
                await idInput.fill(data.id);
            }
        }

        if (data.name) {
            const nameInput = dialog.locator('input[name="name"], #space-name');
            if (await nameInput.isVisible()) {
                await nameInput.fill(data.name);
            }
        }

        // Handle additional dynamic fields
        for (const [key, value] of Object.entries(data)) {
            if (key !== 'id' && key !== 'name' && value) {
                const input = dialog.locator(`input[name="${key}"], #${key}`);
                if (await input.isVisible()) {
                    await input.fill(value);
                }
            }
        }
    }

    /**
     * Submit the space form
     */
    async submitSpaceForm() {
        const saveButton = this.page.getByRole('button', { name: /save|submit|add/i });
        await saveButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Search for spaces
     */
    async searchSpaces(searchTerm: string) {
        const searchInput = this.page.getByPlaceholder(/search/i);
        await searchInput.fill(searchTerm);
        await this.page.waitForTimeout(500); // Wait for debounce
    }

    /**
     * Clear search
     */
    async clearSearch() {
        const searchInput = this.page.getByPlaceholder(/search/i);
        await searchInput.clear();
        await this.page.waitForTimeout(500);
    }

    /**
     * Edit a space by clicking its row and edit button
     */
    async editSpace(spaceId: string) {
        const row = this.page.locator(`tr:has-text("${spaceId}"), [role="row"]:has-text("${spaceId}")`);
        await row.click();

        const editButton = this.page.getByRole('button', { name: /edit/i });
        if (await editButton.isVisible()) {
            await editButton.click();
        }

        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Delete a space by ID
     */
    async deleteSpace(spaceId: string) {
        const row = this.page.locator(`tr:has-text("${spaceId}"), [role="row"]:has-text("${spaceId}")`);

        // Try row action button first
        const deleteButton = row.locator('button[aria-label*="delete"], button:has([data-testid*="delete"])');
        if (await deleteButton.isVisible()) {
            await deleteButton.click();
        } else {
            // Click row to select, then use toolbar delete
            await row.click();
            const toolbarDelete = this.page.getByRole('button', { name: /delete/i });
            await toolbarDelete.click();
        }
    }

    /**
     * Confirm deletion in dialog
     */
    async confirmDelete() {
        const confirmButton = this.page.getByRole('button', { name: /confirm|delete|yes/i });
        await confirmButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Cancel deletion
     */
    async cancelDelete() {
        const cancelButton = this.page.getByRole('button', { name: /cancel|no/i });
        await cancelButton.click();
    }

    /**
     * Open filter drawer
     */
    async openFilterDrawer() {
        const filterButton = this.page.getByRole('button', { name: /filter/i });
        await filterButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Get space by ID locator
     */
    getSpaceRow(spaceId: string): Locator {
        return this.page.locator(`tr:has-text("${spaceId}"), [role="row"]:has-text("${spaceId}")`);
    }
}
