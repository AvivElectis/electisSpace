# Enhanced Space Dialog Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal Add Space and separate Edit Space dialogs with a single unified dialog containing all space fields.

**Architecture:** Server-first approach — extend the `updateSpaceProperties` endpoint to accept new fields (amenityIds, minCapacity, maxCapacity, permanentAssigneeId, sortOrder), then build a unified client dialog component. The dialog is used for both create and edit modes.

**Tech Stack:** React 19, MUI 7, Zustand, Zod (server validation), Prisma 7, i18next

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/src/features/compass-spaces/types.ts` | Add new fields to Zod schema |
| Modify | `server/src/features/compass-spaces/repository.ts` | Add amenity sync, extend updateCompassProperties |
| Modify | `server/src/features/compass-spaces/service.ts` | Pass new fields through, handle amenityIds |
| Modify | `server/src/features/compass-spaces/controller.ts` | Pass new fields from parsed body |
| Modify | `src/features/compass/domain/types.ts` | Extend CompassSpace interface |
| Modify | `src/features/compass/infrastructure/compassAdminApi.ts` | Extend updateSpaceProperties params |
| Modify | `src/features/compass/presentation/CompassSpacesTab.tsx` | Replace both dialogs with unified SpaceDialog |
| Modify | `src/locales/en/common.json` | Add new translation keys |
| Modify | `src/locales/he/common.json` | Add Hebrew translations |

---

## Task 1: Extend Server Schema and Repository

**Files:**
- Modify: `server/src/features/compass-spaces/types.ts`
- Modify: `server/src/features/compass-spaces/repository.ts`

- [ ] **Step 1: Extend the Zod schema**

In `server/src/features/compass-spaces/types.ts`, extend `updateSpacePropertiesSchema`:

```typescript
export const updateSpacePropertiesSchema = z.object({
    compassSpaceType: z.enum([
        'DESK', 'MEETING_ROOM', 'PHONE_BOOTH',
        'COLLABORATION_ZONE', 'PARKING', 'LOCKER', 'EVENT_SPACE',
    ]).nullable().optional(),
    compassCapacity: z.number().int().min(0).nullable().optional(),
    minCapacity: z.number().int().min(0).nullable().optional(),
    maxCapacity: z.number().int().min(0).nullable().optional(),
    buildingId: z.string().uuid().nullable().optional(),
    floorId: z.string().uuid().nullable().optional(),
    areaId: z.string().uuid().nullable().optional(),
    neighborhoodId: z.string().uuid().nullable().optional(),
    permanentAssigneeId: z.string().uuid().nullable().optional(),
    amenityIds: z.array(z.string().uuid()).optional(),
    sortOrder: z.number().int().min(0).optional(),
});
```

- [ ] **Step 2: Add amenity sync function to repository**

In `server/src/features/compass-spaces/repository.ts`, add at the end before the Buildings section:

```typescript
// ─── Admin: Sync Space Amenities ────────────────────

export const syncSpaceAmenities = async (
    spaceId: string,
    amenityIds: string[],
) => {
    return prisma.$transaction(async (tx) => {
        // Delete existing
        await tx.spaceAmenity.deleteMany({ where: { spaceId } });
        // Insert new
        if (amenityIds.length > 0) {
            await tx.spaceAmenity.createMany({
                data: amenityIds.map((amenityId) => ({ spaceId, amenityId })),
            });
        }
    });
};
```

- [ ] **Step 3: Extend updateCompassProperties to accept new fields**

In `server/src/features/compass-spaces/repository.ts`, update `updateCompassProperties`:

```typescript
export const updateCompassProperties = async (
    spaceId: string,
    data: {
        compassSpaceType?: string | null;
        compassCapacity?: number | null;
        minCapacity?: number | null;
        maxCapacity?: number | null;
        buildingId?: string | null;
        floorId?: string | null;
        areaId?: string | null;
        neighborhoodId?: string | null;
        permanentAssigneeId?: string | null;
        sortOrder?: number;
    },
) => {
    return prisma.space.update({
        where: { id: spaceId },
        data: data as any,
    });
};
```

- [ ] **Step 4: Fix admin list to show all compass modes**

In `server/src/features/compass-spaces/repository.ts`, update `findCompassSpaces` to accept an `includeAllModes` param:

Add to the params interface: `includeAllModes?: boolean;`

Change the compassMode filter logic (line 20-22):

```typescript
compassMode: params.includeAllModes
    ? { not: null }
    : params.compassMode
        ? params.compassMode
        : { in: ['AVAILABLE', 'PERMANENT'] },
