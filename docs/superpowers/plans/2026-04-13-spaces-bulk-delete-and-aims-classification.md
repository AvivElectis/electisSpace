# Spaces Bulk Delete + AIMS Classification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three spaces-feature problems: (1) route C-prefixed AIMS articles to conference rooms instead of spaces, (2) add a bulk-delete UX via a Select Mode toggle, (3) make delete (single and bulk) reliable against pull/delete races.

**Architecture:** Server-side changes first (AIMS classification, bulk-delete endpoint, race guard), then client changes (store action, select-mode UI), then E2E. The sequential-delete bug is investigated mid-plan — any fix beyond the already-planned race guard is decided from real evidence, not speculation.

**Tech Stack:** Server — Express 4, Prisma 7, Zod, Vitest. Client — React 19, MUI 7, Zustand 5, React Hook Form, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-13-spaces-bulk-delete-and-aims-classification-design.md`

**Branch:** `fix/spaces-bulk-delete-and-aims-classification`

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree and branch**

Run:
```bash
git status
git rev-parse --abbrev-ref HEAD
```
Expected: branch is `fix/spaces-bulk-delete-and-aims-classification`, tree contains only the committed spec file plus normal untracked files.

- [ ] **Step 2: Start dev stack**

Run:
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
Expected: postgres, redis, migrate, server containers healthy. Leave running for the duration.

---

## Task 1: Discover the conference feature flag

**Purpose:** §1 of the spec depends on knowing where "conference enabled for this company" lives. We refuse to guess — grep first, commit a finding note inline in the plan.

**Files:**
- Read-only: `server/src/features/settings/**`, `server/src/features/companies/**`, `server/prisma/schema.prisma`

- [ ] **Step 1: Grep for conference feature flag**

Run:
```bash
```
Use the Grep tool with pattern `conference.*enabled|featureFlags|companyFeatures|enabledFeatures` across `server/src`.

- [ ] **Step 2: Read the Company model**

Use the Read tool on `server/prisma/schema.prisma` for the `Company` and related models. Note the exact field that represents enabled features (likely a JSON column, an array, or a relation table).

- [ ] **Step 3: Read the existing feature-flag accessor**

Use the Grep tool with pattern `isFeatureEnabled|hasFeature|conference` in `server/src/features/settings` and `server/src/features/companies`. Pick the existing helper that answers "is feature X enabled for the company owning this store".

- [ ] **Step 4: Record the finding in the plan file**

Append the following under this task's body (edit this plan file):

```markdown
**Finding:** <exact helper name>, imported from `<path>`. Signature: `<signature>`. To resolve company from a store: `<how>`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-13-spaces-bulk-delete-and-aims-classification.md
git commit -m "docs(plan): record conference feature-flag accessor finding"
```

---

## Task 2: New `conferenceSyncService.upsertManyFromArticles`

**Purpose:** Put conference-pull knowledge inside the conference feature so `spacesSyncService` can delegate without importing conference internals.

**Files:**
- Create: `server/src/features/conference/syncService.ts`
- Create: `server/src/features/conference/__tests__/syncService.test.ts`
- Read-only: `server/src/features/conference/service.ts`, `server/src/features/conference/repository.ts`, `server/src/features/conference/types.ts`

### Shape of the new service

```ts
// server/src/features/conference/syncService.ts
import { prisma } from '../../shared/config/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { conferenceRepository } from './repository.js';
import type { Prisma } from '@prisma/client';

export interface ConferenceSyncUserContext {
    id: string;
    globalRole?: string;
    stores?: { id: string }[];
}

export interface ConferencePullResult {
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
}

export interface RawAimsArticle {
    articleId?: string;
    data?: unknown;
}

/**
 * Unescape CSV-style double-quoting ("ד""ר" → ד"ר) on every string value.
 * Mirrors the logic already in spacesSyncService so both services handle
 * AIMS data the same way.
 */
function normalizeArticleData(raw: unknown): Record<string, unknown> {
    const source: Record<string, unknown> =
        raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
        if (
            typeof value === 'string' &&
            value.startsWith('"') &&
            value.endsWith('"') &&
            value.includes('""')
        ) {
            out[key] = value.slice(1, -1).replace(/""/g, '"');
        } else {
            out[key] = value;
        }
    }
    return out;
}

export const conferenceSyncService = {
    async upsertManyFromArticles(
        articles: RawAimsArticle[],
        storeId: string,
        user: ConferenceSyncUserContext,
    ): Promise<ConferencePullResult> {
        const result: ConferencePullResult = { created: 0, updated: 0, unchanged: 0, skipped: 0 };

        // Race guard: skip externalIds that have a non-terminal delete
        // pending in the sync queue (PENDING or PROCESSING). Source of truth is the DB.
        const pendingDeletes = await prisma.syncQueueItem.findMany({
            where: {
                storeId,
                entityType: 'conference',
                action: 'DELETE',
                status: { in: ['PENDING', 'PROCESSING'] },
            },
            select: { payload: true },
        });
        const pendingDeleteExternalIds = new Set<string>();
        for (const item of pendingDeletes) {
            const payload = item.payload as { externalId?: string } | null;
            // payload.externalId is stored with the "C" prefix by
            // conference/service.ts:145 — strip it so we can compare against
            // the local externalId (stored without the prefix).
            if (payload?.externalId && payload.externalId.startsWith('C')) {
                pendingDeleteExternalIds.add(payload.externalId.slice(1));
            }
        }

        for (const article of articles) {
            const articleId = article.articleId;
            if (!articleId || articleId.length <= 1) {
                result.skipped++;
                continue;
            }
            const externalId = articleId.slice(1); // strip the "C" prefix
            if (!externalId || pendingDeleteExternalIds.has(externalId)) {
                result.skipped++;
                continue;
            }

            const data = normalizeArticleData(article.data);
            const existing = await conferenceRepository.findByExternalId(storeId, externalId);

            if (existing) {
                const existingData = (existing.data ?? {}) as Record<string, unknown>;
                if (JSON.stringify(existingData) === JSON.stringify(data)) {
                    result.unchanged++;
                } else {
                    await conferenceRepository.update(existing.id, {
                        data: data as Prisma.InputJsonValue,
                        updatedById: user.id,
                    });
                    result.updated++;
                }
            } else {
                await conferenceRepository.create({
                    storeId,
                    externalId,
                    data: data as Prisma.InputJsonValue,
                    createdById: user.id,
                    updatedById: user.id,
                });
                result.created++;
            }
        }

        appLogger.info(
            'conferenceSyncService',
            `Conference upsert from AIMS complete for store ${storeId}`,
            { ...result },
        );

        return result;
    },
};
```

### IMPORTANT

- `conferenceRepository.update` and `.create` signatures must be read from `server/src/features/conference/repository.ts` before writing this file. If the actual signatures differ, adapt — but keep the public shape of `upsertManyFromArticles` stable because later tasks depend on it.
- The `action` field values come from `syncQueueService.queue(...)` — verify they are literal strings `'DELETE'` (uppercase). If the service wraps them in an enum, use the enum import.

- [ ] **Step 1: Read conference repository to confirm method signatures**

Read: `server/src/features/conference/repository.ts` fully. Note the exact signatures of `findByExternalId`, `create`, and `update`. If the signatures differ from what's used above, adapt the `create`/`update` calls in the snippet accordingly during Step 4.

- [ ] **Step 2: Write the failing test file**

Create `server/src/features/conference/__tests__/syncService.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// All prisma + repository access is mocked so the test stays unit-scoped.
const mockFindMany = vi.fn();
const mockFindByExternalId = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../../shared/config/index.js', () => ({
    prisma: {
        syncQueueItem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    },
}));

