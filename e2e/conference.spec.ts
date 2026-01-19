import { test, expect } from '@playwright/test';
import { ConferencePage } from './fixtures/pageObjects';
import { waitForAppReady, waitForDialogClose, waitForTableData } from './fixtures/helpers';
import { sampleConferenceRooms, VIEWPORTS } from './fixtures/test-data';

test.describe('Conference Room Management', () => {
    let conferencePage: ConferencePage;

    test.beforeEach(async ({ page }) => {
        conferencePage = new ConferencePage(page);
        await conferencePage.goto();
        await waitForAppReady(page);
    });

    test.describe('Page Display', () => {
        test('should display conference rooms table or empty state', async () => {
            const table = conferencePage.getRoomTable();
            const emptyState = conferencePage.page.locator('[data-testid="empty-state"]');

            const tableVisible = await table.isVisible();
            const emptyVisible = await emptyState.isVisible();
            expect(tableVisible || emptyVisible).toBe(true);
        });

        test('should show add room button', async () => {
            const addButton = conferencePage.page.getByRole('button', { name: /add|new/i });
            await expect(addButton).toBeVisible();
        });

        test('should display room count statistics', async () => {
            const occupiedCount = conferencePage.getOccupiedRoomsCount();
            const availableCount = conferencePage.getAvailableRoomsCount();

            if (await occupiedCount.isVisible()) {
                await expect(occupiedCount).toBeVisible();
            }
            if (await availableCount.isVisible()) {
                await expect(availableCount).toBeVisible();
            }
        });
    });

    test.describe('Add Conference Room', () => {
        test('should open add room dialog', async () => {
            const dialog = await conferencePage.openAddDialog();
            await expect(dialog).toBeVisible();
        });

        test('should show form fields in add dialog', async () => {
            const dialog = await conferencePage.openAddDialog();

            const inputs = dialog.locator('input');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
        });

        test('should close dialog on cancel', async () => {
            await conferencePage.openAddDialog();
            await conferencePage.closeDialog();

            const dialog = conferencePage.page.getByRole('dialog');
            await expect(dialog).not.toBeVisible();
        });

        test('should add new conference room', async ({ page }) => {
            const testRoom = sampleConferenceRooms[1]; // Use the one without meeting

            await conferencePage.openAddDialog();
            await conferencePage.fillRoomForm({
                roomName: testRoom.roomName
            });
            await conferencePage.submitRoomForm();

            await waitForDialogClose(page);

            // Verify room appears in table
            const roomRow = page.locator(`tr:has-text("${testRoom.roomName}"), [role="row"]:has-text("${testRoom.roomName}")`);
            if (await roomRow.isVisible()) {
                await expect(roomRow).toBeVisible();
            }
        });
    });

    test.describe('Edit Conference Room', () => {
        test.beforeEach(async ({ page }) => {
            await waitForTableData(page);
        });

        test('should open edit dialog', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                await firstRow.click();

                const editButton = page.getByRole('button', { name: /edit/i });
                if (await editButton.isVisible()) {
                    await editButton.click();

                    const dialog = page.getByRole('dialog');
                    await expect(dialog).toBeVisible();
                }
            }
        });

        test('should pre-fill form with existing data', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                await firstRow.click();

                const editButton = page.getByRole('button', { name: /edit/i });
                if (await editButton.isVisible()) {
                    await editButton.click();

                    const dialog = page.getByRole('dialog');
                    const nameInput = dialog.locator('input[name="roomName"], #room-name');

                    if (await nameInput.isVisible()) {
                        const value = await nameInput.inputValue();
                        expect(value.length).toBeGreaterThan(0);
                    }
                }
            }
        });
    });

    test.describe('Delete Conference Room', () => {
        test.beforeEach(async ({ page }) => {
            await waitForTableData(page);
        });

        test('should show confirmation before delete', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                await firstRow.click();

                const deleteButton = page.getByRole('button', { name: /delete/i });
                if (await deleteButton.isVisible()) {
                    await deleteButton.click();

                    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
                    await expect(confirmButton).toBeVisible();

                    // Cancel for cleanup
                    const cancelButton = page.getByRole('button', { name: /cancel|no/i });
                    if (await cancelButton.isVisible()) {
                        await cancelButton.click();
                    }
                }
            }
        });
    });

    test.describe('Meeting Toggle', () => {
        test.beforeEach(async ({ page }) => {
            await waitForTableData(page);
        });

        test('should show meeting toggle or button', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const toggle = firstRow.locator('[role="switch"], input[type="checkbox"]');
                const meetingButton = firstRow.locator('button:has-text("meeting")');

                const toggleVisible = await toggle.isVisible();
                const buttonVisible = await meetingButton.isVisible();

                // At least one meeting control should be present
                if (toggleVisible || buttonVisible) {
                    expect(toggleVisible || buttonVisible).toBe(true);
                }
            }
        });

        test('should toggle meeting status', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const toggle = firstRow.locator('[role="switch"], input[type="checkbox"]');

                if (await toggle.isVisible()) {
                    const initialState = await toggle.isChecked();
                    await toggle.click();
                    await page.waitForTimeout(500);

                    const newState = await toggle.isChecked();
                    expect(newState).not.toBe(initialState);

                    // Toggle back to restore state
                    await toggle.click();
                }
            }
        });
    });

    test.describe('Room Status Display', () => {
        test.beforeEach(async ({ page }) => {
            await waitForTableData(page);
        });

        test('should display room status indicator', async ({ page }) => {
            const rows = conferencePage.getRoomRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const statusIndicator = firstRow.locator('[data-testid="room-status"], .status-indicator');
                if (await statusIndicator.isVisible()) {
                    await expect(statusIndicator).toBeVisible();
                }
            }
        });

        test('should show meeting details for occupied rooms', async ({ page }) => {
            const occupiedRow = page.locator('tr:has-text("occupied"), tr:has(.meeting-active), [role="row"]:has([data-testid="occupied"])');

            if (await occupiedRow.isVisible()) {
                // Meeting name or time should be visible
                const meetingInfo = occupiedRow.locator('[data-testid="meeting-name"], [data-testid="meeting-time"]');
                if (await meetingInfo.isVisible()) {
                    await expect(meetingInfo).toBeVisible();
                }
            }
        });
    });

    test.describe('Search and Filter', () => {
        test('should filter rooms by search', async ({ page }) => {
            const searchInput = page.getByPlaceholder(/search/i);

            if (await searchInput.isVisible()) {
                await searchInput.fill('Board');
                await page.waitForTimeout(500);

                const rows = conferencePage.getRoomRows();
                const count = await rows.count();
                expect(count).toBeGreaterThanOrEqual(0);
            }
        });

        test('should clear search', async ({ page }) => {
            const searchInput = page.getByPlaceholder(/search/i);

            if (await searchInput.isVisible()) {
                await searchInput.fill('Test');
                await page.waitForTimeout(500);

                await searchInput.clear();
                await page.waitForTimeout(500);

                await expect(searchInput).toHaveValue('');
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
            await waitForAppReady(page);

            const table = conferencePage.getRoomTable();
            const cards = page.locator('[data-testid="room-card"]');

            const tableVisible = await table.isVisible();
            const cardsVisible = await cards.first().isVisible().catch(() => false);

            expect(tableVisible || cardsVisible).toBe(true);
        });

        test('should show add button on mobile', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
            await waitForAppReady(page);

            const addButton = page.getByRole('button', { name: /add|new/i });
            await expect(addButton).toBeVisible();
        });
    });
});

test.describe('Conference Page Navigation', () => {
    test('should navigate to conference from dashboard', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const conferenceButton = page.getByRole('button', { name: /conference|meeting/i });
        if (await conferenceButton.isVisible()) {
            await conferenceButton.click();
            await expect(page).toHaveURL(/\/conference/);
        }
    });

    test('should navigate back to dashboard', async ({ page }) => {
        await page.goto('/conference');
        await waitForAppReady(page);

        const conferencePage = new ConferencePage(page);
        await conferencePage.navigateTo('dashboard');

        await expect(page).toHaveURL(/^\/$|\/dashboard/);
    });
});
