# Compass Structure Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add company work configuration, organizational structure (departments/teams), space taxonomy (types/amenities/neighborhoods), and recurring bookings to the existing Compass workspace management system.

**Architecture:** Four sequential database-first phases, each following the pattern: Prisma schema → migration → server service/controller/routes → admin UI tab → compass mobile app updates → i18n. All changes are additive (nullable columns, new tables) with zero impact on existing features.

**Tech Stack:** Prisma 7, Express 4, Zod, React 19, MUI 7, Zustand 5, react-i18next, Vitest, `rrule` npm package (Phase 24 only)

**Design Doc:** `docs/plans/2026-03-07-compass-structure-enhancement-design.md`
**Implementation TODO:** `docs/architecture/compass/17-IMPLEMENTATION-TODO.md` (Phases 21-24)

---

## Phase 21: Company Work Configuration + Store Address

### Task 1: Add Work Config Fields to Prisma Schema

**Files:**
- Modify: `server/prisma/schema.prisma` (Company model, ~line 30)
- Modify: `server/prisma/schema.prisma` (Store model, ~line 70)

**Step 1: Add nullable work config fields to Company model**

After the existing `compassConfig` field in the Company model, add:

```prisma
  // Work week configuration
  workWeekStart     Int?      @default(0)    // 0=Sunday..6=Saturday
  workWeekEnd       Int?      @default(4)    // inclusive
  workingDays       Json?                    // { "0": false, "1": true, ... }
  workingHoursStart String?   @db.VarChar(5) // "08:00" (HH:MM)
  workingHoursEnd   String?   @db.VarChar(5) // "17:00"
  defaultTimezone   String?   @db.VarChar(50) // "Asia/Jerusalem"
  defaultLocale     String?   @db.VarChar(10) // "en" or "he"
```

**Step 2: Add address and capacity fields to Store model**

After the existing `status`-related fields in the Store model, add:

```prisma
  // Structured address
  addressLine1      String?   @db.VarChar(255)
  addressLine2      String?   @db.VarChar(255)
  city              String?   @db.VarChar(100)
  state             String?   @db.VarChar(100)
  postalCode        String?   @db.VarChar(20)
  country           String?   @db.VarChar(2)   // ISO 3166-1 alpha-2
  latitude          Float?
  longitude         Float?

  // Capacity
  totalDesks        Int?
  maxOccupancy      Int?

  // Operating hours (overrides company defaults if set)
  workingDays       Json?
  workingHoursStart String?   @db.VarChar(5)
  workingHoursEnd   String?   @db.VarChar(5)
```

**Step 3: Generate and apply migration**

Run:
```bash
cd server && npx prisma migrate dev --name phase21_company_work_config
```

Expected: Migration created, Prisma client regenerated, no errors.

**Step 4: Verify schema compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

**Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(compass): add company work config and store address schema (Phase 21)"
```

---

### Task 2: Work Hours Resolution Service

**Files:**
- Create: `server/src/features/compass-bookings/workHoursService.ts`
- Create: `server/src/features/compass-bookings/__tests__/workHoursService.test.ts`

**Step 1: Write failing tests for work hours resolution**

```typescript
// server/src/features/compass-bookings/__tests__/workHoursService.test.ts
import { describe, it, expect } from 'vitest';
import { resolveWorkHours, isWithinWorkingHours } from '../workHoursService.js';

describe('resolveWorkHours', () => {
    const DEFAULTS = {
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'UTC',
    };

    it('should return platform defaults when company has no config', () => {
        const result = resolveWorkHours({}, {});
        expect(result).toEqual(DEFAULTS);
    });

    it('should use company values when set', () => {
        const result = resolveWorkHours(
            { workingHoursStart: '09:00', workingHoursEnd: '18:00', defaultTimezone: 'Asia/Jerusalem' },
            {},
        );
        expect(result.workingHoursStart).toBe('09:00');
        expect(result.workingHoursEnd).toBe('18:00');
        expect(result.timezone).toBe('Asia/Jerusalem');
    });

    it('should override with store values when set', () => {
        const result = resolveWorkHours(
            { workingHoursStart: '09:00', workingHoursEnd: '18:00' },
            { workingHoursStart: '07:00', workingHoursEnd: '16:00' },
        );
        expect(result.workingHoursStart).toBe('07:00');
        expect(result.workingHoursEnd).toBe('16:00');
    });
});