vi.mock('../repository.js', () => ({
    conferenceRepository: {
        findByExternalId: (...args: unknown[]) => mockFindByExternalId(...args),
        create: (...args: unknown[]) => mockCreate(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
    },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { conferenceSyncService } from '../syncService.js';

const user = { id: 'user-1' };

beforeEach(() => {
    mockFindMany.mockReset();
    mockFindByExternalId.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockFindMany.mockResolvedValue([]);
});

describe('conferenceSyncService.upsertManyFromArticles', () => {
    it('strips the C prefix and creates when no existing row', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockCreate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
            user,
        );

        expect(mockFindByExternalId).toHaveBeenCalledWith('store-1', '101');
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ storeId: 'store-1', externalId: '101' }),
        );
        expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
    });

    it('updates when existing row has different data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', data: { name: 'Old' } });
        mockUpdate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'New' } }],
            'store-1',
            user,
        );

        expect(mockUpdate).toHaveBeenCalledWith(
            'conf-1',
            expect.objectContaining({ data: { name: 'New' } }),
        );
        expect(result.updated).toBe(1);
    });

    it('reports unchanged when existing row has identical data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', data: { name: 'Same' } });

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Same' } }],
            'store-1',
            user,
        );

        expect(mockUpdate).not.toHaveBeenCalled();
        expect(result.unchanged).toBe(1);
    });

    it('skips articles whose externalId has a non-terminal delete in the queue', async () => {
        mockFindMany.mockResolvedValue([
            { payload: { externalId: 'C101' } },
        ]);

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
            user,
        );

        expect(mockFindByExternalId).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
        expect(result).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 });
    });

    it('skips an article with missing or single-char articleId', async () => {
        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C' }, { articleId: undefined }],
            'store-1',
            user,
        );
        expect(result.skipped).toBe(2);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('unescapes CSV-style double-quoted strings', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockCreate.mockResolvedValue({});

        await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { title: '"ד""ר"' } }],
            'store-1',
            user,
        );

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { title: 'ד"ר' } }),
        );
    });
});
```

- [ ] **Step 3: Run the test (expected FAIL)**

Run:
```bash
cd server && npx vitest run src/features/conference/__tests__/syncService.test.ts
```
Expected: all cases fail with a module-not-found error for `../syncService.js`.

- [ ] **Step 4: Create the implementation file**

Create `server/src/features/conference/syncService.ts` using the snippet at the top of this task, adapted to match the real `conferenceRepository.create`/`update` signatures noted in Step 1.

- [ ] **Step 5: Run tests (expected PASS)**

Run:
```bash
cd server && npx vitest run src/features/conference/__tests__/syncService.test.ts
```
Expected: 6 passing. If any fail, fix the implementation — do not relax assertions.

- [ ] **Step 6: Commit**

```bash
git add server/src/features/conference/syncService.ts server/src/features/conference/__tests__/syncService.test.ts
git commit -m "feat(conference): add syncService.upsertManyFromArticles for AIMS pull routing"
```

---

## Task 3: Route C-prefixed articles in `spacesSyncService.pullFromAims`

**Purpose:** Implement §1 of the spec — partition articles by prefix, delegate conference path, add pull-time race guard for spaces.

**Files:**
- Modify: `server/src/features/spaces/syncService.ts`
- Modify / create: `server/src/features/spaces/__tests__/syncService.test.ts`
- Read-only: whatever the Task 1 finding named as the conference-enabled accessor.

### Design sketch

```ts
// Inside pullFromAims, replacing the simple for-loop over `articles`.
const articles = await aimsGateway.pullArticleInfo(storeId);
result.total = articles.length;

// 1. Query pending deletes for spaces — source of truth for the race guard.
const pendingSpaceDeletes = await prisma.syncQueueItem.findMany({
    where: {
        storeId,
        entityType: 'space',
        action: 'DELETE',
        status: { in: ['PENDING', 'PROCESSING'] },
    },
    select: { payload: true },
});
const pendingSpaceDeleteExternalIds = new Set<string>();
for (const item of pendingSpaceDeletes) {
    const payload = item.payload as { externalId?: string } | null;
    if (payload?.externalId) pendingSpaceDeleteExternalIds.add(payload.externalId);
}

// 2. Partition articles. Case-insensitive 'C' prefix to match filterConferenceArticles.
const isConferenceArticle = (articleId: unknown): boolean =>
    typeof articleId === 'string' && articleId.length > 1 && articleId[0].toUpperCase() === 'C';

const conferenceArticles: typeof articles = [];
const spaceArticles: typeof articles = [];
for (const article of articles) {
    if (isConferenceArticle(article.articleId)) {
        conferenceArticles.push(article);
    } else {
        spaceArticles.push(article);
    }
}

// 3. Resolve conferenceEnabled via the helper discovered in Task 1.
const conferenceEnabled = await isConferenceFeatureEnabledForStore(storeId);

