# Contributing to Testing

## Overview

We welcome contributions to improve test coverage and quality. This guide explains how to write and contribute tests to the electisSpace project.

## Test Structure

Tests should follow the project's feature-based architecture:

```
src/
├── features/
│   └── [feature]/
│       ├── domain/
│       │   └── validation.test.ts
│       ├── application/
│       │   └── useController.test.ts
│       └── presentation/
│           └── Component.test.tsx
├── shared/
│   ├── infrastructure/
│   │   └── services/
│       │       └── service.test.ts
│   └── presentation/
│       └── components/
│           └── Component.test.tsx
└── test/
    └── utils/
```

## Writing Tests

### 1. Unit Tests

**Location**: Next to the file being tested  
**Naming**: `[filename].test.ts` or `[filename].test.tsx`

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

### 2. Component Tests

Use the custom render function for proper setup:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@test/utils/testUtils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### 3. E2E Tests

**Location**: `e2e/` directory  
**Naming**: `[feature].spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL('/next-step');
});
```

## Test Coverage Guidelines

### Minimum Coverage
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Priority Areas
1. **Critical Business Logic**: 100% coverage
2. **User-Facing Features**: 90%+ coverage
3. **Utility Functions**: 85%+ coverage
4. **UI Components**: 75%+ coverage

## Best Practices

### DO ✅
- Write descriptive test names
- Test behavior, not implementation
- Use semantic queries (role, label, text)
- Clean up after tests
- Mock external dependencies
- Test edge cases and error states

### DON'T ❌
- Test implementation details
- Use `data-testid` excessively
- Write flaky tests
- Skip cleanup
- Test third-party libraries
- Duplicate test logic

## Code Review Checklist

Before submitting a PR with tests:

- [ ] All tests pass locally
- [ ] Coverage meets minimum thresholds
- [ ] Tests are well-named and descriptive
- [ ] No console errors or warnings
- [ ] Tests are isolated and independent
- [ ] Mocks are properly cleaned up
- [ ] E2E tests are stable (run 3+ times)
- [ ] Documentation updated if needed

## Running Tests Locally

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Debug tests
npm run test:ui
```

## Common Patterns

### Testing Async Operations
```typescript
it('should load data', async () => {
  render(<MyComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Testing User Interactions
```typescript
it('should submit form', async () => {
  const onSubmit = vi.fn();
  render(<Form onSubmit={onSubmit} />);
  
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
});
```

### Testing Error States
```typescript
it('should display error message', () => {
  render(<MyComponent error="Something went wrong" />);
  
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
});
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in test file
- Check for missing `await` keywords
- Verify async operations complete

### Flaky Tests
- Add proper wait conditions
- Avoid hardcoded timeouts
- Check for race conditions
- Ensure proper cleanup

### Import Errors
- Verify path aliases in `vitest.config.ts`
- Check file extensions
- Ensure dependencies are installed

## Getting Help

- Check existing tests for examples
- Review [Testing Guide](./TESTING_GUIDE.md)
- Ask in team chat or PR comments
- Consult [Vitest docs](https://vitest.dev/)
- Consult [Testing Library docs](https://testing-library.com/)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