describe('isWithinWorkingHours', () => {
    const workHours = {
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'UTC',
    };

    it('should return true for booking within hours on a working day', () => {
        // Wednesday 2026-03-11 10:00 UTC
        const start = new Date('2026-03-11T10:00:00Z');
        const end = new Date('2026-03-11T12:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(true);
    });

    it('should return false for booking on a non-working day (Sunday)', () => {
        // Sunday 2026-03-08
        const start = new Date('2026-03-08T10:00:00Z');
        const end = new Date('2026-03-08T12:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(false);
    });

    it('should return false for booking outside hours', () => {
        // Wednesday but 06:00-07:00
        const start = new Date('2026-03-11T06:00:00Z');
        const end = new Date('2026-03-11T07:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(false);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/features/compass-bookings/__tests__/workHoursService.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement work hours service**

```typescript
// server/src/features/compass-bookings/workHoursService.ts

export interface ResolvedWorkHours {
    workingHoursStart: string;  // "08:00"
    workingHoursEnd: string;    // "17:00"
    workingDays: Record<string, boolean>;  // { "0": false, "1": true, ... }
    timezone: string;
}

const PLATFORM_DEFAULTS: ResolvedWorkHours = {
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
    timezone: 'UTC',
};

/**
 * Resolution chain: Store → Company → Platform defaults.
 * Each level's non-null values override the previous level.
 */
export function resolveWorkHours(
    company: {
        workingHoursStart?: string | null;
        workingHoursEnd?: string | null;
        workingDays?: Record<string, boolean> | null;
        defaultTimezone?: string | null;
    },
    store: {
        workingHoursStart?: string | null;
        workingHoursEnd?: string | null;
        workingDays?: Record<string, boolean> | null;
        timezone?: string | null;
    },
): ResolvedWorkHours {
    return {
        workingHoursStart:
            store.workingHoursStart ?? company.workingHoursStart ?? PLATFORM_DEFAULTS.workingHoursStart,
        workingHoursEnd:
            store.workingHoursEnd ?? company.workingHoursEnd ?? PLATFORM_DEFAULTS.workingHoursEnd,
        workingDays:
            (store.workingDays ?? company.workingDays ?? PLATFORM_DEFAULTS.workingDays) as Record<string, boolean>,
        timezone:
            store.timezone ?? company.defaultTimezone ?? PLATFORM_DEFAULTS.timezone,
    };
}

/**
 * Check if a booking's start and end time fall within working hours on a working day.
 * Times are compared in UTC (caller should convert to branch timezone first for non-UTC).
 */
export function isWithinWorkingHours(
    startTime: Date,
    endTime: Date | null,
    workHours: ResolvedWorkHours,
): boolean {
    const dayOfWeek = startTime.getUTCDay().toString();
    if (!workHours.workingDays[dayOfWeek]) return false;

    const [startH, startM] = workHours.workingHoursStart.split(':').map(Number);
    const [endH, endM] = workHours.workingHoursEnd.split(':').map(Number);
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    const bookingStartMinutes = startTime.getUTCHours() * 60 + startTime.getUTCMinutes();
    if (bookingStartMinutes < workStart || bookingStartMinutes >= workEnd) return false;

    if (endTime) {
        const bookingEndMinutes = endTime.getUTCHours() * 60 + endTime.getUTCMinutes();
        if (bookingEndMinutes > workEnd) return false;
    }

    return true;
}
```

**Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/features/compass-bookings/__tests__/workHoursService.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add server/src/features/compass-bookings/workHoursService.ts server/src/features/compass-bookings/__tests__/workHoursService.test.ts
git commit -m "feat(compass): add work hours resolution service with tests (Phase 21)"
```

---

### Task 3: Add Work Hours to Rule Engine

**Files:**
- Modify: `server/src/features/compass-bookings/ruleEngine.ts`
- Modify: `server/src/features/compass-bookings/__tests__/ruleEngine.test.ts`

**Step 1: Add `enforceWorkingHours` to ResolvedRules interface**

In `ruleEngine.ts`, add to `ResolvedRules`:

```typescript
enforceWorkingHours: boolean;
```

Add to `PLATFORM_DEFAULTS`:
```typescript
enforceWorkingHours: false,
```

Add to `RULE_TYPE_MAP`:
```typescript
BLOCKED_TIMES: 'enforceWorkingHours',
```

**Step 2: Add test for enforceWorkingHours rule resolution**

In the existing `ruleEngine.test.ts`, add:

```typescript
it('should resolve enforceWorkingHours when BLOCKED_TIMES rule is set', async () => {
    mockFindRules.mockResolvedValue([{
        ruleType: 'BLOCKED_TIMES',
        config: { value: true },
        applyTo: 'ALL_BRANCHES',
        targetBranchIds: [],
        targetSpaceTypes: [],
        priority: 1,
    }]);

    const result = await resolveRules('company-1', 'branch-1');
    expect(result.enforceWorkingHours).toBe(true);
});
```

**Step 3: Run tests**

Run: `cd server && npx vitest run src/features/compass-bookings/__tests__/ruleEngine.test.ts`
Expected: All tests PASS.

**Step 4: Integrate work hours validation into booking service**

In `server/src/features/compass-bookings/service.ts`, in the `createBooking` function, after rule validation and before the transaction, add:

```typescript
// Validate against work hours if enforced
if (rules.enforceWorkingHours) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { workingHoursStart: true, workingHoursEnd: true, workingDays: true, defaultTimezone: true },
    });
    const store = await prisma.store.findUnique({
        where: { id: branchId },
        select: { workingHoursStart: true, workingHoursEnd: true, workingDays: true, timezone: true },
    });
    const workHours = resolveWorkHours(company || {}, store || {});

    if (!isWithinWorkingHours(startTime, endTime, workHours)) {
        throw badRequest('BOOKING_OUTSIDE_WORKING_HOURS');
    }
}
```

Add import at top:
```typescript
import { resolveWorkHours, isWithinWorkingHours } from './workHoursService.js';
```

**Step 5: Commit**

```bash
git add server/src/features/compass-bookings/ruleEngine.ts server/src/features/compass-bookings/service.ts server/src/features/compass-bookings/__tests__/ruleEngine.test.ts
git commit -m "feat(compass): integrate work hours enforcement into booking rules (Phase 21)"
```

---

### Task 4: Company & Store API — Accept Work Config Fields

**Files:**
- Modify: `server/src/features/companies/types.ts`
- Modify: `server/src/features/companies/service.ts`
- Modify: `server/src/features/companies/controller.ts`
- Modify: `server/src/features/settings/controller.ts`

**Step 1: Add Zod schemas for new fields**

In `server/src/features/companies/types.ts`, add:

```typescript
export const workConfigSchema = z.object({
    workWeekStart: z.number().int().min(0).max(6).optional(),
    workWeekEnd: z.number().int().min(0).max(6).optional(),
    workingDays: z.record(z.string(), z.boolean()).optional(),
    workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    defaultTimezone: z.string().max(50).optional(),
    defaultLocale: z.string().max(10).optional(),
});

export const storeAddressSchema = z.object({
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().length(2).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    totalDesks: z.number().int().min(0).optional(),
    maxOccupancy: z.number().int().min(0).optional(),
    workingDays: z.record(z.string(), z.boolean()).optional(),
    workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
```

**Step 2: Update companies service to accept new fields in create/update**

In the `create()` method of `server/src/features/companies/service.ts`, add the work config fields to the company data object passed to `prisma.company.create()`:

```typescript
workWeekStart: fullData.workConfig?.workWeekStart,
workWeekEnd: fullData.workConfig?.workWeekEnd,
workingDays: fullData.workConfig?.workingDays,
workingHoursStart: fullData.workConfig?.workingHoursStart,
workingHoursEnd: fullData.workConfig?.workingHoursEnd,
defaultTimezone: fullData.workConfig?.defaultTimezone,
defaultLocale: fullData.workConfig?.defaultLocale,
```

Similarly for store creation within the same method, add address fields to the store data.

**Step 3: Add work config update endpoint**

In `server/src/features/settings/controller.ts`, add a handler for updating company work config:

```typescript
export const updateWorkConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = workConfigSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid work config', parsed.error.format());

        const companyId = req.params.companyId;
        const company = await prisma.company.update({
            where: { id: companyId },
            data: parsed.data,
        });

        res.json({ data: company });
    } catch (error) {
        next(error);
    }
};
```

**Step 4: Add store address update to existing store update endpoint**

In the settings controller's store update handler, merge the address fields from `storeAddressSchema`.

**Step 5: Run server type check**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

**Step 6: Commit**

```bash
git add server/src/features/companies/ server/src/features/settings/
git commit -m "feat(compass): add work config and store address API support (Phase 21)"
```

---

### Task 5: Admin UI — Work Hours Settings

**Files:**
- Modify: `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx`
- Modify: `src/features/settings/presentation/companyDialog/CreateCompanyWizard.tsx`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add i18n keys**

In `src/locales/en/common.json`, add under `"compass"`:

```json
"workHours": {
    "title": "Work Hours",
    "workWeekStart": "Work Week Start",
    "workWeekEnd": "Work Week End",
    "workingHours": "Working Hours",
    "start": "Start",
    "end": "End",
    "workingDays": "Working Days",
    "outsideHoursWarning": "This booking is outside working hours",
    "enforceWorkingHours": "Enforce Working Hours",
    "sun": "Sun", "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu", "fri": "Fri", "sat": "Sat"
},
"address": {
    "title": "Address",
    "line1": "Address Line 1",
    "line2": "Address Line 2",
    "city": "City",
    "state": "State/Province",
    "postalCode": "Postal Code",
    "country": "Country",
    "capacity": "Capacity",
    "totalDesks": "Total Desks",
    "maxOccupancy": "Max Occupancy"
}
```

Add corresponding Hebrew translations in `src/locales/he/common.json`:

```json
"workHours": {
    "title": "שעות עבודה",
    "workWeekStart": "תחילת שבוע עבודה",
    "workWeekEnd": "סוף שבוע עבודה",
    "workingHours": "שעות פעילות",
    "start": "התחלה",
    "end": "סיום",
    "workingDays": "ימי עבודה",
    "outsideHoursWarning": "הזמנה זו מחוץ לשעות העבודה",
    "enforceWorkingHours": "אכיפת שעות עבודה",
    "sun": "א׳", "mon": "ב׳", "tue": "ג׳", "wed": "ד׳", "thu": "ה׳", "fri": "ו׳", "sat": "ש׳"
},
"address": {
    "title": "כתובת",
    "line1": "שורת כתובת 1",
    "line2": "שורת כתובת 2",
    "city": "עיר",
    "state": "מדינה/מחוז",
    "postalCode": "מיקוד",
    "country": "ארץ",
    "capacity": "קיבולת",
    "totalDesks": "סה״כ שולחנות",
    "maxOccupancy": "תפוסה מקסימלית"
}
```

**Step 2: Add Work Hours section to EditCompanyTabs**

In `EditCompanyTabs.tsx`, add a new tab section (after Features) with:
- Day checkboxes (7 ToggleButtons for Sun-Sat)
- Start/End time pickers (type="time" TextFields)
- Timezone select (text field)
- Save button that calls the work config update API

Follow the existing tab panel pattern:
```tsx
<TabPanel value={tabValue} index={NEW_TAB_INDEX}>
    <Typography variant="h6" gutterBottom>{t('compass.workHours.title')}</Typography>
    <Stack gap={2}>
        <Typography variant="subtitle2">{t('compass.workHours.workingDays')}</Typography>
        <ToggleButtonGroup value={selectedDays} onChange={handleDaysChange}>
            {DAYS.map(day => (
                <ToggleButton key={day.value} value={day.value}>{day.label}</ToggleButton>
            ))}
        </ToggleButtonGroup>
        <Stack direction="row" gap={2}>
            <TextField label={t('compass.workHours.start')} type="time" value={workStart} onChange={...} />
            <TextField label={t('compass.workHours.end')} type="time" value={workEnd} onChange={...} />
        </Stack>
        <TextField label="Timezone" value={timezone} onChange={...} />
        <Button variant="contained" onClick={handleSaveWorkConfig}>{t('common.save')}</Button>
    </Stack>
</TabPanel>
```

**Step 3: Add store address fields to StoreDialog**

When editing a store, add address fields (addressLine1, city, state, postalCode, country) as TextFields in the existing store edit dialog/section.

**Step 4: Run client type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 5: Commit**

```bash
git add src/features/settings/ src/locales/
git commit -m "feat(compass): add work hours and store address admin UI (Phase 21)"
```

---

### Task 6: Compass Mobile — Work Hours Warning

**Files:**
- Modify: `compass/src/features/booking/presentation/BookingDialog.tsx`
- Modify: `compass/src/features/profile/presentation/ProfilePage.tsx`
- Modify: `compass/src/locales/en/common.json`
- Modify: `compass/src/locales/he/common.json`

**Step 1: Add work hours warning to BookingDialog**

When the user selects a booking time outside working hours, show an `<Alert severity="warning">` below the time pickers:

```tsx
{isOutsideWorkHours && (
    <Alert severity="warning" sx={{ mt: 1 }}>
        {t('booking.outsideWorkHours')}
    </Alert>
)}
```

The check uses branch work hours from the auth store (add `workHours` to the compass auth context).

**Step 2: Show branch address in ProfilePage**

Add a section below the user info card showing the branch address if available:

```tsx
{branch?.city && (
    <Typography variant="body2" color="text.secondary">
        {[branch.addressLine1, branch.city, branch.country].filter(Boolean).join(', ')}
    </Typography>
)}
```

**Step 3: Add i18n keys to compass locales**

Add `"outsideWorkHours": "This booking falls outside working hours"` to `compass/src/locales/en/common.json` and Hebrew equivalent to `he/common.json`.

**Step 4: Commit**

```bash
git add compass/
git commit -m "feat(compass): add work hours warning and branch address to mobile app (Phase 21)"
```

---

### Task 7: Phase 21 Verification

**Step 1: Run all server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass.

**Step 2: Run client type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Run server type check**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

---

## Phase 22: Organizational Structure (Departments + Teams)

### Task 8: Database Schema — Department, Team, TeamMember Models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add Department model**

```prisma
model Department {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid
  name        String   @db.VarChar(100)
  code        String?  @db.VarChar(20)
  parentId    String?  @db.Uuid
  managerId   String?  @db.Uuid
  color       String?  @db.VarChar(7)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent      Department?   @relation("DeptHierarchy", fields: [parentId], references: [id])
  children    Department[]  @relation("DeptHierarchy")
  manager     CompanyUser?  @relation("DeptManager", fields: [managerId], references: [id])
  members     CompanyUser[] @relation("DeptMembers")
  teams       Team[]

  @@unique([companyId, code])
  @@index([companyId, isActive])
  @@map("departments")
}
```

**Step 2: Add Team and TeamMember models**

```prisma
model Team {
  id           String   @id @default(uuid()) @db.Uuid
  companyId    String   @db.Uuid
  departmentId String?  @db.Uuid
  name         String   @db.VarChar(100)
  leadId       String?  @db.Uuid
  color        String?  @db.VarChar(7)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company      Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  department   Department?  @relation(fields: [departmentId], references: [id])
  lead         CompanyUser? @relation("TeamLead", fields: [leadId], references: [id])
  members      TeamMember[]

  @@index([companyId])
  @@map("teams")
}

model TeamMember {
  id            String   @id @default(uuid()) @db.Uuid
  teamId        String   @db.Uuid
  companyUserId String   @db.Uuid
  role          String   @default("MEMBER") @db.VarChar(20)
  joinedAt      DateTime @default(now())

  team          Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  companyUser   CompanyUser @relation(fields: [companyUserId], references: [id], onDelete: Cascade)

  @@unique([teamId, companyUserId])
  @@index([companyUserId])
  @@map("team_members")
}
```

**Step 3: Add org fields to CompanyUser model**

Add to the existing CompanyUser model:

```prisma
  departmentId     String?  @db.Uuid
  jobTitle         String?  @db.VarChar(100)
  employeeNumber   String?  @db.VarChar(50)
  managerId        String?  @db.Uuid
  costCenter       String?  @db.VarChar(50)
  workSchedule     Json?
  isRemote         Boolean  @default(false)

  department       Department?  @relation("DeptMembers", fields: [departmentId], references: [id])
  manager          CompanyUser? @relation("ManagerReports", fields: [managerId], references: [id])
  directReports    CompanyUser[] @relation("ManagerReports")
  teamMemberships  TeamMember[]
  managedDepartments Department[] @relation("DeptManager")
  ledTeams         Team[]       @relation("TeamLead")
```

Also add to Company model:
```prisma
  departments     Department[]
  teams           Team[]
```

**Step 4: Generate migration**

Run: `cd server && npx prisma migrate dev --name phase22_org_structure`
Expected: Migration created, no errors.

**Step 5: Verify**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

**Step 6: Commit**

```bash
git add server/prisma/
git commit -m "feat(compass): add Department, Team, TeamMember schema and CompanyUser org fields (Phase 22)"
```

---

### Task 9: Compass Organization Feature Module — Server

**Files:**
- Create: `server/src/features/compass-organization/types.ts`
- Create: `server/src/features/compass-organization/service.ts`
- Create: `server/src/features/compass-organization/controller.ts`
- Create: `server/src/features/compass-organization/routes.ts`
- Create: `server/src/features/compass-organization/index.ts`
- Modify: `server/src/app.ts`

**Step 1: Create types with Zod schemas**

```typescript
// server/src/features/compass-organization/types.ts
import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().max(20).optional(),
    parentId: z.string().uuid().nullable().optional(),
    managerId: z.string().uuid().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTeamSchema = z.object({
    name: z.string().min(1).max(100),
    departmentId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addTeamMemberSchema = z.object({
    companyUserId: z.string().uuid(),
    role: z.enum(['MEMBER', 'LEAD']).optional(),
});
```

**Step 2: Create service with cycle detection**

```typescript
// server/src/features/compass-organization/service.ts
import { badRequest, notFound } from '../../shared/middleware/index.js';
import { prisma } from '../../config/index.js';

const MAX_DEPTH = 5;

async function detectCycle(companyId: string, departmentId: string, parentId: string): Promise<boolean> {
    let currentId: string | null = parentId;
    let depth = 0;
    while (currentId && depth < MAX_DEPTH) {
        if (currentId === departmentId) return true;
        const parent = await prisma.department.findUnique({
            where: { id: currentId },
            select: { parentId: true },
        });
        currentId = parent?.parentId ?? null;
        depth++;
    }
    return depth >= MAX_DEPTH;
}

export const createDepartment = async (companyId: string, data: {
    name: string;
    code?: string;
    parentId?: string | null;
    managerId?: string | null;
    color?: string;
    sortOrder?: number;
}) => {
    if (data.parentId) {
        const parent = await prisma.department.findUnique({ where: { id: data.parentId } });
        if (!parent || parent.companyId !== companyId) throw notFound('Parent department not found');
        // Check depth
        let depth = 1;
        let currentId: string | null = data.parentId;
        while (currentId) {
            const p = await prisma.department.findUnique({ where: { id: currentId }, select: { parentId: true } });
            currentId = p?.parentId ?? null;
            depth++;
        }
        if (depth > MAX_DEPTH) throw badRequest('MAX_DEPARTMENT_DEPTH_EXCEEDED');
    }

    return prisma.department.create({
        data: { companyId, ...data },
        include: { manager: { select: { displayName: true } } },
    });
};

export const listDepartments = async (companyId: string) => {
    return prisma.department.findMany({
        where: { companyId, isActive: true },
        include: {
            manager: { select: { id: true, displayName: true } },
            _count: { select: { members: true, children: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

export const updateDepartment = async (companyId: string, id: string, data: Record<string, any>) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.companyId !== companyId) throw notFound('Department not found');

    if (data.parentId) {
        const hasCycle = await detectCycle(companyId, id, data.parentId);
        if (hasCycle) throw badRequest('CIRCULAR_DEPARTMENT_HIERARCHY');
    }

    return prisma.department.update({ where: { id }, data });
};

export const deleteDepartment = async (companyId: string, id: string) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.companyId !== companyId) throw notFound('Department not found');
    return prisma.department.update({ where: { id }, data: { isActive: false } });
};

// Team CRUD follows same pattern...
export const createTeam = async (companyId: string, data: {
    name: string;
    departmentId?: string | null;
    leadId?: string | null;
    color?: string;
}) => {
    return prisma.team.create({
        data: { companyId, ...data },
        include: { lead: { select: { displayName: true } }, _count: { select: { members: true } } },
    });
};

export const listTeams = async (companyId: string) => {
    return prisma.team.findMany({
        where: { companyId, isActive: true },
        include: {
            lead: { select: { id: true, displayName: true } },
            department: { select: { id: true, name: true } },
            _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
    });
};

export const addTeamMember = async (companyId: string, teamId: string, companyUserId: string, role = 'MEMBER') => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    const user = await prisma.companyUser.findUnique({ where: { id: companyUserId } });
    if (!user || user.companyId !== companyId) throw notFound('Employee not found');

    return prisma.teamMember.create({
        data: { teamId, companyUserId, role },
        include: { companyUser: { select: { displayName: true, email: true } } },
    });
};

export const removeTeamMember = async (companyId: string, teamId: string, companyUserId: string) => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    const member = await prisma.teamMember.findUnique({
        where: { teamId_companyUserId: { teamId, companyUserId } },
    });
    if (!member) throw notFound('Member not found');
    return prisma.teamMember.delete({ where: { id: member.id } });
};
```

**Step 3: Create controller**

```typescript
// server/src/features/compass-organization/controller.ts
import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../shared/middleware/index.js';
import * as service from './service.js';
import {
    createDepartmentSchema, updateDepartmentSchema,
    createTeamSchema, updateTeamSchema, addTeamMemberSchema,
} from './types.js';

// Departments
export const listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await service.listDepartments(req.params.companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = createDepartmentSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request', parsed.error.format());
        const dept = await service.createDepartment(req.params.companyId, parsed.data);
        res.status(201).json({ data: dept });
    } catch (error) { next(error); }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = updateDepartmentSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request', parsed.error.format());
        const dept = await service.updateDepartment(req.params.companyId, req.params.id, parsed.data);
        res.json({ data: dept });
    } catch (error) { next(error); }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteDepartment(req.params.companyId, req.params.id);
        res.json({ message: 'Department deactivated' });
    } catch (error) { next(error); }
};

// Teams — same pattern
export const listTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await service.listTeams(req.params.companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = createTeamSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request', parsed.error.format());
        const team = await service.createTeam(req.params.companyId, parsed.data);
        res.status(201).json({ data: team });
    } catch (error) { next(error); }
};

export const addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = addTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request', parsed.error.format());
        const member = await service.addTeamMember(
            req.params.companyId, req.params.id, parsed.data.companyUserId, parsed.data.role,
        );
        res.status(201).json({ data: member });
    } catch (error) { next(error); }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.removeTeamMember(req.params.companyId, req.params.id, req.params.uid);
        res.json({ message: 'Member removed' });
    } catch (error) { next(error); }
};
```

**Step 4: Create routes**

```typescript
// server/src/features/compass-organization/routes.ts
import { Router } from 'express';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

