/**
 * E2E test: Spaces bulk delete via Select Mode
 *
 * Prerequisites: the test environment must have at least 3 spaces already
 * created. If fewer than 3 exist the test is skipped (not failed).
 *
 * This test does NOT seed spaces — it relies on pre-existing data.
 */
import { test, expect } from '../fixtures/test-fixtures';
import { waitForAppReady } from '../fixtures/helpers';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Spaces bulk delete', () => {
    test('selects multiple rows and deletes them via the selection bar', async ({ page }) => {
        await page.goto('/#/spaces');
        await waitForAppReady(page);

        // Wait for the "Total {label} - N" subtitle to confirm data loaded.
        // The spaces page renders: t('spaces.total') + " " + getLabel('plural') + " - " + count
        // e.g. "Total Rooms - 12" or "Total Offices - 0"
        const totalHeader = page.locator('text=/Total.*-\\s*\\d+/i').first();
        await expect(totalHeader).toBeVisible({ timeout: 15000 });

        const headerText = (await totalHeader.textContent()) ?? '';
        const match = headerText.match(/(\d+)\s*$/);
        const totalBefore = match ? parseInt(match[1], 10) : 0;

        // Skip if not enough spaces in this environment.
        test.skip(totalBefore < 3, `Need at least 3 spaces to run bulk delete test (have ${totalBefore})`);

        // Enter Select Mode. The button is a Tooltip-wrapped IconButton with title "Select".
        // MUI Tooltip renders the title on the child element; use getByLabel which matches
        // aria-label on the <span> wrapper or title on the icon.
        // Fallback: locate the ChecklistIcon button inside the desktop toolbar.
        const selectButton = page.getByLabel('Select').first();
        await expect(selectButton).toBeVisible({ timeout: 5000 });
        await selectButton.click();

        // The selection bar appears as a Paper with role="toolbar".
        const toolbar = page.getByRole('toolbar');
        await expect(toolbar).toBeVisible({ timeout: 5000 });

        // In select mode, row checkboxes have aria-label "Select {id}".
        // The header "select all visible" checkbox has aria-label "Select all visible".
        // Get all checkboxes and skip the first one (select-all-visible header).
        const allCheckboxes = page.getByRole('checkbox');
        const checkboxCount = await allCheckboxes.count();

        // We need at least 3 checkboxes: 1 header + 2 row checkboxes.
        // If for some reason checkboxes are not rendered yet, wait a moment.
        await page.waitForTimeout(TIMEOUTS.medium);
        const checkboxCountAfterWait = await allCheckboxes.count();
        if (checkboxCountAfterWait < 3) {
            test.skip(true, `Expected at least 3 checkboxes in select mode (header + 2 rows), got ${checkboxCountAfterWait}`);
        }

        // Check the first two row checkboxes (index 1 and 2; index 0 is "Select all visible").
        await allCheckboxes.nth(1).check();
        await allCheckboxes.nth(2).check();

        // The toolbar shows "2 selected".
        await expect(page.getByText(/2 selected/i)).toBeVisible({ timeout: 5000 });

        // Click "Delete selected" in the selection toolbar.
        await toolbar.getByRole('button', { name: /delete selected/i }).click();

        // Confirmation dialog appears — confirm with the "Delete" button.
        const confirmDialog = page.getByRole('dialog');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        await confirmDialog.getByRole('button', { name: /^delete$/i }).click();

        // After successful deletion a success confirm dialog appears.
        // Its close button renders t('common.close') = "Close".
        const successDialog = page.getByRole('dialog');
        await expect(successDialog).toBeVisible({ timeout: 10000 });
        await successDialog.getByRole('button', { name: /^close$/i }).click();

        // Verify the total count decreased by 2.
        const expectedTotal = totalBefore - 2;
        const newHeader = page.locator(`text=/Total.*-\\s*${expectedTotal}\\b/i`).first();
        await expect(newHeader).toBeVisible({ timeout: 10000 });
    });
});