// 4. Space path — existing upsert loop, but iterate spaceArticles and skip
//    pendingSpaceDeleteExternalIds before upserting.
//    (Keep the existing spacesByExternalId map and loop body.)
const existingSpaces = await prisma.space.findMany({
    where: { storeId },
    select: { id: true, externalId: true, data: true },
});
const spacesByExternalId = new Map(existingSpaces.map((s) => [s.externalId, s]));

for (const article of spaceArticles) {
    const articleId = article.articleId;
    if (!articleId) { result.errors.push('Article missing articleId'); continue; }
    if (pendingSpaceDeleteExternalIds.has(String(articleId))) continue; // race guard

    // ... existing upsert body unchanged ...
}

// 5. Conference path.
if (conferenceEnabled && conferenceArticles.length > 0) {
    const conferenceResult = await conferenceSyncService.upsertManyFromArticles(
        conferenceArticles,
        storeId,
        user,
    );
    result.conference = conferenceResult;
} else if (!conferenceEnabled && conferenceArticles.length > 0) {
    appLogger.info(
        'spacesSyncService',
        `Skipped ${conferenceArticles.length} C-prefixed article(s) — conference feature disabled for store ${storeId}`,
    );
}
```

And extend `SyncResult`:

```ts
export interface SyncResult {
    total: number;
    created: number;
    updated: number;
    unchanged: number;
    deleted: number;
    errors: string[];
    conference?: { created: number; updated: number; unchanged: number; skipped: number };
}
```

### Steps

- [ ] **Step 1: Apply Task 1's finding to the import list**

Open `server/src/features/spaces/syncService.ts`. Add the import for the conference-enabled accessor (from Task 1) and for `conferenceSyncService` from `../conference/syncService.js`.

- [ ] **Step 2: Write failing tests for the partitioning + race guard**

Create/extend `server/src/features/spaces/__tests__/syncService.test.ts` with unit tests that mock:
- `aimsGateway.pullArticleInfo` to return a mixed array `[ { articleId: '101' }, { articleId: 'C101' }, { articleId: '102' } ]`.
- `prisma.syncQueueItem.findMany` for the pending-deletes query.
- `prisma.space.findMany` for existing spaces.
- `prisma.space.create/update`.
- The conference-enabled helper — one case returning `true`, another `false`.
- `conferenceSyncService.upsertManyFromArticles` to record its call arguments.

Assertions:

1. **Conference enabled:** non-C articles are upserted into `space`; C-prefixed articles are forwarded to `conferenceSyncService.upsertManyFromArticles` with the original articles (not stripped — stripping is conference's job); `result.conference` is populated.
2. **Conference disabled:** C-prefixed articles are not upserted into `space` AND `conferenceSyncService.upsertManyFromArticles` is NOT called; `result.conference` is undefined.
3. **Race guard:** when `syncQueueItem.findMany` returns a pending delete with `{ externalId: '101' }`, the space with externalId `'101'` is skipped (no create/update), while other non-C articles still upsert.
4. **Edge case:** `articleId: 'C'` (single char) is treated as conference by the partition but gets `skipped` by conferenceSyncService (already covered by Task 2 test; here we just ensure partitioning doesn't crash).

Write one `it()` per assertion. Use `vi.mock` to stub the dependencies. The test file must not import `@prisma/client` directly — mock everything that touches DB or network.

- [ ] **Step 3: Run tests (expected FAIL)**

Run:
```bash
cd server && npx vitest run src/features/spaces/__tests__/syncService.test.ts
```
Expected: tests fail because the current `pullFromAims` does not partition or skip.

- [ ] **Step 4: Implement the changes in `syncService.ts`**

Apply the Design Sketch above to `pullFromAims`. Preserve the existing logging at the end (`'Pull from AIMS complete for store ...'`) — extend the payload to include `conference` when present.

- [ ] **Step 5: Run tests (expected PASS)**

Run:
```bash
cd server && npx vitest run src/features/spaces/__tests__/syncService.test.ts
```
Expected: all new tests + any pre-existing ones in this file pass. Fix any failures in the implementation, not the tests.

- [ ] **Step 6: Run the entire server test suite**

Run:
```bash
cd server && npx vitest run
```
Expected: no regressions.

- [ ] **Step 7: Commit**

```bash
git add server/src/features/spaces/syncService.ts server/src/features/spaces/__tests__/syncService.test.ts
git commit -m "feat(spaces): route C-prefixed AIMS articles to conference, add pull race guard"
```

---

## Task 4: Bulk-delete endpoint (`POST /api/v1/spaces/bulk-delete`)

**Purpose:** §3a of the spec — atomic, idempotent bulk delete.

**Files:**
- Modify: `server/src/features/spaces/service.ts`
- Modify: `server/src/features/spaces/controller.ts`
- Modify: `server/src/features/spaces/routes.ts`
- Modify: `server/src/features/spaces/types.ts`
- Modify: `server/src/features/spaces/__tests__/service.test.ts` (create if missing)

- [ ] **Step 1: Add the Zod schema to `types.ts`**

Edit `server/src/features/spaces/types.ts`, append:

```ts
import { z } from 'zod';

