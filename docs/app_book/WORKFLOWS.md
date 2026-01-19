# Project Workflows

> **Standard operating procedures for `electisSpace` development.**

## Git Workflow

We generally follow a simplified feature-branch workflow.

1.  **Main Branch**: `main` (Production-ready code)
2.  **Feature Branches**: `feature/<feature-name>`
3.  **Fix Branches**: `fix/<issue-description>`

### Commit Messages
Use descriptive commit messages.
- `feat: login page implementation`
- `fix: crash on android startup`
- `refactor: extract space card component`

## Release Process

### Desktop (Windows)
1.  Update version in `package.json`.
2.  Run `npm run electron:build`.
3.  The installer is generated in `dist-electron`.
4.  Artifact name format: `electisSpace.Setup.<version>.exe`.
5.  GitHub Actions (if configured) will auto-publish to Releases.

### Mobile (Android)
1.  Update version in `package.json` and `android/app/build.gradle`.
2.  Run `npm run android:build`.
3.  Open Android Studio.
4.  Build > Generate Signed Bundle / APK.

### Auto-Update
The application supports auto-updates via `electron-updater` (Windows). Updates are fetched from the GitHub Releases of the repository (`AvivElectis/electisSpace`).

## Quality Assurance

### Pre-Commit
- Ensure no linting errors (`npm run lint`).
- Ensure `npm run type-check` (or build) passes.

### Pre-Merge
- Run unit tests: `npm test`
- Run E2E tests: `npm run test:e2e`

## Issue Tracking
Issues are tracked in the GitHub repository.

- **Bug**: Something is broken. Requires steps to reproduce.
- **Enhancement**: New feature request.
- **Task**: Maintenance or refactoring work.
