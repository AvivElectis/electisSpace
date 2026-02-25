/**
 * Playwright Auth Setup
 *
 * Authenticates once before all tests and saves browser state.
 * Subsequent test projects reuse the saved state (cookies + localStorage).
 *
 * Credentials are loaded from environment variables (see e2e/.env).
 */
import { test as setup, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const AUTH_FILE = join(__dirname, '.auth', 'user.json');

setup.setTimeout(60_000);

setup('authenticate', async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'E2E_EMAIL and E2E_PASSWORD must be set. Copy e2e/.env.example to e2e/.env and fill in credentials.'
        );
    }

    // Navigate to establish page context (needed for cookie domain)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Call login API (triggers 2FA code generation in DB)
    await page.request.post('/api/v1/auth/login', {
        data: { email, password },
    });

    // Step 2: Retrieve the 2FA code from the database via Docker
    const rawCode = execSync(
        'docker exec electisspace-dev-postgres psql -U postgres -d electisspace_dev -t -c ' +
        '"SELECT code FROM verification_codes WHERE used = false ORDER BY created_at DESC LIMIT 1"',
    ).toString().trim();

    const code = rawCode.replace(/\s+/g, '');
    if (!code || code.length !== 6) {
        throw new Error(`Failed to retrieve valid 2FA code from database. Got: "${rawCode}"`);
    }

    // Step 3: Verify 2FA (sets refresh token as httpOnly cookie)
    const verifyResponse = await page.request.post('/api/v1/auth/verify-2fa', {
        data: { email, code },
    });
    expect(verifyResponse.ok()).toBeTruthy();

    const data = await verifyResponse.json();

    // Step 4: Get the first available store from the database
    const storeRow = execSync(
        'docker exec electisspace-dev-postgres psql -U postgres -d electisspace_dev -t -c ' +
        '"SELECT s.id, s.company_id FROM stores s JOIN companies c ON c.id = s.company_id LIMIT 1"',
    ).toString().trim();

    let activeStoreId: string | null = null;
    let activeCompanyId: string | null = null;

    if (storeRow) {
        const parts = storeRow.split('|').map((s: string) => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
            activeStoreId = parts[0];
            activeCompanyId = parts[1];
        }
    }

    // Step 5: Set user context via API (selects company + store)
    if (activeStoreId && activeCompanyId) {
        await page.request.patch('/api/v1/users/me/context', {
            data: { activeCompanyId, activeStoreId },
        });
    }

    // Step 6: Get fresh user data from /me (includes effectiveFeatures on stores)
    const meResponse = await page.request.get('/api/v1/users/me');
    const meData = meResponse.ok() ? await meResponse.json() : null;
    const freshUser = meData?.user || data.user || {};
    freshUser.activeCompanyId = activeCompanyId;
    freshUser.activeStoreId = activeStoreId;

    // Step 7: Set Zustand persisted auth state + cached access token in localStorage
    // The access token is cached so tests can bypass refresh token rotation
    // (server revokes old refresh tokens, breaking parallel Playwright workers)
    await page.evaluate((authData) => {
        localStorage.setItem('auth-store', JSON.stringify({
            state: {
                user: authData.user,
                activeCompanyId: authData.activeCompanyId,
                activeStoreId: authData.activeStoreId,
            },
            version: 0,
        }));
        localStorage.setItem('_e2eAccessToken', authData.accessToken);
        localStorage.setItem('_e2eUserData', JSON.stringify(authData.user));
    }, { user: freshUser, activeCompanyId, activeStoreId, accessToken: data.accessToken });

    // Step 8: Reload to trigger session validation with the new state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for session restore to complete (tablist appears when app is ready)
    await page.locator('[role="tablist"]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Step 9: Save full browser state (cookies + localStorage)
    await page.context().storageState({ path: AUTH_FILE });
});
