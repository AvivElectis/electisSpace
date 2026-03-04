# electisCompass — Admin Dashboard Integration (electisSpace)

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Context:** electisSpace is the admin panel for Compass. When Compass is enabled, the dashboard, navigation, and action buttons must support Compass management.

---

## 1. Dashboard Card: Compass Overview

When `compassEnabled = true` for the active company, a **Compass Dashboard Card** replaces the Spaces/People/Conference cards (those features are locked).

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🧭 Compass Overview                           [To Compass →] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │ 📊 Today's Stats │  │ 👥 Employees     │  │ 🏢 Occupancy ││
│  │                  │  │                  │  │              ││
│  │ Bookings: 47     │  │ Active: 234      │  │ Floor 1: 78% ││
│  │ Check-ins: 38    │  │ Checked in: 156  │  │ Floor 2: 65% ││
│  │ No-shows: 3      │  │ Rate: 66.7%      │  │ Floor 3: 42% ││
│  │ Auto-released: 2 │  │                  │  │              ││
│  │                  │  │ ████████░░ 66.7% │  │ Total: 62%   ││
│  └──────────────────┘  └──────────────────┘  └──────────────┘│
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │ 📈 Check-in Rate │  │ 🪑 Space Status  │  │ 📋 Rules     ││
│  │                  │  │                  │  │              ││
│  │ ████████████░░░  │  │ Available: 89    │  │ Active: 12   ││
│  │ 80.9% (38/47)   │  │ Booked: 47       │  │ Company: 5   ││
│  │                  │  │ Occupied: 38     │  │ Branch: 7    ││
│  │ vs yesterday:    │  │ Maintenance: 3   │  │              ││
│  │ ↑ +5.2%          │  │ Permanent: 15    │  │              ││
│  └──────────────────┘  └──────────────────┘  └──────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌────────────────────────────┐
│ 🧭 Compass Overview    [→]│
├────────────────────────────┤
│                            │
│ Hero: 156 Checked In       │
│ ████████████░░░ 66.7%      │
│ of 234 active employees    │
│                            │
│ ┌──────────┐ ┌──────────┐ │
│ │ Bookings │ │ Check-in │ │
│ │    47    │ │   80.9%  │ │
│ └──────────┘ └──────────┘ │
│ ┌──────────┐ ┌──────────┐ │
│ │ No-shows │ │ Occupancy│ │
│ │     3    │ │   62%    │ │
│ └──────────┘ └──────────┘ │
│ ┌──────────┐ ┌──────────┐ │
│ │ Available│ │ Permanent│ │
│ │    89    │ │    15    │ │
│ └──────────┘ └──────────┘ │
│                            │
│ ┌──────────────────────┐   │
│ │ Floor Occupancy      │   │
│ │ F1: ████████ 78%     │   │
│ │ F2: ██████░░ 65%     │   │
│ │ F3: ████░░░░ 42%     │   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

### Data Source

New API endpoint: `GET /api/v2/compass/dashboard/summary`

```typescript
interface CompassDashboardSummary {
  today: {
    totalBookings: number;
    checkedIn: number;
    noShows: number;
    autoReleased: number;
    cancelled: number;
    checkInRate: number;         // percentage
    checkInRateChange: number;   // vs yesterday, percentage points
  };
  employees: {
    totalActive: number;
    currentlyCheckedIn: number;
    attendanceRate: number;      // percentage
  };
  spaces: {
    available: number;
    booked: number;
    occupied: number;
    maintenance: number;
    permanent: number;
    excluded: number;
  };
  occupancy: {
    overall: number;             // percentage
    byFloor: Array<{
      floorId: string;
      floorName: string;
      occupancyRate: number;
    }>;
  };
  rules: {
    totalActive: number;
    companyLevel: number;
    branchLevel: number;
  };
}
```

---

## 2. Dashboard Speed Dial / Action Buttons

When Compass is enabled, the dashboard speed dial (FAB) actions change:

### Current Actions (without Compass)
- Add Space
- Add Person
- Add Conference Room
- Sync AIMS

### Compass Actions (when compassEnabled)