export const bulkDeleteSpacesSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one id is required'),
});
export type BulkDeleteSpacesInput = z.infer<typeof bulkDeleteSpacesSchema>;
```

(If `z` is already imported, reuse the import.)

- [ ] **Step 2: Write the failing service test**

Create or edit `server/src/features/spaces/__tests__/service.test.ts`. Mock `prisma`, `spacesRepository`, and `syncQueueService`. Add:

```ts
describe('spacesService.deleteBulk', () => {
    it('deletes all accessible ids in one transaction and queues deletes', async () => {
        const ids = ['a', 'b'];
        mockFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', data: {} },
            { id: 'b', storeId: 'store-1', externalId: 'E-B', data: {} },
        ]);
        mockTransaction.mockImplementation(async (fn: any) => fn({
            space: { deleteMany: mockDeleteMany },
        }));
        mockDeleteMany.mockResolvedValue({ count: 2 });

        const result = await spacesService.deleteBulk(ids, userWithStore1);

        expect(mockQueueDelete).toHaveBeenCalledTimes(2);
        expect(mockQueueDelete).toHaveBeenCalledWith('store-1', 'space', 'a', 'E-A');
        expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } } });
        expect(result).toEqual({ deleted: ['a', 'b'], alreadyGone: [] });
    });

    it('throws FORBIDDEN when an id belongs to a store the user cannot access', async () => {
        mockFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', data: {} },
            { id: 'b', storeId: 'store-2', externalId: 'E-B', data: {} },
        ]);

        await expect(
            spacesService.deleteBulk(['a', 'b'], userWithStore1),
        ).rejects.toThrow('FORBIDDEN');
        expect(mockQueueDelete).not.toHaveBeenCalled();
        expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('treats missing ids as already-deleted (idempotent)', async () => {
        mockFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', data: {} },
        ]);
        mockTransaction.mockImplementation(async (fn: any) => fn({
            space: { deleteMany: mockDeleteMany },
        }));
        mockDeleteMany.mockResolvedValue({ count: 1 });

        const result = await spacesService.deleteBulk(['a', 'ghost'], userWithStore1);

        expect(result).toEqual({ deleted: ['a'], alreadyGone: ['ghost'] });
        expect(mockQueueDelete).toHaveBeenCalledTimes(1);
    });
});
```

Full test scaffolding (mocks, imports, `userWithStore1`) follows the pattern in the existing spaces tests directory — read `server/src/features/spaces/__tests__/` first to match conventions.

- [ ] **Step 3: Run the test (expected FAIL)**

Run:
```bash
cd server && npx vitest run src/features/spaces/__tests__/service.test.ts
```
Expected: FAIL — `spacesService.deleteBulk is not a function`.

- [ ] **Step 4: Add `deleteBulk` to the service**

Append to `server/src/features/spaces/service.ts`:

```ts
async deleteBulk(ids: string[], user: SpacesUserContext) {
    const storeIds = getEffectiveStoreIds(user);

    const found = await prisma.space.findMany({
        where: { id: { in: ids } },
        select: { id: true, storeId: true, externalId: true, data: true },
    });

    // Access check: any row outside the user's effective stores is a FORBIDDEN.
    if (storeIds !== undefined) {
        const forbidden = found.filter((row) => !storeIds.includes(row.storeId));
        if (forbidden.length > 0) {
            const err = new Error('FORBIDDEN');
            (err as any).forbiddenIds = forbidden.map((f) => f.id);
            throw err;
        }
    }

    const foundIds = new Set(found.map((f) => f.id));
    const alreadyGone = ids.filter((id) => !foundIds.has(id));
    const accessible = found; // after forbidden filter

    if (accessible.length === 0) {
        appLogger.info('SpacesService', `Bulk delete: nothing to delete`, {
            requested: ids.length,
            alreadyGone: alreadyGone.length,
            triggeredBy: user.id,
        });
        return { deleted: [], alreadyGone };
    }

    await prisma.$transaction(async (tx) => {
        // Enqueue deletes inside the transaction so nothing is enqueued if the
        // delete itself fails.
        for (const row of accessible) {
            await syncQueueService.queueDelete(
                row.storeId,
                'space',
                row.id,
                row.externalId,
            );
        }
        await tx.space.deleteMany({
            where: { id: { in: accessible.map((a) => a.id) } },
        });
    });

    const linkedLabelRows = accessible.filter((row) => {
        const labels = (row as any).assignedLabels as string[] | undefined;
        return labels && labels.length > 0;
    });
    appLogger.info('SpacesService', `Bulk delete complete`, {
        requested: ids.length,
        deleted: accessible.length,
        alreadyGone: alreadyGone.length,
        withLinkedLabels: linkedLabelRows.length,
        triggeredBy: user.id,
    });

    return { deleted: accessible.map((a) => a.id), alreadyGone };
},
```

Make sure `prisma` is imported at the top of the file if it isn't already.

- [ ] **Step 5: Add the controller handler**

In `server/src/features/spaces/controller.ts`:

```ts
import { bulkDeleteSpacesSchema } from './types.js';

// inside spacesController:
async deleteBulk(req: Request, res: Response, next: NextFunction) {
    try {
        const { ids } = bulkDeleteSpacesSchema.parse(req.body);
        const result = await spacesService.deleteBulk(ids, getUserContext(req));
        res.json(result);
    } catch (error: any) {
        if (error.message === 'FORBIDDEN') {
            return next(forbidden('One or more spaces belong to a store you cannot access'));
        }
        next(error);
    }
},
```

(Import `forbidden` from the existing error factory if not already imported.)

- [ ] **Step 6: Register the route**

Edit `server/src/features/spaces/routes.ts`. Add *above* the `/:id` patch/delete routes (order matters — `/bulk-delete` must come before `/:id` to avoid path-param shadowing... though it's `POST /bulk-delete` vs `DELETE /:id` so methods differ. Safe to place anywhere logically, but keep next to the other mutators):

```ts
router.post('/bulk-delete', requirePermission('spaces', 'delete'), spacesController.deleteBulk);
```

- [ ] **Step 7: Run the tests (expected PASS)**

Run:
```bash
cd server && npx vitest run src/features/spaces/__tests__/service.test.ts
```
Expected: PASS.

- [ ] **Step 8: Run the full server test suite**

Run:
```bash
cd server && npx vitest run
```
Expected: no regressions.

- [ ] **Step 9: Manual smoke against the dev server**

With the dev stack running, call the endpoint using curl (replace tokens appropriately):

```bash
curl -X POST http://localhost:3001/api/v1/spaces/bulk-delete \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{"ids":["<id1>","<id2>"]}'
```
Expected: JSON response `{"deleted":[...],"alreadyGone":[...]}`. Verify the rows are gone in Prisma Studio.

- [ ] **Step 10: Commit**

```bash
git add server/src/features/spaces/service.ts server/src/features/spaces/controller.ts server/src/features/spaces/routes.ts server/src/features/spaces/types.ts server/src/features/spaces/__tests__/service.test.ts
git commit -m "feat(spaces): add atomic idempotent bulk-delete endpoint"
```

---

## Task 5: Client API + store action for bulk delete

**Purpose:** §3a frontend half.

**Files:**
- Modify: `src/features/space/infrastructure/spacesApi.ts`
- Modify: `src/features/space/infrastructure/spacesStore.ts`
- Modify: `src/features/space/application/useSpaceController.ts`
- Modify: `src/features/space/__tests__/spacesStore.test.ts`

- [ ] **Step 1: Add the API call**

Edit `src/features/space/infrastructure/spacesApi.ts`. Append inside the `spacesApi` object:

```ts
/**
 * Delete many spaces in a single request.
 * Idempotent: ids already gone on the server are returned as `alreadyGone`.
 */
