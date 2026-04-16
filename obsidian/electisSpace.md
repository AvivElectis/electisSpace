---
tags: [#electisSpace, #esl, #solum, #react, #project-root]
---

# electisSpace

**ESL management system for SoluM AIMS platform integration.** Manages spaces (offices/rooms/chairs), people assignments, conference rooms, and label synchronization. Supports web, Electron desktop, and Capacitor Android from a single codebase.

- **Path:** `c:/react/electisSpace`
- **Repo:** `AvivElectis/electisSpace` (private)
- **Owner:** Aviv Ben Waiss (aviv@electis.co.il)
- **Client version:** 2.15.1 / **Server version:** 2.10.1
- **Vault link:** this folder is junctioned into the project at `./obsidian/`

**Cross-project:** [[Electis]], [[AIMS Platform]], [[Docker Infrastructure]], [[PostgreSQL]], [[Nginx]], [[Auth Patterns]], [[Projects/NewSolumServer/NewSolumServer|NewSolumServer]] (shared AIMS), [[Projects/gmk/gmk|gmk]] (dev dependency on this stack)

## Architecture at a Glance

```
React 19 SPA (Vite/rolldown, MUI 7, Zustand 5, HashRouter)
  -> Express 4 API (Prisma 7 + PostgreSQL, Redis, Socket.IO)
    -> SoluM AIMS API (ESL label sync)
```

- Client: DDD per feature (`application/` / `domain/` / `infrastructure/` / `presentation/`)
- Server: feature modules (`routes` / `controller` / `service` / `types`)
- Auth: JWT access token in memory + refresh token as httpOnly cookie
- Sync: queue-based push (10s tick) + reconciliation (60s tick)
- Deployment: Docker on Ubuntu, PM2 on Windows, Electron desktop, Capacitor Android

## Map of Notes

| Note | Content |
|------|---------|
| [[architecture]] | Full architecture detail -- client layers, server layers, Zustand, MUI, feature map, repo structure |
| [[deploy]] | Docker setup, Capacitor Android, Electron desktop, CI/CD, all deployment modes |
| [[deploy-windows]] | Step-by-step native Windows Server deployment (PM2 + Nginx + PostgreSQL + Redis) |
| [[domain]] | ESL concepts, spaces, people, labels, AIMS sync flow, roles & access control, glossary |
| [[api]] | API routes, server endpoints, data models, auth rate limits, error format |
| [[conventions]] | Code style, naming patterns, testing approach, GitHub project workflow, i18n, security |
| [[audit-2026]] | Comprehensive codebase audit: ~150 issues found, ~75+ fixed across 4 batches |
| [[release-notes-v1.3]] | Release notes for v1.3.0 (testing system, Playwright, auto-update, docs) |
| [[ux-audit]] | UX audit findings (19 issues), redesign priority order, Stitch SDK setup |

## Onboarding System

Per-feature first-use guided tours using custom MUI Popper tooltips with highlight overlays. Each feature page (Dashboard, Spaces, People, Conference, Labels) has its own tour with 3-5 steps. Conference tour adapts to simple vs advanced mode. Tour state persisted to `localStorage` (`electisspace_onboarding` key). Step configs in `src/shared/domain/onboardingTypes.ts`, hook in `src/shared/application/useOnboardingTour.ts`. Dashboard cards are clickable with "View All" navigation and zero-data messages. Disabled features show an info toast instead of silently blocking. Users can restart tours from Settings > App Settings. Full Hebrew RTL support.

## Key Gotchas

- **HashRouter**: all URLs use `/#/` prefix. `page.goto('/spaces')` will 404.
- **MUI TextFields**: render without `name` attributes. Always locate by label text.
- **Spaces table**: custom flexbox + react-window, no `<table>` elements.
- **SSE token**: passed as `?token=` query param (EventSource limitation).
- **solumConfig**: uses `company.code` (AIMS identifier), NOT `company.name`.
- **Zustand subscriptions**: use selective selectors or `useShallow`, never subscribe to entire store.
- **AIMS pagination**: `pullArticles()` must loop all pages (100/page, max 50 pages).

## Log

- 2026-04-15 -- Linked to Obsidian vault as second brain.
- 2026-04-16 -- Consolidated CLAUDE.md into Obsidian sub-notes. Created architecture, deploy, domain, api, conventions notes. Moved AUDIT_CHANGES.md, RELEASE_NOTES.md, WINDOWS_NATIVE_DEPLOYMENT.md into obsidian/. CLAUDE.md reduced from 230 to ~100 lines for token efficiency.
- 2026-04-16 -- Full UX audit of entire app. Found 19 friction points (7 high, 6 medium, 6 low). Key: no first-run experience, dashboard not actionable, silent feature restrictions, invisible list locking. Spec at `docs/superpowers/specs/2026-04-16-ux-audit-and-redesign.md`. Using Google Stitch SDK for mockups. See [[ux-audit]].
- 2026-04-16 -- Added per-feature onboarding tours (Dashboard 3, Spaces 5, People 5, Conference 4/3, Labels 4 steps). Custom MUI Popper tooltip component with highlight overlay. Tour state in localStorage. Dashboard cards now clickable with "View All" nav. Disabled features show info toast. Restart from Settings. Full HE/RTL support.