export const adminDepartmentRoutes = Router();
adminDepartmentRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listDepartments);
adminDepartmentRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createDepartment);
adminDepartmentRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.updateDepartment);
adminDepartmentRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.deleteDepartment);

export const adminTeamRoutes = Router();
adminTeamRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listTeams);
adminTeamRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createTeam);
adminTeamRoutes.post('/:companyId/:id/members', authenticate, requireCompassAdmin(), controller.addMember);
adminTeamRoutes.delete('/:companyId/:id/members/:uid', authenticate, requireCompassAdmin(), controller.removeMember);
```

**Step 5: Create index.ts**

```typescript
// server/src/features/compass-organization/index.ts
export { adminDepartmentRoutes, adminTeamRoutes } from './routes.js';
```

**Step 6: Register routes in app.ts**

In `server/src/app.ts`, add:

```typescript
import { adminDepartmentRoutes, adminTeamRoutes } from './features/compass-organization/index.js';

// After existing compass admin routes:
apiRouter.use('/admin/compass/departments', adminDepartmentRoutes);
apiRouter.use('/admin/compass/teams', adminTeamRoutes);
```

**Step 7: Verify**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

**Step 8: Commit**

```bash
git add server/src/features/compass-organization/ server/src/app.ts
git commit -m "feat(compass): add compass-organization feature module with department and team CRUD (Phase 22)"
```

---

### Task 10: Admin UI — Organization Tab

**Files:**
- Create: `src/features/compass/presentation/CompassOrganizationTab.tsx`
- Modify: `src/features/compass/presentation/CompassPage.tsx`
- Modify: `src/features/compass/infrastructure/compassAdminApi.ts`
- Modify: `src/features/compass/domain/types.ts`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add types**

In `src/features/compass/domain/types.ts`, add:

```typescript
export interface Department {
    id: string;
    name: string;
    code: string | null;
    parentId: string | null;
    manager: { id: string; displayName: string } | null;
    color: string | null;
    sortOrder: number;
    _count: { members: number; children: number };
}