deleteBulk: async (ids: string[]): Promise<{ deleted: string[]; alreadyGone: string[] }> => {
    const response = await api.post<{ deleted: string[]; alreadyGone: string[] }>(
        '/spaces/bulk-delete',
        { ids },
    );
    return response.data;
},
```

- [ ] **Step 2: Write failing test for the store action**

Edit `src/features/space/__tests__/spacesStore.test.ts`. Add:

```ts
describe('deleteSpacesBulk', () => {
    it('removes both deleted and alreadyGone ids from state in one update', async () => {
        // Seed the store with three spaces
        useSpacesStore.setState({
            spaces: [
                { id: 'a', externalId: 'A', data: {}, syncStatus: 'SYNCED' },
                { id: 'b', externalId: 'B', data: {}, syncStatus: 'SYNCED' },
                { id: 'c', externalId: 'C', data: {}, syncStatus: 'SYNCED' },
            ] as any,
            isLoading: false,
            error: null,
        });

        // Mock the API
        vi.spyOn(spacesApi, 'deleteBulk').mockResolvedValue({
            deleted: ['a'],
            alreadyGone: ['b'],
        });

        const ok = await useSpacesStore.getState().deleteSpacesBulk(['a', 'b']);

        expect(ok).toBe(true);
        const remaining = useSpacesStore.getState().spaces.map((s) => s.id);
        expect(remaining).toEqual(['c']);
    });

    it('leaves state unchanged and returns false on API failure', async () => {
        useSpacesStore.setState({
            spaces: [{ id: 'a', externalId: 'A', data: {}, syncStatus: 'SYNCED' }] as any,
            isLoading: false,
            error: null,
        });

        vi.spyOn(spacesApi, 'deleteBulk').mockRejectedValue(new Error('boom'));

        const ok = await useSpacesStore.getState().deleteSpacesBulk(['a']);

        expect(ok).toBe(false);
        expect(useSpacesStore.getState().spaces).toHaveLength(1);
    });
});
```

- [ ] **Step 3: Run the test (expected FAIL)**

Run:
```bash
npm run test:unit -- src/features/space/__tests__/spacesStore.test.ts
```
Expected: FAIL — `deleteSpacesBulk is not a function`.

- [ ] **Step 4: Add the store action**

Edit `src/features/space/infrastructure/spacesStore.ts`. Extend the store interface:

```ts
deleteSpacesBulk: (ids: string[]) => Promise<boolean>;
```

Implement it inside the store factory, next to `deleteSpace`:

```ts
deleteSpacesBulk: async (ids) => {
    set({ isLoading: true, error: null }, false, 'deleteSpacesBulk/start');
    try {
        const { deleted, alreadyGone } = await spacesApi.deleteBulk(ids);
        const removed = new Set([...deleted, ...alreadyGone]);
        set((state) => ({
            spaces: state.spaces.filter((s) => !removed.has(s.id)),
            isLoading: false,
        }), false, 'deleteSpacesBulk/success');
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to bulk delete spaces';
        set({ error: message, isLoading: false }, false, 'deleteSpacesBulk/error');
        return false;
    }
},
```

- [ ] **Step 5: Expose via the controller**

Edit `src/features/space/application/useSpaceController.ts`. Add `deleteSpacesBulk` to the returned object:

```ts
deleteSpacesBulk: useSpacesStore((state) => state.deleteSpacesBulk),
```

(Match the existing pattern in that file — it may already use a destructured selector; follow its convention.)

- [ ] **Step 6: Run tests (expected PASS)**

Run:
```bash
npm run test:unit -- src/features/space/__tests__/spacesStore.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/space/infrastructure/spacesApi.ts src/features/space/infrastructure/spacesStore.ts src/features/space/application/useSpaceController.ts src/features/space/__tests__/spacesStore.test.ts
git commit -m "feat(spaces): add deleteSpacesBulk store action + API call"
```

---

## Task 6: Select-Mode UI in `SpacesManagementView`

**Purpose:** §2 of the spec — toggle button, checkboxes, sticky selection bar, delete flow.

**Files:**
- Modify: `src/features/space/presentation/SpacesManagementView.tsx`
- Modify: `src/locales/en/common.json`
- Modify: `src/locales/he/common.json`

- [ ] **Step 1: Add translation keys to both locale files**

Add to `src/locales/en/common.json` (merge into existing `spaces` / `common` objects — do not duplicate top-level keys):

```jsonc
{
  "common": {
    "select": "Select",
    "cancel": "Cancel"
  },
  "spaces": {
    "selectMode": {
      "selectedCount": "{{count}} selected",
      "deleteSelected": "Delete selected"
    },
    "bulkDelete": {
      "confirm": "Delete {{count}} spaces? This cannot be undone.",
      "success": "{{count}} spaces deleted",
      "error": "Failed to delete selected spaces"
    }
  }
}
```

Add the matching Hebrew strings to `src/locales/he/common.json` at the same paths:

```jsonc
{
  "common": {
    "select": "בחירה",
    "cancel": "ביטול"
  },
  "spaces": {
    "selectMode": {
      "selectedCount": "{{count}} נבחרו",
      "deleteSelected": "מחק נבחרים"
    },
    "bulkDelete": {
      "confirm": "למחוק {{count}} מרחבים? פעולה זו אינה ניתנת לביטול.",
      "success": "{{count}} מרחבים נמחקו",
      "error": "מחיקת המרחבים הנבחרים נכשלה"
    }
  }
}
```

**Important:** if a key already exists in the file, merge — don't overwrite the whole `common` or `spaces` object. Read the file first.

- [ ] **Step 2: Add select-mode state and controls to `SpacesManagementView.tsx`**

Near the top of the component (alongside existing `useState` calls), add:

```tsx
const [selectMode, setSelectMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Reset selection whenever filter/search changes.
useEffect(() => {
    setSelectedIds(new Set());
}, [searchQuery /*, any filter deps used in this file */]);

// Leave select mode → clear selection.
const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
}, []);

const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
}, []);
```

The `searchQuery` dependency (and any other filter state in this view) must be the actual names used in the file — read the file first to confirm.

- [ ] **Step 3: Add the "Select" toggle button to the toolbar**

Locate the toolbar where "Add" button is rendered. Add a button next to it, visible only when `canEdit`:

```tsx
<Tooltip title={t('common.select')}>
    <IconButton
        color={selectMode ? 'primary' : 'default'}
        disabled={!canEdit}
        onClick={() => {
            if (selectMode) exitSelectMode();
            else setSelectMode(true);
        }}
    >
        <ChecklistIcon />
    </IconButton>
