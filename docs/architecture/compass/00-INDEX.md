# electisCompass — Architecture Planning Index

**Version:** 1.0
**Date:** 2026-03-04
**Authors:** Aviv Ben Waiss + Claude Opus 4.6
**Status:** Draft — Awaiting Review

---

## Overview

electisCompass is a **flagship additive feature** for the electisSpace platform. It transforms the system from simple ESL management into a full enterprise workspace booking platform with a dedicated employee-facing mobile app.

### Key Design Decisions

| Decision | Choice |
|----------|--------|
| **Relationship to electisSpace** | Compass is additive — existing features remain unchanged |
| **Feature exclusivity** | Compass mode LOCKS Spaces/People/Conference modes |
| **Admin interface** | electisSpace serves as the admin panel for Compass |
| **User app** | Separate SPA (electisCompass) at `compass.solumesl.co.il` |
| **Unique differentiator** | ESL/e-ink label integration — no competitor has this |
| **Quality bar** | Premium — Compass is the flagship upgrade for the platform |

---

## Document Map

| # | Document | Contents |
|---|----------|----------|
| [01](01-USE-CASES.md) | **Use Cases** | Actor definitions, 28 use cases (employee, admin, system), dependency matrix, access matrix |
| [02](02-FUNCTIONAL-REQUIREMENTS.md) | **Functional Requirements** | 50+ FRs across auth, spaces, bookings, friends, admin, ESL, notifications, i18n, offline |
| [03](03-NON-FUNCTIONAL-REQUIREMENTS.md) | **Non-Functional Requirements** | Performance targets, scalability limits, security, usability, maintainability, compatibility, deployment, observability |
| [04](04-HIGH-LEVEL-DESIGN.md) | **High-Level Design (HLD)** | System context, application architecture, data architecture, integration architecture, technology stack, network, security layers, deployment |
| [05](05-LOW-LEVEL-DESIGN.md) | **Low-Level Design (LLD)** | Server module design, BookingService, RuleEngine, ProximityService, CompassAuth, client module design, Zustand stores, Socket.IO integration, database schema details, feature gating, error handling |
| [06](06-FLOWCHARTS.md) | **Flowcharts & Sequences** | Booking lifecycle, auth flow, booking sequence diagram, auto-release flow, no-show detection, friend proximity, wizard expansion, ESL sync trigger |
| [07](07-STATE-DIAGRAMS.md) | **State Diagrams** | Booking states, space modes, friendship states, auth states, Compass feature toggle, AIMS sync states |
| [08](08-CLEAN-CODE-GUIDELINES.md) | **Clean Code Guidelines** | SOLID principles applied, naming conventions, function design, error handling, testing strategy, React component rules |
| [09](09-ARCHITECTURAL-RISKS-AND-COLLISIONS.md) | **Risks & Collisions** | 5 critical collisions, 22 risks, concrete solutions with SQL/TypeScript, resolution status matrix |
| [10](10-ADMIN-DASHBOARD-INTEGRATION.md) | **Dashboard Integration** | Compass dashboard card (desktop/mobile), speed dial actions, navigation tab changes, admin pages (bookings, spaces, employees, rules), visibility logic |
| [11](11-INFRASTRUCTURE-REQUIREMENTS.md) | **Infrastructure Requirements** | Server hardware (small/medium/large), RAM/CPU allocation, disk space, network, Docker limits, monitoring thresholds, backup strategy, scaling path |
| [12](12-APP-SCREEN-DIAGRAMS.md) | **App Screen Diagrams** | Navigation hierarchy, auth flow with biometric, all tab screens (Home/Find/Bookings/Profile), booking dialog, offline mode, RTL support |
| [13](13-DIRECTORY-AND-CALENDAR-SYNC.md) | **Directory & Calendar Sync** | Microsoft 365 Graph API, Google Workspace Admin SDK, Okta Users API, user directory sync (delta queries), conference room sync, availability checking, field mapping, admin setup UI |
| [14](14-MOBILE-BIOMETRIC-AUTH.md) | **Mobile Biometric Auth** | Capacitor biometric plugin, fingerprint/Face ID/PIN, device token storage, secure token flow, biometric auth store, session management |
| [15](15-MONOREPO-STRUCTURE.md) | **Monorepo Structure** | Repository layout (admin + compass + server + shared), path aliases, Vite configs, Docker builds, CI/CD pipeline, dependency strategy, migration path |
| [16](16-ADVANCED-CAPABILITIES.md) | **Advanced Capabilities** | Analytics dashboard (heatmaps, KPIs, export), service tickets, SSO (SAML/OIDC), live chat, webhooks (12 events, HMAC signing), company API (API keys, scopes, rate limiting, Swagger docs) |
| [17](17-IMPLEMENTATION-TODO.md) | **Implementation Todo** | 199 tasks across 20 phases (bottom→top): monorepo, DB, auth, bookings, spaces, real-time, admin UI, wizard, Compass app, mobile, directory sync (incl. Okta), SSO, analytics, tickets, chat, webhooks, API, floor plans & LBS, testing, deployment |
| [18](18-FLOOR-PLANS-AND-LBS.md) | **Floor Plans & LBS** | Floor plan upload/editor, space placement (x,y), AIMS LBS sync (shelf/floor/order/arrow), map view in Compass app, real-time occupancy overlay, ESL wayfinding, friends on map |

---

## Companion Documents (Existing)

| Document | Location |
|----------|----------|
| Architecture Plan (full) | [`../SPACE-MANAGEMENT-REDESIGN.md`](../SPACE-MANAGEMENT-REDESIGN.md) |
| Work Plan (phases + weak spots) | [`../WORK-PLAN.md`](../WORK-PLAN.md) |
| Company Wizard Plan | [`../../plans/2026-03-03-company-wizard-plan.md`](../../plans/2026-03-03-company-wizard-plan.md) |
| Design Document | [`../../plans/2026-03-03-dashboard-aims-and-company-wizard-design.md`](../../plans/2026-03-03-dashboard-aims-and-company-wizard-design.md) |

---

## Reading Order

1. Start with **01-USE-CASES** to understand who does what
2. Read **02-FUNCTIONAL-REQUIREMENTS** for the complete feature spec
3. Read **04-HIGH-LEVEL-DESIGN** for the big picture architecture
4. Read **09-ARCHITECTURAL-RISKS** to understand pitfalls
5. Read **05-LOW-LEVEL-DESIGN** for implementation details
6. Read **06-FLOWCHARTS** and **07-STATE-DIAGRAMS** for behavior specification
7. Read **12-APP-SCREEN-DIAGRAMS** for user interface sequence layout
8. Read **10-ADMIN-DASHBOARD** for electisSpace integration
9. Read **11-INFRASTRUCTURE** for deployment planning
10. Reference **03-NFR** and **08-CLEAN-CODE** throughout implementation
11. Read **13-DIRECTORY-SYNC** for Microsoft/Google integration details
12. Read **14-MOBILE-BIOMETRIC-AUTH** for Capacitor biometric design
13. Read **15-MONOREPO-STRUCTURE** for repository layout and build system
14. Read **16-ADVANCED-CAPABILITIES** for analytics, SSO, webhooks, API, tickets, and chat
15. Read **18-FLOOR-PLANS-AND-LBS** for map/floor plan editor and AIMS LBS integration
16. Use **17-IMPLEMENTATION-TODO** as the agent task list (269 tasks, bottom→top, Phases 0-24)
17. Read **[Structure Enhancement Design](../plans/2026-03-07-compass-structure-enhancement-design.md)** for Phases 21-24 (work hours, departments, amenities, recurring bookings)