export interface Team {
    id: string;
    name: string;
    department: { id: string; name: string } | null;
    lead: { id: string; displayName: string } | null;
    color: string | null;
    _count: { members: number };
}
```

**Step 2: Add API methods**

In `compassAdminApi.ts`, add:

```typescript
// Departments
listDepartments: (companyId: string) =>
    api.get<{ data: Department[] }>(`/admin/compass/departments/${companyId}`),
createDepartment: (companyId: string, data: Partial<Department>) =>
    api.post(`/admin/compass/departments/${companyId}`, data),
updateDepartment: (companyId: string, id: string, data: Partial<Department>) =>
    api.put(`/admin/compass/departments/${companyId}/${id}`, data),
deleteDepartment: (companyId: string, id: string) =>
    api.delete(`/admin/compass/departments/${companyId}/${id}`),

// Teams
listTeams: (companyId: string) =>
    api.get<{ data: Team[] }>(`/admin/compass/teams/${companyId}`),
createTeam: (companyId: string, data: Partial<Team>) =>
    api.post(`/admin/compass/teams/${companyId}`, data),
addTeamMember: (companyId: string, teamId: string, companyUserId: string) =>
    api.post(`/admin/compass/teams/${companyId}/${teamId}/members`, { companyUserId }),
removeTeamMember: (companyId: string, teamId: string, userId: string) =>
    api.delete(`/admin/compass/teams/${companyId}/${teamId}/members/${userId}`),