```

- [ ] **Step 5: Commit server schema + repository changes**

```bash
git add server/src/features/compass-spaces/types.ts server/src/features/compass-spaces/repository.ts
git commit -m "feat(server): extend space properties schema with amenities, capacity, assignee, sortOrder"
```

---

## Task 2: Extend Server Service and Controller

**Files:**
- Modify: `server/src/features/compass-spaces/service.ts`
- Modify: `server/src/features/compass-spaces/controller.ts`

- [ ] **Step 1: Extend service to handle amenityIds and new fields**

In `server/src/features/compass-spaces/service.ts`, update `updateSpaceProperties`:

```typescript
export const updateSpaceProperties = async (
    spaceId: string,
    data: {
        compassSpaceType?: string | null;
        compassCapacity?: number | null;
        minCapacity?: number | null;
        maxCapacity?: number | null;
        buildingId?: string | null;
        floorId?: string | null;
        areaId?: string | null;
        neighborhoodId?: string | null;
        permanentAssigneeId?: string | null;
        amenityIds?: string[];
        sortOrder?: number;
    },
) => {
    const space = await repo.findSpaceById(spaceId);
    if (!space) {
        throw notFound('Space not found');
    }

    // Extract amenityIds — handled separately via join table
    const { amenityIds, ...spaceData } = data;

    await repo.updateCompassProperties(spaceId, spaceData);

    if (amenityIds !== undefined) {
        await repo.syncSpaceAmenities(spaceId, amenityIds);
    }

    return { success: true };
};
```

- [ ] **Step 2: Update controller to pass new fields**

In `server/src/features/compass-spaces/controller.ts`, update `updateProperties`:

```typescript
export const updateProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = updateSpacePropertiesSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest('Invalid request', parsed.error.format());
        }

        const user = req.user!;
        if (!isPlatformAdmin(user)) {
            const spaceRecord = await prisma.space.findUnique({
                where: { id: req.params.id as string },
                select: { store: { select: { companyId: true } } },
            });
            if (!spaceRecord) throw badRequest('Space not found');
            if (!canManageCompany(user, spaceRecord.store.companyId)) {
                throw forbidden('Not authorized to manage this company');
            }
        }

        const result = await service.updateSpaceProperties(req.params.id as string, parsed.data as any);
        res.json({ data: result });
    } catch (error) {
        next(error);
    }
};
```

- [ ] **Step 3: Update admin list to include all modes**

In `server/src/features/compass-spaces/service.ts`, add `includeAllModes` to `listSpaces` params interface and pass it through to the repository:

Add to params type: `includeAllModes?: boolean;`

In `server/src/features/compass-spaces/controller.ts`, update `adminList` to pass `includeAllModes: true`:

```typescript
const spaces = await service.listSpaces({ branchId, includeAllModes: true });
```

- [ ] **Step 4: Commit service + controller changes**

```bash
git add server/src/features/compass-spaces/service.ts server/src/features/compass-spaces/controller.ts
git commit -m "feat(server): wire up amenityIds sync, new fields in space properties controller"
```

---

## Task 3: Extend Client Types and API

**Files:**
- Modify: `src/features/compass/domain/types.ts`
- Modify: `src/features/compass/infrastructure/compassAdminApi.ts`

- [ ] **Step 1: Extend CompassSpace interface**

In `src/features/compass/domain/types.ts`, update `CompassSpace`:

```typescript
export interface CompassSpace {
    id: string;
    name: string;
    type: string;
    compassMode: SpaceMode | null;
    compassSpaceType: CompassSpaceType | null;
    compassCapacity: number | null;
    minCapacity: number | null;
    maxCapacity: number | null;
    sortOrder: number;
    buildingId: string | null;
    floorId: string | null;
    areaId: string | null;
    neighborhoodId: string | null;
    building?: { id: string; name: string } | null;
    floor?: { id: string; name: string } | null;
    area?: { id: string; name: string } | null;
    neighborhood?: { id: string; name: string } | null;
    permanentAssignee?: { id: string; displayName: string } | null;
    structuredAmenities?: Array<{
        quantity: number;
        amenity: { id: string; name: string; nameHe: string | null; icon: string | null; category: string };
    }>;
}
```

- [ ] **Step 2: Extend API updateSpaceProperties**

In `src/features/compass/infrastructure/compassAdminApi.ts`, update `updateSpaceProperties`:

```typescript
updateSpaceProperties: (spaceId: string, data: {
    compassSpaceType?: CompassSpaceType | null;
    compassCapacity?: number | null;
    minCapacity?: number | null;
    maxCapacity?: number | null;
    buildingId?: string | null;
    floorId?: string | null;
    areaId?: string | null;
    neighborhoodId?: string | null;
    permanentAssigneeId?: string | null;
    amenityIds?: string[];
    sortOrder?: number;
}) => api.put(`/admin/compass/spaces/${spaceId}/properties`, data),
```

- [ ] **Step 3: Commit client types + API changes**

```bash
git add src/features/compass/domain/types.ts src/features/compass/infrastructure/compassAdminApi.ts
git commit -m "feat(client): extend CompassSpace type and API with new space fields"
```

---

## Task 4: Add Translation Keys

**Files:**
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

- [ ] **Step 1: Add English translations**

Add under the `compass` section, near the existing `addSpace`/`editSpace` keys (around line 1979):

```json
"spaceDialog": {
    "addTitle": "Add Space",
    "editTitle": "Edit Space",
    "spaceNumber": "Space Number",
    "spaceNumberHelper": "Unique identifier (e.g. D-301, MR-2B)",
    "displayName": "Display Name",
    "displayNameHelper": "Friendly name (defaults to Space Number if empty)",
    "classification": "Classification",
    "location": "Location",
    "capacitySection": "Capacity",
    "amenitiesSection": "Amenities",
    "selectAmenities": "Select amenities",
    "noAmenities": "No amenities configured. Add them in the Amenities tab.",
    "capacity": "Capacity",
    "minCapacity": "Min Capacity",
    "maxCapacity": "Max Capacity",
    "mode": "Mode",
    "assignee": "Permanent Assignee",
    "searchEmployee": "Search employee...",
    "sortOrder": "Sort Order",
    "sortOrderHelper": "Lower numbers appear first",
    "required": "Required"
}
```

- [ ] **Step 2: Add Hebrew translations**

Add the matching Hebrew translations:

```json
"spaceDialog": {
    "addTitle": "הוספת מקום",
    "editTitle": "עריכת מקום",
    "spaceNumber": "מספר מקום",
    "spaceNumberHelper": "מזהה ייחודי (לדוגמה: D-301, MR-2B)",
    "displayName": "שם תצוגה",
    "displayNameHelper": "שם ידידותי (ברירת מחדל: מספר המקום)",
    "classification": "סיווג",
    "location": "מיקום",
    "capacitySection": "קיבולת",
    "amenitiesSection": "מתקנים",
    "selectAmenities": "בחר מתקנים",
    "noAmenities": "לא הוגדרו מתקנים. הוסף אותם בלשונית מתקנים.",
    "capacity": "קיבולת",
    "minCapacity": "קיבולת מינימלית",
    "maxCapacity": "קיבולת מקסימלית",
    "mode": "מצב",
    "assignee": "ממונה קבוע",
    "searchEmployee": "חפש עובד...",
    "sortOrder": "סדר מיון",
    "sortOrderHelper": "מספרים נמוכים מופיעים ראשונים",
    "required": "שדה חובה"
}
```

- [ ] **Step 3: Commit translations**

```bash
git add src/locales/en/common.json src/locales/he/common.json
git commit -m "feat(i18n): add space dialog translation keys (EN + HE)"
```

---

## Task 5: Build Unified Space Dialog

**Files:**
- Modify: `src/features/compass/presentation/CompassSpacesTab.tsx`

This is the main task. Replace both the Add and Edit dialogs with a single unified dialog.

- [ ] **Step 1: Update imports and interfaces**

At the top of `CompassSpacesTab.tsx`, add new imports and update the form interface:

```typescript
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TextField, MenuItem, IconButton,
    Stack, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { CompassSpace, CompassSpaceType, SpaceMode, Amenity, Employee } from '../domain/types';