</Tooltip>
```

Import `ChecklistIcon` from `@mui/icons-material/Checklist`.

- [ ] **Step 4: Add the selection bar component**

Insert above the table, inside the same container:

```tsx
{selectMode && (
    <Paper
        role="toolbar"
        elevation={3}
        sx={{
            position: isMobile ? 'fixed' : 'sticky',
            bottom: isMobile ? 0 : 'auto',
            top: isMobile ? 'auto' : 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar - 1,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
        }}
    >
        <Typography aria-live="polite" sx={{ flex: 1 }}>
            {t('spaces.selectMode.selectedCount', { count: selectedIds.size })}
        </Typography>
        <Button onClick={exitSelectMode}>{t('common.cancel')}</Button>
        <Button
            variant="contained"
            color="error"
            disabled={selectedIds.size === 0 || isLoading}
            onClick={handleBulkDelete}
        >
            {t('spaces.selectMode.deleteSelected')}
        </Button>
    </Paper>
)}
```

`isMobile` should come from the existing MUI media query used elsewhere in the file; match its pattern.

- [ ] **Step 5: Add the `handleBulkDelete` callback**

Near `handleDelete`:

```tsx
const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmed = await confirmDialog({
        title: t('common.dialog.delete'),
        message: t('spaces.bulkDelete.confirm', { count: ids.length }),
        confirmLabel: t('common.dialog.delete'),
        severity: 'error',
    });
    if (!confirmed) return;

    const ok = await spaceController.deleteSpacesBulk(ids);
    if (ok) {
        enqueueSnackbar(t('spaces.bulkDelete.success', { count: ids.length }), {
            variant: 'success',
        });
        exitSelectMode();
    } else {
        enqueueSnackbar(t('spaces.bulkDelete.error'), { variant: 'error' });
        // Keep selection so user can retry.
    }
}, [selectedIds, t, spaceController, exitSelectMode, confirmDialog, enqueueSnackbar]);
```

Match the exact `confirmDialog` / `enqueueSnackbar` API already used by this file — read `handleDelete` first to get the right hooks and property names.

- [ ] **Step 6: Add checkbox column in the desktop row renderer**

In the desktop row component (search for `onEdit={...}` usage around line 780 in the existing file):

- Add a leading `<Checkbox>` when `selectMode` is true:
  ```tsx
  {selectMode && (
      <Checkbox
          checked={selectedIds.has(space.id)}
          onChange={() => toggleSelection(space.id)}
          inputProps={{ 'aria-label': `Select ${space.externalId}` }}
      />
  )}
  ```
- Hide edit/delete icons when `selectMode` is true (`{!selectMode && <IconButton ...>}`).
- Make the row clickable to toggle selection in select mode:
  ```tsx
  onClick={selectMode ? () => toggleSelection(space.id) : undefined}
  ```

Pass `selectMode`, `selectedIds`, `toggleSelection` as props to the row component.

- [ ] **Step 7: Add the same to the mobile card layout**

Locate the mobile card rendering in the same file. Add a top-left checkbox in the card header when `selectMode` is true, using the same toggle logic. Hide the per-card edit/delete icons when `selectMode` is true.

- [ ] **Step 8: Add "select all visible" header checkbox**

In the header row of the spaces table:

```tsx
{selectMode && (
    <Checkbox
        indeterminate={
            selectedIds.size > 0 && selectedIds.size < visibleSpaces.length
        }
        checked={visibleSpaces.length > 0 && selectedIds.size === visibleSpaces.length}
        onChange={(e) => {
            if (e.target.checked) {
                setSelectedIds(new Set(visibleSpaces.map((s) => s.id)));
            } else {
                setSelectedIds(new Set());
            }
        }}
    />
)}
```

`visibleSpaces` must be whatever variable in this file holds the filtered-in spaces currently rendered. Read the file to identify it.

- [ ] **Step 9: Run the client unit tests**

Run:
```bash
npm run test:unit
```
Expected: all pass (no regressions in existing tests).

- [ ] **Step 10: Manual smoke in the dev client**

In a separate terminal:
```bash
npm run dev
```
Open `http://localhost:3000/#/spaces`, ensure several spaces exist. Click Select → checkboxes appear. Select 2-3, click Delete selected, confirm. Verify the rows disappear, the selection bar closes, and a success snackbar is shown. Verify in Prisma Studio that the rows are gone from the DB.

- [ ] **Step 11: Commit**

```bash
git add src/features/space/presentation/SpacesManagementView.tsx src/locales/en/common.json src/locales/he/common.json
git commit -m "feat(spaces): add select-mode bulk delete UI"
```

---

## Task 7: `SpacesSyncPanel` pull result shows conference counts

**Purpose:** Surface the conference-path result from Task 3 in the pull toast.

**Files:**
- Modify: `src/features/space/presentation/SpacesSyncPanel.tsx`
- Modify: `src/features/space/infrastructure/spacesApi.ts` (extend the `syncPull` return type)
- Modify: `src/locales/en/common.json`, `src/locales/he/common.json`

- [ ] **Step 1: Extend `syncPull` return type**

Edit `src/features/space/infrastructure/spacesApi.ts`:

```ts
syncPull: async (storeId: string) => {
    const response = await api.post<{
        total: number;
        created: number;
        updated: number;
        unchanged: number;
        conference?: { created: number; updated: number; unchanged: number; skipped: number };
    }>('/spaces/sync/pull', { storeId });
    return response.data;
},
```

- [ ] **Step 2: Add translation keys**

Add to both locale files under `spaces.sync`:

```jsonc
"pullResultWithConference": "Pulled {{created}} new, {{updated}} updated spaces; {{confCreated}} new, {{confUpdated}} updated conference rooms"
```

Hebrew:

```jsonc
"pullResultWithConference": "נמשכו {{created}} מרחבים חדשים, {{updated}} עודכנו; {{confCreated}} חדרי ישיבות חדשים, {{confUpdated}} עודכנו"
```

- [ ] **Step 3: Update `handlePull` to use the conditional key**

In `SpacesSyncPanel.tsx:73 handlePull`:

