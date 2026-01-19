# Coding Standards & Guidelines

> **Standards for maintaining the `electisSpace` codebase.**

## Technology Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Architecture**: Domain-Driven Design (DDD) - Vertical Slices
- **Styling**: MUI (Material UI) + Emotion
- **Desktop**: Electron
- **Mobile**: Capacitor

## TypeScript Guidelines

1.  **Strict Typing**: Avoid `any`. Use `unknown` if necessary and narrow types.
2.  **Interfaces vs Types**: Prefer `interface` for object shapes (extensible), `type` for unions/primitives.
3.  **Null vs Undefined**: Prefer `null` for "no value" in data, `undefined` for optional parameters.
4.  **Path Aliases**: Use path aliases for imports:
    - `@features/*` -> Feature modules
    - `@shared/*` -> Shared core code
    - `@test/*` -> Test utilities

## React Guidelines

1.  **Functional Components**: Use FCs with hooks. No class components.
2.  **Custom Hooks**: Encapsulate logic in custom hooks (`useController`).
3.  **Memoization**: Use `useMemo` for expensive calculations, `useCallback` for stable function references passed to children.
4.  **Presentation vs Container**:
    - **Controllers** (`application/`): Handle business logic, API calls, state.
    - **Views/Components** (`presentation/`): Pure UI, receive data/actions via props (or connect internally to simple hooks).

## Code Structure (Vertical Slices)

We follow a feature-based folder structure. Each feature (`src/features/<feature>`) contains:

```
feature/
├── application/         # Controllers, hooks, use cases
│   └── useSpaceController.ts
├── domain/             # Types, pure functions, validation
│   └── types.ts
├── infrastructure/     # Services, API calls, Stores (Zustand)
│   ├── spaceService.ts
│   └── spaceStore.ts
└── presentation/       # React Components
    └── SpaceView.tsx
```

## Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Files | PascalCase or camelCase | `SpaceView.tsx`, `useSpace.ts` |
| Components | PascalCase | `SpaceCard` |
| Hooks | camelCase (use*) | `useSpaceController` |
| Functions | camelCase | `calculateTotal` |
| Types/Interfaces | PascalCase | `UsageStats` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

## Testing

- **Unit Tests** (`*.test.ts`): Logic, utils, pure functions. Use Vitest.
- **Component Tests** (`*.test.tsx`): UI rendering, interactions. Use Testing Library.
- **Integration Tests**: Feature workflows.
- **E2E Tests** (`*.spec.ts`): Full app flows. Use Playwright.