```

Replace `EditForm` and `emptyForm` with:

```typescript
interface SpaceForm {
    externalId: string;
    displayName: string;
    compassSpaceType: string;
    compassMode: string;
    permanentAssigneeId: string;
    compassCapacity: string;
    minCapacity: string;
    maxCapacity: string;
    buildingId: string;
    floorId: string;
    areaId: string;
    neighborhoodId: string;
    amenityIds: string[];
    sortOrder: string;
}

const emptyForm: SpaceForm = {
    externalId: '',
    displayName: '',
    compassSpaceType: '',
    compassMode: 'AVAILABLE',
    permanentAssigneeId: '',
    compassCapacity: '',
    minCapacity: '',
    maxCapacity: '',
    buildingId: '',
    floorId: '',
    areaId: '',
    neighborhoodId: '',
    amenityIds: [],
    sortOrder: '0',
};
```

- [ ] **Step 2: Update component state**

Replace the existing dialog states (`addOpen`, `newSpaceName`, `newSpaceId`, `editSpace`, `editForm`) with:

```typescript
// Unified dialog state
const [dialogOpen, setDialogOpen] = useState(false);
const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
const [form, setForm] = useState<SpaceForm>(emptyForm);
const [saving, setSaving] = useState(false);
const [formErrors, setFormErrors] = useState<Partial<Record<keyof SpaceForm, string>>>({});

