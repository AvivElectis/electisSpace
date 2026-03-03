# Dashboard AIMS Card & Company Creation Wizard — Design Document

**Date:** 2026-03-03
**Author:** Aviv + Claude
**Status:** Approved

---

## Overview

Two independent improvements:

1. **AIMS Dashboard Card** — Replace the lightweight 4-stat card with a full overview replica showing all 6 AIMS health categories. Improve overall dashboard unified design across all breakpoints.
2. **Company Creation Wizard** — Replace the 2-step wizard with a 6-step validated stepper. No features enabled by default. Full article format, field mapping, and multi-store support. Existing companies preserved with new UI.

---

## Subject 1: AIMS Dashboard Card Redesign

### Current State

The `DashboardAimsCard` shows 4 core metrics (total/online gateways, total/online labels) plus optional battery chips. The `AimsOverviewTab` shows 6 detailed cards with comprehensive health metrics from the same `storeSummary` endpoint.

### Target State

A full overview replica embedded in the dashboard card with 6 sub-sections:

| Section | Metrics | Color |
|---------|---------|-------|
| Gateway Health | Online/Offline + progress bar | success/error |
| Label Health | Online/Offline + progress bar | success/error |
| Update Progress | Updated/In-Progress/Failed | success/warning/error |
| Battery Health | Good/Low/Critical chips | success/warning/error |
| Signal Quality | Excellent/Good/Bad | success/info/error |
| Label Models | Type chips with counts | primary |

### Desktop Layout

- Card spans full width (`xs: 12`) since it's richer than other cards
- 6 sub-sections arranged in a 2x3 grid using `bgcolor: 'background.default', borderRadius: 2`
- Each sub-section has a label, progress bar (where applicable), and stat values
- Header: RouterIcon + "AIMS Management" + "To AIMS →" link
- All progress bars: `height: 8, borderRadius: 4` with semantic colors

### Mobile Layout

- Tappable header navigates to `/aims-management`
- Hero number: total gateways
- Gateway health progress bar
- 6 rows of `MobileStatTile` pairs covering all categories
- Battery chips at bottom (existing pattern)

### Data Source Change

Dashboard switches from separate `useGateways()` + `useLabelsOverview()` calls to `useAimsOverview()` which fetches `storeSummary` — a single endpoint with all metrics.

### Dashboard Unified Design

The frontend-design skill will handle polishing all dashboard cards together. The AIMS card sets the standard; other cards get visual alignment. All modes: desktop, mobile, tablet.

---

## Subject 2: Company Creation Wizard Redesign

### Current State

- 2-step wizard: (1) AIMS credentials + test connection, (2) select 1 store + company details + features
- Default features: `peopleEnabled: true, conferenceEnabled: true, labelsEnabled: true`
- Article format NOT fetched at creation
- Field mappings empty on creation
- Single store only

### Target State

6-step MUI Stepper wizard with full validation at each step. All features disabled by default.

### Step 1: AIMS Connection + Company Info

**Fields:**
- Company Code (3-20 uppercase, validates uniqueness via debounced API call)
- Company Name, Location (optional), Description (optional)
- AIMS Cluster selector (C1 / Common)
- AIMS Username, Password
- "Test Connection" button — **required** before proceeding

**Validation:** Connection must succeed. Code must be unique.

### Step 2: Store Selection (Multi-Store)

**Behavior:**
- Fetches available stores from AIMS via `fetchAimsStores()`
- Displays as selectable list with checkboxes
- Each store shows: store code, label count, gateway count (from AIMS)
- Each selected store gets inline fields: friendly name (optional override), timezone
- At least 1 store required

**Data:** `{ storeCode, name, timezone, labelCount, gatewayCount }`

### Step 3: Article Format

**Behavior:**
- Auto-fetches article format from AIMS on step entry
- Displays: file extension, delimiter, basic info fields, data fields
- All fields are editable but pre-populated from AIMS response
- User can accept as-is or modify

**Data:** `ArticleFormat { fileExtension, delimeter, mappingInfo, articleBasicInfo, articleData }`

### Step 4: Field Mapping

**Behavior:**
- Pre-populated from article format fields (Step 3)
- Each field row: AIMS field name → English display name → visibility toggle
- Unique ID field selector (dropdown)
- Conference mapping section (optional): meeting name, meeting time, participants — each maps to an AIMS field