```

**Step 3: Create CompassOrganizationTab**

Follow the existing `CompassEmployeesTab.tsx` pattern. The tab has two sections:
- **Departments**: Table with Name, Code, Manager, Members count, Actions (edit/deactivate)
- **Teams**: Table with Name, Department, Lead, Members count, Actions

Create/edit dialogs for both. Use the existing CRUD patterns (useState for dialogs, fetchData callback, etc.).

**Step 4: Add tab to CompassPage**

In `CompassPage.tsx`, add a new `<Tab>` for "Organization" between Employees and Rules:

```tsx
<Tab label={t('compass.organization.title')} />
```

And render `{tab === NEW_INDEX && <CompassOrganizationTab />}`.

**Step 5: Add i18n keys**

Add to both locale files:
```json
"organization": {
    "title": "Organization",
    "departments": "Departments",
    "teams": "Teams",
    "addDepartment": "Add Department",
    "addTeam": "Add Team",
    "parentDepartment": "Parent Department",
    "manager": "Manager",
    "teamLead": "Team Lead",
    "members": "Members",
    "addMember": "Add Member",
    "jobTitle": "Job Title",
    "employeeNumber": "Employee Number",
    "costCenter": "Cost Center",
    "noMembers": "No members yet"
}
```

**Step 6: Add dept/title fields to employee edit**

In `CompassEmployeesTab.tsx`, add Department dropdown and Job Title text field to the employee add/edit dialog.

**Step 7: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add src/features/compass/ src/locales/
git commit -m "feat(compass): add Organization admin tab with departments and teams UI (Phase 22)"
```

---

### Task 11: Phase 22 — Unit Tests + Compass Mobile Updates

**Files:**
- Create: `server/src/features/compass-organization/__tests__/service.test.ts`
- Modify: `compass/src/features/profile/presentation/ProfilePage.tsx`
- Modify: `compass/src/features/friends/presentation/FriendsPage.tsx`

**Step 1: Write service tests**

Test cycle detection, depth limit, department/team CRUD. Follow the existing booking service test pattern with mocked Prisma.

**Step 2: Update compass mobile profile to show department**

**Step 3: Add department badge to friends page**

**Step 4: Run all tests and commit**

```bash
cd server && npx vitest run
git add server/src/features/compass-organization/__tests__/ compass/
git commit -m "feat(compass): add organization tests and mobile app updates (Phase 22)"
```

---

## Phase 23: Space Types + Amenities + Neighborhoods

### Task 12: Database Schema — SpaceType Enum, Amenity, Neighborhood Models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add SpaceType enum**

```prisma
enum SpaceType {
  DESK
  MEETING_ROOM
  PHONE_BOOTH
  COLLABORATION_ZONE
  PARKING
  LOCKER
  EVENT_SPACE
}
```

**Step 2: Add Amenity, SpaceAmenity, and Neighborhood models**

```prisma
model Amenity {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.Uuid
  name        String   @db.VarChar(100)
  nameHe      String?  @db.VarChar(100)
  icon        String?  @db.VarChar(50)
  category    String   @db.VarChar(50)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  spaces      SpaceAmenity[]

  @@unique([companyId, name])
  @@index([companyId, isActive])
  @@map("amenities")
}

model SpaceAmenity {
  spaceId     String   @db.Uuid
  amenityId   String   @db.Uuid
  quantity    Int      @default(1)

  space       Space    @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  amenity     Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([spaceId, amenityId])
  @@index([amenityId])
  @@map("space_amenities")
}

model Neighborhood {
  id           String   @id @default(uuid()) @db.Uuid
  floorId      String   @db.Uuid
  departmentId String?  @db.Uuid
  name         String   @db.VarChar(100)
  color        String?  @db.VarChar(7)
  description  String?  @db.VarChar(500)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  floor        Floor        @relation(fields: [floorId], references: [id], onDelete: Cascade)
  department   Department?  @relation(fields: [departmentId], references: [id])
  spaces       Space[]

  @@map("neighborhoods")
}
```

**Step 3: Add new fields to Space model**

```prisma
  spaceType           SpaceType?
  neighborhoodId      String?    @db.Uuid
  neighborhood        Neighborhood? @relation(fields: [neighborhoodId], references: [id])
  minCapacity         Int?
  maxCapacity         Int?
  structuredAmenities SpaceAmenity[]
```

