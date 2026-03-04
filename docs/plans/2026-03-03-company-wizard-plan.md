# Company Creation Wizard — 6-Step Stepper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 2-step company creation wizard with a comprehensive 6-step validated stepper. All features disabled by default. Multi-store selection, article format fetch/confirm, field mapping, and feature selection with dependency validation. Existing companies (dev + production) preserved with new UI. Article safety: only People mode writes articles to AIMS; all other modes sync FROM AIMS and never delete existing articles.

**Architecture:** The wizard becomes a 6-step MUI Stepper: (1) AIMS Connection + Company Info, (2) Multi-Store Selection, (3) Article Format Fetch & Confirm, (4) Field Mapping, (5) Feature Selection, (6) Review & Create. The server `createCompany` endpoint is extended to accept the full payload (stores[], articleFormat, fieldMapping, features). Edit mode presents the same sections as tabs. DEFAULT_COMPANY_FEATURES changes to all-false. Backward compatibility for existing companies via `ALL_FEATURES_ENABLED` fallback.

**Tech Stack:** React 19, MUI 7 (Stepper, Dialog, Grid, TextField, Select, Switch, Chip), React Hook Form + Zod, i18next, Express, Prisma

---

## Critical Safety Rule: Article Protection

**In People mode:** The server is the source of truth. Articles are created/updated/deleted by the server based on person assignments.

**In all other modes (Spaces, Conference, Labels):** AIMS is the source of truth. The app syncs FROM AIMS, never deletes articles. Conference rooms auto-detect from articles with `C+number` pattern. Spaces show all other articles.

This means:
- Company creation MUST NOT push/delete any articles to AIMS
- Feature toggling MUST NOT trigger article deletion
- Only explicit sync actions in People mode should write articles

---

## Task 1: Create Branch and Update DEFAULT_COMPANY_FEATURES

**Files:**
- Modify: `server/src/shared/utils/featureResolution.ts`

**Step 1: Create feature branch**

```bash
git checkout main && git pull
git checkout -b feat/company-wizard-redesign
```

**Step 2: Change DEFAULT_COMPANY_FEATURES to all-false**

In `server/src/shared/utils/featureResolution.ts`, change lines 23-30:

```typescript
export const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
    spacesEnabled: false,
    peopleEnabled: false,
    conferenceEnabled: false,
    simpleConferenceMode: false,
    labelsEnabled: false,
    aimsManagementEnabled: false,
};
```

**Important:** The `ALL_FEATURES_ENABLED` constant (line 63-70) and the `extractCompanyFeatures` backward-compat logic MUST remain unchanged — this protects existing companies.

**Step 3: Verify server compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | tail -5
```

Expected: PASS

**Step 4: Commit**

```bash
git add server/src/shared/utils/featureResolution.ts
git commit -m "feat: change default company features to all-disabled"
```

---

## Task 2: Extend Server Create Company Endpoint

**Files:**
- Modify: `server/src/features/companies/types.ts`
- Modify: `server/src/features/companies/service.ts`
- Modify: `server/src/features/companies/controller.ts`

**Step 1: Extend Zod schema for full creation payload**

In `server/src/features/companies/types.ts`, add a new schema for the stores array:

```typescript
/** Store to create alongside company */
export const createStoreSchema = z.object({
    code: z.string().min(1, 'Store code is required'),
    name: z.string().max(100).optional(),
    timezone: z.string().default('UTC'),
});

/** Extended create company schema with multi-store + config */
export const createCompanyFullSchema = createCompanySchema.extend({
    stores: z.array(createStoreSchema).min(1, 'At least one store is required'),
    articleFormat: z.record(z.unknown()).optional(),
    fieldMapping: z.record(z.unknown()).optional(),
});
```

Add the DTO:
```typescript
export interface CreateCompanyFullDto extends CreateCompanyDto {
    stores: Array<{ code: string; name?: string; timezone?: string }>;
    articleFormat?: Record<string, unknown>;
    fieldMapping?: Record<string, unknown>;
}
```

**Step 2: Extend service to create multiple stores + save config**

In `server/src/features/companies/service.ts`, modify the `createCompany` method to:

1. Accept the extended DTO
2. Create all stores in a loop (not just one)
3. Save `articleFormat` to `company.settings.solumArticleFormat` if provided
4. Save `fieldMapping` to `company.settings.solumMappingConfig` if provided
5. **MUST NOT** push articles to AIMS during creation

The existing `createCompany` already creates one store. Extend it:

```typescript
// After company creation, create all requested stores
for (const storeData of dto.stores) {
    await prisma.store.create({
        data: {
            companyId: company.id,
            code: storeData.code,
            name: storeData.name || storeData.code,
            timezone: storeData.timezone || 'UTC',
            syncEnabled: false, // Don't auto-sync on creation
            isActive: true,
        },
    });
}

