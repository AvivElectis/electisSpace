# AIMS Dashboard Card — Full Overview Replica

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the lightweight AIMS dashboard card with a full overview replica showing all 6 AIMS health categories (gateways, labels, updates, battery, signal, models) using data from the `storeSummary` endpoint, with unified design polish across all dashboard cards.

**Architecture:** The `DashboardAimsCard` gets a full rewrite to consume `storeSummary` data (same endpoint used by AimsOverviewTab). The `DashboardPage` switches from `useGateways()` + `useLabelsOverview()` to `useAimsOverview()` for the AIMS card. The card uses the `frontend-design` skill for distinctive visual treatment while respecting the existing dashboard design language. All dashboard cards get minor unified design alignment.

**Tech Stack:** React 19, MUI 7 (Grid, Card, LinearProgress, Chip, Stack), Zustand, i18next, `useAimsOverview` hook

---

## Task 1: Create Branch and Update DashboardPage Data Fetching

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`

**Step 1: Create feature branch**

```bash
git checkout main && git pull
git checkout -b feat/aims-dashboard-overview
```

**Step 2: Update DashboardPage to use `useAimsOverview` instead of separate hooks**

In `src/features/dashboard/DashboardPage.tsx`:

Replace these imports:
```typescript
import { useGateways } from '@features/aims-management/application/useGateways';
import { useLabelsOverview } from '@features/aims-management/application/useLabelsOverview';
```

With:
```typescript
import { useAimsOverview } from '@features/aims-management/application/useAimsOverview';
```

Replace these lines (around line 67-68):
```typescript
const { gateways, fetchGateways: fetchAimsGateways } = useGateways(activeStoreId);
const { stats: aimsLabelStats, fetchLabels: fetchAimsLabels } = useLabelsOverview(activeStoreId);
```

With:
```typescript
const { storeSummary: aimsStoreSummary, labelModels: aimsLabelModels, fetchOverview: fetchAimsOverview } = useAimsOverview(activeStoreId);
```

Replace the AIMS fetch calls in useEffect (around line 76-79):
```typescript
if (isAimsEnabled) {
    fetchAimsGateways();
    fetchAimsLabels();
}
```

With:
```typescript
if (isAimsEnabled) {
    fetchAimsOverview();
}
```

Remove the `aimsGatewayStats` useMemo block entirely (lines 122-129).

Replace the `DashboardAimsCard` usage (around line 236-248) with:
```tsx
{isAimsEnabled && (
    <Grid size={{ xs: 12 }}>
        <DashboardAimsCard
            storeSummary={aimsStoreSummary}
            labelModels={aimsLabelModels}
            isMobile={isMobile}
        />
    </Grid>
)}
```

Note: Card now spans full width (`xs: 12` only, no `md: 6`) since it's a rich overview.

**Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: Errors about DashboardAimsCard props mismatch (will be fixed in Task 2).

**Step 4: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx
git commit -m "refactor: switch dashboard AIMS card to useAimsOverview data source"
```

---

## Task 2: Rewrite DashboardAimsCard as Full Overview Replica

**Files:**
- Rewrite: `src/features/dashboard/components/DashboardAimsCard.tsx`

**Step 1: Invoke frontend-design skill for the card**

Use the `frontend-design` skill with this argument:
```
Rewrite DashboardAimsCard as a full AIMS overview replica embedded in the dashboard.
The card receives `storeSummary` (object with AIMS store health metrics) and `labelModels` (array of label type objects).

Data fields from storeSummary:
- onlineGwCount, offlineGwCount (gateway health)
- totalLabelCount, onlineLabelCount, offlineLabelCount (label health)
- updatedLabelCount, inProgressLabelCount, notUpdatedLabelCount (update progress)
- goodBatteryCount, lowBatteryCount (battery health)
- excellentSignalLabelCount, goodSignalLabelCount, badSignalLabelCount (signal quality)

labelModels: array of { labelType/type: string, count: number }

Design requirements:
- MUST match existing dashboard card design language (see DashboardSpacesCard, DashboardPeopleCard, DashboardConferenceCard patterns)
- Header: RouterIcon + "AIMS Management" title + "To AIMS →" navigation link
- Desktop: 6 sub-sections in 2x3 grid, each with bgcolor 'background.default', borderRadius 2
  1. Gateway Health — progress bar (success/error) + online/offline counts
  2. Label Health — progress bar (success/error) + online/offline counts
  3. Update Progress — progress bar (success) + updated/in-progress/failed counts
  4. Battery Health — progress bar (success/warning) + good/low counts
  5. Signal Quality — progress bar (success/info/error) + excellent/good/bad counts
  6. Label Models — Chip list with type:count
- Mobile: Tappable header → hero number (total gateways) → gateway health bar → MobileStatTile rows for all categories → battery/signal chips
- Each sub-section icon uses colored rounded box (same pattern as AimsOverviewTab)
- All numeric ratios use dir="ltr" for RTL support
- Progress bars: height 8, borderRadius 4
- Use MobileStatTile component for mobile stat tiles
- Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} on desktop
- CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }} on desktop
- Navigation: navigate('/aims-management')
- Show "no data" states gracefully when storeSummary is null/undefined
- Translation keys: use existing aims.* keys (aims.gatewayHealth, aims.labelHealth, aims.online, aims.offline, aims.batteryHealth, aims.batteryGood, aims.batteryLow, aims.signalDistribution, aims.signalExcellent, aims.signalGood, aims.signalBad, aims.productUpdates, aims.success, aims.failed, aims.labelTypes, aims.totalGateways, aims.totalLabels, aims.gateways, aims.labels)
- Add new translation key: dashboard.toAimsManagement for the navigation link

MUI imports needed: Box, Card, CardContent, Typography, Stack, Grid, LinearProgress, Chip, useMediaQuery, useTheme
Icon imports: RouterIcon, ArrowForwardIcon, LabelIcon, BatteryChargingFullOutlined, SignalCellularAltOutlined, UpdateOutlined, CategoryOutlined
Other imports: useTranslation, useNavigate, MobileStatTile

Props interface:
interface DashboardAimsCardProps {
    storeSummary: any;
    labelModels: any[];
    isMobile?: boolean;
}
```