// Reference data
const [amenities, setAmenities] = useState<Amenity[]>([]);
const [employees, setEmployees] = useState<Employee[]>([]);
```

- [ ] **Step 3: Add data loading for amenities and employees**

Add a new useEffect after the existing buildings/floors effect:

```typescript
// Load amenities and employees for dialog
useEffect(() => {
    if (!activeCompanyId) return;
    const load = async () => {
        try {
            const [amenRes, empRes] = await Promise.all([
                compassAdminApi.listAmenities(activeCompanyId),
                compassAdminApi.listEmployees(activeCompanyId, { pageSize: 1000 }),
            ]);
            setAmenities((amenRes.data.data || []).filter((a) => a.isActive));
            setEmployees((empRes.data.data || []).filter((e) => e.isActive));
        } catch { /* non-critical */ }
    };
    load();
}, [activeCompanyId]);
```

- [ ] **Step 4: Update floor area hierarchy**

Extend the floors state to include areas. Update the `FloorOption` interface:

```typescript
interface FloorOption {
    id: string;
    name: string;
    buildingId: string;
    buildingName: string;
    areas: { id: string; name: string }[];
}
```

Update the buildings loading effect to capture areas:

```typescript
for (const b of res.data.data || []) {
    for (const f of b.floors || []) {
        opts.push({
            id: f.id,
            name: f.name,
            buildingId: b.id,
            buildingName: b.name,
            areas: (f as any).areas || [],
        });
    }
}
```

- [ ] **Step 5: Add neighborhood loading tied to form.floorId**

Replace the existing neighborhood effect to use `form.floorId` instead of `editForm.floorId`:

```typescript
useEffect(() => {
    if (!form.floorId || !activeCompanyId) { setNeighborhoods([]); return; }
    let cancelled = false;
    const load = async () => {
        try {
            const res = await compassAdminApi.listNeighborhoods(activeCompanyId, form.floorId);
            if (!cancelled) {
                setNeighborhoods((res.data.data || []).map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })));
            }
        } catch { if (!cancelled) setNeighborhoods([]); }
    };
    load();
    return () => { cancelled = true; };
}, [form.floorId, activeCompanyId]);
```

- [ ] **Step 6: Add open/close dialog handlers**

```typescript
const openAddDialog = () => {
    setForm(emptyForm);
    setFormErrors({});
    setDialogMode('add');
    setEditingSpaceId(null);
    setDialogOpen(true);
};

