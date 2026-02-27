# Chapter 8 — Auth Connection Management & AIMS Management

> **Status**: Implemented — Device Auth shipped in v2.6.0, AIMS Management in v2.7.0, AIMS Dashboard Enhancement in v2.8.0
> **Added**: 2026-02-23 | **Updated**: 2026-02-27

---

## Overview

This chapter documents two major features:

1. **Device-Based Auth Token Management** (v2.6.0) — eliminates forced re-login when mobile browsers are closed/reopened.
2. **AIMS Management Feature** (v2.7.0 base, v2.8.0 enhanced) — a dedicated module for managing Electronic Shelf Labels (ESLs) with gateway management, labels overview dashboard, and product update tracking.

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

A dedicated AIMS Management module, available to admins, enabling:

- View and manage AIMS gateway configurations per store
- Labels overview dashboard with stats, battery/signal distributions
- Browse label history and article assignments
- Track product updates with date filtering, batch error details, and article drill-down
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

### Server Routes (`/aims/*`)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/gateways` | view | List all gateways |
| `GET` | `/gateways/floating` | view | List unregistered floating gateways |
| `GET` | `/gateways/:mac` | view | Gateway detail |
| `GET` | `/gateways/:mac/debug` | view | Gateway debug report |
| `POST` | `/gateways` | manage | Register gateway |
| `DELETE` | `/gateways` | manage | Deregister gateways |
| `PATCH` | `/gateways/:mac/reboot` | manage | Reboot gateway |
| `GET` | `/labels` | view | List all labels |
| `GET` | `/labels/unassigned` | view | List unassigned labels |
| `GET` | `/labels/:code/history` | view | Label status history |
| `GET` | `/products/history` | view | Batch update history (supports `fromDate`/`toDate`) |
| `GET` | `/products/history/:name` | view | Batch detail |
| `GET` | `/products/history/:name/errors` | view | Batch errors |
| `GET` | `/products/:articleId/history` | view | Article update history |

### Client Components

| Component | Purpose |
|-----------|---------|
| `AimsManagementPage` | Main page: stats cards (gateways + labels), 3-tab layout |
| `GatewayList` | Gateway table with status chips, row click → detail |
| `GatewayDetail` | All gateway fields + collapsible debug report |
| `GatewayRegistration` | Register dialog with floating gateways chip selection |
| `LabelsOverview` | Stats cards + battery/signal distribution bars + label search |
| `LabelHistory` | Label code search with status history table |
| `ProductHistory` | Date-filtered batch table, expandable with errors + article drill-down |

### Client State (Zustand)

`useAimsManagementStore` manages: gateways, selectedGateway, floatingGateways, labels, unassignedLabels, debugReport, batchErrors, labelHistory, batchHistory, activeTab.

### Hooks

| Hook | Purpose |
|------|---------|
| `useGateways` | Gateway list/detail/floating/debugReport with 30s stale cache |
| `useLabelsOverview` | Labels + unassigned fetch, computes stats (status/battery/signal) |
| `useProductHistory` | Batch history/detail/errors, article history |
| `useGatewayManagement` | Register/deregister/reboot mutations |
| `useLabelHistory` | Single label status history search |

---

## Production Safety Notes

- All DB changes are purely additive (new tables/columns only)
- Standard Prisma migrations — no destructive resets
- Backward-compatible API changes (existing clients unaffected)
- AIMS label listing routes delegate to existing `aimsGateway.fetchLabels()` / `fetchUnassignedLabels()`