The frontend-design skill will generate the complete component. After it produces the code, write it to `src/features/dashboard/components/DashboardAimsCard.tsx`.

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add src/features/dashboard/components/DashboardAimsCard.tsx
git commit -m "feat: rewrite AIMS dashboard card as full overview replica"
```

---

## Task 3: Add Missing Translation Keys

**Files:**
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add any new translation keys needed by the card**

In the `dashboard` section of both locale files, add:
```json
"toAimsManagement": "To AIMS Management"
```

Hebrew:
```json
"toAimsManagement": "לניהול AIMS"
```

Check if the frontend-design skill output uses any keys not already in the locale files. The existing `aims.*` keys should cover most needs. Add any missing ones to BOTH files.

**Step 2: Commit**

```bash
git add src/locales/en/common.json src/locales/he/common.json
git commit -m "feat: add dashboard AIMS card translation keys"
```

---

## Task 4: Dashboard Unified Design Polish

**Files:**
- Modify: `src/features/dashboard/components/DashboardSpacesCard.tsx`
- Modify: `src/features/dashboard/components/DashboardConferenceCard.tsx`
- Modify: `src/features/dashboard/components/DashboardPeopleCard.tsx`
- Modify: `src/features/dashboard/components/MobileStatTile.tsx` (if needed)

**Step 1: Invoke frontend-design skill for unified polish**

Use the `frontend-design` skill to review and align all dashboard cards:
```
Review and polish the existing dashboard cards (DashboardSpacesCard, DashboardConferenceCard, DashboardPeopleCard) to create a unified, polished dashboard design that aligns with the new rich AIMS card.

Focus areas:
- Consistent spacing, typography, and color usage across all cards
- Matching sub-section styling (bgcolor background.default, borderRadius 2)
- Consistent icon treatment (colored rounded box for section headers)
- Consistent progress bar styling (height 8, borderRadius 4)
- Mobile stat tile consistency
- RTL support (dir="ltr" on all numeric values)
- DO NOT change functionality or data — only visual polish
- Keep changes minimal and targeted — don't rewrite cards that are already well-structured
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/dashboard/components/
git commit -m "style: unified dashboard card design polish"
```

---

## Task 5: Final Verification and PR

**Step 1: Full build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors

**Step 2: Server TypeScript check**

```bash
cd server && npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors (server wasn't changed)

**Step 3: Push and create PR**

```bash
git push -u origin feat/aims-dashboard-overview
```

Create PR with:
- Title: `feat: AIMS dashboard card full overview replica`
- Body: Summary of changes, link to design doc
- Base: `main`

**Step 4: Commit**

No commit needed — PR creation is the final step.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/features/dashboard/DashboardPage.tsx` | Modify — switch to useAimsOverview, full-width card |
| `src/features/dashboard/components/DashboardAimsCard.tsx` | Rewrite — full overview replica |
| `src/locales/en/common.json` | Add translation keys |
| `src/locales/he/common.json` | Add translation keys |
| `src/features/dashboard/components/DashboardSpacesCard.tsx` | Polish — unified design |
| `src/features/dashboard/components/DashboardConferenceCard.tsx` | Polish — unified design |
| `src/features/dashboard/components/DashboardPeopleCard.tsx` | Polish — unified design |
| `src/features/dashboard/components/MobileStatTile.tsx` | Polish — if needed |
