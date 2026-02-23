# Enhanced Features Design Document

**Author:** Shimon (AI)  
**Date:** 2026-02-23  
**Branch:** `feat/enhanced-features`

---

## Table of Contents

1. [Quick Actions / Command Palette](#1-quick-actions--command-palette)
2. [Audit Log / Activity Feed](#2-audit-log--activity-feed)
3. [Smart Notifications System](#3-smart-notifications-system)
4. [Label Health Dashboard](#4-label-health-dashboard)
5. [Offline Mode / PWA Enhancement](#5-offline-mode--pwa-enhancement)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Quick Actions / Command Palette

**Status:** ✅ Fully Implemented  
**Priority:** High — power-user productivity  

### Overview
A Ctrl+K / ⌘K command palette for instant navigation and search across labels, stores, spaces, and users. Inspired by VS Code, Linear, and GitHub.

### Architecture
- **Component:** `src/features/quick-actions/presentation/CommandPalette.tsx`
- **Store:** `src/features/quick-actions/infrastructure/quickActionsStore.ts`
- **Hook:** `src/features/quick-actions/application/useCommandPalette.ts`
- **Integration:** Mounted in `MainLayout`, listens for global keyboard events

### Features
- Global `Ctrl+K` / `⌘K` shortcut to open
- Fuzzy search across: navigation pages, spaces, people, labels
- Recent actions memory
- Keyboard navigation (↑↓ to select, Enter to execute, Esc to close)
- Action categories with icons
- Admin-only actions (settings, audit log) filtered by role

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `⌘K` | Open command palette |
| `Esc` | Close palette |
| `↑` / `↓` | Navigate results |
| `Enter` | Execute selected action |

---

## 2. Audit Log / Activity Feed

**Status:** ✅ Fully Implemented  
**Priority:** High — compliance & security  

### Overview
Admin-only audit log viewer showing all tracked actions. Backend already exists (`/api/v1/admin/audit-log`); this adds the frontend.

### Architecture
- **Page:** `src/features/audit-log/presentation/AuditLogPage.tsx`
- **Service:** `src/features/audit-log/infrastructure/auditLogApi.ts`
- **Store:** `src/features/audit-log/infrastructure/auditLogStore.ts`
- **Route:** `/audit-log` (admin-only, added to AppRoutes)

### Features
- Paginated table of audit events
- Filters: user, action type, entity type, date range
- JSON diff viewer for old/new data
- Export to CSV
- Color-coded action types (create=green, update=blue, delete=red)
- Real-time updates via SSE (future)

### Data Model (existing)
```prisma
model AuditLog {
  id, storeId, userId, action, entityType, entityId,
  oldData, newData, ipAddress, userAgent,
  permissionChecked, wasAuthorized, createdAt
}
```

---

## 3. Smart Notifications System

**Status:** 📋 Designed (stubs created)  
**Priority:** High  

### Overview
In-app notification center with bell icon in header. Persistent notifications stored in DB with per-user preferences.

### Proposed Schema Addition
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  type        String   // SYNC_FAILURE, LABEL_OFFLINE, CAMPAIGN_START, etc.
  title       String
  body        String?
  data        Json     @default("{}")
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model NotificationPreference {
  id          String  @id @default(uuid())
  userId      String  @map("user_id")
  type        String  // notification type
  enabled     Boolean @default(true)
  channels    Json    @default("[\"in_app\"]") // in_app, email, push
  user        User    @relation(fields: [userId], references: [id])
  @@unique([userId, type])
}
```

### Architecture
- Bell icon in AppHeader with unread badge
- Notification dropdown/drawer
- Server routes: GET/PATCH /notifications, GET/PUT /notification-preferences
- SSE push for real-time delivery
- Triggers: sync service emits events → notification service creates records

---

## 4. Label Health Dashboard

**Status:** 📋 Designed (stubs created)  
**Priority:** Medium  

### Overview
Dashboard widget showing label fleet health: online %, battery levels, last-seen distribution, alerts.

### Architecture
- **Widget:** `src/features/label-health/presentation/LabelHealthDashboard.tsx`
- **Service:** Server endpoint aggregating label status from AIMS/Solum API
- **Thresholds:**
  - 🟢 Online, battery > 50%
  - 🟡 Battery 20-50%, or offline 1-24h
  - 🔴 Battery < 20%, or offline > 24h

### Data Sources
- AIMS API `/labels` endpoint → battery, signal, lastSeen
- Cached in Redis with 5min TTL
- Aggregated per store/area

### Widgets
1. **Health Ring** — donut chart: % green/yellow/red
2. **Battery Distribution** — histogram
3. **Offline Labels** — sortable table of labels offline > threshold
4. **Alerts Feed** — recent threshold violations

---

## 5. Offline Mode / PWA Enhancement

**Status:** 📋 Designed (stubs created)  
**Priority:** Medium  

### Overview
Enhanced service worker for offline label browsing, background sync when reconnected, and visible offline indicator.

### Architecture
- **Service Worker:** Enhanced `public/sw.js` with cache-first for label data
- **Offline Indicator:** Component in AppHeader showing connection status
- **Background Sync:** Queue label updates in IndexedDB, sync on reconnect
- Existing `OfflineIndicator.tsx` and `offlineQueueStore.ts` provide foundation

### Caching Strategy
| Resource | Strategy |
|----------|----------|
| App shell (HTML/CSS/JS) | Cache-first, update in background |
| API: labels, spaces | Stale-while-revalidate, 5min max-age |
| API: mutations | Network-only, queue if offline |
| Images/fonts | Cache-first, long TTL |

### Background Sync Flow
1. User makes change offline → queued in `offlineQueueStore`
2. Service worker registers sync event
3. On reconnect → process queue via `/api/v1/sync/batch`
4. Notify user of sync results

---

## 6. Implementation Roadmap

### Phase 1 (This PR) ✅
- **Quick Actions / Command Palette** — full implementation
- **Audit Log UI** — full implementation

### Phase 2 (Next Sprint)
- **Smart Notifications** — DB migration, server routes, bell icon UI
- **Offline Mode** — enhanced service worker, background sync

### Phase 3 (Following Sprint)
- **Label Health Dashboard** — AIMS integration, Redis caching, dashboard widgets
- **Notification Preferences** — per-user settings UI

### Dependencies
- Notifications → requires Prisma migration
- Label Health → requires AIMS API access for battery/signal data
- Offline Mode → builds on existing `offlineQueueStore`