// Save article format and field mapping to company settings
if (dto.articleFormat || dto.fieldMapping) {
    const currentSettings = (company.settings as Record<string, unknown>) || {};
    const updatedSettings = {
        ...currentSettings,
        ...(dto.articleFormat ? { solumArticleFormat: dto.articleFormat } : {}),
        ...(dto.fieldMapping ? { solumMappingConfig: dto.fieldMapping } : {}),
    };
    await prisma.company.update({
        where: { id: company.id },
        data: { settings: updatedSettings as any },
    });
}
```

**Step 3: Update controller to parse extended schema**

In `server/src/features/companies/controller.ts`, the `create` handler should parse with `createCompanyFullSchema` instead of `createCompanySchema`. Fall back gracefully — if `stores` is not provided, use the legacy single-store creation.

**Step 4: Verify server compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | tail -5
```

Expected: PASS

**Step 5: Commit**

```bash
git add server/src/features/companies/
git commit -m "feat: extend company creation to accept multi-store, article format, and field mapping"
```

---

## Task 3: Client-Side Wizard Step Components — Step 1 (Connection)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/ConnectionStep.tsx`

**Step 1: Create the steps directory**

```bash
mkdir -p src/features/settings/presentation/companyDialog/steps
```

**Step 2: Create ConnectionStep component**

This step collects:
- Company code (validates uniqueness via debounced API)
- Company name, location (optional)
- AIMS cluster (C1 / Common radio group)
- AIMS username, password
- "Test Connection" button — required before proceeding

Props:
```typescript
interface ConnectionStepProps {
    formData: WizardFormData;
    onUpdate: (data: Partial<WizardFormData>) => void;
    onConnectionTest: () => Promise<boolean>;
    connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
    codeAvailable: boolean | null;
    codeChecking: boolean;
}
```

The component uses MUI TextField, RadioGroup, Button. On "Test Connection" click, calls `onConnectionTest()` which the parent wizard handles.

Validation: code must be 3-20 uppercase, name required, AIMS fields required.

Connection must succeed (`connectionStatus === 'connected'`) before the parent wizard allows "Next".

**Step 3: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/ConnectionStep.tsx
git commit -m "feat: add wizard ConnectionStep component"
```

---

## Task 4: Client-Side Wizard Step Components — Step 2 (Stores)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/StoreSelectionStep.tsx`

**Step 1: Create StoreSelectionStep component**

This step shows:
- List of stores fetched from AIMS (passed as prop)
- Each store: checkbox + store code + label count + gateway count
- Selected stores get inline fields: friendly name (TextField), timezone (Autocomplete)
- At least 1 store must be selected

Props:
```typescript
interface StoreSelectionStepProps {
    aimsStores: AimsStoreInfo[];  // from fetchAimsStores()
    selectedStores: WizardStoreData[];
    onUpdate: (stores: WizardStoreData[]) => void;
}
```

When user toggles a store checkbox, it's added/removed from `selectedStores`. Each selected store shows name/timezone fields.

**Step 2: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/StoreSelectionStep.tsx
git commit -m "feat: add wizard StoreSelectionStep component"
```

---

## Task 5: Client-Side Wizard Step Components — Step 3 (Article Format)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/ArticleFormatStep.tsx`

**Step 1: Create ArticleFormatStep component**

This step:
- Auto-fetches article format from AIMS on mount (parent passes fetch function)
- Shows: file extension, delimiter, basic info fields, data fields
- Fields are editable but pre-populated
- User can accept or modify

Props:
```typescript
interface ArticleFormatStepProps {
    articleFormat: ArticleFormat | null;
    loading: boolean;
    onUpdate: (format: ArticleFormat) => void;
    onFetch: () => Promise<void>;
}
```

Displays `articleBasicInfo` as read-only chips (these are required AIMS fields). Displays `articleData` fields as editable list. Shows `fileExtension` and `delimeter` as TextFields.

**Step 2: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/ArticleFormatStep.tsx
git commit -m "feat: add wizard ArticleFormatStep component"
```

---

## Task 6: Client-Side Wizard Step Components — Step 4 (Field Mapping)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/FieldMappingStep.tsx`

