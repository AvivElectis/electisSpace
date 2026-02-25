---
paths:
  - "e2e/**"
  - "playwright.config.ts"
---

# E2E Test Rules (Playwright)

## Architecture
- **Page Object Model**: `e2e/fixtures/pageObjects/` (BasePage, DashboardPage, SpacesPage, ConferencePage, PeoplePage, SettingsDialog)
- **Auth setup project**: `e2e/auth.setup.ts` authenticates once, shares state across workers
- **Auth bypass**: `setupAuthBypass()` intercepts `/api/v1/auth/refresh` for parallel workers
- **Helpers**: `e2e/fixtures/helpers.ts` (`waitForAppReady()`, `waitForTableData()`, `waitForDialogClose()`)
- **Test data**: `e2e/fixtures/test-data.ts` (sample data, viewports)

## Critical: HashRouter URLs
All `page.goto()` calls MUST use `/#/` prefix:
```typescript
// CORRECT
await page.goto('/#/spaces');
await page.goto('/#/conference');

// WRONG — will show 404 or wrong page
await page.goto('/spaces');
await page.goto('/#/dashboard');  // Dashboard route doesn't exist — it's '/'
```

## MUI Component Selectors
- **TextFields**: Use `getByLabel(/field name/i)` — MUI inputs lack `name` attributes
- **Tabs**: Use `getByRole('tab', { name: /tab text/i })`
- **Dialogs**: Use `getByRole('dialog')`
- **Drawers**: Use `.MuiDrawer-root` class selector
- **Tabpanels**: Use `[role="tabpanel"]:not([hidden])` to avoid matching hidden panels

## Navigation Selectors
- Desktop tabs: Dashboard, People, Conference Rooms, Labels (no "Spaces" tab)
- Mobile: Hamburger menu `[aria-label="menu"]` → Drawer → list items
- Use `Promise.race` to detect desktop vs mobile navigation

## Spaces Table — No Standard Table Elements
The spaces page uses custom flexbox layout with react-window virtualization:
- NO `<table>`, NO `[role="row"]`, NO `<tr>` elements
- Check for "Total ... - N" header text to verify data loaded
- Check for "no ... yet" empty state message
- Check for "add" button as fallback

## Strict Mode
Playwright strict mode fails when multiple elements match. Common pitfalls:
- Multiple `[role="tabpanel"]` — add `:not([hidden])` and `.first()`
- Multiple tabs with `aria-selected="true"` (main + sub-tabs) — scope to first `[role="tablist"]`
- Multiple close/save buttons — scope to dialog: `dialog.getByRole('button', ...)`

## Test Data Cleanup
- Use unique IDs to avoid "already exists" errors: `Math.floor(Math.random() * 900) + 100`
- Some tests check for existing data before creating test data

## Waiting Strategies
- `waitForAppReady(page)` — Use before all interactions (waits for app shell)
- `waitForTableData(page)` — Wait for table content to load
- `waitForDialogClose(page)` — Wait for MUI dialog transition
- `page.waitForTimeout(N)` — Last resort for debounced inputs (500ms) or animations (300ms)
- Prefer `waitFor({ state: 'visible' })` over fixed timeouts

## Config
- 3 projects: setup → auth → chromium
- 60s timeout per test
- 4 parallel workers max
- Retries: 2 in CI, 0 locally
- Auth state stored in `e2e/.auth/` (gitignored)

## Running Tests
```bash
npm run test:e2e           # Headless, 4 workers
npm run test:e2e:headed    # With browser visible
npm run test:e2e:ui        # Playwright UI mode
npx playwright test --grep "test name"  # Single test
```
