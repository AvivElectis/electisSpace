# Chapter 8 — Auth Connection Management & AIMS Management

> **Status**: Implemented — Device Auth shipped in v2.6.0, AIMS Management in v2.7.0, AIMS Dashboard Enhancement in v2.8.0, AIMS Manager Overhaul in v2.9.0
> **Added**: 2026-02-23 | **Updated**: 2026-03-02

---

## Overview

This chapter documents two major features:

1. **Device-Based Auth Token Management** (v2.6.0) — eliminates forced re-login when mobile browsers are closed/reopened.
2. **AIMS Management Feature** (v2.7.0 base, v2.8.0 enhanced, v2.9.0 overhaul) — a comprehensive module for managing Electronic Shelf Labels (ESLs). The v2.9.0 overhaul expanded from 3 to 7 tabs, added 17 new server endpoints, and aims to replace the AIMS SaaS UI entirely.

---

## Part 1: Device-Based Auth Token Management

### Problem

Users on mobile are forced to re-login (email + password + 2FA) every time the browser is closed. Root causes:

- Access token lives only in memory (`apiClient.ts`)
- Refresh token is in an `httpOnly` cookie, which mobile browsers (iOS Safari, Chrome) aggressively purge
- iOS WebKit ITP clears cookies after 7 days of inactivity

### Solution: Device Token Layer

A new **device token** sits below the standard JWT flow:

```
[New Flow]
  Login → 2FA → Access Token (memory) + Refresh Token (cookie) + Device Token (persistent storage)
  Cookie Lost → Device Token → new Refresh Token + new Access Token (seamless)
  Device Token expired/revoked → Full re-login required
```

Device tokens are stored in Capacitor `Preferences` (native) or `IndexedDB` (web) — both survive browser close/reopen.

### Key Changes

| Layer | Change |
|-------|--------|
| DB | New `DeviceToken` model (additive migration) |
| Server | New auth service methods + 4 new routes |
| Client | Persistent storage via Capacitor/idb-keyval |
| UI | Device management screen (list + revoke) |

### New API Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/device-auth` | Auth using device token |
| `GET` | `/auth/devices` | List active devices |
| `DELETE` | `/auth/devices/:id` | Revoke specific device |
| `DELETE` | `/auth/devices` | Revoke all devices |

---

## Part 2: AIMS Management Feature

### Overview

A comprehensive AIMS Management module that serves as a full replacement for the AIMS SaaS UI, enabling:

- **Overview** — store health dashboard with gateway/label status summaries and battery health
- **Gateways** — view, register, deregister, reboot, and configure gateway network settings
- **Labels** — searchable list with detail view, LED control, blink, NFC URL, force heartbeat
- **Articles** — paginated article browser with linked labels, update history, and raw data
- **Templates** — sortable template list with mapping conditions and template groups
- **History** — unified history with batch updates, article updates, and label history sub-tabs
- **Whitelist** — full CRUD for label whitelisting with box whitelist, sync to storage/gateways
- Per-company feature toggle (`aimsManagementEnabled`)

### Access Control

| Role | Access |
|------|--------|
| `PLATFORM_ADMIN` | Full access (all companies) |
| `COMPANY_ADMIN` | Full access (own company) |
| `STORE_ADMIN` | Full access (own stores) — can register/deregister/reboot gateways |
| `STORE_MANAGER` | Read-only — can view all tabs and data |
| `STORE_EMPLOYEE` / `VIEWER` | No access (feature hidden) |

### Architecture

- Server-proxy architecture (prevents CORS issues, centralises AIMS credential management)
- Three-layer enforcement: navigation filtering → `ProtectedFeature` component → server-side role guards
- Feature toggle in Settings → Features tab (disabled by default, can be enabled per company)
- `Promise.allSettled` used for overview fetches — partial API failures degrade gracefully

### Tab Layout (v2.9.0 — 7 Scrollable Tabs)

| Tab | Component | Description |
|-----|-----------|-------------|
| 0 — Overview | `OverviewTab` | Store health metrics: gateway/label summaries, battery indicators, label models |
| 1 — Gateways | `GatewayList` | Gateway table, detail dialog, registration dialog, config dialog |
| 2 — Labels | `LabelsTab` | Searchable labels with click-to-detail: status, history, actions |
| 3 — Articles | `ArticlesTab` | Paginated article browser with detail dialog |
| 4 — Templates | `TemplatesTab` | Template list with detail dialog showing conditions/groups |
| 5 — History | `HistoryTab` | 3 sub-tabs: Batch Updates, Article Updates, Label History |
| 6 — Whitelist | `WhitelistTab` | Whitelist CRUD, bulk add/remove, box, sync operations |