**Step 1: Create FieldMappingStep component**

This step:
- Pre-populates from article format fields (Step 3 data)
- Each row: AIMS field name | English display name (TextField) | Visible (Switch)
- Unique ID field selector (Select from available fields)
- Conference mapping section (optional): meeting name, meeting time, participants — each a Select from available fields

Props:
```typescript
interface FieldMappingStepProps {
    articleFormat: ArticleFormat | null;
    fieldMapping: SolumMappingConfig | null;
    onUpdate: (mapping: SolumMappingConfig) => void;
}
```

Auto-generates initial mapping from `articleFormat.articleData` fields if `fieldMapping` is null.

**Step 2: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/FieldMappingStep.tsx
git commit -m "feat: add wizard FieldMappingStep component"
```

---

## Task 7: Client-Side Wizard Step Components — Step 5 (Features)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/FeaturesStep.tsx`

**Step 1: Create FeaturesStep component**

This step:
- Space type selector at top (Select: office/room/chair/person-tag)
- Feature cards — each with Switch + description:
  1. Spaces Management — "Manage office spaces and sync articles from AIMS"
  2. People Management — "Assign people to spaces. Server manages articles." + mutual exclusivity warning
  3. Conference Rooms — "Conference room displays. Auto-detects C-prefix articles from AIMS." + mode selector (Full/Simple) + requires field mapping warning
  4. Labels — "ESL label management and synchronization"
  5. AIMS Management — "Full AIMS gateway, label, and template management"
- ALL features disabled by default
- Mutual exclusivity: enabling Spaces disables People and vice versa (with warning text)
- Dependency warnings: Conference requires conference field mapping from Step 4

Props:
```typescript
interface FeaturesStepProps {
    features: CompanyFeatures;
    spaceType: SpaceType;
    hasConferenceMapping: boolean;  // from Step 4
    onUpdate: (features: CompanyFeatures, spaceType: SpaceType) => void;
}
```

**Step 2: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/FeaturesStep.tsx
git commit -m "feat: add wizard FeaturesStep component"
```

---

## Task 8: Client-Side Wizard Step Components — Step 6 (Review)

**Files:**
- Create: `src/features/settings/presentation/companyDialog/steps/ReviewStep.tsx`

**Step 1: Create ReviewStep component**

Read-only summary of all previous steps:
- Company info (code, name, location, AIMS connection status)
- Selected stores (list with names and timezones)
- Article format summary (extension, delimiter, field count)
- Field mapping summary (visible field count, unique ID field)
- Features summary (enabled features with icons)

Each section is clickable to jump back to that step (calls `onGoToStep(n)`).

Props:
```typescript
interface ReviewStepProps {
    formData: WizardFormData;
    onGoToStep: (step: number) => void;
}
```

**Step 2: Commit**

```bash
git add src/features/settings/presentation/companyDialog/steps/ReviewStep.tsx
git commit -m "feat: add wizard ReviewStep component"
```

---

## Task 9: Rewrite CreateCompanyWizard as 6-Step Stepper

**Files:**
- Rewrite: `src/features/settings/presentation/companyDialog/CreateCompanyWizard.tsx`
- Create: `src/features/settings/presentation/companyDialog/steps/index.ts` (barrel export)

**Step 1: Create barrel export**

```typescript
// src/features/settings/presentation/companyDialog/steps/index.ts
export { ConnectionStep } from './ConnectionStep';
export { StoreSelectionStep } from './StoreSelectionStep';
export { ArticleFormatStep } from './ArticleFormatStep';
export { FieldMappingStep } from './FieldMappingStep';
export { FeaturesStep } from './FeaturesStep';
export { ReviewStep } from './ReviewStep';
```

**Step 2: Define shared wizard types**

Create or add to the wizard file:
```typescript
interface WizardStoreData {
    code: string;
    name: string;
    timezone: string;
    labelCount?: number;
    gatewayCount?: number;
    selected: boolean;
}