```tsx
const result = await spacesApi.syncPull(activeStoreId);
if (result.conference) {
    setLastResult(
        t('spaces.sync.pullResultWithConference', {
            created: result.created,
            updated: result.updated,
            confCreated: result.conference.created,
            confUpdated: result.conference.updated,
        }),
    );
} else {
    setLastResult(
        t('spaces.sync.pullResult', {
            created: result.created,
            updated: result.updated,
            unchanged: result.unchanged,
        }),
    );
}
```

- [ ] **Step 4: Run client unit tests**

Run:
```bash
npm run test:unit
```
Expected: no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/features/space/presentation/SpacesSyncPanel.tsx src/features/space/infrastructure/spacesApi.ts src/locales/en/common.json src/locales/he/common.json
git commit -m "feat(spaces): show conference counts in pull-from-AIMS toast"
```

---

## Task 8: E2E test — spaces bulk delete via select mode

**Files:**
- Create: `e2e/tests/spaces-bulk-delete.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../fixtures/helpers';

test.describe('Spaces bulk delete', () => {
    test('selects multiple rows and deletes them via the selection bar', async ({ page }) => {
        await page.goto('/#/spaces');
        await waitForAppReady(page);

        // Ensure at least 3 rows are present. If fewer, skip.
        const totalHeader = page.getByText(/Total .* - \d+/i);
        await expect(totalHeader).toBeVisible();
        const match = (await totalHeader.textContent())?.match(/(\d+)\s*$/);
        const total = match ? parseInt(match[1], 10) : 0;
        test.skip(total < 3, 'Test environment has fewer than 3 spaces');

        // Enter select mode.
        await page.getByRole('button', { name: /select/i }).click();

        // Select the first two rows by clicking their checkboxes.
        const checkboxes = page.getByRole('checkbox');
        await checkboxes.nth(1).click(); // nth(0) is the header "select all"
        await checkboxes.nth(2).click();

        // Click "Delete selected" in the selection bar.
        await page.getByRole('button', { name: /delete selected/i }).click();

        // Confirm the dialog.
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /delete/i }).click();

        // Selection bar should close, total should have decreased by 2.
        await expect(page.getByText(`Total`).first()).toBeVisible();
        await expect(page.getByText(new RegExp(`- ${total - 2}$`))).toBeVisible({
            timeout: 10000,
        });
    });
});
```

- [ ] **Step 2: Run the test**

Run:
```bash
npm run test:e2e -- --grep "bulk delete"
```
Expected: PASS. If it skips because there are fewer than 3 spaces, seed data first and retry.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/spaces-bulk-delete.spec.ts
git commit -m "test(e2e): spaces bulk delete via select mode"
```

---

## Task 9: Investigate the sequential-delete bug (evidence first)

**Purpose:** §3b of the spec. No fix is written here — only repro and evidence. The fix (if any beyond the already-shipped race guard from Task 3) is in Task 10.

**Files:**
- Modify: this plan file to record findings inline.

- [ ] **Step 1: Seed data**

Ensure 8–10 spaces exist locally for the test store AND in AIMS (use the push sync from the panel to make the local rows match AIMS).

- [ ] **Step 2: Open observability**

- Client DevTools Network panel, filter `/api/v1/spaces`.
- Server logs: `docker compose -f docker-compose.dev.yml logs -f server`.
- Prisma Studio open on the `space` table.

- [ ] **Step 3: Perform sequential deletes**

Delete 5 spaces one-by-one using the existing per-row delete button, confirming each dialog. Do NOT use the new bulk delete UI — this must reproduce the old path.

- [ ] **Step 4: Record observations**

For each delete, record in a scratch note:
- Delete request status code.
- `DELETE /spaces/:id` response body.
- Number of rows shown in UI immediately after.
- Number of rows in the DB (Prisma Studio refresh).
- Any server log entries that contain `SpacesService` or errors.

After the 5 deletes, navigate away from `/spaces` and back. Record the row counts again.

- [ ] **Step 5: Categorize the failure**

Fill in one of the following in the plan file by editing this task:

```markdown
**Observed failure:** <one of>
  - A: UI shows stale count but DB is correct (optimistic update bug)
  - B: DB still has rows (server delete failed silently)
  - C: Rows disappear then reappear after navigation (refetch bug)
  - D: Rows disappear then reappear after the next auto-pull (already fixed by Task 3's race guard)
  - E: Other — <describe>

**Evidence:** <paste relevant network responses / logs>
**Root cause hypothesis:** <one sentence>
```

- [ ] **Step 6: Commit findings**

```bash
git add docs/superpowers/plans/2026-04-13-spaces-bulk-delete-and-aims-classification.md
git commit -m "docs(plan): record sequential-delete repro findings"
```

---

## Task 10: Fix sequential-delete bug (branches on Task 9 findings)

**Purpose:** Based on the category recorded in Task 9, apply the right fix.

### If category D (race with auto-pull)

- [ ] **Step 1: Confirm Task 3's race guard fully addresses it**

Re-run the Task 9 repro procedure. If rows no longer come back, the guard is the fix.

- [ ] **Step 2: Add a regression test**

