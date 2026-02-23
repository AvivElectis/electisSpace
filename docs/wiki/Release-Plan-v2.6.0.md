# Release Plan — v2.6.0

**Date:** 2026-02-23  
**Release Manager:** Shimon (AI)  
**Current Version:** 2.5.0 → **Target:** 2.6.0

---

## PR Merge Order

| Order | PR | Branch | Status | Notes |
|-------|-----|--------|--------|-------|
| 1 | #65 — QA Audit: security, performance & code quality | `feat/qa-optimization` | ✅ Ready | Fixes first — XSS patch, console.log cleanup, auth naming |
| 2 | #66 — Enhanced Features: command palette, audit log, notifications | `feat/enhanced-features` | ✅ Ready | New features on clean base |

**No conflicts** between PRs — verified via test merge.

### Pending PRs (expected from active agents)
- Tests agent — additional test coverage
- Rewards/features agents — may submit before release
- Users agent — user management enhancements

These will be reviewed as they arrive and slotted into the merge order.

---

## Version Roadmap

### v2.6.0 (This Release)
- **Security:** DOMPurify XSS protection for release notes rendering
- **Security:** `requireGlobalRole()` auth middleware rename for clarity
- **Performance:** Debug console.log removal, dev-only SSE logging
- **Feature:** Command Palette (Ctrl+K / ⌘K) with navigation & search
- **Feature:** Audit Log admin page with filters & pagination
- **Infrastructure:** Stubs for Phase 2/3 features (notifications, offline, label health)
- **Docs:** QA audit report, enhanced features design document

### v2.7.0 (Planned)
- Notification Center (Phase 2)
- Offline mode enhancements (Phase 2)
- Label Health Dashboard (Phase 3)

---

## Changelog Draft

### [2.6.0] — 2026-02-XX

#### 🔒 Security
- Fixed XSS vulnerability in update dialog release notes rendering (DOMPurify)
- Renamed `authorize()` to `requireGlobalRole()` for clearer auth middleware semantics

#### ⚡ Performance
- Removed debug `console.log` statements from production code paths
- Gated SSE connection logs behind development mode flag

#### ✨ Features
- **Command Palette** — Press Ctrl+K (⌘K on Mac) for instant navigation, search, and quick actions
- **Audit Log** — Admin page to view system activity with filtering by action, entity type, pagination, and expandable detail rows

#### 🏗️ Infrastructure
- Added stub components for upcoming features: NotificationCenter, OfflineEnhancement, LabelHealthDashboard
- Added `dompurify` dependency for HTML sanitization

#### 📝 Documentation
- Added QA audit report (`docs/QA_AUDIT_2026-02-23.md`)
- Added enhanced features design document (`docs/ENHANCED_FEATURES_DESIGN.md`)

---

## Known Issues
- AuditLogPage uses nested `<tbody>` elements (minor HTML validation issue) — tracked for fix
- Audit log route lacks `ProtectedFeature` wrapper — verify admin-only access is enforced server-side
