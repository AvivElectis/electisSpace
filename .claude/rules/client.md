---
paths:
  - "src/**"
---

# Client Code Rules

## Component Structure
- Follow DDD layers: `application/` (stores/hooks), `domain/` (types), `infrastructure/` (API), `presentation/` (components)
- Place new components inside the relevant feature directory, not in shared unless reused by 3+ features
- Use MUI 7 components — never add custom CSS frameworks

## State Management
- Zustand 5 stores in `application/` directories
- Each feature has its own store — avoid cross-store imports when possible
- Access token lives only in memory (Zustand auth store), never localStorage/sessionStorage

## Forms
- Use React Hook Form + Zod for all forms
- Validation schemas go in `domain/types.ts` or `domain/schemas.ts`
- MUI TextFields: use `getByLabel()` in tests, not `input[name="..."]`

## Routing
- HashRouter — all routes use `/#/` prefix
- Navigation tabs: Dashboard, People, Conference Rooms, Labels
- `navigate('/spaces')` is correct (router adds `/#/` automatically)
- Direct URL access requires `/#/` prefix: `page.goto('/#/spaces')`

## Translations
- All user-facing strings must use `t('key')` from react-i18next
- Keys in `src/locales/en/common.json` and `src/locales/he/common.json`
- Always update BOTH locale files when adding/changing text
- Hebrew locale requires RTL-aware layouts (MUI handles most of this)

## Path Aliases
- `@features/` → `src/features/`
- `@shared/` → `src/shared/`
- `@test/` → `src/test/`

## Performance
- Use react-window for large lists/tables (spaces table already does this)
- Lazy-load heavy components (e.g., vanilla-jsoneditor)
- Vite chunks: react-vendor, mui-vendor, form-vendor, i18n-vendor, utils-vendor

## Responsive Design
- Desktop: Tab navigation in AppHeader
- Mobile (< 600px): Hamburger menu → MUI Drawer
- Touch targets: Use `size="medium"` on mobile action buttons
- Speed dial: Wrap with `ClickAwayListener` on mobile

## API Calls
- All API calls go through axios instances in `infrastructure/` directories
- Base URL configured in axios instance, not hardcoded
- Error handling: axios interceptor handles 401 auto-refresh
- Never call API directly from components — always through stores/hooks

## Testing (Client Unit)
- Vitest + React Testing Library + MSW
- Test files: `__tests__/` directories or `*.test.tsx` co-located with source
- Use `@test/` alias for shared test utilities
- Mock API calls with MSW, not manual axios mocks
