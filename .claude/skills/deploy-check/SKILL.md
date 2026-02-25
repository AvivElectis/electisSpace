---
name: deploy-check
description: Pre-deployment verification — build, test, lint, and check for common issues
user-invocable: true
---

# Deploy Check Workflow

When the user invokes `/deploy-check`, run all verification steps:

## 1. TypeScript Compilation
```bash
# Client
npx tsc -b --noEmit

# Server
cd server && npx tsc --noEmit
```
Both must pass with zero errors.

## 2. Lint Check
```bash
npm run lint
```

## 3. Unit Tests
```bash
# Client
npx vitest run

# Server
cd server && npx vitest run
```

## 4. Build Verification
```bash
# Client production build
npm run build

# Server production build
cd server && npm run build
```

## 5. Security Checks
- Scan for hardcoded secrets: search for patterns like passwords, tokens, API keys
- Verify `.env` files are gitignored
- Check no `console.log` in production code (Vite terser strips them, but verify)

## 6. Database Migration Check
```bash
cd server && npx prisma migrate status
```
Verify no pending migrations.

## 7. Translation Sync
Verify both locale files have matching keys:
- `src/locales/en/common.json`
- `src/locales/he/common.json`

## 8. Changelog
Verify `CHANGELOG.md` has entries for new changes under `[Unreleased]`.

## Report Format
```
Deploy Check Results
====================
[ ] TypeScript (Client): PASS/FAIL
[ ] TypeScript (Server): PASS/FAIL
[ ] Lint: PASS/FAIL
[ ] Unit Tests (Client): PASS/FAIL (X passed, Y failed)
[ ] Unit Tests (Server): PASS/FAIL (X passed, Y failed)
[ ] Build (Client): PASS/FAIL
[ ] Build (Server): PASS/FAIL
[ ] Security Scan: PASS/FAIL
[ ] DB Migrations: PASS/FAIL
[ ] Translations: PASS/FAIL
[ ] Changelog: PASS/FAIL
```
