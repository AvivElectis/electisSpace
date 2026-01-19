import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * People Page Object - People management methods
 */
export class PeoplePage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to people page
     */
    async goto() {
        await super.goto('/people');
    }

    /**
     * Get the people table
     */
    getPeopleTable(): Locator {
        return this.page.locator('table, [role="table"]');
    }

    /**
     * Get all person rows
     */
    getPersonRows(): Locator {
        return this.page.locator('[data-testid="person-row"], table tbody tr, [role="row"]');
    }

    /**
     * Get the number of people displayed
     */
    async getPersonCount(): Promise<number> {
        const rows = this.getPersonRows();
        // Filter out header row if present
        const count = await rows.count();
        return count > 0 ? count : 0;
    }

    /**
     * Upload a CSV file
     */
    async uploadCSV(filePath: string) {
        // Click upload button to open dialog/file picker
        const uploadButton = this.page.getByRole('button', { name: /upload|import|csv/i });
        await uploadButton.click();

        // Set file input
        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Confirm upload if there's a confirm button
        const confirmButton = this.page.getByRole('button', { name: /upload|confirm|import/i });
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        await this.page.waitForTimeout(500);
    }

    /**
     * Select a person by ID (checkbox selection)
     */
    async selectPerson(personId: string) {
        const row = this.page.locator(`[data-testid="person-row"]:has-text("${personId}"), tr:has-text("${personId}")`);
        const checkbox = row.locator('input[type="checkbox"]');

        if (await checkbox.isVisible()) {
            await checkbox.check();
        } else {
            // Click row to select
            await row.click();
        }
    }

    /**
     * Deselect a person by ID
     */
    async deselectPerson(personId: string) {
        const row = this.page.locator(`[data-testid="person-row"]:has-text("${personId}"), tr:has-text("${personId}")`);
        const checkbox = row.locator('input[type="checkbox"]');

        if (await checkbox.isVisible()) {
            await checkbox.uncheck();
        }
    }

    /**
     * Select all people
     */
    async selectAll() {
        const selectAllCheckbox = this.page.locator('thead input[type="checkbox"], [data-testid="select-all"]');
        if (await selectAllCheckbox.isVisible()) {
            await selectAllCheckbox.check();
        }
    }

    /**
     * Assign selected person to a space
     */
    async assignToSpace(spaceId: string) {
        // Open assignment dropdown/dialog
        const assignButton = this.page.getByRole('button', { name: /assign|space/i });
        await assignButton.click();

        // Select space from dropdown
        const spaceOption = this.page.locator(`[role="option"]:has-text("${spaceId}"), li:has-text("${spaceId}")`);
        await spaceOption.click();

        await this.page.waitForTimeout(300);
    }

    /**
     * Unassign person from space
     */
    async unassign(personId: string) {
        const row = this.page.locator(`[data-testid="person-row"]:has-text("${personId}"), tr:has-text("${personId}")`);
        const unassignButton = row.locator('button[aria-label*="unassign"], button:has-text("unassign")');

        if (await unassignButton.isVisible()) {
            await unassignButton.click();
        }
    }

    /**
     * Bulk assign selected people
     */
    async bulkAssign(spaceId: string) {
        const bulkAssignButton = this.page.getByRole('button', { name: /bulk assign|assign selected/i });
        await bulkAssignButton.click();

        const spaceOption = this.page.locator(`[role="option"]:has-text("${spaceId}"), li:has-text("${spaceId}")`);
        await spaceOption.click();

        await this.page.waitForTimeout(300);
    }

    /**
     * Create a new list
     */
    async createList(name: string) {
        const createListButton = this.page.getByRole('button', { name: /create list|new list/i });
        await createListButton.click();

        const nameInput = this.page.locator('input[name="listName"], #list-name');
        await nameInput.fill(name);

        const saveButton = this.page.getByRole('button', { name: /save|create|confirm/i });
        await saveButton.click();

        await this.page.waitForTimeout(300);
    }

    /**
     * Save current assignments to a list
     */
    async saveToList(listName: string) {
        const saveButton = this.page.getByRole('button', { name: /save.*list|save to list/i });
        await saveButton.click();

        // If list selector appears
        const listOption = this.page.locator(`[role="option"]:has-text("${listName}"), li:has-text("${listName}")`);
        if (await listOption.isVisible()) {
            await listOption.click();
        }

        const confirmButton = this.page.getByRole('button', { name: /save|confirm/i });
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        await this.page.waitForTimeout(300);
    }

    /**
     * Load a list by name
     */
    async loadList(listName: string) {
        const loadButton = this.page.getByRole('button', { name: /load.*list|load list/i });
        await loadButton.click();

        const listOption = this.page.locator(`[role="option"]:has-text("${listName}"), li:has-text("${listName}")`);
        await listOption.click();

        await this.page.waitForTimeout(500);
    }

    /**
     * Delete a list by name
     */
    async deleteList(listName: string) {
        // Find list in list panel
        const listItem = this.page.locator(`[data-testid="list-item"]:has-text("${listName}")`);
        const deleteButton = listItem.locator('button[aria-label*="delete"]');

        if (await deleteButton.isVisible()) {
            await deleteButton.click();
        }

        // Confirm deletion
        const confirmButton = this.page.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }
    }

    /**
     * Get list of saved lists
     */
    getSavedLists(): Locator {
        return this.page.locator('[data-testid="list-item"], [data-testid="saved-list"]');
    }

    /**
     * Get space allocation display
     */
    getSpaceAllocation(): Locator {
        return this.page.locator('[data-testid="space-allocation"]');
    }

    /**
     * Search for people
     */
    async searchPeople(searchTerm: string) {
        const searchInput = this.page.getByPlaceholder(/search/i);
        await searchInput.fill(searchTerm);
        await this.page.waitForTimeout(500);
    }

    /**
     * Filter by assignment status
     */
    async filterByAssignment(status: 'all' | 'assigned' | 'unassigned') {
        const filterButton = this.page.getByRole('button', { name: /filter/i });
        await filterButton.click();

        const statusOption = this.page.locator(`[role="option"]:has-text("${status}"), li:has-text("${status}")`);
        await statusOption.click();
    }

    /**
     * Get assigned count
     */
    async getAssignedCount(): Promise<number> {
        const assignedText = await this.page.locator('[data-testid="assigned-count"]').textContent();
        return parseInt(assignedText ?? '0', 10);
    }

    /**
     * Get unassigned count
     */
    async getUnassignedCount(): Promise<number> {
        const unassignedText = await this.page.locator('[data-testid="unassigned-count"]').textContent();
        return parseInt(unassignedText ?? '0', 10);
    }
}
