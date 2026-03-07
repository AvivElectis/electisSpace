# electisCompass — State Diagrams

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft

---

## 1. Booking State Machine

```
                              ┌──────────────┐
                              │              │
                    ┌────────▶│  CANCELLED   │
                    │         │              │
                    │         └──────────────┘
                    │
              ┌─────┴─────┐
              │           │        ┌──────────────────┐
  Employee ──▶│  BOOKED   │───────▶│    NO_SHOW       │
  books  OR   │           │        │ (check-in window │
  Admin ─────▶└─────┬─────┘        │  expired, auto-  │
                    │              │  release enabled) │
                    │              └──────────────────┘
                    │
           Employee checks in
           (within window)
                    │
              ┌─────▼─────┐
              │           │
              │ CHECKED_IN│
              │           │
              └─────┬─────┘
                    │
         ┌─────────┼─────────┐
         │                   │
   Employee releases    endTime passes
   early                (BullMQ job)
         │                   │
   ┌─────▼─────┐    ┌───────▼────────┐
   │           │    │                │
   │ RELEASED  │    │ AUTO_RELEASED  │
   │           │    │                │
   └───────────┘    └────────────────┘


State Transitions:
  (new) → BOOKED             (employee action: book, OR admin action: reserve space)
  BOOKED → CHECKED_IN        (employee action: check-in)
  BOOKED → CANCELLED         (employee action: cancel, OR admin action: cancel)
  BOOKED → NO_SHOW           (system: no-show job, when autoReleaseOnNoShow=true)
  BOOKED → AUTO_RELEASED     (system: auto-release job, endTime passed)
  CHECKED_IN → RELEASED      (employee action: release early)
  CHECKED_IN → AUTO_RELEASED (system: auto-release job, endTime passed)

  Admin-created bookings (bookedBy='ADMIN'):
  - Skip rule validation (max concurrent, advance limit, etc.)
  - May have null endTime ("until cancellation" — no auto-release)
  - Same state transitions after creation

Terminal States: CANCELLED, NO_SHOW, RELEASED, AUTO_RELEASED
```

### Booking State Transition Table

| Current State | Event | Guard | Next State | Side Effects |
|--------------|-------|-------|------------|-------------|
| (new) | `employee.book` | Rules pass, no conflicts | BOOKED | AIMS sync, Socket.IO, push notification |
| (new) | `admin.reserve` | No conflicts (rules bypassed) | BOOKED | AIMS sync, Socket.IO. Sets `bookedBy='ADMIN'` |
| BOOKED | `employee.checkIn` | Within check-in window | CHECKED_IN | AIMS sync, Socket.IO, friend location update |
| BOOKED | `employee.cancel` | — | CANCELLED | AIMS sync (→ Available), Socket.IO |
| BOOKED | `admin.cancel` | — | CANCELLED | AIMS sync (→ Available), Socket.IO |
| BOOKED | `system.noShowCheck` | Window expired AND autoRelease=true | NO_SHOW | AIMS sync, Socket.IO, push notification |
| BOOKED | `system.autoRelease` | endTime < now AND endTime IS NOT NULL | AUTO_RELEASED | AIMS sync, Socket.IO, push notification |
| CHECKED_IN | `employee.release` | — | RELEASED | AIMS sync, Socket.IO, friend location clear |
| CHECKED_IN | `system.autoRelease` | endTime < now AND endTime IS NOT NULL | AUTO_RELEASED | AIMS sync, Socket.IO, push notification |
| CHECKED_IN | `employee.extend` | No conflicts, within max duration | CHECKED_IN | Update endTime, AIMS sync |

> **Note:** Bookings with `endTime=null` ("until cancellation") are never auto-released. They must be manually cancelled or released.

---

## 2. Space Mode State Machine

```
Space modes are ADMIN-CONTROLLED (not booking-driven).
Modes determine WHETHER a space can participate in bookings.

                ┌─────────────┐
   Create ─────▶│  AVAILABLE  │◀───────────────────┐
                │ (default)   │                     │
                └──────┬──────┘              Admin restores
                       │                           │
           ┌───────────┼───────────┐               │
           │           │           │               │
     Admin excludes  Admin sets  Admin marks       │
           │        permanent    maintenance       │
           │           │           │               │
     ┌─────▼────┐ ┌────▼─────┐ ┌──▼────────┐     │
     │ EXCLUDED │ │PERMANENT │ │MAINTENANCE│     │
     │          │ │          │ │           │     │
     │ Not in   │ │ Assigned │ │ Temp out  │─────┘
     │ booking  │ │ to one   │ │ of service│
     │ pool     │ │ employee │ │           │
     └─────┬────┘ └──────────┘ └───────────┘
           │
     Admin assigns ──▶ PERMANENT
     permanent
     employee


Mode Effects:
  AVAILABLE   → Space appears in booking search, can be booked
  EXCLUDED    → Hidden from booking search, can ONLY be assigned permanently
  PERMANENT   → Hidden from booking search, shows assignee on ESL
  MAINTENANCE → Hidden from booking search, shows "Out of Service" on ESL
```

---

## 3. Friendship State Machine