const openEditDialog = (space: CompassSpace) => {
    const floorOpt = floors.find(f => f.id === space.floorId);
    setForm({
        externalId: space.type || '',
        displayName: space.name || '',
        compassSpaceType: space.compassSpaceType || '',
        compassMode: space.compassMode || 'AVAILABLE',
        permanentAssigneeId: space.permanentAssignee?.id || '',
        compassCapacity: space.compassCapacity?.toString() || '',
        minCapacity: space.minCapacity?.toString() || '',
        maxCapacity: space.maxCapacity?.toString() || '',
        buildingId: floorOpt?.buildingId || space.buildingId || '',
        floorId: space.floorId || '',
        areaId: space.areaId || '',
        neighborhoodId: space.neighborhoodId || '',
        amenityIds: space.structuredAmenities?.map(sa => sa.amenity.id) || [],
        sortOrder: space.sortOrder?.toString() || '0',
    });
    setFormErrors({});
    setDialogMode('edit');
    setEditingSpaceId(space.id);
    setDialogOpen(true);
};

const closeDialog = () => {
    setDialogOpen(false);
    setEditingSpaceId(null);
};
```

- [ ] **Step 7: Add form update helper**

```typescript
const updateForm = (field: keyof SpaceForm, value: string | string[]) => {
    setForm(prev => {
        const updated = { ...prev, [field]: value };
        // Cascade: clear floor/area/neighborhood when building changes
        if (field === 'buildingId') {
            updated.floorId = '';
            updated.areaId = '';
            updated.neighborhoodId = '';
        }
        // Cascade: clear area/neighborhood when floor changes
        if (field === 'floorId') {
            updated.areaId = '';
            updated.neighborhoodId = '';
        }
        // Clear assignee when mode changes away from PERMANENT
        if (field === 'compassMode' && value !== 'PERMANENT') {
            updated.permanentAssigneeId = '';
        }
        return updated;
    });
    // Clear error for this field
    if (formErrors[field as keyof SpaceForm]) {
        setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
};
```

- [ ] **Step 8: Add validation and save handler**

```typescript
const validateForm = (): boolean => {
    const errors: Partial<Record<keyof SpaceForm, string>> = {};
    if (!form.externalId.trim()) errors.externalId = t('compass.spaceDialog.required');
    if (!form.compassSpaceType) errors.compassSpaceType = t('compass.spaceDialog.required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
};

const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
        const displayName = form.displayName.trim() || form.externalId.trim();

        if (dialogMode === 'add') {
            // Step 1: Create the space
            const externalId = form.externalId.trim();
            const createRes = await compassAdminApi.createSpace(activeStoreId!, {
                externalId,
                data: { ITEM_NAME: displayName },
            });
            // Step 2: Update properties on newly created space
            const newSpaceId = (createRes.data as any).data?.id || (createRes.data as any).id;
            if (newSpaceId) {
                await compassAdminApi.updateSpaceProperties(newSpaceId, {
                    compassSpaceType: (form.compassSpaceType as CompassSpaceType) || null,
                    compassCapacity: form.compassCapacity ? parseInt(form.compassCapacity, 10) : null,
                    minCapacity: form.minCapacity ? parseInt(form.minCapacity, 10) : null,
                    maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity, 10) : null,
                    buildingId: form.buildingId || null,
                    floorId: form.floorId || null,
                    areaId: form.areaId || null,
                    neighborhoodId: form.neighborhoodId || null,
                    permanentAssigneeId: form.permanentAssigneeId || null,
                    amenityIds: form.amenityIds,
                    sortOrder: parseInt(form.sortOrder, 10) || 0,
                });
                // Step 3: Set mode if not default
                if (form.compassMode && form.compassMode !== 'AVAILABLE') {
                    await compassAdminApi.updateSpaceMode(
                        newSpaceId,
                        form.compassMode as SpaceMode,
                        form.compassMode === 'PERMANENT' ? form.permanentAssigneeId || undefined : undefined,
                    );
                }
            }
        } else if (editingSpaceId) {
            // Update properties
            await compassAdminApi.updateSpaceProperties(editingSpaceId, {
                compassSpaceType: (form.compassSpaceType as CompassSpaceType) || null,
                compassCapacity: form.compassCapacity ? parseInt(form.compassCapacity, 10) : null,
                minCapacity: form.minCapacity ? parseInt(form.minCapacity, 10) : null,
                maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity, 10) : null,
                buildingId: form.buildingId || null,
                floorId: form.floorId || null,
                areaId: form.areaId || null,
                neighborhoodId: form.neighborhoodId || null,
                permanentAssigneeId: form.permanentAssigneeId || null,
                amenityIds: form.amenityIds,
                sortOrder: parseInt(form.sortOrder, 10) || 0,
            });
            // Update mode separately (uses different endpoint)
            await compassAdminApi.updateSpaceMode(
                editingSpaceId,
                (form.compassMode as SpaceMode) || 'AVAILABLE',
                form.compassMode === 'PERMANENT' ? form.permanentAssigneeId || undefined : undefined,
            );
        }

        closeDialog();
        fetchSpaces();
    } catch {
        setError(t('errors.saveFailed'));
    } finally {
        setSaving(false);
    }
};
```

- [ ] **Step 9: Compute derived values for location cascade**

```typescript
const availableFloors = form.buildingId
    ? floors.filter(f => f.buildingId === form.buildingId)
    : floors;

