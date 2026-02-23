# Rewards Mode — Design Document

## Overview

Rewards Mode is a new feature for ElectisSpace that enables fashion retail chains to manage promotional ESL content ("hot deals") through time-bound campaigns. It allows store managers to designate specific ESLs to display promotional content such as discount badges, loyalty point offers, and seasonal sale graphics.

## Architecture

### Data Model

```
RewardsCampaign
├── id (UUID)
├── storeId (FK → Store)
├── name (string) — e.g. "Summer Sale 2026"
├── nameHe (string) — Hebrew name
├── description (text)
├── status (enum: DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED)
├── startDate (DateTime)
├── endDate (DateTime)
├── templateKey (string) — references a hot deal template
├── discountType (enum: PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, LOYALTY_POINTS)
├── discountValue (Decimal)
├── labelCodes (string[]) — ESL codes assigned to this campaign
├── priority (int) — for overlapping campaigns
├── metadata (JSON) — extensible campaign data
├── createdBy (string)
├── createdAt / updatedAt
```

### Enums

- **CampaignStatus**: DRAFT → SCHEDULED → ACTIVE → PAUSED → COMPLETED / CANCELLED
- **DiscountType**: PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, LOYALTY_POINTS

### Server Feature (`server/src/features/rewards/`)

Standard feature structure:
- `routes.ts` — Express router with auth + permission middleware
- `controller.ts` — Request validation, error mapping
- `service.ts` — Business logic (CRUD, status transitions, label assignment)
- `types.ts` — Zod schemas and TypeScript interfaces
- `index.ts` — Barrel exports

**API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/rewards` | List campaigns for store |
| GET | `/api/v1/rewards/:id` | Get campaign details |
| POST | `/api/v1/rewards` | Create campaign |
| PUT | `/api/v1/rewards/:id` | Update campaign |
| DELETE | `/api/v1/rewards/:id` | Delete campaign |
| POST | `/api/v1/rewards/:id/activate` | Activate campaign |
| POST | `/api/v1/rewards/:id/pause` | Pause campaign |
| POST | `/api/v1/rewards/:id/complete` | Complete campaign |
| GET | `/api/v1/rewards/analytics` | Campaign analytics |

### Client Feature (`src/features/rewards/`)

- `presentation/RewardsPage.tsx` — Main page with campaign list
- `presentation/CampaignDialog.tsx` — Create/edit campaign dialog
- `presentation/CampaignCard.tsx` — Campaign summary card
- `infrastructure/rewardsStore.ts` — Zustand store for state management
- `domain/types.ts` — Client-side type definitions

### Feature Toggle

- Added `rewardsModeEnabled` to `CompanyFeatures` interface
- Default: `false` (opt-in per company)
- Feature key: `'rewards'` in the permission system

### Navigation

- Added "Rewards" tab to MainLayout navigation
- Icon: `LocalOffer` (MUI icon)
- Conditionally shown based on `rewardsModeEnabled` feature flag

### Hebrew (RTL) Support

- All UI strings use `react-i18next` with `useTranslation()`
- Hebrew translations added to `src/locales/he/common.json`
- English translations added to `src/locales/en/common.json`
- Date formatting uses Hebrew locale via `date-fns/locale/he`
- RTL layout handled by existing MUI theme RTL support in `theme.ts`

## Hot Deal Templates

Pre-defined template keys:
- `percentage_off` — "X% הנחה" badge
- `fixed_discount` — "₪X הנחה" badge  
- `buy_get` — "קנה X קבל Y" promotion
- `loyalty_points` — "X נקודות מועדון" loyalty offer
- `flash_sale` — "מבצע בזק" time-limited deal
- `seasonal` — Seasonal themed promotions

## Campaign Lifecycle

1. **DRAFT** — Created but not scheduled
2. **SCHEDULED** — Start/end dates set, waiting for activation
3. **ACTIVE** — Currently running, ESLs showing promotional content
4. **PAUSED** — Temporarily suspended
5. **COMPLETED** — End date passed or manually completed
6. **CANCELLED** — Cancelled before completion

## Future Enhancements

- Auto-activation scheduler (cron-based campaign start/stop)
- Campaign performance analytics dashboard
- Template visual editor
- Bulk label assignment via barcode scanning
- Campaign duplication/cloning
- Multi-store campaign sync
