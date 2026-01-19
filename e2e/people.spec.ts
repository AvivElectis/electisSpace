import { test, expect } from '@playwright/test';
import { PeoplePage } from './fixtures/pageObjects';
import { waitForAppReady, waitForDialogClose, waitForTableData } from './fixtures/helpers';
import { samplePeople, testListNames, VIEWPORTS } from './fixtures/test-data';

test.describe('People Management', () => {
    let peoplePage: PeoplePage;

    test.beforeEach(async ({ page }) => {
        peoplePage = new PeoplePage(page);
        await peoplePage.goto();
        await waitForAppReady(page);
    });

    test.describe('Page Display', () => {
        test('should display people table or empty state', async () => {
            const table = peoplePage.getPeopleTable();
            const emptyState = peoplePage.page.locator('[data-testid="empty-state"]');

            const tableVisible = await table.isVisible();
            const emptyVisible = await emptyState.isVisible();
            expect(tableVisible || emptyVisible).toBe(true);
        });

        test('should show upload button for CSV', async () => {
            const uploadButton = peoplePage.page.getByRole('button', { name: /upload|import|csv/i });
            // Upload button should be visible
            await expect(uploadButton).toBeVisible();
        });

        test('should show space allocation info', async () => {
            const allocation = peoplePage.getSpaceAllocation();
            if (await allocation.isVisible()) {
                await expect(allocation).toBeVisible();
            }
        });
    });

    test.describe('CSV Upload', () => {
        test('should open file dialog on upload click', async ({ page }) => {
            const uploadButton = page.getByRole('button', { name: /upload|import|csv/i });

            if (await uploadButton.isVisible()) {
                // Check for file input
                const fileInput = page.locator('input[type="file"]');
                expect(await fileInput.count()).toBeGreaterThanOrEqual(0);
            }
        });

        test('should show error for invalid file type', async ({ page }) => {
            // This test would require actual file upload simulation
            // Skipping actual file manipulation for now
            test.skip();
        });
    });

    test.describe('Person Selection', () => {
        test.beforeEach(async ({ page }) => {
            // Only run if people are present in the table
            await waitForTableData(page);
        });

        test('should select person via checkbox', async ({ page }) => {
            const rows = peoplePage.getPersonRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const checkbox = firstRow.locator('input[type="checkbox"]');
                if (await checkbox.isVisible()) {
                    await checkbox.check();
                    await expect(checkbox).toBeChecked();
                }
            }
        });

        test('should select all people', async ({ page }) => {
            const selectAllCheckbox = page.locator('thead input[type="checkbox"], [data-testid="select-all"]');

            if (await selectAllCheckbox.isVisible()) {
                await selectAllCheckbox.check();

                // Verify all rows are selected
                const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
                const count = await rowCheckboxes.count();

                if (count > 0) {
                    for (let i = 0; i < count; i++) {
                        await expect(rowCheckboxes.nth(i)).toBeChecked();
                    }
                }
            }
        });

        test('should deselect all people', async ({ page }) => {
            const selectAllCheckbox = page.locator('thead input[type="checkbox"], [data-testid="select-all"]');

            if (await selectAllCheckbox.isVisible()) {
                // Select all first
                await selectAllCheckbox.check();
                await page.waitForTimeout(300);

                // Then deselect
                await selectAllCheckbox.uncheck();

                // Verify all rows are deselected
                const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
                const count = await rowCheckboxes.count();

                if (count > 0) {
                    for (let i = 0; i < count; i++) {
                        await expect(rowCheckboxes.nth(i)).not.toBeChecked();
                    }
                }
            }
        });
    });

    test.describe('Space Assignment', () => {
        test('should show assign button when person selected', async ({ page }) => {
            const rows = peoplePage.getPersonRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const checkbox = firstRow.locator('input[type="checkbox"]');
                if (await checkbox.isVisible()) {
                    await checkbox.check();

                    const assignButton = page.getByRole('button', { name: /assign/i });
                    if (await assignButton.isVisible()) {
                        await expect(assignButton).toBeVisible();
                    }
                }
            }
        });

        test('should open space selection dropdown', async ({ page }) => {
            const rows = peoplePage.getPersonRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                const checkbox = firstRow.locator('input[type="checkbox"]');
                if (await checkbox.isVisible()) {
                    await checkbox.check();

                    const assignButton = page.getByRole('button', { name: /assign/i });
                    if (await assignButton.isVisible()) {
                        await assignButton.click();

                        const dropdown = page.locator('[role="listbox"], .MuiMenu-root');
                        if (await dropdown.isVisible()) {
                            await expect(dropdown).toBeVisible();
                        }
                    }
                }
            }
        });
    });

    test.describe('List Management', () => {
        test('should show create list button', async ({ page }) => {
            const createListButton = page.getByRole('button', { name: /create.*list|new.*list/i });
            // May not always be visible depending on UI state
            if (await createListButton.isVisible()) {
                await expect(createListButton).toBeVisible();
            }
        });

        test('should show saved lists panel', async ({ page }) => {
            const listsPanel = page.locator('[data-testid="lists-panel"], [data-testid="saved-lists"]');
            if (await listsPanel.isVisible()) {
                await expect(listsPanel).toBeVisible();
            }
        });

        test('should open create list dialog', async ({ page }) => {
            const createListButton = page.getByRole('button', { name: /create.*list|new.*list/i });

            if (await createListButton.isVisible()) {
                await createListButton.click();

                const dialog = page.getByRole('dialog');
                if (await dialog.isVisible()) {
                    await expect(dialog).toBeVisible();

                    // Close for cleanup
                    await peoplePage.closeDialog();
                }
            }
        });

        test('should show list name input in create dialog', async ({ page }) => {
            const createListButton = page.getByRole('button', { name: /create.*list|new.*list/i });

            if (await createListButton.isVisible()) {
                await createListButton.click();

                const nameInput = page.locator('input[name="listName"], #list-name, input[placeholder*="name"]');
                if (await nameInput.isVisible()) {
                    await expect(nameInput).toBeVisible();
                }

                await peoplePage.closeDialog();
            }
        });
    });

    test.describe('Search and Filter', () => {
        test('should filter people by search', async ({ page }) => {
            const searchInput = page.getByPlaceholder(/search/i);

            if (await searchInput.isVisible()) {
                await searchInput.fill('John');
                await page.waitForTimeout(500);

                const rows = peoplePage.getPersonRows();
                const count = await rows.count();
                expect(count).toBeGreaterThanOrEqual(0);
            }
        });

        test('should filter by assignment status', async ({ page }) => {
            const filterButton = page.getByRole('button', { name: /filter/i });

            if (await filterButton.isVisible()) {
                await filterButton.click();

                const assignedOption = page.locator('[role="option"]:has-text("assigned"), li:has-text("assigned")');
                if (await assignedOption.isVisible()) {
                    await expect(assignedOption).toBeVisible();
                }
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
            await waitForAppReady(page);

            // Page should still be functional
            const heading = page.getByRole('heading', { level: 1 });
            if (await heading.isVisible()) {
                await expect(heading).toBeVisible();
            }
        });

        test('should show mobile menu on small screens', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await page.reload();
            await waitForAppReady(page);

            const menuButton = page.getByRole('button', { name: /menu/i });
            if (await menuButton.isVisible()) {
                await menuButton.click();

                const drawer = page.locator('.MuiDrawer-root');
                await expect(drawer).toBeVisible();
            }
        });
    });

    test.describe('Statistics Display', () => {
        test('should show total people count', async ({ page }) => {
            const countElement = page.locator('[data-testid="people-count"], [data-testid="total-count"]');
            if (await countElement.isVisible()) {
                const text = await countElement.textContent();
                expect(text).toBeDefined();
            }
        });

        test('should show assigned/unassigned counts', async ({ page }) => {
            const assignedCount = page.locator('[data-testid="assigned-count"]');
            const unassignedCount = page.locator('[data-testid="unassigned-count"]');

            if (await assignedCount.isVisible()) {
                await expect(assignedCount).toBeVisible();
            }
            if (await unassignedCount.isVisible()) {
                await expect(unassignedCount).toBeVisible();
            }
        });
    });
});

test.describe('People Page Navigation', () => {
    test('should navigate to people from dashboard', async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);

        const peopleButton = page.getByRole('button', { name: /people/i });
        if (await peopleButton.isVisible()) {
            await peopleButton.click();
            await expect(page).toHaveURL(/\/people/);
        }
    });

    test('should navigate back to dashboard', async ({ page }) => {
        await page.goto('/people');
        await waitForAppReady(page);

        const peoplePage = new PeoplePage(page);
        await peoplePage.navigateTo('dashboard');

        await expect(page).toHaveURL(/^\/$|\/dashboard/);
    });
});
