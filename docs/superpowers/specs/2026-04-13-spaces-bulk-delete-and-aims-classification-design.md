# Spaces Bulk Delete + AIMS Classification — Design

**Date:** 2026-04-13
**Branch:** `fix/spaces-bulk-delete-and-aims-classification`
**Scope:** Three related fixes in the Spaces feature.

## Problems

1. **No bulk delete for spaces.** Users can only delete one space at a time.
2. **Sequential delete is unreliable.** Deleting several spaces one-by-one through the per-row button leaves some rows behind or they reappear — root cause unknown, investigation required.
3. **AIMS pull misclassifies conference rooms.** `pullFromAims` in `server/src/features/spaces/syncService.ts` ingests every article as a space, including `C`-prefixed articles that should be conference rooms.

## User decisions (from brainstorming)

| Question | Decision |
|---|---|
| What to do with `C`-prefixed articles on pull? | If the conference feature is enabled for the company → upsert them into conference rooms. If not enabled → skip entirely. Never create them as spaces. |
| What about C-prefixed rows already mistakenly stored in the `space` table from prior pulls? | Leave them; user removes them via the new bulk-delete UI. |
| Bulk-delete UI pattern? | "Select mode" toggle that reveals checkboxes only when active. |
| Reproduction mode for the sequential-delete bug? | Sequential per-row deletes through the existing confirm-dialog flow; some rows silently remain or come back. |

## 1. AIMS pull classification

**File:** `server/src/features/spaces/syncService.ts`

Before the upsert loop in `pullFromAims`:

1. Determine `conferenceEnabled` for the store's company. *Investigation item:* find the existing feature-flag accessor by grepping the codebase — do not invent one.
2. Query non-terminal pending deletes from the sync queue to build `pendingSpaceDeletes: Set<string>` (by externalId):
   ```
   SyncQueueItem where storeId = :storeId
                 AND entityType = 'space'
                 AND operation = 'delete'
                 AND status IN <non-terminal statuses>
   ```
3. Partition fetched articles by an `isConference(articleId)` helper:
   - Returns true when `articleId` is non-empty, length > 1, and the first character matches `C` (case rule to be confirmed against the existing frontend `filterConferenceArticles`).
4. **Space path:**
   - Skip any article whose externalId is in `pendingSpaceDeletes` (pull-time race guard, see §3c).
   - Otherwise, existing upsert logic unchanged.
5. **Conference path:**
   - If `!conferenceEnabled`: drop silently. No error, no log spam.
   - If enabled: delegate to new `conferenceSyncService.upsertManyFromArticles(conferenceArticles, storeId, user)`. The externalId stripping (`articleId.slice(1)`) and the conference-side race guard (§3c) happen inside that service — conference knowledge stays in the conference feature.
6. Extend `SyncResult` with an optional `conference: { created, updated, unchanged, skipped }`. Populated only when the conference path executed.

**New file:** `server/src/features/conference/syncService.ts`

- `upsertManyFromArticles(articles, storeId, user)`:
  - Query `pendingConferenceDeletes` (same query shape as above, `entityType='conference'`).
  - For each article:
    - `externalId = articleId.slice(1)`. Skip if empty.
    - Skip if `externalId ∈ pendingConferenceDeletes`.
    - Upsert via the existing `conferenceRepository.findByExternalId` + create/update path already used by `conferenceService`. Reuse the same CSV-quote unescaping transform that `spacesSyncService` applies.
  - Return counts `{ created, updated, unchanged, skipped }`.
- Unit-testable in isolation from AIMS by injecting the articles array.

### Pre-existing stale rows

After this fix, `C`-prefixed rows already stored in the `space` table are never touched by pull again (they are routed elsewhere or skipped). They remain until the user removes them via bulk delete. This is intentional, per Q2.

### Frontend changes

- `src/features/space/presentation/SpacesSyncPanel.tsx` — the pull-result toast shows both space counts and (when present in the response) conference counts.
- New translation keys `spaces.sync.pullResultWithConference` (or equivalent) in `src/locales/en/common.json` and `src/locales/he/common.json`.

## 2. Bulk delete UX ("Select mode")

**File:** `src/features/space/presentation/SpacesManagementView.tsx`

### Local state (not in Zustand store — selection is ephemeral UI state)

