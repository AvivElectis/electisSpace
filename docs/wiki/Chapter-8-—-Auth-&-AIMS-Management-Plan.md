# Chapter 8 — Auth Connection Management & AIMS Management Plan

> **Status**: Planned — see branch `claude/plan-auth-aims-features-UNrVw`
> **Added**: 2026-02-23

---

## Overview

This chapter documents two major planned features for ElectisSpace v2.6.0:

1. **Device-Based Auth Token Management** — eliminates the need for users to re-login when mobile browsers are closed/reopened.
2. **AIMS Management Feature** — a dedicated module for managing Electronic Shelf Labels (ESLs) with gateway management, label history, and product update tracking.

Full implementation detail is in [`docs/PLAN-auth-and-aims-features.md`](../PLAN-auth-and-aims-features.md).

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
- Browse label history and article assignments
- Track product updates and AIMS sync status
- Per-company feature toggle (`aimsManagementEnabled`)

### Access Control

| Role | Access |
|------|--------|
| `PLATFORM_ADMIN` | Full access (all companies) |
| `COMPANY_ADMIN` | Full access (own company) |
| `STORE_ADMIN` | Full access (own stores) |
| `STORE_MANAGER` | Read-only |
| `STORE_EMPLOYEE` / `VIEWER` | No access (feature hidden) |

### Implementation Approach

- Server-proxy architecture (prevents CORS issues, centralises AIMS credential management)
- Three-layer enforcement: navigation filtering → `ProtectedFeature` component → server-side role guards
- Feature toggle in Settings → Features tab (enabled by default, can be disabled per company)

### Implementation Phases

1. **Feature Toggle Infrastructure** — `aimsManagementEnabled` in `CompanyFeatures`
2. **Server Routes & Proxy Layer** — AIMS gateway CRUD + proxy endpoints
3. **Client Navigation & Guards** — route protection + sidebar links
4. **AIMS Dashboard UI** — store selector, gateway status, label browser
5. **Product Update Tracking** — article history, sync status timeline

---

## Production Safety Notes

- All DB changes are purely additive (new tables/columns only)
- Standard Prisma migrations — no destructive resets
- Backward-compatible API changes (existing clients unaffected)
- Every phase includes a rollback strategy

---

*See full plan: [`docs/PLAN-auth-and-aims-features.md`](../PLAN-auth-and-aims-features.md)*