interface WizardFormData {
    // Step 1
    companyCode: string;
    companyName: string;
    location: string;
    description: string;
    aimsCluster: string;
    aimsUsername: string;
    aimsPassword: string;
    connectionTested: boolean;
    // Step 2
    stores: WizardStoreData[];
    // Step 3
    articleFormat: ArticleFormat | null;
    // Step 4
    fieldMapping: SolumMappingConfig | null;
    // Step 5
    features: CompanyFeatures;
    spaceType: SpaceType;
}
```

**Step 3: Rewrite CreateCompanyWizard**

The wizard:
- Uses MUI `Stepper` with 6 steps
- Holds `WizardFormData` state
- Each step renders the corresponding step component
- "Next" button validates current step before advancing
- "Back" button goes to previous step
- Step 1 requires connection test
- Step 2 requires at least 1 store selected
- Step 3 auto-fetches article format on entry
- Step 6 "Create Company" button submits everything

On submit:
1. Call `companyService.create()` with the full payload
2. Show loading spinner
3. On success: close dialog, show snackbar, refresh company list
4. On error: show error alert, stay on review step

Responsive:
- Mobile: `fullScreen` dialog, stepper shows numbers only (no labels)
- Tablet/Desktop: standard dialog `maxWidth="md"`, full stepper labels

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | tail -10
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/settings/presentation/companyDialog/
git commit -m "feat: rewrite company creation as 6-step stepper wizard"
```

---

## Task 10: Update Client companyService for Full Creation Payload

**Files:**
- Modify: `src/shared/infrastructure/services/companyService.ts`

**Step 1: Extend `create` method**

The `create` method should accept the full payload including `stores`, `articleFormat`, and `fieldMapping`:

```typescript
async create(data: {
    code: string;
    name: string;
    location?: string;
    description?: string;
    aimsConfig?: { baseUrl: string; cluster?: string; username: string; password: string };
    stores: Array<{ code: string; name?: string; timezone?: string }>;
    companyFeatures?: CompanyFeatures;
    spaceType?: SpaceType;
    articleFormat?: Record<string, unknown>;
    fieldMapping?: Record<string, unknown>;
}): Promise<Company> {
    const response = await this.api.post('/companies', data);
    return response.data;
}
```

**Step 2: Add `fetchArticleFormat` method if not already present**

Check if there's already a method to fetch article format from AIMS during wizard (before company exists). If not, add one that uses the raw AIMS credentials (same as `fetchAimsStores`).

**Step 3: Commit**

```bash
git add src/shared/infrastructure/services/companyService.ts
git commit -m "feat: extend companyService.create for full wizard payload"
```

---

## Task 11: Rewrite EditCompanyTabs to Match Wizard Sections

**Files:**
- Rewrite: `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx`

**Step 1: Rewrite with tabbed sections matching wizard steps**

Tabs:
1. **Basic Info** — Company code (read-only), name, location, description, AIMS connection status
2. **Stores** — List of existing stores with edit/add capabilities
3. **Article Format** — Current format display, re-fetch from AIMS button
4. **Field Mapping** — Current mapping, edit inline
5. **Features** — Same as wizard Step 5, pre-filled from current settings

Each tab reuses the step components from the wizard (or simplified versions for edit mode).

Pre-fill all fields from `company` prop data. Save changes per-tab (not all at once).

