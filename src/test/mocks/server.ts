/**
 * MSW Server Setup for Node.js Tests
 * 
 * This file sets up the Mock Service Worker server for use in Node.js tests (vitest).
 * Import and use setupServer from this file in your test setup.
 */

import { setupServer } from 'msw/node';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { handlers, allHandlers } from './handlers';

// Create MSW server with default handlers
export const server = setupServer(...handlers);

// Export a version with all handlers (including C1 cluster)
export const serverWithAllClusters = setupServer(...allHandlers);

/**
 * Helper to setup MSW for a test suite
 * Call this in your test file's beforeAll/afterAll/afterEach
 */
export function setupMswForTests() {
    beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' });
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => {
        server.close();
    });
}

// Export handlers for custom test scenarios
export { handlers, allHandlers } from './handlers';
export * from './handlers';