```ts
const [selectMode, setSelectMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### Behavior

- **Toolbar** gains a `Select` toggle button (`ChecklistIcon`). Entering select mode hides per-row edit/delete icons to prevent accidents.
- **Selection bar** — new component, sibling of the table:
  - Desktop: sticky at the top of the table area, below the page header.
  - Mobile: fixed at the bottom of the viewport (thumb reach).
  - Contents: `"{N} selected"`, `Delete selected` (red contained button), `Cancel`.
  - `role="toolbar"`, count inside `aria-live="polite"`.
- **Checkbox column:**
  - Added to the desktop custom-flexbox row renderer AND the mobile card.
  - Header row gets a "select all visible" checkbox that toggles *currently-filtered-in* rows only.
  - Each checkbox carries a descriptive `aria-label` including the row's identifying field.
- **Row click in select mode** toggles selection. Edit dialog is unreachable in select mode.
- **Filter / search change** → clear selection. Simple and predictable; avoids the "I selected twenty rows, filtered, and lost track" trap.
- **Exit select mode** (Cancel or toggle off) → clear selection.

### Delete flow

1. Click `Delete selected` → existing confirm dialog, text `t('spaces.bulkDelete.confirm', { count: N })`.
2. On confirm → `await spaceController.deleteSpacesBulk(Array.from(selectedIds))`.
3. Success → snackbar `t('spaces.bulkDelete.success', { count: N })`, exit select mode, clear selection.
4. Error → snackbar error, selection preserved so the user can retry without re-selecting.

### Translation keys (both `en` and `he`)

- `common.select`, `common.cancel` (reuse if present)
- `spaces.bulkDelete.confirm`
- `spaces.bulkDelete.success`
- `spaces.bulkDelete.error`
- `spaces.selectMode.selectedCount`
- `spaces.selectMode.deleteSelected`

## 3a. Bulk delete endpoint (atomic + idempotent)

### Files

- `server/src/features/spaces/routes.ts` — `router.post('/bulk-delete', requirePermission('spaces','delete'), spacesController.deleteBulk)`
- `server/src/features/spaces/types.ts` — Zod schema: `z.object({ ids: z.array(z.string().min(1)).min(1) })`
- `server/src/features/spaces/controller.ts` — parse body, delegate to service, return result.
- `server/src/features/spaces/service.ts` — new `deleteBulk(ids, user)`.
- `server/src/features/spaces/repository.ts` — new `findManyByIdsWithAccess` (or inline in service).

### `deleteBulk(ids, user)` — algorithm

1. `found = prisma.space.findMany({ where: { id: { in: ids } }, select: { id, storeId, externalId, data } })`.
2. Split into:
   - `accessible` — `storeId ∈ getEffectiveStoreIds(user)`.
   - `forbidden` — everything else.
3. If `forbidden.length > 0` → throw `forbidden(...)` with the offending ids. Nothing is deleted.
4. `missingIds = ids.filter(id => !found.some(f => f.id === id))` — treated as already-deleted. **Not an error** (HTTP DELETE idempotency — makes frontend retries safe).
5. `prisma.$transaction`:
   - Enqueue deletes via `syncQueueService.queueDelete(...)` per accessible row. (Or `queueDeleteBulk` if we add one — the choice is made during implementation after reading `syncQueueService` to understand its current semantics.)
   - `prisma.space.deleteMany({ where: { id: { in: accessible.map(a => a.id) } } })`.
6. One structured `appLogger.info` entry: `bulkDeleteSpaces`, totals, ids that had linked labels, `triggeredBy`. No per-id chatter.
7. Return `{ deleted: accessibleIds, alreadyGone: missingIds }`.

### Store action

`deleteSpacesBulk(ids)` in `spacesStore.ts`:
- One HTTP call.
- On success: one `set` that filters out `[...deleted, ...alreadyGone]` from `state.spaces`. No loop, no per-id loading flag.
- On HTTP error: no state change; error is thrown to the view.

## 3b. Sequential-delete bug — investigation before fix

**No fix is committed until the bug is reproduced and root-caused.** The implementation plan includes a dedicated investigation task:

1. On this branch, start client + server in the dev Docker stack.
2. Ensure 8–10 spaces exist both locally and in AIMS for the test store.
3. Open DevTools Network tab and tail `appLogger` from the server container.
4. Delete 5 spaces sequentially through the per-row button, confirming each dialog.
5. After each delete, record:
   - Network request and status code.
   - Server log entries emitted.
   - UI row count vs. DB row count (`prisma studio` or direct query).
6. Observe which rows "come back" and **when** they come back:
   - Immediately (UI-only bug), or
   - After the next pull (re-sync from AIMS), or
   - After a navigation-away-and-back (refetch bug).
7. Based on evidence, pick the fix. Candidates the investigation should confirm or eliminate:
   - `handleDelete`'s confirm dialog callback closing over stale state.
   - Optimistic UI diverging from server because a non-2xx response is swallowed.
   - Auto-sync pull racing with the delete's AIMS push and re-creating the row (§3c already prevents this).
   - A second delete's `findByIdWithAccess` returning null because a prior delete already removed it — benign unless the resulting `NOT_FOUND` is swallowed.

The plan branches at step 7. No speculative code is written before step 6.

## 3c. Pull-time race guard (defensive fix, kept independently)

Already described in §1: `pullFromAims` skips any article whose externalId is in the non-terminal `SyncQueueItem` delete set for that entity type. Applied symmetrically to spaces and conference.

- Source of truth is the DB. No in-memory cache, no restart concerns.
- Exact non-terminal status values are bound during implementation by reading the Prisma schema's `SyncQueueItem.status` enum — no guessing.

This is a defensive fix that prevents a real class of race (delete locally → pull before AIMS push completes → row comes back). Worth shipping on its own merits even if §3b's investigation finds a different root cause.

## Files touched (enumerated)

### Server
- `server/src/features/spaces/syncService.ts` — classification, race guard
- `server/src/features/spaces/service.ts` — `deleteBulk`
- `server/src/features/spaces/controller.ts` — bulk handler
- `server/src/features/spaces/routes.ts` — `POST /bulk-delete`
- `server/src/features/spaces/types.ts` — Zod schema for bulk delete
- `server/src/features/spaces/repository.ts` — `findManyByIdsWithAccess` (if helpful)
- `server/src/features/conference/syncService.ts` — **new** file: `upsertManyFromArticles`, race guard
- `server/src/shared/infrastructure/services/syncQueueService.ts` — possibly `queueDeleteBulk` (decision deferred to implementation)

### Client
- `src/features/space/infrastructure/spacesApi.ts` — `deleteBulk(ids)`
- `src/features/space/infrastructure/spacesStore.ts` — `deleteSpacesBulk` action
- `src/features/space/application/useSpaceController.ts` — expose bulk delete
- `src/features/space/presentation/SpacesManagementView.tsx` — select mode, checkboxes, selection bar, behavior rules
- `src/features/space/presentation/SpacesSyncPanel.tsx` — pull toast shows conference counts when present
- `src/locales/en/common.json`, `src/locales/he/common.json` — all new keys in both

### Tests
- `server/src/features/spaces/__tests__/syncService.test.ts` — pull classification (conference enabled / disabled, race guard, C-prefix edge cases)
- `server/src/features/spaces/__tests__/service.test.ts` — `deleteBulk` (atomicity, idempotency on missing ids, 403 on forbidden ids)
- `server/src/features/conference/__tests__/syncService.test.ts` — **new**: `upsertManyFromArticles`, strip prefix, race guard
- `src/features/space/__tests__/spacesStore.test.ts` — `deleteSpacesBulk` cases
- `e2e/tests/spaces-bulk-delete.spec.ts` — **new**: enter select mode, select rows, bulk delete, verify `"Total ... - N"` header decreases

## Open investigation items (resolved during implementation, not guessed now)

1. Exact location/shape of the company "conference enabled" feature flag.
2. Case-sensitivity rule for the `C` prefix — confirm against the existing `filterConferenceArticles`.
3. Whether `syncQueueService.queueDelete` has dedup or side effects that preclude naive bulk inserts.
4. Exact `SyncQueueItem.status` enum values representing non-terminal delete states.
5. Root cause of the sequential-delete bug (see §3b repro).

## Out of scope

- Conference-feature bulk delete UI (only spaces, per user request).
- People feature changes (explicitly excluded by the user).
- Auto-cleanup of pre-existing stale `C`-prefixed `space` rows (user chose bulk-delete path).
- Any CHANGELOG or wiki updates — those happen as part of the PR flow, not design.
