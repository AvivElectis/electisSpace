---
tags: [#conventions, #code-style, #testing, #git, #i18n]
---

**Related:** [[electisSpace]], [[architecture]], [[api]]

# Conventions & Code Style

## Project Workflow (GitHub)

1. Create GitHub issue for the task
2. Add to project board "electisSpace Development" (project #2, owner AvivElectis)
   - Project ID: `PVT_kwHOC2mF1s4BP2ar`
   - Status field: `PVTSSF_lAHOC2mF1s4BP2arzg-I748` (Todo `f75ad846` / In Progress `47fc9ee4` / Done `98236657`)
   - Priority field: `PVTSSF_lAHOC2mF1s4BP2arzg-I76c` (High `c8b9a08e` / Medium `38f731c0` / Low `6699439f`)
   - Type field: `PVTSSF_lAHOC2mF1s4BP2arzg-I77w` (Bug `6f285e6c` / Feature `ae61764a` / Enhancement `76068ce7` / Chore `820911a8` / Docs `d9710f6d`)
3. Create branch from `main` (`feat/`, `fix/`, `chore/`, `tests/`)
4. Create PR linking issue (`Closes #N`)
5. Before merge: update CHANGELOG.md, wiki if architecture changed
6. After merge: move project item to "Done"

## Translations (i18n)

- English + Hebrew, both must stay in sync
- Files: `src/locales/en/common.json`, `src/locales/he/common.json`
- Use `t('key')` from react-i18next for all user-facing strings
- Never hardcode English strings in components
- Hebrew requires RTL-aware layouts (MUI handles most)

## Client Code Style

- Follow DDD layers: `application/` (stores/hooks), `domain/` (types), `infrastructure/` (API), `presentation/` (components)
- Place new components in feature directory, not shared (unless reused by 3+ features)
- MUI 7 components only -- no custom CSS frameworks
- React Hook Form + Zod for all forms; schemas in `domain/types.ts` or `domain/schemas.ts`
- Lazy-load heavy components (e.g., vanilla-jsoneditor)
- Vite chunks: react-vendor, mui-vendor, form-vendor, i18n-vendor, utils-vendor
- API calls through axios in `infrastructure/` directories, never directly from components

## Server Code Style

- Zod schemas for ALL request validation in `*.types.ts`
- Validate in controller, not service layer
- Use `AppError` + factory helpers for errors
- Log via `appLogger` (not console.log) -- structured JSON
- Prisma migrations: always idempotent where possible, never modify existing migration files
- Redis failures are non-fatal (graceful degradation)

## Testing

### Client Unit Tests
- Vitest + React Testing Library + MSW
- Files: `__tests__/` dirs or `*.test.tsx` co-located
- Mock API with MSW, not manual axios mocks
- MUI TextFields: use `getByLabel()` not `input[name="..."]`

### Server Unit Tests
- Vitest with `server/vitest.config.ts`
- Test constants with passwords: use `// pragma: allowlist secret`

### E2E Tests (Playwright)
- Page Object Model in `e2e/fixtures/pageObjects/`
- Auth setup project in `e2e/auth.setup.ts`
- HashRouter URLs: all `page.goto()` must use `/#/` prefix
- Spaces table: custom flexbox with react-window, no `<table>` elements
- 3 projects: setup -> auth -> chromium; 4 parallel workers; 60s timeout
- Use `waitForAppReady()`, `waitForTableData()`, `waitForDialogClose()`

## Security

- Never commit `.env` files, credentials, or API keys
- GitGuardian monitors all commits
- `// pragma: allowlist secret` for test-only constants
- Server passwords: bcrypt hashing
- Rate limiting on all auth endpoints
- CORS configured per environment
- Helmet.js for security headers

## Documentation

- **Changelog**: `CHANGELOG.md` at root (Keep a Changelog format)
- **Wiki**: `docs/wiki/` -- auto-published via GitHub Actions
- **Release notes**: `releaseNotesContent` key in locale translation files
