# electisSpace App Book

> **Version:** 2.4.0 | **Last updated:** 2026-02-22
> **Audience:** Senior engineers, DevOps, technical onboarding

Welcome to the electisSpace Application Book. This is the comprehensive technical documentation for the electisSpace platform — a B2B SaaS system for Electronic Shelf Label (ESL) management via SoluM AIMS.

---

## Architecture Book (7 Chapters)

| # | Chapter | Description |
|---|---------|-------------|
| 1 | [System Overview & Philosophy](chapters/Chapter-1-—-System-Overview-&-Philosophy.md) | Business context, tech stack, design principles, repo structure |
| 2 | [Data Architecture](chapters/Chapter-2-—-Data-Architecture.md) | ER model, multi-tenancy, dynamic data pattern, sync state machines |
| 3 | [Server Architecture](chapters/Chapter-3-—-Server-Architecture.md) | Express pipeline, feature modules, shared services, App Logger |
| 4 | [Client Architecture](chapters/Chapter-4-—-Client-Architecture.md) | React/Zustand patterns, routing, i18n, SSE real-time updates |
| 5 | [Integration & Synchronization](chapters/Chapter-5-—-Integration-&-Synchronization.md) | AIMS integration, push/pull sync, reconciliation, label operations |
| 6 | [Infrastructure & Deployment](chapters/Chapter-6-—-Infrastructure-&-Deployment.md) | Docker, Nginx, observability (Loki/Grafana), multi-platform |
| 7 | [Security, Auth & Access Control](chapters/Chapter-7-—-Security,-Auth-&-Access-Control.md) | JWT auth, RBAC, rate limiting, audit logging |

## Reference

| Appendix | Description |
|----------|-------------|
| [A — Glossary](chapters/Appendix-A-—-Glossary.md) | Key terms and definitions |
| [B — Environment Variables](chapters/Appendix-B-—-Environment-Variables.md) | Full env var reference |
| [C — Key File Reference](chapters/Appendix-C-—-Key-File-Reference.md) | Important files and their purposes |

## Feature Guides

| Guide | Description |
|-------|-------------|
| [Spaces](features/SPACES.md) | Space management feature |
| [People Manager](features/PEOPLE_MANAGER.md) | People assignment and slot management |
| [Conference](features/CONFERENCE.md) | Conference room management |
| [Dashboard](features/DASHBOARD.md) | Dashboard overview cards |
| [Settings](features/SETTINGS.md) | Company & store settings |
| [Sync System](features/SYNC_SYSTEM.md) | AIMS synchronization system |
| [Auto Update](features/AUTO_UPDATE.md) | Electron auto-update |

## Technical Deep-Dives

| Document | Description |
|----------|-------------|
| [High-Level Design](HIGH_LEVEL_DESIGN.md) | HLD overview |
| [Data Flow](DATA_FLOW.md) | End-to-end data flow diagrams |
| [Architecture Patterns](architecture/ARCH_PATTERNS.md) | Design patterns used |
| [Coding Standards](CODING_STANDARDS.md) | Code style and conventions |
| [Shared Domain](SHARED_DOMAIN.md) | Shared domain types |
| [Shared Infrastructure](SHARED_INFRASTRUCTURE.md) | Shared infra services |
| [Shared Presentation](SHARED_PRESENTATION.md) | Shared UI components |

## Mechanics

| Document | Description |
|----------|-------------|
| [CSV Import/Export](mechanics/MECHANICS_CSV.md) | CSV processing mechanics |
| [State Management](mechanics/MECHANICS_STATE.md) | Zustand state patterns |
| [Sync Mechanics](mechanics/MECHANICS_SYNC.md) | Sync queue internals |

## External

| Document | Description |
|----------|-------------|
| [External API](EXTERNAL_API.md) | API documentation |
| [Internal API](INTERNAL_API.md) | Internal service API |
| [Setup Guide](SETUP.md) | Development setup |
| [Workflows](WORKFLOWS.md) | Development workflows |

---

## Quick Links

| Resource | Link |
|----------|------|
| Architecture Book (single file) | [`docs/ARCHITECTURE_BOOK.md`](../ARCHITECTURE_BOOK.md) |
| Changelog | [`CHANGELOG.md`](../../CHANGELOG.md) |
| Server Docs | [`docs/server/`](../server/) |

---

*This app book is maintained as part of the electisSpace repository. For the single-file architecture reference, see [`docs/ARCHITECTURE_BOOK.md`](../ARCHITECTURE_BOOK.md).*