Also add relations to Company:
```prisma
  amenities       Amenity[]
```

**Step 4: Generate migration**

Run: `cd server && npx prisma migrate dev --name phase23_space_taxonomy`

**Step 5: Write data migration script for existing data**

Create a seed/migration script that:
1. Backfills `spaceType` from company settings
2. Migrates `compassAmenities` string[] to SpaceAmenity records
3. Copies `compassCapacity` to `maxCapacity`

This can be a Prisma seed function or a standalone script.

**Step 6: Verify and commit**

```bash
git add server/prisma/
git commit -m "feat(compass): add SpaceType, Amenity, Neighborhood schema (Phase 23)"
```

---

### Task 13: Compass Amenities Feature Module — Server

**Files:**
- Create: `server/src/features/compass-amenities/types.ts`
- Create: `server/src/features/compass-amenities/service.ts`
- Create: `server/src/features/compass-amenities/controller.ts`
- Create: `server/src/features/compass-amenities/routes.ts`
- Create: `server/src/features/compass-amenities/index.ts`
- Modify: `server/src/app.ts`

Follow the exact same pattern as compass-organization (Task 9). Implement:

**Admin endpoints:**
```
GET    /admin/compass/amenities/:companyId         — List amenity catalog
POST   /admin/compass/amenities/:companyId         — Create amenity
PUT    /admin/compass/amenities/:companyId/:id      — Update amenity
DELETE /admin/compass/amenities/:companyId/:id      — Delete (soft) amenity

GET    /admin/compass/neighborhoods/:storeId        — List neighborhoods
POST   /admin/compass/neighborhoods/:storeId        — Create neighborhood
PUT    /admin/compass/neighborhoods/:storeId/:id     — Update neighborhood
DELETE /admin/compass/neighborhoods/:storeId/:id     — Delete (soft) neighborhood
```

**Compass read-only endpoints:**
```
GET    /compass/amenities           — List amenities for filter UI
GET    /compass/neighborhoods       — List neighborhoods for current floor
```

Register all routes in `app.ts`.

**Commit:**
```bash
git add server/src/features/compass-amenities/ server/src/app.ts
git commit -m "feat(compass): add compass-amenities feature module (Phase 23)"
```

---

### Task 14: Update Space Queries for Type/Amenity Filtering

**Files:**
- Modify: `server/src/features/compass-spaces/service.ts`
- Modify: `server/src/features/compass-spaces/repository.ts`
- Modify: `server/src/shared/infrastructure/services/articleBuilder.ts`

**Step 1: Add type, amenity, and neighborhood filtering to space queries**

In the spaces repository, update the `findMany` query to accept optional filters:

```typescript
if (filters.spaceType) {
    where.spaceType = filters.spaceType;
}
if (filters.amenities?.length) {
    where.structuredAmenities = {
        some: { amenity: { name: { in: filters.amenities } } },
    };
}
if (filters.neighborhoodId) {
    where.neighborhoodId = filters.neighborhoodId;
}
```

**Step 2: Update article builder**

In `buildSpaceArticle()`, add:

```typescript
if (compassData?.spaceType) data['SPACE_TYPE'] = compassData.spaceType;
```

This is additive — existing compass fields continue to work. Non-compass companies are unaffected (spaceType is null).

**Step 3: Verify and commit**

```bash
git add server/src/features/compass-spaces/ server/src/shared/infrastructure/services/articleBuilder.ts
git commit -m "feat(compass): add space type, amenity, and neighborhood filtering (Phase 23)"
```

---

### Task 15: Admin UI — Amenities & Neighborhoods Tabs

**Files:**
- Create: `src/features/compass/presentation/CompassAmenitiesTab.tsx`
- Create: `src/features/compass/presentation/CompassNeighborhoodsTab.tsx`
- Modify: `src/features/compass/presentation/CompassPage.tsx`
- Modify: `src/features/compass/presentation/CompassSpacesTab.tsx`
- Modify: `src/features/compass/infrastructure/compassAdminApi.ts`
- Modify: `src/features/compass/domain/types.ts`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add types for Amenity and Neighborhood**

**Step 2: Add API methods for amenities and neighborhoods**

**Step 3: Create CompassAmenitiesTab**

Table with: Name, Hebrew Name, Icon, Category, Actions. Add dialog with all fields.

**Step 4: Create CompassNeighborhoodsTab**

Table with: Name, Floor, Department, Color, Actions. Add dialog.

**Step 5: Add tabs to CompassPage**

Add "Amenities" and "Neighborhoods" tabs.

**Step 6: Update CompassSpacesTab**

Add Type dropdown column (inline, like mode dropdown), Neighborhood column, Amenity chips.

**Step 7: Add i18n keys**

```json
"spaceTypes": {
    "DESK": "Desk",
    "MEETING_ROOM": "Meeting Room",
    "PHONE_BOOTH": "Phone Booth",
    "COLLABORATION_ZONE": "Collaboration Zone",
    "PARKING": "Parking",
    "LOCKER": "Locker",
    "EVENT_SPACE": "Event Space"
},
"amenities": {
    "title": "Amenities",
    "addAmenity": "Add Amenity",
    "category": "Category",
    "EQUIPMENT": "Equipment",
    "FURNITURE": "Furniture",
    "ACCESSIBILITY": "Accessibility",
    "CONNECTIVITY": "Connectivity"
},
"neighborhoods": {
    "title": "Neighborhoods",
    "addNeighborhood": "Add Neighborhood",
    "departmentAffinity": "Department Affinity"
}
```

And Hebrew equivalents.

**Step 8: Verify and commit**

```bash
git add src/features/compass/ src/locales/
git commit -m "feat(compass): add Amenities and Neighborhoods admin tabs (Phase 23)"
```

---

### Task 16: Compass Mobile — Type/Amenity Filters + Display

**Files:**
- Modify: `compass/src/features/booking/presentation/FindPage.tsx`
- Modify: `compass/src/features/booking/presentation/SpaceCard.tsx`
- Modify: `compass/src/features/booking/application/useSpacesStore.ts`
- Modify: `compass/src/locales/en/common.json`
- Modify: `compass/src/locales/he/common.json`

**Step 1: Add type filter chips to FindPage**

Below the search bar, add filter chips: "All" | "Desk" | "Meeting Room" | "Phone Booth" etc. Use `<Chip>` components with `onClick` to set filter.

**Step 2: Add amenity filter**

Add a multi-select chip group for common amenities (fetched from API).

**Step 3: Show type icon and amenity icons on SpaceCard**

Use MUI icons mapped to space types:
- DESK → `DeskIcon`
- MEETING_ROOM → `MeetingRoomIcon`
- PHONE_BOOTH → `PhoneIcon`

Show up to 4 amenity icons as small chips.

**Step 4: Update spaces store with filter params**

Pass `spaceType`, `amenities`, `neighborhoodId` query params to the spaces API.

**Step 5: Add i18n keys and commit**

```bash
git add compass/
git commit -m "feat(compass): add type and amenity filters to mobile find page (Phase 23)"
```

---

## Phase 24: Recurring Bookings

