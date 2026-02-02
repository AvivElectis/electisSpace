# ElectisSpace AI Coding Instructions

You are working on **electisSpace**, a comprehensive ESL (Electronic Shelf Label) management application integrated with SoluM AIMS. The project supports Web, Windows (Electron), and Android (Capacitor) platforms from a single codebase.

## 1. Architecture & Project Structure

The project follows a **Feature-Sliced Design** implementation combined with **Clean Architecture** principles within each feature.

### Directory Structure
- `src/features/` - Vertical slices of the application (e.g., `space`, `conference`, `people`).
  - `application/` - Business logic, custom hooks, controllers (e.g., `useSpaceController`).
  - `domain/` - Types, interfaces, and core business rules.
  - `infrastructure/` - Data access, API calls, Zustand stores (e.g., `settingsStore`).under the header
  - `presentation/` - React components and UI logic.
- `src/shared/` - Shared code following the same layers (`application`, `domain`, `infrastructure`, `presentation`).
- `server/` - Node.js/Express backend with Prisma & PostgreSQL. Supports Multi-Company/Multi-Store architecture (`Company` -> `Store` -> `User`).
- `electron/` - Electron main and preload scripts.
- `android/` - Capacitor Android native shell.

### Key Patterns
- **Controllers**: Use "Controller" hooks (e.g., `useSpaceController`) to bridge UI and logic. Do not put heavy business logic directly in UI components.
- **State Management**: Use **Zustand** for global state, located in `infrastructure/*Store.ts`.
- **Database**: Prisma with Multi-Company/Multi-Store schema.
- **Imports**: Use path aliases `@features/*` and `@shared/*`.
  - Example: `import { useSpaceController } from '@features/space/application/useSpaceController';`

## 2. Tech Stack & Conventions

- **Frontend Core**: React 19, TypeScript (Strict), Vite.
- **UI Framework**: **Material UI v7**. Use `Box`, `Grid`, and `Typography` for layout.
- **Data Fetching**: Custom hooks in `application/` layer, often calling `services` in `infrastructure/`.
- **Internationalization**: **i18next**. Always wrap text in `t('')`.
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL.
- **Desktop/Mobile**: Electron (Desktop), Capacitor (Android).

## 3. Development Workflow

- **Start Dev Server**: `npm run dev` (Vite).
- **Start Electron Dev**: `npm run electron:dev`.
- **Run Unit Tests**: `npm run test` (Vitest).
- **Run E2E Tests**: `npm run test:e2e` (Playwright).
- **Build**: `npm run build` (Production build).

## 4. Testing Strategy

- **Unit/Integration**: Use **Vitest**. Locate tests in `__tests__` directories within features.
- **E2E**: Use **Playwright** (`e2e/*.spec.ts`).
- **Mocking**: Use standard Vitest mocking for unit tests.

## 5. Specific Guidelines

- **SoluM Integration**: Logic related to SoluM AIMS API is central. Understand `solumConfig` and `solumMappingConfig` passed to controllers.
- **Lazy Loading**: Use `React.lazy` for heavy dialogs/components (e.g., `SpaceDialog`).
- **Clean Code**:
  - Keep `DashboardPage.tsx` and main pages clean by extracting sub-components (e.g., `DashboardSpacesCard`).
  - Define interfaces in `domain/types` before implementing logic.

## 6. Common Paths

- **Backend Entry**: `server/src/server.ts`
- **Frontend Entry**: `src/main.tsx`
- **Routes**: `src/AppRoutes.tsx`
- **Theme**: `src/theme.ts`

## 7. Agent Operational Protocol

1. **ISOLATION**: Never commit directly to `main` or `master`.
2. **START**: Before writing code, create a new branch: `feature/agent-[mission-name]`.
3. **SYNC**: Ensure the branch is up to date with `origin/main`.
4. **FINISH**: When the task is complete, push the branch to origin.
5. **REPORT**: Generate a Pull Request link and present it in the final Artifact.