const selectedFloor = floors.find(f => f.id === form.floorId);
const availableAreas = selectedFloor?.areas ?? [];
```

- [ ] **Step 10: Replace Add/Edit buttons to use new handlers**

In the toolbar, replace `onClick={() => setAddOpen(true)}` with `onClick={openAddDialog}`.

In the table row, replace `onClick={() => openEdit(s)}` with `onClick={() => openEditDialog(s)}`.

- [ ] **Step 11: Replace both dialogs with unified dialog JSX**

Remove both the old Add Space Dialog (lines ~288-314) and Edit Space Properties Dialog (lines ~316-393). Replace with:

```tsx
{/* Unified Space Dialog */}
<Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
    <DialogTitle>
        {dialogMode === 'add'
            ? t('compass.spaceDialog.addTitle')
            : t('compass.spaceDialog.editTitle')}
    </DialogTitle>
    <DialogContent>
        <Stack gap={2.5} sx={{ mt: 1 }}>
            {/* Section 1: Identity */}
            <Stack direction="row" gap={2}>
                <TextField
                    fullWidth
                    required
                    label={t('compass.spaceDialog.spaceNumber')}
                    value={form.externalId}
                    onChange={(e) => updateForm('externalId', e.target.value)}
                    error={!!formErrors.externalId}
                    helperText={formErrors.externalId || t('compass.spaceDialog.spaceNumberHelper')}
                    disabled={dialogMode === 'edit'}
                />
                <TextField
                    fullWidth
                    label={t('compass.spaceDialog.displayName')}
                    value={form.displayName}
                    onChange={(e) => updateForm('displayName', e.target.value)}
                    helperText={t('compass.spaceDialog.displayNameHelper')}
                />
            </Stack>

            {/* Section 2: Classification */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('compass.spaceDialog.classification')}
            </Typography>
            <Stack direction="row" gap={2}>
                <TextField
                    fullWidth
                    required
                    select
                    label={t('compass.spaceDialog.spaceNumber').replace(/\d/g, '') || t('compass.spaceType', 'Type')}
                    value={form.compassSpaceType}
                    onChange={(e) => updateForm('compassSpaceType', e.target.value)}
                    error={!!formErrors.compassSpaceType}
                    helperText={formErrors.compassSpaceType}
                >
                    {SPACE_TYPES.map(st => (
                        <MenuItem key={st} value={st}>{t(`compass.spaceTypes.${st}`)}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    fullWidth
                    select
                    label={t('compass.spaceDialog.mode')}
                    value={form.compassMode}
                    onChange={(e) => updateForm('compassMode', e.target.value)}
                >
                    <MenuItem value="AVAILABLE">{t('compass.spaceMode.AVAILABLE')}</MenuItem>
                    <MenuItem value="PERMANENT">{t('compass.spaceMode.PERMANENT')}</MenuItem>
                    <MenuItem value="MAINTENANCE">{t('compass.spaceMode.MAINTENANCE')}</MenuItem>
                    <MenuItem value="EXCLUDED">{t('compass.spaceMode.EXCLUDED')}</MenuItem>
                </TextField>
            </Stack>

            {/* Permanent Assignee — only when mode = PERMANENT */}
            {form.compassMode === 'PERMANENT' && (
                <Autocomplete
                    options={employees}
                    getOptionLabel={(opt) => `${opt.displayName} (${opt.email})`}
                    value={employees.find(e => e.id === form.permanentAssigneeId) || null}
                    onChange={(_, val) => updateForm('permanentAssigneeId', val?.id || '')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t('compass.spaceDialog.assignee')}
                            placeholder={t('compass.spaceDialog.searchEmployee')}
                        />
                    )}
                />
            )}

            {/* Section 3: Capacity */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('compass.spaceDialog.capacitySection')}
            </Typography>
            <Stack direction="row" gap={2}>
                <TextField
                    fullWidth
                    type="number"
                    label={t('compass.spaceDialog.capacity')}
                    value={form.compassCapacity}
                    onChange={(e) => updateForm('compassCapacity', e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                />
                <TextField
                    fullWidth
                    type="number"
                    label={t('compass.spaceDialog.minCapacity')}
                    value={form.minCapacity}
                    onChange={(e) => updateForm('minCapacity', e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                />
                <TextField
                    fullWidth
                    type="number"
                    label={t('compass.spaceDialog.maxCapacity')}
                    value={form.maxCapacity}
                    onChange={(e) => updateForm('maxCapacity', e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: 9999 } }}
                />
            </Stack>

            {/* Section 4: Location */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('compass.spaceDialog.location')}
            </Typography>
            <Stack direction="row" gap={2}>
                <TextField
                    fullWidth
                    select
                    label={t('compass.dashboard.building')}
                    value={form.buildingId}
                    onChange={(e) => updateForm('buildingId', e.target.value)}
                >
                    <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                    {[...new Map(floors.map(f => [f.buildingId, f.buildingName])).entries()].map(([id, name]) => (
                        <MenuItem key={id} value={id}>{name}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    fullWidth
                    select
                    label={t('compass.dashboard.floor')}
                    value={form.floorId}
                    onChange={(e) => updateForm('floorId', e.target.value)}
                    disabled={!form.buildingId}
                >
                    <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                    {availableFloors.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                    ))}
                </TextField>
            </Stack>
            <Stack direction="row" gap={2}>
                {availableAreas.length > 0 && (
                    <TextField
                        fullWidth
                        select
                        label={t('compass.dashboard.area')}
                        value={form.areaId}
                        onChange={(e) => updateForm('areaId', e.target.value)}
                    >
                        <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                        {availableAreas.map(a => (
                            <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                        ))}
                    </TextField>
                )}
                {neighborhoods.length > 0 && (
                    <TextField
                        fullWidth
                        select
                        label={t('compass.neighborhoods.title')}
                        value={form.neighborhoodId}
                        onChange={(e) => updateForm('neighborhoodId', e.target.value)}
                    >
                        <MenuItem value=""><em>{t('common.none')}</em></MenuItem>
                        {neighborhoods.map(n => (
                            <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
                        ))}
                    </TextField>
                )}
            </Stack>

            {/* Section 5: Amenities */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('compass.spaceDialog.amenitiesSection')}
            </Typography>
            {amenities.length > 0 ? (
                <Autocomplete
                    multiple
                    options={amenities}
                    getOptionLabel={(opt) => opt.name}
                    value={amenities.filter(a => form.amenityIds.includes(a.id))}
                    onChange={(_, val) => updateForm('amenityIds', val.map(v => v.id))}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                {...getTagProps({ index })}
                                key={option.id}
                                label={option.name}
                                size="small"
                            />
                        ))
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={t('compass.spaceDialog.selectAmenities')}
                        />
                    )}
                />
            ) : (
                <Typography variant="body2" color="text.secondary">
                    {t('compass.spaceDialog.noAmenities')}
                </Typography>
            )}

            {/* Section 6: Sort Order */}
            <TextField
                fullWidth
                type="number"
                label={t('compass.spaceDialog.sortOrder')}
                value={form.sortOrder}
                onChange={(e) => updateForm('sortOrder', e.target.value)}
                helperText={t('compass.spaceDialog.sortOrderHelper')}
                slotProps={{ htmlInput: { min: 0 } }}
                sx={{ maxWidth: 200 }}
            />
        </Stack>
    </DialogContent>
    <DialogActions>
        <Button onClick={closeDialog}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : dialogMode === 'add' ? t('common.add') : t('common.save')}
        </Button>
    </DialogActions>