```
Speed Dial (Desktop & Mobile):
  ┌─────────────────────────────────┐
  │ ⚡ Quick Actions                │
  │                                 │
  │  📋 View Today's Bookings      │ → Navigate to Bookings admin page
  │  🏢 Manage Buildings           │ → Navigate to Building Management
  │  👥 Manage Employees           │ → Navigate to Employee Management
  │  📏 Edit Booking Rules         │ → Navigate to Rules page
  │  🔄 Sync AIMS                  │ → Trigger AIMS sync (existing)
  │  📊 Booking Report             │ → Navigate to Reports (Phase 2)
  └─────────────────────────────────┘
```

### Implementation

```typescript
// DashboardPage.tsx — speed dial actions based on feature flags
const compassActions: SpeedDialAction[] = compassEnabled
  ? [
      { icon: <BookingsIcon />, name: t('dashboard.viewBookings'), action: () => navigate('/compass/bookings') },
      { icon: <BuildingIcon />, name: t('dashboard.manageBuildings'), action: () => navigate('/compass/buildings') },
      { icon: <PeopleIcon />, name: t('dashboard.manageEmployees'), action: () => navigate('/compass/employees') },
      { icon: <RulesIcon />, name: t('dashboard.editRules'), action: () => navigate('/compass/rules') },
      { icon: <SyncIcon />, name: t('dashboard.syncAims'), action: triggerSync },
    ]
  : existingActions; // current space/people/conference actions
```

---

## 3. Navigation Tab Changes

### Without Compass (current)
```
[Dashboard] [People] [Conference Rooms] [Labels] [AIMS]
```

### With Compass Enabled
```
[Dashboard] [Compass] [Labels] [AIMS]
                │
                └── Sub-tabs within Compass:
                    [Bookings] [Spaces] [Employees] [Buildings] [Rules]
```

The **Compass** tab replaces People and Conference Rooms tabs (both locked).

### Implementation

```typescript
// AppHeader.tsx — tabs based on feature flags
const tabs = useMemo(() => {
  const baseTabs = [{ label: t('nav.dashboard'), path: '/' }];

  if (compassEnabled) {
    baseTabs.push({ label: t('nav.compass'), path: '/compass' });
  } else {
    if (peopleEnabled) baseTabs.push({ label: t('nav.people'), path: '/people' });
    if (conferenceEnabled) baseTabs.push({ label: t('nav.conferenceRooms'), path: '/conference' });
    if (spacesEnabled) baseTabs.push({ label: t('nav.spaces'), path: '/spaces' });
  }

  if (labelsEnabled) baseTabs.push({ label: t('nav.labels'), path: '/labels' });
  if (aimsManagementEnabled) baseTabs.push({ label: t('nav.aims'), path: '/aims-management' });

  return baseTabs;
}, [compassEnabled, peopleEnabled, conferenceEnabled, spacesEnabled, labelsEnabled, aimsManagementEnabled]);
```

---

## 4. Compass Admin Pages (electisSpace)

When Compass is enabled, the following admin pages are added to electisSpace:

### 4.1 Bookings Admin Page (`/compass/bookings`)

```
┌────────────────────────────────────────────────────────────────┐
│ 📋 Bookings                                    [Export CSV]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Filters: [Today ▼] [All Floors ▼] [All Statuses ▼] [Search] │
│                                                                │
│ ┌──────────┬──────────┬─────────┬──────────┬────────┬───────┐│
│ │ Space    │ Employee │ Time    │ Status   │Check-in│Actions││
│ ├──────────┼──────────┼─────────┼──────────┼────────┼───────┤│
│ │ A102     │ Dan L.   │ 9-18:00 │ ✅ In    │ 09:05  │ [···]││
│ │ A103     │ Noa S.   │ 9-18:00 │ 📌 Booked│ —      │ [···]││
│ │ A201     │ Yael K.  │ 10-14:00│ ❌ No-show│ —     │ [···]││
│ └──────────┴──────────┴─────────┴──────────┴────────┴───────┘│
│                                                                │
│ Showing 1-50 of 127 bookings            [◀ 1 2 3 ▶]          │
└────────────────────────────────────────────────────────────────┘
```

Admin actions per booking: Cancel, Extend, Reassign Space.

### 4.2 Compass Spaces Page (`/compass/spaces`)

Hierarchy tree view + space list:

```
┌────────────────────────────────────────────────────────────────┐
│ 🏢 Spaces                                [+ Add Building]     │
├───────────────────┬────────────────────────────────────────────┤
│ Building A        │  Floor 1 — Spaces (50)                    │
│   ├── Floor 1     │  ┌────────┬────────┬────────┬──────────┐ │
│   ├── Floor 2     │  │ A101   │ A102   │ A103   │ A104     │ │
│   └── Floor 3     │  │ 🟢     │ 🔵     │ 🔴     │ 🟡       │ │
│ Building B        │  │ Office │ Office │ Desk   │ Conf     │ │
│   ├── Floor 1     │  └────────┴────────┴────────┴──────────┘ │
│   └── Floor 2     │                                           │
│                   │  Legend: 🟢 Available 🔵 Booked           │
│                   │  🔴 Occupied 🟡 Maintenance               │
└───────────────────┴────────────────────────────────────────────┘
```

### 4.3 Employee Management Page (`/compass/employees`)

```
┌────────────────────────────────────────────────────────────────┐
│ 👥 Employees                    [+ Add] [Import CSV] [Sync AD]│
├────────────────────────────────────────────────────────────────┤
│ Search: [________________]  Branch: [All ▼]  Status: [All ▼] │
│                                                                │
│ ┌────────┬──────────────┬──────────┬────────┬────────┬──────┐│
│ │ Avatar │ Name         │ Email    │ Branch │ Status │ Loc  ││
│ ├────────┼──────────────┼──────────┼────────┼────────┼──────┤│
│ │ 🟢     │ Dan Levy     │ dan@...  │ TLV    │ Active │ A102 ││
│ │ 🟢     │ Noa Shapira  │ noa@...  │ TLV    │ Active │ A103 ││
│ │ ⚪     │ Yael Klein   │ yael@... │ HFA    │ Active │ —    ││
│ │ 🔴     │ Avi Cohen    │ avi@...  │ TLV    │Inactive│ —    ││
│ └────────┴──────────────┴──────────┴────────┴────────┴──────┘│
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Booking Rules Page (`/compass/rules`)

```
┌────────────────────────────────────────────────────────────────┐
│ 📏 Booking Rules                               [+ Add Rule]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Company-Level Rules                                            │
│ ┌──────────────────────────┬───────────┬────────┬────────────┐│
│ │ Rule                     │ Value     │ Active │ Actions    ││
│ ├──────────────────────────┼───────────┼────────┼────────────┤│
│ │ Max Booking Duration     │ 10 hours  │ ✅     │ [Edit] [x] ││
│ │ Check-In Window          │ 15 min    │ ✅     │ [Edit] [x] ││
│ │ Max Concurrent Bookings  │ 1         │ ✅     │ [Edit] [x] ││
│ │ Auto-Release on No-Show  │ Yes       │ ✅     │ [Edit] [x] ││
│ └──────────────────────────┴───────────┴────────┴────────────┘│
│                                                                │
│ Branch-Level Overrides (Tel Aviv)                              │
│ ┌──────────────────────────┬───────────┬────────┬────────────┐│
│ │ Max Booking Duration     │ 4 hours   │ ✅     │ [Edit] [x] ││
│ └──────────────────────────┴───────────┴────────┴────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Dashboard Card Visibility Logic

| Company Features | Dashboard Cards Shown |
|-----------------|----------------------|
| Compass OFF, Spaces ON | Spaces Card (existing) |
| Compass OFF, People ON | People Card (existing) |
| Compass OFF, Conference ON | Conference Card (existing) |
| Compass OFF, Labels ON | Labels Card (existing) |
| Compass OFF, AIMS ON | AIMS Card (existing) |
| **Compass ON** | **Compass Card (NEW)** + Labels Card + AIMS Card |
| Compass ON | Spaces/People/Conference cards **HIDDEN** (features locked) |

### Card Grid Layout

```
Without Compass (current):
  [Spaces Card] [People Card] [Conference Card]
  [Labels Card] [AIMS Card]

With Compass:
  [Compass Card ─────────────────── full width ──────────]
  [Labels Card]         [AIMS Card]
```

The Compass card takes full width (`xs: 12`) since it contains 6 sub-sections, matching the AIMS card pattern.