In `server/src/features/spaces/__tests__/syncService.test.ts`, add a test that starts with one pending delete queue item and one identical AIMS article, runs `pullFromAims`, and asserts the article was not upserted. (May already be covered by Task 3's "race guard" test — if so, skip this step.)

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "fix(spaces): sequential-delete race fixed by Task 3 pull guard"
```

### If category A (optimistic update bug)

- [ ] **Step 1: Locate the bug**

Likely in `spacesStore.deleteSpace` or `SpacesManagementView.handleDelete`. Inspect for:
- `setState` not functional (`set({ spaces: ... })` vs `set((state) => ...)`).
- Closure over a stale `spaces` snapshot inside `handleDelete`.

- [ ] **Step 2: Write a failing unit test**

Simulate two sequential `deleteSpace` calls and assert both are removed from state. (Test belongs in `src/features/space/__tests__/spacesStore.test.ts`.)

- [ ] **Step 3: Apply the fix**

Smallest possible change that makes the test pass. Usually: convert the `set(...)` call in `deleteSpace` to use the functional updater (it already does — verify), or fix the stale closure in `handleDelete` by reading current state inside the callback.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test:unit -- src/features/space/__tests__/spacesStore.test.ts
git add src/features/space/infrastructure/spacesStore.ts src/features/space/presentation/SpacesManagementView.tsx src/features/space/__tests__/spacesStore.test.ts
git commit -m "fix(spaces): sequential delete stale-state bug"
```

### If category B (server delete failed silently)

- [ ] **Step 1: Inspect `spacesService.delete` path**

Follow the call from `controller.delete` → `spacesService.delete` → `syncQueueService.queueDelete` → `spacesRepository.delete`. Find which throws and where the error is swallowed.

- [ ] **Step 2: Add a failing server test**

Mock the failure condition discovered in Step 1 and assert the controller returns a non-2xx response with the real error.

- [ ] **Step 3: Apply the fix**

Stop swallowing the error. Re-run the test suite.

- [ ] **Step 4: Commit**

```bash
git add server/src/features/spaces/service.ts server/src/features/spaces/controller.ts server/src/features/spaces/__tests__/service.test.ts
git commit -m "fix(spaces): surface errors from sequential single-delete path"
```

### If category C (refetch bug)

- [ ] **Step 1: Inspect `SpacesPage` data fetch**

Look for a `useEffect` that re-fetches on navigation and merges instead of replacing. Or a stale cache in the store that resurfaces on mount.

- [ ] **Step 2: Write a failing test**

Simulate a refetch after a delete and assert the deleted id is not present in the refetched list.

- [ ] **Step 3: Apply the smallest fix**

Usually: replace state wholesale on refetch, not merge.

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(spaces): delete survives navigation refetch"
```

### If category E (something else)

Stop. Write the evidence to this plan file under Task 9's scratch note, then ask the user to review before writing a fix.

---

## Task 11: CHANGELOG and wiki

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/wiki/Chapter-5-—-Integration-&-Synchronization.md` (if the AIMS flow section needs updating)

- [ ] **Step 1: Add CHANGELOG entries under `[Unreleased]`**

```markdown
### Added
- Spaces: bulk delete via new Select Mode (`Select` toolbar toggle + selection bar).
- Spaces: `POST /api/v1/spaces/bulk-delete` endpoint (atomic, idempotent).

### Fixed
- Spaces: pulling from AIMS no longer imports `C`-prefixed articles as spaces. When the conference feature is enabled for the company, those articles are upserted into conference rooms; otherwise they are skipped.
- Spaces: race condition where an AIMS pull could re-create a space that had just been deleted locally (delete still in the sync queue). Pulls now skip externalIds with non-terminal delete queue items.
- Spaces: <sequential-delete fix summary from Task 10, if applicable>
```

- [ ] **Step 2: Update wiki Chapter 5 (only if architecture changed materially)**

If Task 3 introduced a new code path visible at the architecture level, append a short note describing the partition. Otherwise, skip.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md docs/wiki/
git commit -m "docs: changelog + wiki for spaces bulk delete and AIMS classification"
```

---

## Task 12: Full verification before PR

- [ ] **Step 1: Run all server tests**

Run:
```bash
cd server && npx vitest run
```
Expected: all green.

- [ ] **Step 2: Run all client unit tests**

Run:
```bash
npm run test:unit
```
Expected: all green.

- [ ] **Step 3: Run the E2E suite**

Run:
```bash
npm run test:e2e
```
Expected: all green. If unrelated flakes appear, re-run once. If still failing, investigate.

- [ ] **Step 4: Build the client**

Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Build the server**

Run:
```bash
cd server && npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Manual sanity — full pull cycle**

- Upload a mix of space and C-prefixed articles to AIMS for the test store.
- Click "Pull from AIMS" on the spaces page.
- Verify: space rows appear in spaces table; conference rows appear in conference table (if feature enabled); nothing C-prefixed appears in spaces.
- Delete some spaces (single + bulk).
- Click "Pull from AIMS" again before the push has propagated (fast click). Verify the deleted rows do NOT come back.

---

## Task 13: Create GitHub issue, PR, project board

Follow the project's `.claude/rules/git-workflow.md`:

- [ ] **Step 1: Create the issue**

Run:
```bash
gh issue create \
  --title "Spaces: bulk delete + AIMS classification for C-prefixed articles" \
  --body "See docs/superpowers/specs/2026-04-13-spaces-bulk-delete-and-aims-classification-design.md"
```

- [ ] **Step 2: Add to project board**

Use `gh api graphql` with the IDs from CLAUDE.md / MEMORY.md to add the issue to project `PVT_kwHOC2mF1s4BP2ar`, Status=In Progress, Type=Bug (for the delete and pull classification fixes).

- [ ] **Step 3: Push branch and open PR**

```bash
git push -u origin fix/spaces-bulk-delete-and-aims-classification
gh pr create --title "fix(spaces): bulk delete + AIMS classification for C-prefixed articles" --body "$(cat <<'EOF'
## Summary
- Adds Select Mode bulk delete UI for spaces.
- Routes C-prefixed AIMS articles to conference rooms when that feature is enabled, skips them otherwise.
- Pull-time race guard prevents just-deleted spaces from being re-created by a subsequent pull.
- Sequential-delete fix from investigation in Task 9/10 (see CHANGELOG).

Closes #<issue-number>

## Test plan
- [ ] server unit tests pass
- [ ] client unit tests pass
- [ ] spaces bulk-delete E2E passes
- [ ] manual pull cycle (spaces + conference articles) classifies correctly
- [ ] single delete + immediate pull no longer resurrects the row

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: After merge**

Move the project item to Done.

---

## Self-review pass (completed by plan author before handoff)

- **Spec coverage:** every spec section maps to a task — §1→Task 3 + Task 2 (delegate), §2→Task 6, §3a→Task 4 + Task 5, §3b→Task 9, §3c→Task 3 (spaces side) + Task 2 (conference side). Translation keys for §2 covered in Task 6. Pull toast conference counts covered in Task 7. E2E covered in Task 8. Feature-flag investigation covered in Task 1.
- **Placeholders:** one deliberate branch point exists in Task 10, gated on Task 9 evidence; that is not a placeholder because each branch is fully specified. All other code blocks are complete.
- **Type consistency:** `deleteSpacesBulk` is used consistently in store, controller, view, and tests. `upsertManyFromArticles` signature matches between Task 2's definition and Task 3's call site. `conference?: { created, updated, unchanged, skipped }` matches between server type, client type in Task 7, and the API response payload in Task 5.
