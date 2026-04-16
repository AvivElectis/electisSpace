---
tags: [#esl, #solum, #aims, #domain, #spaces, #people, #conference]
---

**Related:** [[electisSpace]], [[architecture]], [[api]], [[audit-2026]]

# Domain Concepts

## What electisSpace Does

electisSpace is a B2B SaaS platform for managing Electronic Shelf Labels (ESL) via the SoluM AIMS platform. It serves organizations that manage physical spaces, people assignments, and conference rooms, all synchronized to physical e-ink displays.

## Working Modes

### Spaces Mode
Manages physical spaces (desks, rooms, chairs) with labels displaying space-related data. Each space has an `externalId` used as the AIMS `articleId`.

### People Manager Mode
Manages people assignments to numbered slots. Each person gets a `virtualSpaceId` (logical identifier) and an `assignedSpaceId` (physical slot number used as AIMS `articleId`). Unassigned slots push empty skeleton articles to AIMS rather than deleting them.

## Glossary

| Term | Definition |
|------|-----------|
| **AIMS** | SoluM's Article Information Management System -- manages ESL labels |
| **Article** | An AIMS data record linked to one or more physical labels |
| **ESL** | Electronic Shelf Label -- e-ink displays managed via AIMS |
| **Label Code** | Unique identifier for a physical ESL device |
| **External ID** | Identifier used as the AIMS `articleId` for a space or conference room |
| **Virtual Space ID** | A person's logical identifier (before slot assignment) |
| **Assigned Space ID** | Physical slot number a person is assigned to (used as AIMS `articleId` in people mode) |
| **Reconciliation** | Periodic process (every 60s) of diffing DB state against AIMS state and correcting discrepancies |
| **Singleflight** | Concurrency pattern that deduplicates in-flight requests for the same resource |
| **Store** | An operational unit within a company, mapped to an AIMS store number |
| **Company** | Top-level organization entity. Contains stores. Has `code` (AIMS identifier) and `name` (display) |
| **Global Field Assignments** | Company-level settings that control which data fields appear on AIMS articles |

## Multi-Tenant Hierarchy

```
Company
  -> Store(s)           -- each mapped to an AIMS store number
    -> Spaces            -- physical locations (desks, rooms, chairs)
    -> People            -- person records assigned to slots
    -> Conference Rooms  -- meeting rooms with ESL door signs
    -> Labels            -- physical ESL devices linked to articles
```

## AIMS Sync Architecture

```
Entity changed (create/update/delete)
  -> Service marks syncStatus = PENDING
  -> SyncQueueService upserts SyncQueueItem (deduplicates)
  -> SyncQueueProcessor (every 10s) claims PENDING items
  -> ArticleBuilder constructs AIMS article payload
  -> AimsGateway pushes to SoluM AIMS API
```

Key services (all singletons):
- **AIMS Gateway** -- HTTP client for SoluM AIMS API (auth, articles, labels, stores)
- **Article Builder** -- transforms DB entities into AIMS article format
- **Sync Queue Service** -- manages the queue of pending sync operations
- **Sync Queue Processor** -- processes the queue every 10 seconds
- **Reconciliation Job** -- full diff every 60 seconds

### AIMS API Pagination

`pullArticles()` fetches all pages (100 articles/page, max 50 pages safety limit).

### Config Gotcha

`solumConfig` uses `company.code` (AIMS identifier), NOT `company.name` (display name). The encrypted AIMS password must be decrypted by callers.

## Roles & Access Control

- **Platform Admin** -- full access to all companies and stores
- **Company Admin** -- manages all stores within their company
- **Store Admin** -- manages assigned stores only
- **User** -- basic access to assigned stores
- `allStoresAccess` flag grants cross-store access within a company
- Non-admin users with no managed stores get empty results (not unfiltered access)
