# Testing Guide

## Overview

This project uses a comprehensive testing strategy with multiple layers:
- **Unit Tests**: Test individual functions and utilities
- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test feature workflows and API integrations
- **E2E Tests**: Test complete user journeys

## Test Stack

- **Vitest**: Fast unit test runner with TypeScript support
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end browser testing
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### With Coverage
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Writing Tests

### Unit Tests

Create test files next to the code they test with `.test.ts` or `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Tests

Use the custom `render` function from test utils for proper provider setup:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/testUtils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

Create test files in the `e2e/` directory with `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});
```

## Test Utilities

### Mock Data

Import mock data from `@test/utils/mockData`:

```typescript
import { mockSpace, mockSpaces, mockSettings } from '@test/utils/mockData';
```

### Test Helpers

Use helper functions from `@test/utils/testHelpers`:

```typescript
import { waitForCondition, createMockFile } from '@test/utils/testHelpers';
```

### Custom Render

The custom `render` function includes all necessary providers:
- i18n Provider
- Theme Provider
- Router Provider

```typescript
import { render } from '@test/utils/testUtils';

render(<MyComponent />);
```

## Coverage Requirements

Target coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Best Practices

### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - testing implementation details
expect(component.state.count).toBe(1);

// ✅ Good - testing user-visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should display error message when form is invalid', () => { ... });
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should increment counter', () => {
  // Arrange
  render(<Counter />);
  
  // Act
  fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
  
  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 4. Clean Up After Tests
```typescript
import { afterEach } from 'vitest';

afterEach(() => {
  // Clean up mocks, reset state, etc.
  vi.clearAllMocks();
});
```

### 5. Use Data-TestId Sparingly
Prefer semantic queries (role, label, text) over test IDs:

```typescript
// ❌ Avoid when possible
screen.getByTestId('submit-button');

// ✅ Better
screen.getByRole('button', { name: 'Submit' });
```

## Debugging Tests

### Vitest UI
```bash
npm run test:ui
```

### Playwright Debug Mode
```bash
npx playwright test --debug
```

### Console Logging
```typescript
import { screen } from '@testing-library/react';

// Print current DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main/develop branches

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Tests Timing Out
Increase timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

### E2E Tests Failing
1. Ensure dev server is running
2. Check browser compatibility
3. Review screenshots in `test-results/`

### Import Errors
Verify path aliases in both `vite.config.ts` and `vitest.config.ts` match.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
