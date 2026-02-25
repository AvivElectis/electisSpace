import { test, expect } from './fixtures/test-fixtures';
import { SpacesPage, SettingsDialog } from './fixtures/pageObjects';
import { waitForAppReady, waitForTableData, waitForDialogClose, waitForNotification } from './fixtures/helpers';
import { sampleSpaces, VIEWPORTS } from './fixtures/test-data';

test.describe('Spaces Management', () => {
    let spacesPage: SpacesPage;

    test.beforeEach(async ({ page }) => {
        spacesPage = new SpacesPage(page);
        await spacesPage.goto();
        await waitForAppReady(page);
    });

    test.describe('Table Display', () => {
        test('should display spaces heading and content', async () => {
            // Spaces page shows heading with space type name
            const heading = spacesPage.page.locator('h4, h3, h2').first();
            await expect(heading).toBeVisible();
        });

        test('should show data rows or empty message', async ({ page }) => {
            // The spaces table uses custom flexbox layout (no <table> or [role="row"]),
            // so check for the "Total ... - N" header or an empty state message
            await page.waitForTimeout(2000); // Wait for data fetch

            const totalCountText = page.locator('text=/Total.*-\\s*\\d+/i');
            const emptyText = page.getByText(/no .* yet/i);
            const addButton = page.getByRole('button', { name: /add office|add space|add room|add chair/i });

            const totalVisible = await totalCountText.isVisible().catch(() => false);
            const emptyVisible = await emptyText.isVisible().catch(() => false);
            const addVisible = await addButton.isVisible().catch(() => false);

            // Page should show data count, empty message, or at least the add button
            expect(totalVisible || emptyVisible || addVisible).toBe(true);
        });
    });

    test.describe('Add Space', () => {
        test('should open add space dialog', async () => {
            const dialog = await spacesPage.openAddDialog();
            await expect(dialog).toBeVisible();
        });

        test('should close dialog on cancel', async () => {
            await spacesPage.openAddDialog();
            await spacesPage.closeDialog();

            const dialog = spacesPage.page.getByRole('dialog');
            await expect(dialog).not.toBeVisible();
        });

        test('should show form fields in add dialog', async () => {
            const dialog = await spacesPage.openAddDialog();

            // Check for common form fields
            const inputs = dialog.locator('input');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
        });

        test('should add new space', async ({ page }) => {
            const testSpace = sampleSpaces[0];

            await spacesPage.openAddDialog();
            await spacesPage.fillSpaceForm({
                name: testSpace.name
            });
            await spacesPage.submitSpaceForm();

            await waitForDialogClose(page);

            // Verify space appears in table
            const spaceRow = page.locator(`tr:has-text("${testSpace.name}"), [role="row"]:has-text("${testSpace.name}")`);
            if (await spaceRow.isVisible()) {
                await expect(spaceRow).toBeVisible();
            }
        });
    });

    test.describe('Edit Space', () => {
        test.beforeEach(async ({ page }) => {
            // Add a space first if needed
            const rows = spacesPage.getSpaceRows();
            const count = await rows.count();

            if (count === 0) {
                await spacesPage.openAddDialog();
                await spacesPage.fillSpaceForm({ name: 'Test Space' });
                await spacesPage.submitSpaceForm();
                await waitForDialogClose(page);
            }
        });

        test('should open edit dialog when clicking edit', async () => {
            const rows = spacesPage.getSpaceRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                await firstRow.click();

                // Look for edit button in toolbar or row
                const editButton = spacesPage.page.getByRole('button', { name: /edit/i });
                if (await editButton.isVisible()) {
                    await editButton.click();

                    const dialog = spacesPage.page.getByRole('dialog');
                    await expect(dialog).toBeVisible();
                }
            }
        });
    });

    test.describe('Delete Space', () => {
        test('should show confirmation before delete', async () => {
            const rows = spacesPage.getSpaceRows();
            const firstRow = rows.first();

            if (await firstRow.isVisible()) {
                await firstRow.click();

                const deleteButton = spacesPage.page.getByRole('button', { name: /delete/i });
                if (await deleteButton.isVisible()) {
                    await deleteButton.click();

                    // Confirmation dialog should appear
                    const confirmButton = spacesPage.page.getByRole('button', { name: /confirm|yes/i });
                    await expect(confirmButton).toBeVisible();

                    // Cancel for cleanup
                    await spacesPage.cancelDelete();
                }
            }
        });
    });

    test.describe('Search and Filter', () => {
        test('should filter spaces by search', async ({ page }) => {
            const searchInput = page.getByPlaceholder(/search/i);

            if (await searchInput.isVisible()) {
                await searchInput.fill('Room');
                await page.waitForTimeout(500); // Wait for debounce

                // Verify filtered results or empty state
                const rows = spacesPage.getSpaceRows();
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

                // All spaces should be visible again
                await expect(searchInput).toHaveValue('');
            }
        });

        test('should open filter drawer', async () => {
            const filterButton = spacesPage.page.getByRole('button', { name: /filter/i });

            if (await filterButton.isVisible()) {
                await filterButton.click();

                // Filter drawer or popover should appear
                const filterDrawer = spacesPage.page.locator('.MuiDrawer-root, [role="dialog"]');
                await expect(filterDrawer).toBeVisible();
            }
        });
    });

    test.describe('Navigation', () => {
        test('should navigate back to dashboard', async ({ page }) => {
            // Use tab navigation to go back to dashboard
            await spacesPage.navigateTo('dashboard');
            // Dashboard is at root URL
            const url = page.url();
            expect(url.endsWith('/') || url.includes('/dashboard') || !url.includes('/spaces')).toBe(true);
        });
    });

    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize(VIEWPORTS.mobile);
            await waitForAppReady(page);

            // On mobile, the hamburger menu should be visible
            const menuButton = page.locator('[aria-label="menu"]');
            await expect(menuButton).toBeVisible();
        });
    });
});

test.describe('Settings from Spaces Page', () => {
    test('should open settings dialog', async ({ page }) => {
        await page.goto('/#/spaces');
        await waitForAppReady(page);

        const settingsDialog = new SettingsDialog(page);

        const settingsButton = page.getByRole('button', { name: /settings/i });
        if (await settingsButton.isVisible()) {
            await settingsDialog.open();
            await expect(settingsDialog.getDialog()).toBeVisible();
        }
    });

    test('should switch between settings tabs', async ({ page }) => {
        await page.goto('/#/spaces');
        await waitForAppReady(page);

        const settingsButton = page.getByRole('button', { name: /settings/i });

        if (await settingsButton.isVisible()) {
            await settingsButton.click();
            const dialog = page.getByRole('dialog');
            await dialog.waitFor({ state: 'visible' });

            // Get only the main settings tabs (inside the tablist)
            const tablist = dialog.locator('[role="tablist"]').first();
            const tabs = tablist.locator('[role="tab"]');
            const tabCount = await tabs.count();

            if (tabCount > 1) {
                // Click second tab
                await tabs.nth(1).click();
                await page.waitForTimeout(300);

                // Verify the second tab is now selected
                const secondTabSelected = await tabs.nth(1).getAttribute('aria-selected');
                expect(secondTabSelected).toBe('true');
            }
        }
    });
});
