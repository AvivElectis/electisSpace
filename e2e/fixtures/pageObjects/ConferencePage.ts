import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Conference Page Object - Conference room management methods
 */
export class ConferencePage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to conference page
     */
    async goto() {
        await super.goto('/conference');
    }

    /**
     * Get the conference rooms table
     */
    getRoomTable(): Locator {
        return this.page.locator('table, [role="table"]');
    }

    /**
     * Get all room rows
     */
    getRoomRows(): Locator {
        return this.page.locator('[data-testid="room-row"], table tbody tr, [role="row"]');
    }

    /**
     * Get the number of rooms displayed
     */
    async getRoomCount(): Promise<number> {
        const rows = this.getRoomRows();
        return rows.count();
    }

    /**
     * Open the add room dialog
     */
    async openAddDialog(): Promise<Locator> {
        const addButton = this.page.getByRole('button', { name: /add|new/i });
        await addButton.click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Fill room form fields
     */
    async fillRoomForm(data: {
        id?: string;
        roomName?: string;
        meetingName?: string;
        startTime?: string;
        endTime?: string;
        participants?: string;
    }) {
        const dialog = this.page.getByRole('dialog');

        if (data.id) {
            const idInput = dialog.locator('input[name="id"], #room-id');
            if (await idInput.isVisible()) {
                await idInput.fill(data.id);
            }
        }

        if (data.roomName) {
            const nameInput = dialog.locator('input[name="roomName"], #room-name');
            if (await nameInput.isVisible()) {
                await nameInput.fill(data.roomName);
            }
        }

        if (data.meetingName) {
            const meetingInput = dialog.locator('input[name="meetingName"], #meeting-name');
            if (await meetingInput.isVisible()) {
                await meetingInput.fill(data.meetingName);
            }
        }

        if (data.startTime) {
            const startInput = dialog.locator('input[name="startTime"], #start-time');
            if (await startInput.isVisible()) {
                await startInput.fill(data.startTime);
            }
        }

        if (data.endTime) {
            const endInput = dialog.locator('input[name="endTime"], #end-time');
            if (await endInput.isVisible()) {
                await endInput.fill(data.endTime);
            }
        }

        if (data.participants) {
            const participantsInput = dialog.locator('input[name="participants"], #participants, textarea[name="participants"]');
            if (await participantsInput.isVisible()) {
                await participantsInput.fill(data.participants);
            }
        }
    }

    /**
     * Submit the room form
     */
    async submitRoomForm() {
        const saveButton = this.page.getByRole('button', { name: /save|submit|add/i });
        await saveButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Edit a room by ID
     */
    async editRoom(roomId: string): Promise<Locator> {
        const row = this.page.locator(`tr:has-text("${roomId}"), [role="row"]:has-text("${roomId}")`);

        const editButton = row.locator('button[aria-label*="edit"], button:has([data-testid*="edit"])');
        if (await editButton.isVisible()) {
            await editButton.click();
        } else {
            await row.click();
            const toolbarEdit = this.page.getByRole('button', { name: /edit/i });
            await toolbarEdit.click();
        }

        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({ state: 'visible' });
        return dialog;
    }

    /**
     * Delete a room by ID
     */
    async deleteRoom(roomId: string) {
        const row = this.page.locator(`tr:has-text("${roomId}"), [role="row"]:has-text("${roomId}")`);

        const deleteButton = row.locator('button[aria-label*="delete"], button:has([data-testid*="delete"])');
        if (await deleteButton.isVisible()) {
            await deleteButton.click();
        } else {
            await row.click();
            const toolbarDelete = this.page.getByRole('button', { name: /delete/i });
            await toolbarDelete.click();
        }
    }

    /**
     * Confirm deletion
     */
    async confirmDelete() {
        const confirmButton = this.page.getByRole('button', { name: /confirm|delete|yes/i });
        await confirmButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * Toggle meeting status for a room
     */
    async toggleMeeting(roomId: string) {
        const row = this.page.locator(`tr:has-text("${roomId}"), [role="row"]:has-text("${roomId}")`);

        // Look for toggle switch or meeting button
        const toggleSwitch = row.locator('input[type="checkbox"][role="switch"], [role="switch"]');
        if (await toggleSwitch.isVisible()) {
            await toggleSwitch.click();
        } else {
            const meetingButton = row.locator('button[aria-label*="meeting"], button:has-text("meeting")');
            if (await meetingButton.isVisible()) {
                await meetingButton.click();
            }
        }

        await this.page.waitForTimeout(300);
    }

    /**
     * Get room row by ID
     */
    getRoomRow(roomId: string): Locator {
        return this.page.locator(`tr:has-text("${roomId}"), [role="row"]:has-text("${roomId}")`);
    }

    /**
     * Check if room is occupied (has meeting)
     */
    async isRoomOccupied(roomId: string): Promise<boolean> {
        const row = this.getRoomRow(roomId);
        const occupiedIndicator = row.locator('[data-testid="occupied"], .meeting-active, :has-text("occupied")');
        return occupiedIndicator.isVisible();
    }

    /**
     * Get room meeting status
     */
    async getRoomMeetingStatus(roomId: string): Promise<string | null> {
        const row = this.getRoomRow(roomId);
        const statusCell = row.locator('[data-testid="meeting-status"]');
        return statusCell.textContent();
    }

    /**
     * Search for rooms
     */
    async searchRooms(searchTerm: string) {
        const searchInput = this.page.getByPlaceholder(/search/i);
        await searchInput.fill(searchTerm);
        await this.page.waitForTimeout(500);
    }

    /**
     * Get occupied rooms count
     */
    getOccupiedRoomsCount(): Locator {
        return this.page.locator('[data-testid="occupied-count"]');
    }

    /**
     * Get available rooms count
     */
    getAvailableRoomsCount(): Locator {
        return this.page.locator('[data-testid="available-count"]');
    }
}