```
                    ┌───────────┐
  User A sends ────▶│  PENDING  │
  friend request    │           │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │                       │
        User B accepts          User B blocks
              │                       │
        ┌─────▼─────┐          ┌──────▼──────┐
        │ ACCEPTED  │          │  BLOCKED    │
        │           │          │             │
        │ Mutual    │          │ A cannot    │
        │ location  │          │ re-send     │
        │ sharing   │          │ requests    │
        └─────┬─────┘          └─────────────┘
              │
        Either user removes
              │
        ┌─────▼─────┐
        │ (deleted)  │
        │ Record     │
        │ removed    │
        └────────────┘
```

---

## 4. Employee Authentication State Machine

```
                ┌──────────────┐
                │ UNAUTHENTICATED│
   App open ───▶│ (no session)  │
                └──────┬───────┘
                       │
              ┌────────┼────────┐
              │                 │
        Has device         No device
        token              token
              │                 │
     ┌────────▼────────┐  ┌────▼─────────────┐
     │ VALIDATING_DEVICE│  │ AWAITING_EMAIL   │
     │ (auto-login)    │  │ (login screen)   │
     └────────┬────────┘  └────┬─────────────┘
              │                │
     ┌────────┼────────┐  Email entered
     │                 │       │
   Valid           Invalid ┌───▼──────────────┐
     │              token  │ AWAITING_CODE    │
     │                │   │ (code sent)      │
     │          ┌─────▼──┐└───┬──────────────┘
     │          │ Back to│    │
     │          │ EMAIL  │  Code entered
     │          └────────┘    │
     │                   ┌────▼────────────┐
     │                   │ VALIDATING_CODE │
     │                   └────┬────────────┘
     │                        │
     │              ┌─────────┼─────────┐
     │              │                   │
     │            Valid             Invalid
     │              │                   │
     │              │            ┌──────▼──────┐
     │              │            │ INCREMENT   │
     │              │            │ ATTEMPTS    │
     │              │            └──────┬──────┘
     │              │                   │
     │              │         ┌─────────┼─────────┐
     │              │         │                   │
     │              │    < 5 attempts        >= 5 attempts
     │              │         │                   │
     │              │    Back to code      ┌──────▼──────┐
     │              │    entry              │ LOCKED      │
     │              │                      │ (15 min)    │
     │              │                      └─────────────┘
     │              │
     └──────────────┼──▶ ┌──────────────┐
                    └───▶│ AUTHENTICATED │
                         │ (session)     │
                         └──────┬───────┘
                                │
                          Logout / token
                          expiry (no refresh)
                                │
                         ┌──────▼───────┐
                         │UNAUTHENTICATED│
                         └──────────────┘
```

---

## 5. Compass Feature Toggle State Machine

```
Company Feature Configuration:
When compassEnabled transitions, other features MUST respond.

                    ┌───────────────────────┐
                    │  COMPASS DISABLED     │
                    │  (default)            │
                    │                       │
                    │  spaces: unlocked     │
                    │  people: unlocked     │
                    │  conference: unlocked │
                    │  labels: unlocked     │
                    │  aims: unlocked       │
                    └───────────┬───────────┘
                                │
                     Admin enables Compass
                     in wizard or settings
                                │
                    ┌───────────▼───────────┐
                    │  COMPASS ENABLED      │
                    │                       │
                    │  spaces: LOCKED OFF   │
                    │  people: LOCKED OFF   │
                    │  conference: LOCKED OFF│
                    │  labels: unlocked     │
                    │  aims: unlocked       │
                    │                       │
                    │  Compass features:    │
                    │  - Buildings          │
                    │  - Floors/Areas       │
                    │  - Booking Rules      │
                    │  - Employee Mgmt      │
                    │  - Compass Dashboard  │
                    └───────────┬───────────┘
                                │
                     Admin disables Compass
                     (confirmation required)
                                │
                    ┌───────────▼───────────┐
                    │  COMPASS DISABLED     │
                    │  (all features        │
                    │   unlocked again)     │
                    │                       │
                    │  WARNING: Existing    │
                    │  bookings cancelled   │
                    │  Buildings/floors     │
                    │  data preserved       │
                    └───────────────────────┘
```

---

## 6. AIMS Sync State per Space (Enhanced for Compass)

```
                    ┌──────────────┐
                    │  NOT_SYNCED  │
    Space created ─▶│              │
                    └──────┬───────┘
                           │
                     First sync push
                           │
                    ┌──────▼───────┐
                    │   SYNCED     │◀──────────────────┐
                    │              │                    │
                    └──────┬───────┘             Sync succeeds
                           │                           │
              ┌────────────┼────────────┐              │
              │                         │              │
        Booking event            Data change     ┌─────┴─────┐
        triggers update          (admin edit)    │ SYNC_QUEUE │
              │                         │        │            │
              └─────────┬───────────────┘        └────────────┘
                        │                              ▲
                  ┌─────▼─────┐                        │
                  │  PENDING  │──── Throttle OK ──────▶│
                  │  _SYNC    │     (30s since last)
                  │           │
                  │  Throttle │── Throttle active ──▶ Wait
                  └───────────┘
```