### Task 17: Database Schema — Recurrence Fields

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add BookingType enum**

```prisma
enum BookingType {
  HOT_DESK
  MEETING
  ADMIN_RESERVE
  PERMANENT
}
```

**Step 2: Add recurrence fields to Booking model**

```prisma
  bookingType       BookingType  @default(HOT_DESK)
  recurrenceRule    String?   @db.VarChar(255)   // iCal RRULE
  recurrenceGroupId String?   @db.Uuid
  isRecurrence      Boolean   @default(false)
  parentBookingId   String?   @db.Uuid
  bookedById        String?   @db.Uuid
```

Add indexes:
```prisma
  @@index([recurrenceGroupId])
```

**Step 3: Generate migration and commit**

```bash
cd server && npx prisma migrate dev --name phase24_recurring_bookings
git add server/prisma/
git commit -m "feat(compass): add BookingType enum and recurrence fields (Phase 24)"
```

---

### Task 18: Install rrule + Implement RecurrenceService

**Files:**
- Create: `server/src/features/compass-bookings/recurrenceService.ts`
- Create: `server/src/features/compass-bookings/__tests__/recurrenceService.test.ts`

**Step 1: Install rrule**

Run: `cd server && npm install rrule`

**Step 2: Write failing tests**

```typescript
// server/src/features/compass-bookings/__tests__/recurrenceService.test.ts
import { describe, it, expect } from 'vitest';
import { generateInstances, MAX_INSTANCES } from '../recurrenceService.js';

describe('generateInstances', () => {
    it('should generate daily instances for 5 days', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;COUNT=5',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates).toHaveLength(5);
        expect(dates[0].getDate()).toBe(9);
        expect(dates[4].getDate()).toBe(13);
    });

    it('should generate weekly Mon/Wed/Fri instances', () => {
        const dates = generateInstances({
            rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates).toHaveLength(6);
    });

    it('should cap at MAX_INSTANCES', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;COUNT=200',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates.length).toBeLessThanOrEqual(MAX_INSTANCES);
    });

    it('should reject rules without COUNT or UNTIL', () => {
        expect(() => generateInstances({
            rrule: 'FREQ=DAILY',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        })).toThrow();
    });
});
```

**Step 3: Implement RecurrenceService**

```typescript
// server/src/features/compass-bookings/recurrenceService.ts
import { RRule, rrulestr } from 'rrule';
import { badRequest } from '../../shared/middleware/index.js';

export const MAX_INSTANCES = 90;

export function generateInstances(params: {
    rrule: string;
    startTime: string;  // "09:00"
    endTime: string | null;
    refDate: Date;
}): Date[] {
    const ruleStr = params.rrule;

    // Safety: must have COUNT or UNTIL
    if (!ruleStr.includes('COUNT') && !ruleStr.includes('UNTIL')) {
        throw badRequest('RRULE must have COUNT or UNTIL to prevent infinite generation');
    }

    const rule = rrulestr(`DTSTART:${formatRRuleDate(params.refDate)}\nRRULE:${ruleStr}`);
    const dates = rule.all((_, i) => i < MAX_INSTANCES);

    // Apply time of day
    const [startH, startM] = params.startTime.split(':').map(Number);
    return dates.map(d => {
        const result = new Date(d);
        result.setUTCHours(startH, startM, 0, 0);
        return result;
    });
}

function formatRRuleDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('T', 'T');
}

export async function createRecurringSeries(params: {
    rrule: string;
    startTime: string;
    endTime: string | null;
    spaceId: string;
    companyUserId: string;
    companyId: string;
    branchId: string;
    notes?: string;
    bookedBy?: string;
    prisma: any;
}): Promise<{ groupId: string; created: any[]; conflicts: Date[] }> {
    const { v4: uuid } = await import('uuid');
    const groupId = uuid();
    const dates = generateInstances({
        rrule: params.rrule,
        startTime: params.startTime,
        endTime: params.endTime,
        refDate: new Date(),
    });

    // Calculate duration
    let durationMs: number | null = null;
    if (params.endTime) {
        const [endH, endM] = params.endTime.split(':').map(Number);
        const [startH, startM] = params.startTime.split(':').map(Number);
        durationMs = ((endH * 60 + endM) - (startH * 60 + startM)) * 60 * 1000;
    }

    // Batch conflict check — one query for all dates
    const conflicts: Date[] = [];
    const nonConflicting: Date[] = [];

    const existingBookings = await params.prisma.booking.findMany({
        where: {
            spaceId: params.spaceId,
            status: { in: ['BOOKED', 'CHECKED_IN'] },
            startTime: { in: dates },
        },
        select: { startTime: true },
    });

    const conflictSet = new Set(existingBookings.map((b: any) => b.startTime.toISOString()));

    for (const date of dates) {
        if (conflictSet.has(date.toISOString())) {
            conflicts.push(date);
        } else {
            nonConflicting.push(date);
        }
    }

    // Create all non-conflicting instances
    const created = await params.prisma.booking.createMany({
        data: nonConflicting.map(date => ({
            companyUserId: params.companyUserId,
            spaceId: params.spaceId,
            branchId: params.branchId,
            companyId: params.companyId,
            startTime: date,
            endTime: durationMs ? new Date(date.getTime() + durationMs) : null,
            status: 'BOOKED',
            bookingType: 'HOT_DESK',
            recurrenceRule: params.rrule,
            recurrenceGroupId: groupId,
            isRecurrence: true,
            bookedBy: params.bookedBy,
            notes: params.notes,
        })),
    });

    return { groupId, created, conflicts };
}
```

**Step 4: Run tests**

Run: `cd server && npx vitest run src/features/compass-bookings/__tests__/recurrenceService.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add server/src/features/compass-bookings/recurrenceService.ts server/src/features/compass-bookings/__tests__/recurrenceService.test.ts server/package.json server/package-lock.json
git commit -m "feat(compass): add RecurrenceService with rrule support (Phase 24)"
```

---

### Task 19: Integrate Recurrence into Booking Creation

**Files:**
- Modify: `server/src/features/compass-bookings/types.ts`
- Modify: `server/src/features/compass-bookings/service.ts`
- Modify: `server/src/features/compass-bookings/controller.ts`
- Modify: `server/src/features/compass-bookings/routes.ts`

**Step 1: Update schemas to accept recurrenceRule**

In `types.ts`, add to both `createBookingSchema` and `adminCreateBookingSchema`:

```typescript
recurrenceRule: z.string().max(255).optional(),
```

**Step 2: Update booking service**

In the `createBooking` function, check for `recurrenceRule`:

```typescript
if (params.recurrenceRule) {
    return createRecurringSeries({
        rrule: params.recurrenceRule,
        startTime: params.startTime.toISOString().slice(11, 16),
        endTime: params.endTime?.toISOString().slice(11, 16) ?? null,
        spaceId: params.spaceId,
        companyUserId: params.companyUserId,
        companyId: params.companyId,
        branchId: params.branchId,
        notes: params.notes,
        bookedBy: params.bookedBy,
        prisma,
    });
}
```

**Step 3: Add cancel scope to delete endpoint**

In `controller.ts`, modify the cancel handler to accept `scope` query param:

