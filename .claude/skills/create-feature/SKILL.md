---
name: create-feature
description: Scaffold a new feature with DDD structure, types, API, store, and UI component
user-invocable: true
---

# Create Feature Workflow

When the user invokes `/create-feature <name>`, follow these steps:

## 1. Create GitHub Issue
```bash
gh issue create --title "feat: <feature description>" --body "<details>"
```
Add to project board with Status: In Progress, Type: Feature.

## 2. Create Branch
```bash
git checkout -b feat/<feature-name> main
```

## 3. Scaffold Client Feature Structure
Create the DDD directory structure:
```
src/features/<name>/
  application/
    use<Name>.ts          ← Main Zustand store
  domain/
    types.ts              ← TypeScript interfaces + Zod schemas
  infrastructure/
    <name>Api.ts          ← Axios API calls
  presentation/
    <Name>Page.tsx        ← Main page component
    components/           ← Feature-specific components
  __tests__/
    <Name>.test.tsx       ← Unit tests
```

## 4. Scaffold Server Feature (if API needed)
```
server/src/features/<name>/
  <name>.routes.ts        ← Express router
  <name>.controller.ts    ← Request handling
  <name>.service.ts       ← Business logic
  <name>.types.ts         ← Zod validation schemas
  __tests__/
    <name>.test.ts        ← Unit tests
```

## 5. Register Routes
- Client: Add route in the HashRouter configuration
- Server: Register routes in `server/src/server.ts` or route aggregator

## 6. Add Translations
Add keys to both locale files:
- `src/locales/en/common.json`
- `src/locales/he/common.json`

## 7. Implementation Checklist
- [ ] TypeScript types and Zod schemas defined
- [ ] API infrastructure layer connected
- [ ] Zustand store with actions
- [ ] UI components with MUI 7
- [ ] Responsive layout (desktop + mobile)
- [ ] Translation keys in both locales
- [ ] Unit tests for store and components
- [ ] E2E test page object (if full page)