**Step 2: Verify build**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | tail -10
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx
git commit -m "feat: rewrite EditCompanyTabs with wizard-aligned tab sections"
```

---

## Task 12: Add Translation Keys

**Files:**
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

**Step 1: Add wizard-related keys to BOTH locale files**

English keys to add in the `settings.companies` section:
```json
"wizardStep1": "AIMS Connection",
"wizardStep2": "Select Stores",
"wizardStep3": "Article Format",
"wizardStep4": "Field Mapping",
"wizardStep5": "Features",
"wizardStep6": "Review & Create",
"testConnection": "Test Connection",
"connectionTesting": "Testing...",
"connectionSuccess": "Connected successfully",
"connectionFailed": "Connection failed",
"selectAtLeastOneStore": "Select at least one store",
"storeName": "Store Name",
"storeTimezone": "Timezone",
"labelCount": "Labels",
"gatewayCount": "Gateways",
"fetchingArticleFormat": "Fetching article format from AIMS...",
"articleFormatFetched": "Article format loaded",
"fileExtension": "File Extension",
"delimiter": "Delimiter",
"basicInfoFields": "Basic Info Fields",
"dataFields": "Data Fields",
"fieldMappingTitle": "Map AIMS Fields",
"aimsField": "AIMS Field",
"displayName": "Display Name",
"visible": "Visible",
"uniqueIdField": "Unique ID Field",
"conferenceMappingTitle": "Conference Mapping (Optional)",
"meetingNameField": "Meeting Name Field",
"meetingTimeField": "Meeting Time Field",
"participantsField": "Participants Field",
"allFeaturesDisabled": "All features are disabled by default",
"featureSpaces": "Spaces Management",
"featureSpacesDesc": "Manage office spaces. Articles synced from AIMS.",
"featurePeople": "People Management",
"featurePeopleDesc": "Assign people to spaces. Server manages articles.",
"featureConference": "Conference Rooms",
"featureConferenceDesc": "Conference room displays. Auto-detects C-prefix articles.",
"featureLabels": "Labels",
"featureLabelsDesc": "ESL label management and synchronization.",
"featureAims": "AIMS Management",
"featureAimsDesc": "Full gateway, label, and template management.",
"mutualExclusiveWarning": "Spaces and People cannot both be enabled",
"requiresConferenceMapping": "Requires conference field mapping (Step 4)",
"conferenceModeSimple": "Simple (page flipping)",
"conferenceModeFull": "Full (real-time updates)",
"reviewTitle": "Review & Create",
"reviewCompanyInfo": "Company Info",
"reviewStores": "Stores",
"reviewArticleFormat": "Article Format",
"reviewFieldMapping": "Field Mapping",
"reviewFeatures": "Features",
"createCompany": "Create Company",
"creating": "Creating..."
```

Hebrew equivalents for all keys.

**Step 2: Commit**

```bash
git add src/locales/en/common.json src/locales/he/common.json
git commit -m "feat: add company wizard translation keys (EN + HE)"
```

---

## Task 13: Server Endpoint for Article Format Fetch (Pre-Company)

**Files:**
- Modify: `server/src/features/companies/routes.ts`
- Modify: `server/src/features/companies/controller.ts`
- Modify: `server/src/features/companies/service.ts`

**Step 1: Add endpoint to fetch article format using raw credentials**

This is needed because during wizard Step 3, the company doesn't exist yet. The endpoint takes raw AIMS credentials (like `fetchAimsStores` does) and fetches the article format.

Route: `POST /api/v1/companies/aims/article-format`
Auth: Platform admin only (same as fetchAimsStores)

Controller:
```typescript
async function fetchArticleFormat(req: Request, res: Response, next: NextFunction) {
    try {
        const { baseUrl, cluster, username, password, companyCode } = fetchAimsStoresSchema.parse(req.body);
        // Use raw credentials to fetch article format from AIMS
        const format = await companyService.fetchArticleFormat({ baseUrl, cluster, username, password, companyCode });
        res.json({ data: format });
    } catch (error) { next(error); }
}
```

Service: Creates a temporary SolumConfig, gets token, calls `solumService.fetchArticleFormat(config, token)`.

**Step 2: Verify server compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | tail -5
```

Expected: PASS

**Step 3: Commit**

```bash
git add server/src/features/companies/
git commit -m "feat: add article format fetch endpoint for wizard (raw credentials)"
```

---

## Task 14: Final Build Verification and PR

**Step 1: Full client build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

**Step 2: Full server build**

```bash
cd server && npx tsc --noEmit 2>&1 | tail -5
```

Expected: No errors

**Step 3: Push and create PR**

```bash
git push -u origin feat/company-wizard-redesign
```

Create PR:
- Title: `feat: company creation wizard redesign — 6-step stepper`
- Body: Summary, link to design doc, article safety notes
- Base: `main`

---

## Files Changed Summary

| File | Action |
|------|--------|
| `server/src/shared/utils/featureResolution.ts` | Modify — DEFAULT_COMPANY_FEATURES all-false |
| `server/src/features/companies/types.ts` | Extend — new schemas for full creation |
| `server/src/features/companies/service.ts` | Extend — multi-store creation, config save |
| `server/src/features/companies/controller.ts` | Extend — parse full schema, article format endpoint |
| `server/src/features/companies/routes.ts` | Add — article format fetch route |
| `src/shared/infrastructure/services/companyService.ts` | Extend — full creation payload |
| `src/features/settings/presentation/companyDialog/steps/ConnectionStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/StoreSelectionStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/ArticleFormatStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/FieldMappingStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/FeaturesStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/ReviewStep.tsx` | CREATE |
| `src/features/settings/presentation/companyDialog/steps/index.ts` | CREATE |
| `src/features/settings/presentation/companyDialog/CreateCompanyWizard.tsx` | Rewrite |
| `src/features/settings/presentation/companyDialog/EditCompanyTabs.tsx` | Rewrite |
| `src/locales/en/common.json` | Add ~40 keys |
| `src/locales/he/common.json` | Add ~40 keys |