```typescript
const scope = req.query.scope as string | undefined; // 'instance' | 'future' | 'all'

if (scope === 'all' && booking.recurrenceGroupId) {
    await prisma.booking.updateMany({
        where: { recurrenceGroupId: booking.recurrenceGroupId, status: { in: ['BOOKED'] } },
        data: { status: 'CANCELLED' },
    });
} else if (scope === 'future' && booking.recurrenceGroupId) {
    await prisma.booking.updateMany({
        where: {
            recurrenceGroupId: booking.recurrenceGroupId,
            startTime: { gte: booking.startTime },
            status: { in: ['BOOKED'] },
        },
        data: { status: 'CANCELLED' },
    });
} else {
    // Single instance cancel (existing behavior)
    await service.cancelBooking(booking.id);
}
```

**Step 4: Verify and commit**

```bash
cd server && npx tsc --noEmit
git add server/src/features/compass-bookings/
git commit -m "feat(compass): integrate recurring bookings into creation and cancel flows (Phase 24)"
```

---

### Task 20: Admin UI — Recurrence in Reserve Dialog

**Files:**
- Modify: `src/features/compass/presentation/CompassBookingsTab.tsx`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add recurrence picker to Reserve Space dialog**

Add a section between the end time and notes fields:

```tsx
<TextField
    select
    label={t('compass.recurrence.title')}
    value={recurrenceType}
    onChange={(e) => setRecurrenceType(e.target.value)}
    fullWidth
>
    <MenuItem value="none">{t('compass.recurrence.none')}</MenuItem>
    <MenuItem value="daily">{t('compass.recurrence.daily')}</MenuItem>
    <MenuItem value="weekdays">{t('compass.recurrence.weekdays')}</MenuItem>
    <MenuItem value="weekly">{t('compass.recurrence.weekly')}</MenuItem>
</TextField>

{recurrenceType !== 'none' && (
    <TextField
        label={t('compass.recurrence.endsOn')}
        type="date"
        value={recurrenceEndDate}
        onChange={(e) => setRecurrenceEndDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
    />
)}
```

Convert the selected recurrence type to an RRULE string before sending to the API.

**Step 2: Show recurrence icon on recurring bookings**

In the bookings table, show a repeat icon next to recurring bookings:

```tsx
{b.isRecurrence && <RepeatIcon fontSize="small" sx={{ ml: 0.5 }} />}
```

**Step 3: Add cancel scope dialog**

When cancelling a recurring booking, show options: "This booking only" / "This and future" / "Entire series":

```tsx
{booking.recurrenceGroupId && (
    <RadioGroup value={cancelScope} onChange={(e) => setCancelScope(e.target.value)}>
        <FormControlLabel value="instance" control={<Radio />} label={t('compass.recurrence.cancelInstance')} />
        <FormControlLabel value="future" control={<Radio />} label={t('compass.recurrence.cancelFuture')} />
        <FormControlLabel value="all" control={<Radio />} label={t('compass.recurrence.cancelSeries')} />
    </RadioGroup>
)}
```

**Step 4: Add i18n keys**

```json
"recurrence": {
    "title": "Repeat",
    "none": "Does not repeat",
    "daily": "Daily",
    "weekdays": "Every weekday",
    "weekly": "Weekly",
    "custom": "Custom",
    "endsOn": "Ends on",
    "conflicts": "{{count}} dates have conflicts",
    "bookRemaining": "Book remaining {{count}}",
    "cancelInstance": "Cancel this booking",
    "cancelFuture": "Cancel this and future bookings",
    "cancelSeries": "Cancel entire series",
    "partOfSeries": "Part of a series"
}
```

And Hebrew equivalents.

**Step 5: Verify and commit**

```bash
npx tsc --noEmit
git add src/features/compass/ src/locales/
git commit -m "feat(compass): add recurring booking UI to admin reserve dialog (Phase 24)"
```

---

### Task 21: Compass Mobile — Recurring Bookings

**Files:**
- Modify: `compass/src/features/booking/presentation/BookingDialog.tsx`
- Modify: `compass/src/features/booking/presentation/BookingsPage.tsx`
- Modify: `compass/src/features/booking/application/useBookingStore.ts`
- Modify: `compass/src/locales/en/common.json`
- Modify: `compass/src/locales/he/common.json`

**Step 1: Add recurrence toggle to BookingDialog**

Add a recurrence section with day selector (Mon-Sun checkboxes) and end date picker. Build the RRULE string from the selected days.

**Step 2: Group recurring instances in BookingsPage**

Group bookings by `recurrenceGroupId` and show a "Part of series" badge.

**Step 3: Add cancel scope dialog**

When cancelling a recurring booking, show the same 3 options as admin UI.

**Step 4: Update booking store**

Add `recurrenceRule` to `CreateBookingRequest` and handle cancel scope.

**Step 5: Add i18n keys and commit**

```bash
git add compass/
git commit -m "feat(compass): add recurring booking support to mobile app (Phase 24)"
```

---

### Task 22: Final Verification — All Phases

**Step 1: Run server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass.

**Step 2: Run server type check**

Run: `cd server && npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Run client type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 4: Review all changes**

Run: `git log --oneline main..HEAD`

Verify each commit corresponds to a clean, self-contained change.

**Step 5: Final commit — update implementation TODO**

Update `docs/architecture/compass/17-IMPLEMENTATION-TODO.md` to mark completed phases.

```bash
git add docs/
git commit -m "docs: mark Phases 21-24 as completed in implementation TODO"
```

---

## Summary

| Task | Phase | Description | Files Changed |
|------|-------|-------------|---------------|
| 1 | 21 | Prisma schema — work config + store address | 1 |
| 2 | 21 | Work hours resolution service + tests | 2 |
| 3 | 21 | Rule engine work hours integration | 3 |
| 4 | 21 | Companies/settings API for new fields | 4 |
| 5 | 21 | Admin UI — work hours settings | 5 |
| 6 | 21 | Compass mobile — work hours warning | 4 |
| 7 | 21 | Phase 21 verification | 0 |
| 8 | 22 | Prisma schema — Department, Team, TeamMember | 1 |
| 9 | 22 | compass-organization feature module | 6 |
| 10 | 22 | Admin UI — Organization tab | 6 |
| 11 | 22 | Tests + compass mobile updates | 3 |
| 12 | 23 | Prisma schema — SpaceType, Amenity, Neighborhood | 1 |
| 13 | 23 | compass-amenities feature module | 6 |
| 14 | 23 | Space query updates + article builder | 3 |
| 15 | 23 | Admin UI — Amenities & Neighborhoods tabs | 8 |
| 16 | 23 | Compass mobile — type/amenity filters | 5 |
| 17 | 24 | Prisma schema — recurrence fields | 1 |
| 18 | 24 | RecurrenceService + rrule + tests | 2 |
| 19 | 24 | Integration into booking flows | 4 |
| 20 | 24 | Admin UI — recurrence in reserve dialog | 3 |
| 21 | 24 | Compass mobile — recurring bookings | 5 |
| 22 | ALL | Final verification | 1 |

**Total: 22 tasks across 4 phases**