**Data:** `SolumMappingConfig { uniqueIdField, fields, conferenceMapping }`

### Step 5: Features

**All features disabled by default.** User explicitly enables what they need.

| Feature | Description | Constraints |
|---------|-------------|-------------|
| Spaces Management | Manage office spaces and labels | Mutually exclusive with People |
| People Management | Assign people to spaces | Mutually exclusive with Spaces |
| Conference Rooms | Conference room displays | Requires conference field mapping (Step 4). Has mode: Full/Simple |
| Labels | ESL label management and sync | — |
| AIMS Management | Full AIMS gateway/label/template management | — |

- Space type selector at top (office/room/chair/person-tag)
- Mutual exclusivity enforced: enabling one disables the other
- Dependency warnings shown inline (e.g., conference requires mapping)

### Step 6: Review & Create

- Read-only summary of all steps
- Each section clickable to jump back to that step for editing
- "Create Company" button with loading state
- On success: creates company + all stores + saves article format + saves field mapping + sets features

### Existing Company Handling

- **Backward compatibility preserved:** `ALL_FEATURES_ENABLED` fallback for old companies without `settings.companyFeatures` stays in code
- **Same new UI:** Existing companies (dev + production) get the new editing experience
- **Edit mode:** Same sections displayed as tabs (not stepper) — each tab corresponds to a wizard step
- **Pre-filled:** All current settings populated from `company.settings`
- **No data loss:** Current features, article format, and field mappings preserved

### Responsive Design

| Breakpoint | Dialog | Stepper | Fields |
|------------|--------|---------|--------|
| Mobile (xs) | `fullScreen` | Step numbers only (labels hidden) | Stacked, full-width |
| Tablet (sm) | Standard dialog | Full stepper visible | 2-column where appropriate |
| Desktop (md+) | `maxWidth: 'md'` | Full stepper | Side-by-side fields |

### Server Changes

- Company creation endpoint accepts full payload: company + stores[] + articleFormat + fieldMapping + features
- New endpoint or extended existing: `POST /api/v1/companies` accepts nested store creation
- Article format fetch endpoint already exists: `GET /settings/company/:companyId/article-format`
- Field mapping save endpoint already exists: `PUT /settings/company/:companyId/field-mappings`

---

## Files Affected

### Subject 1: AIMS Dashboard Card
| File | Action |
|------|--------|
| `src/features/dashboard/components/DashboardAimsCard.tsx` | Rewrite — full overview replica |
| `src/features/dashboard/DashboardPage.tsx` | Update data fetching (useAimsOverview), card grid sizing |
| `src/features/dashboard/components/MobileStatTile.tsx` | Minor — may need additional color support |
| `src/features/dashboard/components/*.tsx` | Polish — unified design alignment |
| `src/locales/en/common.json` | Add dashboard AIMS keys |
| `src/locales/he/common.json` | Add dashboard AIMS keys |

### Subject 2: Company Wizard
| File | Action |
|------|--------|
| `src/features/settings/presentation/companyDialog/CreateCompanyWizard.tsx` | Rewrite — 6-step stepper |
| `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx` | Rewrite — match wizard sections as tabs |
| `src/features/settings/presentation/companyDialog/steps/` | CREATE — step components (6 files) |
| `src/features/settings/presentation/StoreDialog.tsx` | Update — align with new store creation flow |
| `server/src/features/companies/service.ts` | Extend — accept full creation payload |
| `server/src/features/companies/types.ts` | Extend — new Zod schemas |
| `server/src/shared/utils/featureResolution.ts` | Update — DEFAULT_COMPANY_FEATURES all false |
| `src/locales/en/common.json` | Add wizard step keys |
| `src/locales/he/common.json` | Add wizard step keys |

---

## Verification

1. `npm run build` — client builds cleanly
2. `cd server && npx tsc --noEmit` — server compiles
3. Dashboard: AIMS card shows all 6 sections, responsive on mobile/tablet/desktop
4. Dashboard: other cards maintain visual consistency
5. Create Company: full 6-step wizard works end-to-end
6. Edit Company: existing companies show all tabs with current data preserved
7. Existing dev/production companies: features unchanged after code changes
