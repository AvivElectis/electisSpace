---
tags: [#ux, #audit, #redesign, #stitch]
---

**Related:** [[electisSpace]], [[architecture]], [[domain]]

# UX Audit & Redesign Initiative

**Started:** 2026-04-16
**Status:** Audit complete, awaiting redesign prioritization
**Full spec:** `docs/superpowers/specs/2026-04-16-ux-audit-and-redesign.md`

## Summary

Whole-app UX audit found 19 friction points across all surfaces. Key themes:
- No first-run experience or empty states — new users are lost
- Dashboard is display-only, not actionable
- Feature restrictions fail silently
- People manager: invisible list locking, risky bulk ops
- Conference simple mode has a dead end (no inline label linking)
- Settings dialog heavy, confusing auto-save, role-dependent tabs unexplained
- Mobile: FAB placement conflicts with Android gestures

## Redesign Priority

1. First-Run Experience + Empty States (biggest adoption impact)
2. Dashboard Redesign (make it actionable)
3. People Manager UX (daily-use surface)
4. Login & Auth Flow (first touch point)
5. Conference Room Inline Label Linking (quick win)
6. Settings Dialog Overhaul
7. Mobile Layout Polish

## Tool: Google Stitch SDK

Using Google Stitch SDK to generate visual mockups for redesign proposals. API key in `.mcp.json`. Spec in `docs/superpowers/specs/2026-04-16-ux-audit-and-redesign.md` has full Stitch usage instructions.
