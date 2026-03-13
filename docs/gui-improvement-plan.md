# Improvement Plan — Future Work

Items deferred from the optimization rounds (2026-03-13) due to scope, risk, or architectural complexity.

---

## GUI Improvements

### 1. Shared ListManagementPanel Component

**Current state:** The Spaces page (`SpacesManagementView.tsx`, lines 520–578) inlines a list management collapsible panel (header with ListAltIcon, Collapse, buttons for Manage/Save/SaveChanges). The People page extracts the same pattern into `PeopleListPanel.tsx`. The Spaces panel is a simpler version but shares ~80% of the layout logic.

**Problem:** When the People panel gains features (e.g., "Free List" button, unsaved-changes warning chip), the Spaces panel does not get them — the implementations drift.

**Proposed fix:** Create a shared `ListManagementPanel` component in `src/shared/presentation/components/` that accepts handlers as props. Both `SpacesManagementView` and `PeopleManagerView` would use it.

**Risk:** High — changing props and behavior across two features simultaneously. Requires careful testing of both list workflows (save, load, free, manage).

**Files to modify:**
- `src/shared/presentation/components/ListManagementPanel.tsx` (new)
- `src/features/space/presentation/SpacesManagementView.tsx`
- `src/features/people/presentation/components/PeopleListPanel.tsx`

---

### 2. Unified Skeleton Loading Components

**Current state:** A shared `TableSkeleton` exists but renders `<Table>` elements. Conference page simple mode uses `Skeleton variant="rounded"` cards, Labels page inlines its own skeleton rows.

**Problem:** Each page has a slightly different loading skeleton style. The shared component doesn't fit card-based views.

**Proposed fix:** Create `CardSkeleton` and `ListSkeleton` variants alongside the existing `TableSkeleton`.

**Risk:** Low — purely additive. Requires visual validation across all pages.

**Files to modify:**
- `src/shared/presentation/components/CardSkeleton.tsx` (new)
- `src/shared/presentation/components/ListSkeleton.tsx` (new)
- `src/features/conference/presentation/ConferencePage.tsx`
- `src/features/labels/presentation/LabelsPage.tsx`

---

### 3. Success Feedback: Alert → Snackbar in List Panels

**Current state:** `PeopleListPanel.tsx` renders success messages as inline `Alert` components within a `Collapse` panel with 3-second auto-clear.

**Problem:** Other pages use `Snackbar + Alert` for transient success messages. The inline Alert is inconsistent and occupies layout space.

**Proposed fix:** Replace inline success `Alert` with `Snackbar`. Keep error `Alert` inline since it requires acknowledgment.

**Risk:** Low impact but changes UX flow — Snackbar appears at screen bottom instead of inline.

**Files to modify:**
- `src/features/people/presentation/components/PeopleListPanel.tsx`
- `src/features/space/presentation/SpacesManagementView.tsx`

---

## Security & Architecture Improvements

### 4. SSE Token Exposure in URL Query Parameter

**Current state:** `storeEventsService.ts` passes the JWT access token as a URL query parameter for SSE connections because the native `EventSource` API doesn't support custom headers.

**Problem:** Access tokens in URLs are captured in browser history, proxy/server access logs, and Referer headers. This contradicts the project's security model of keeping tokens in memory only.

**Mitigation applied:** Server-side HTTP logs now mask the token parameter (`token=***`).

**Proposed full fix (choose one):**
1. **SSE ticket system** — client calls a backend endpoint with the Bearer header to get a short-lived, single-use ticket token, then passes that opaque ticket in the SSE URL. The ticket is meaningless once used.
2. **Fetch-based SSE** — switch to `@microsoft/fetch-event-source` which supports custom headers via the Fetch API.

**Risk:** Medium — option 1 requires a new server endpoint; option 2 changes the SSE connection mechanism and loses native browser reconnection.

**Files to modify:**
- `src/shared/infrastructure/services/storeEventsService.ts`
- `server/src/features/stores/routes.ts` (if ticket approach)
- `server/src/features/stores/controller.ts` (if ticket approach)

---

### 5. Settings Lock Password Uses SHA-256 Instead of PBKDF2

**Current state:** `encryptionService.ts` uses `CryptoJS.SHA256()` to hash the settings lock password. The hash is stored in localStorage via Zustand persist.

**Problem:** SHA-256 is not a password hashing function — no salt, no cost factor, trivially brute-forceable if the hash is extracted from localStorage/DevTools.

**Context:** The settings lock is a UI convenience feature, not a security boundary. Anyone with device access already has full app access. However, upgrading to PBKDF2 with a per-device salt would be a best-practice improvement.

**Proposed fix:** Replace `CryptoJS.SHA256(password)` with `CryptoJS.PBKDF2(password, deviceSalt, { keySize: 256/32, iterations: 100000 })`. Store the salt alongside the hash in localStorage.

**Risk:** Low — but requires a migration path for existing locked settings (hash format change).

**Files to modify:**
- `src/shared/infrastructure/services/encryptionService.ts`
- `src/features/settings/infrastructure/settingsStore.ts` (migration)
