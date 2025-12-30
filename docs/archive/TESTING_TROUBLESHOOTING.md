# Testing Troubleshooting Guide

## Common Issues and Solutions

### 1. Tests Timing Out

**Symptom**: Tests fail with timeout errors

**Causes**:
- Missing `await` keywords
- Async operations not completing
- Infinite loops or recursion

**Solutions**:
```typescript
// ❌ Bad - missing await
it('should load data', () => {
  render(<MyComponent />);
  expect(screen.getByText('Loaded')).toBeInTheDocument(); // Fails immediately
});

// ✅ Good - proper async handling
it('should load data', async () => {
  render(<MyComponent />);
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});

// Increase timeout if needed
it('should load large dataset', async () => {
  // ... test code
}, { timeout: 10000 }); // 10 seconds
```

---

### 2. Import/Module Errors

**Symptom**: `Cannot find module` or `Failed to resolve import`

**Causes**:
- Incorrect path aliases
- Missing file extensions
- Circular dependencies

**Solutions**:
```typescript
// Check vitest.config.ts has correct aliases
export default defineConfig({
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});

// Use correct import paths
import { mockData } from './utils/mockData'; // Relative
import { Space } from '@shared/domain/types'; // Alias
```

---

### 3. Component Not Rendering

**Symptom**: `Unable to find element` errors

**Causes**:
- Missing providers (theme, i18n, router)
- Conditional rendering
- Async data loading

**Solutions**:
```typescript
// ✅ Use custom render with providers
import { render } from '@test/utils/testUtils';

// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Content')).toBeInTheDocument();
});

// Debug what's rendered
screen.debug(); // Prints current DOM
```

---

### 4. Flaky Tests

**Symptom**: Tests pass/fail inconsistently

**Causes**:
- Race conditions
- Hardcoded timeouts
- Shared state between tests
- Network timing

**Solutions**:
```typescript
// ❌ Bad - hardcoded timeout
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ Good - wait for condition
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
```

---

### 5. Mock Not Working

**Symptom**: Real implementation called instead of mock

**Causes**:
- Mock defined after import
- Incorrect mock path
- Mock not reset between tests

**Solutions**:
```typescript
// ✅ Mock before imports
vi.mock('./api', () => ({
  fetchData: vi.fn(),
}));

import { fetchData } from './api';

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Verify mock was called
expect(fetchData).toHaveBeenCalledWith(expectedArgs);
```

---

### 6. E2E Tests Failing

**Symptom**: Playwright tests fail locally or in CI

**Causes**:
- Dev server not running
- Incorrect selectors
- Timing issues
- Browser compatibility

**Solutions**:
```bash
# Ensure dev server is running
npm run dev

# Run with headed mode to see what's happening
npm run test:e2e:headed

# Use stable selectors
await page.getByRole('button', { name: 'Submit' }); // ✅ Good
await page.locator('#submit-btn'); // ❌ Fragile

# Add proper waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-loaded="true"]');
```

---

### 7. Coverage Not Updating

**Symptom**: Coverage report shows 0% or outdated data

**Causes**:
- Cache not cleared
- Files not included in coverage
- Test files included in coverage

**Solutions**:
```bash
# Clear cache and regenerate
rm -rf coverage/
npm run test:coverage

# Check vitest.config.ts excludes
coverage: {
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.test.ts',
    '**/*.config.*',
  ],
}
```

---

### 8. TypeScript Errors in Tests

**Symptom**: Type errors in test files

**Causes**:
- Missing type definitions
- Incorrect imports
- Vitest globals not configured

**Solutions**:
```typescript
// Add to vitest.config.ts
test: {
  globals: true,
}

// Add to tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}

// Import types explicitly if needed
import type { Mock } from 'vitest';
```

---

### 9. Act Warnings

**Symptom**: `Warning: An update to Component inside a test was not wrapped in act(...)`

**Causes**:
- State updates after test completes
- Missing await on async operations
- Timers not properly handled

**Solutions**:
```typescript
// ✅ Wrap state updates
await act(async () => {
  fireEvent.click(button);
});

// Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// Clean up timers
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});
```

---

### 10. Memory Leaks

**Symptom**: Tests slow down over time, OOM errors

**Causes**:
- Event listeners not removed
- Timers not cleared
- Large objects not garbage collected

**Solutions**:
```typescript
// Clean up in afterEach
afterEach(() => {
  cleanup(); // React Testing Library
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Clear large objects
let largeData: any;

beforeEach(() => {
  largeData = createLargeDataset();
});

afterEach(() => {
  largeData = null;
});
```

---

## Debugging Tips

### 1. Use screen.debug()
```typescript
render(<MyComponent />);
screen.debug(); // Prints entire DOM
screen.debug(screen.getByRole('button')); // Prints specific element
```

### 2. Use Vitest UI
```bash
npm run test:ui
```
Interactive test runner with debugging capabilities

### 3. Use Playwright Inspector
```bash
npx playwright test --debug
```
Step through E2E tests with browser DevTools

### 4. Check Console Output
```typescript
// Add console logs in tests
console.log('Current state:', component.state);

// Check for console errors
expect(console.error).not.toHaveBeenCalled();
```

### 5. Isolate Failing Test
```typescript
// Run only one test
it.only('should work', () => {
  // test code
});

// Skip other tests
it.skip('not relevant', () => {
  // skipped
});
```

---

## Getting More Help

1. **Check Documentation**
   - [Testing Guide](./TESTING_GUIDE.md)
   - [Vitest Docs](https://vitest.dev/)
   - [Testing Library Docs](https://testing-library.com/)

2. **Search Issues**
   - Check GitHub issues for similar problems
   - Search Stack Overflow

3. **Ask for Help**
   - Team chat
   - PR comments
   - Code review

4. **Enable Verbose Logging**
   ```bash
   DEBUG=* npm test
   ```

---

## Prevention Checklist

- [ ] Write tests as you code
- [ ] Run tests before committing
- [ ] Use proper async/await
- [ ] Clean up after tests
- [ ] Use stable selectors
- [ ] Avoid hardcoded timeouts
- [ ] Mock external dependencies
- [ ] Keep tests isolated
- [ ] Review test output carefully
- [ ] Update tests when code changes