### Server Routes (`/aims/*`)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| **Gateways** | | | |
| `GET` | `/gateways` | view | List all gateways |
| `GET` | `/gateways/floating` | view | List unregistered floating gateways |
| `GET` | `/gateways/:mac` | view | Gateway detail |
| `GET` | `/gateways/:mac/debug` | view | Gateway debug report |
| `GET` | `/gateways/:mac/config` | view | Gateway configuration |
| `GET` | `/gateways/:mac/status` | view | Gateway status with opcode info |
| `POST` | `/gateways` | manage | Register gateway |
| `DELETE` | `/gateways` | manage | Deregister gateways |
| `PATCH` | `/gateways/:mac/reboot` | manage | Reboot gateway |
| `PUT` | `/gateways/:mac/config` | manage | Update gateway configuration |
| **Labels** | | | |
| `GET` | `/labels` | view | List all labels (paginated) |
| `GET` | `/labels/unassigned` | view | List unassigned labels |
| `GET` | `/labels/:code` | view | Label detail |
| `GET` | `/labels/:code/history` | view | Label alive history |
| `GET` | `/labels/:code/operations` | view | Label operation history |
| `POST` | `/labels/:code/led` | manage | Control label LED |
| `POST` | `/labels/:code/blink` | manage | Blink label LED |
| `POST` | `/labels/:code/nfc` | manage | Set NFC URL |
| `POST` | `/labels/:code/heartbeat` | manage | Force heartbeat |
| **Overview** | | | |
| `GET` | `/store-summary` | view | Store summary statistics |
| `GET` | `/labels/summary/status` | view | Label status summary |
| `GET` | `/gateways/summary/status` | view | Gateway status summary |
| `GET` | `/labels/models` | view | Label model breakdown |
| **Articles** | | | |
| `GET` | `/articles` | view | List articles (paginated, searchable) |
| `GET` | `/articles/:articleId` | view | Article detail |
| `GET` | `/articles/:articleId/linked` | view | Linked labels for article |
| `GET` | `/articles/:articleId/updates` | view | Article update history |
| **Templates** | | | |
| `GET` | `/templates` | view | List templates |
| `GET` | `/templates/:templateName` | view | Template detail |
| `GET` | `/templates/:templateName/types` | view | Template type mappings |
| `GET` | `/templates/mapping-conditions` | view | Template mapping conditions |
| `GET` | `/templates/groups` | view | Template groups |
| **Products (History)** | | | |
| `GET` | `/products/history` | view | Batch update history |
| `GET` | `/products/history/:name` | view | Batch detail |
| `GET` | `/products/errors/:batchId` | view | Batch errors by ID |
| `GET` | `/products/:articleId/history` | view | Article update history |
| **Whitelist** | | | |
| `GET` | `/whitelist` | view | List whitelisted labels |
| `GET` | `/whitelist/unassigned` | view | List unassigned whitelisted labels |
| `POST` | `/whitelist` | manage | Add labels to whitelist |
| `DELETE` | `/whitelist` | manage | Remove labels from whitelist |
| `POST` | `/whitelist/box` | manage | Whitelist all labels in a box |
| `PUT` | `/whitelist/sync/storage` | manage | Sync whitelist to storage |
| `PUT` | `/whitelist/sync/gateway` | manage | Sync whitelist to gateways |

### Client Components

| Component | Purpose |
|-----------|---------|
| `AimsManagementPage` | Main page: 7 scrollable tabs, responsive layout |
| `OverviewTab` | Store health: summary cards, label/gateway status, battery chips, models |
| `GatewayList` | Gateway table with status chips, row click → detail |
| `GatewayDetail` | All gateway fields + collapsible debug report |
| `GatewayRegistration` | Register dialog with floating gateways chip selection |
| `GatewayConfigDialog` | Gateway refresh settings + network info display |
| `LabelsTab` | Searchable label list, click → detail with actions (LED, blink, NFC, heartbeat) |
| `ArticlesTab` | Paginated article search with detail dialog (linked labels, history, data) |
| `ArticleDetailDialog` | Article metadata, linked labels, update history, raw data tabs |
| `TemplatesTab` | Sortable template list with detail dialog showing conditions/groups |
| `HistoryTab` | 3 sub-tabs: BatchUpdatesSubTab, ArticleUpdatesSubTab, LabelHistorySubTab |
| `WhitelistTab` | Whitelist CRUD table, add/remove dialogs, box whitelist, sync buttons |
| `DashboardAimsCard` | Dashboard card with battery health chips (Good/Low/Critical) |

### Client State (Zustand)

`useAimsManagementStore` manages: gateways, selectedGateway, floatingGateways, labels, unassignedLabels, debugReport, batchErrors, labelHistory, batchHistory, activeTab, storeSummary, labelStatusSummary, gatewayStatusSummary, labelModels, labelDetail, labelAliveHistory, labelOperationHistory, articles, articleDetail, articleHistory, templates, templateDetail, templateTypes, mappingConditions, templateGroups, whitelist, unassignedWhitelist, historySubTab.

### Hooks

| Hook | Purpose |
|------|---------|
| `useAimsOverview` | Store summary, label/gateway status, label models (allSettled, 60s stale) |
| `useGateways` | Gateway list/detail/floating/debug/config with 30s stale cache |
| `useLabelsOverview` | Labels + unassigned fetch, computes stats (status/battery/signal) |
| `useLabelsDetail` | Label detail, alive history, operation history, actions (LED/blink/NFC/heartbeat) |
| `useArticles` | Article list/detail/linked/updates with pagination and search |
| `useTemplates` | Template list/detail/types/conditions/groups |
| `useProductHistory` | Batch history/detail/errors, article history |
| `useGatewayManagement` | Register/deregister/reboot/config mutations |
| `useLabelHistory` | Single label status history search |
| `useWhitelist` | Whitelist CRUD, box whitelist, sync to storage/gateways |

---

## Production Safety Notes

- All DB changes are purely additive (new tables/columns only)
- Standard Prisma migrations — no destructive resets
- Backward-compatible API changes (existing clients unaffected)
- AIMS label listing routes delegate to existing `aimsGateway.fetchLabels()` / `fetchUnassignedLabels()`