</Dialog>
```

- [ ] **Step 12: Remove old handlers**

Delete: `handleAddSpace`, `openEdit`, `handleSaveEdit`, and old `editForm`/`editSpace`/`addOpen`/`newSpaceName`/`newSpaceId` state. Also delete the old `emptyForm` and `EditForm` interface (already replaced in Step 1).

- [ ] **Step 13: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors

- [ ] **Step 14: Commit the unified dialog**

```bash
git add src/features/compass/presentation/CompassSpacesTab.tsx
git commit -m "feat(compass): unified Add/Edit space dialog with all space fields"
```

---

## Task 6: Verify End-to-End

- [ ] **Step 1: Run server type-check**

```bash
cd server && npx tsc --noEmit --pretty
```

Expected: no errors

- [ ] **Step 2: Run client type-check**

```bash
npx tsc --noEmit --pretty
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

1. Open admin panel → Compass → Spaces tab
2. Click "Add Space" → verify all sections render
3. Fill required fields (Space Number + Type) → Save → verify space appears in table
4. Click Edit on the new space → verify all fields populated
5. Change mode to PERMANENT → verify assignee picker appears
6. Add amenities → Save → verify they persist on re-open
7. Change building → verify floor/area/neighborhood cascade correctly

- [ ] **Step 4: Final commit and push**

```bash
git push
```
