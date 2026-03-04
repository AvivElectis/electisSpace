# electisCompass — Advanced Capabilities

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Context:** Premium enhancements that elevate electisCompass from a workspace booking tool into a full enterprise platform. These capabilities apply across both the admin app (electisSpace) and the employee app (electisCompass).

---

## Table of Contents

1. [Advanced Analytics](#1-advanced-analytics)
2. [Service Tickets](#2-service-tickets)
3. [Single Sign-On (SSO)](#3-single-sign-on-sso)
4. [Live Chat](#4-live-chat)
5. [Webhooks](#5-webhooks)
6. [Company API](#6-company-api)

---

## 1. Advanced Analytics

### 1.1 Overview

Admin-facing analytics dashboard in electisSpace providing real-time and historical insights into workspace utilization, employee behavior, and booking patterns. Designed for executives, facility managers, and HR teams.

### 1.2 Analytics Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ 📊 Compass Analytics                    [Date Range ▼] [Export ▼] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ── KPI Summary Row ────────────────────────────────────────────── │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │Bookings  │ │Check-in  │ │Avg Usage │ │No-Show   │ │Peak Hour ││
│ │ 1,247    │ │ Rate     │ │ 6.2h/day │ │ Rate     │ │          ││
│ │ ↑12%     │ │ 84.3%    │ │ ↑0.4h    │ │ 4.1%     │ │ 09:00    ││
│ │ vs last  │ │ ↑2.1%    │ │          │ │ ↓1.2%    │ │ ↓ was    ││
│ │ month    │ │          │ │          │ │          │ │ 10:00    ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                                    │
│ ── Charts Row ─────────────────────────────────────────────────── │
│ ┌───────────────────────────┐ ┌──────────────────────────────────┐│
│ │ 📈 Bookings Over Time     │ │ 🏢 Occupancy Heatmap            ││
│ │                           │ │                                  ││
│ │ 1500│    ╭─╮              │ │    Mon Tue Wed Thu Fri           ││
│ │     │   ╭╯ ╰╮  ╭─╮       │ │ 08: ░░  ░░  ░░  ░░  ░░         ││
│ │ 1000│──╭╯   ╰─╮╯ │       │ │ 09: ██  ██  ██  ██  ▓▓         ││
│ │     │ ╭╯      ╰  ╰╮      │ │ 10: ██  ██  ██  ██  ▓▓         ││
│ │  500│╭╯            ╰╮    │ │ 11: ██  ██  ██  ▓▓  ▓▓         ││
│ │     │╯              │    │ │ 12: ▓▓  ▓▓  ▓▓  ▓▓  ░░         ││
│ │    0└─────────────────   │ │ 13: ▓▓  ▓▓  ▓▓  ▓▓  ░░         ││
│ │      Jan Feb Mar Apr May │ │ 14: ██  ██  ██  ▓▓  ░░         ││
│ └───────────────────────────┘ │ 15: ▓▓  ▓▓  ▓▓  ░░  ░░         ││
│                               │ 16: ░░  ░░  ▓▓  ░░  ░░         ││
│                               │ 17: ░░  ░░  ░░  ░░  ░░         ││
│                               │                                  ││
│                               │ ██ >80%  ▓▓ 40-80%  ░░ <40%    ││
│                               └──────────────────────────────────┘│
│                                                                    │
│ ┌───────────────────────────┐ ┌──────────────────────────────────┐│
│ │ 🪑 Space Utilization      │ │ 👥 Employee Engagement           ││
│ │                           │ │                                  ││
│ │ Office:  ████████░░ 82%   │ │ Daily active users:      156    ││
│ │ Desk:    ██████░░░░ 65%   │ │ Weekly active users:     203    ││
│ │ Conf:    ████████░░ 78%   │ │ Monthly active users:    234    ││
│ │ Phone:   ████░░░░░░ 41%   │ │ Avg sessions/user/week:  4.2   ││
│ │ Lounge:  ██░░░░░░░░ 23%   │ │ Friend connections avg:  3.8   ││
│ │                           │ │                                  ││
│ │ Recommendation:           │ │ Top departments:                 ││
│ │ Phone booths underused.   │ │ Engineering:     89% adoption    ││
│ │ Consider converting 2     │ │ Product:         76% adoption    ││
│ │ to desks.                 │ │ Sales:           52% adoption    ││
│ └───────────────────────────┘ │ HR:              34% adoption    ││
│                               └──────────────────────────────────┘│
│                                                                    │
│ ┌───────────────────────────┐ ┌──────────────────────────────────┐│
│ │ 🏢 Floor Comparison       │ │ 📋 Booking Patterns              ││
│ │                           │ │                                  ││
│ │ Floor │ Util% │ Avg Book │ │ Peak booking time:   08:30-09:30 ││
│ │ ──────┼───────┼────────  │ │ Peak check-in time:  09:00-09:15 ││
│ │ F1    │  78%  │  6.5h    │ │ Avg booking duration: 6.2h       ││
│ │ F2    │  65%  │  5.8h    │ │ Same-day bookings:    73%        ││
│ │ F3    │  42%  │  4.1h    │ │ Advance bookings:     27%        ││
│ │ F4    │  38%  │  3.9h    │ │ Cancellation rate:    8.4%       ││
│ │                           │ │ Auto-release rate:    4.1%       ││
│ │ ⚠ Floor 3-4 underused    │ │ Extension rate:       12.3%      ││
│ └───────────────────────────┘ └──────────────────────────────────┘│
│                                                                    │
│ ── Detailed Tables ────────────────────────────────────────────── │
│ [Space Report] [Employee Report] [Booking Report] [Trend Report] │
└────────────────────────────────────────────────────────────────────┘
```

### 1.3 Mobile Analytics (Compact View)

```
┌─────────────────────────────────────┐
│ 📊 Analytics        [This Month ▼] │
├─────────────────────────────────────┤
│                                     │
│ ┌───────────┐ ┌───────────────────┐ │
│ │ Bookings  │ │ Check-in Rate     │ │
│ │  1,247    │ │  84.3%            │ │
│ │  ↑12%     │ │  ↑2.1%           │ │
│ └───────────┘ └───────────────────┘ │
│ ┌───────────┐ ┌───────────────────┐ │
│ │ Occupancy │ │ No-Show Rate      │ │
│ │  62%      │ │  4.1%             │ │
│ └───────────┘ └───────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Occupancy Trend (30 days)      │ │
│ │ ╭──╮  ╭─╮ ╭──╮                │ │
│ │╭╯  ╰──╯ ╰─╯  ╰──╮            │ │
│ │╯                  ╰─           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [View Full Report →]                │
└─────────────────────────────────────┘
```

### 1.4 Analytics Data Model

```typescript
// server/src/features/analytics/analytics.types.ts

interface AnalyticsQuery {
  companyId: string;
  branchIds?: string[];
  dateRange: { start: Date; end: Date };
  granularity: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  groupBy?: 'BRANCH' | 'BUILDING' | 'FLOOR' | 'SPACE_TYPE' | 'DEPARTMENT';
}

interface BookingAnalytics {
  totalBookings: number;
  totalCheckIns: number;
  checkInRate: number;
  noShowCount: number;
  noShowRate: number;
  autoReleaseCount: number;
  cancellationCount: number;
  cancellationRate: number;
  extensionCount: number;
  extensionRate: number;
  avgBookingDuration: number;      // minutes
  peakBookingHour: number;         // 0-23
  sameDayBookingRate: number;      // percentage
  advanceBookingRate: number;      // percentage
  periodComparison: {
    bookingsChange: number;        // percentage vs previous period
    checkInRateChange: number;
    noShowRateChange: number;
  };
}

interface OccupancyAnalytics {
  overallOccupancy: number;        // percentage
  byFloor: Array<{ floorId: string; floorName: string; occupancy: number }>;
  bySpaceType: Array<{ type: string; occupancy: number; total: number }>;
  byHour: Array<{ hour: number; occupancy: number }>;   // heatmap data
  byDayOfWeek: Array<{ day: number; occupancy: number }>;
  peakDay: string;
  peakHour: number;
  underutilizedSpaces: Array<{ spaceId: string; name: string; utilization: number }>;
  recommendations: string[];
}

interface EmployeeAnalytics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionsPerWeek: number;
  avgFriendConnections: number;
  adoptionByDepartment: Array<{ department: string; rate: number }>;
  topUsers: Array<{ userId: string; name: string; bookingsCount: number }>;
}

interface OccupancyHeatmapCell {
  dayOfWeek: number;               // 0=Mon, 4=Fri
  hour: number;                    // 8-17
  occupancyRate: number;           // 0-100
  bookingCount: number;
}
```

### 1.5 Analytics API Endpoints

```
GET  /api/v2/admin/analytics/bookings
  Query: ?startDate=&endDate=&branchIds=&granularity=DAY
  → BookingAnalytics

GET  /api/v2/admin/analytics/occupancy
  Query: ?startDate=&endDate=&branchIds=&groupBy=FLOOR
  → OccupancyAnalytics

GET  /api/v2/admin/analytics/occupancy/heatmap
  Query: ?startDate=&endDate=&branchId=
  → OccupancyHeatmapCell[]

GET  /api/v2/admin/analytics/employees
  Query: ?startDate=&endDate=&branchIds=
  → EmployeeAnalytics

GET  /api/v2/admin/analytics/spaces
  Query: ?startDate=&endDate=&branchId=&floorId=
  → SpaceUtilizationReport[]

GET  /api/v2/admin/analytics/export
  Query: ?type=bookings|occupancy|employees&format=csv|xlsx&startDate=&endDate=
  → File download
```

### 1.6 Implementation Notes

- **Charting library:** `recharts` (React-native, lightweight, MUI-compatible)
- **Data aggregation:** PostgreSQL materialized views for expensive aggregations, refreshed hourly via BullMQ job
- **Caching:** Redis cache with 5-minute TTL for dashboard summary, 1-hour TTL for historical data
- **Export:** Server-side CSV/XLSX generation using `exceljs` — streamed to avoid memory spikes
- **Recommendations engine:** Rule-based (not ML) — identifies underutilized spaces, peak shifts, capacity mismatches

```sql
-- Materialized view for daily booking aggregation
CREATE MATERIALIZED VIEW daily_booking_stats AS
  SELECT
    DATE_TRUNC('day', "start_time") AS booking_date,
    "store_id" AS branch_id,
    COUNT(*) AS total_bookings,
    COUNT(*) FILTER (WHERE status = 'CHECKED_IN' OR status = 'RELEASED') AS check_ins,
    COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_shows,
    COUNT(*) FILTER (WHERE status = 'AUTO_RELEASED') AS auto_released,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
    AVG(EXTRACT(EPOCH FROM (COALESCE("released_at", "end_time") - "start_time")) / 60)
      AS avg_duration_minutes
  FROM "Booking"
  GROUP BY booking_date, branch_id;

CREATE UNIQUE INDEX ON daily_booking_stats (booking_date, branch_id);

-- Refresh hourly via BullMQ
-- REFRESH MATERIALIZED VIEW CONCURRENTLY daily_booking_stats;
```

---

## 2. Service Tickets

### 2.1 Overview

Built-in support ticket system allowing company admins to submit issues, feature requests, and questions directly from electisSpace to the SoluM/electis support team. Employees can also submit facility-related requests through Compass.

### 2.2 Ticket Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Ticket Lifecycle                            │
│                                                                  │
│  ┌──────┐    ┌──────────┐    ┌───────────┐    ┌──────────────┐ │
│  │ NEW  │───▶│ ASSIGNED │───▶│ IN_PROGRESS│───▶│  RESOLVED    │ │
│  └──┬───┘    └──────────┘    └─────┬─────┘    └──────┬───────┘ │
│     │                              │                  │         │
│     │                              │                  ▼         │
│     │                              │           ┌──────────────┐ │
│     │                              │           │   CLOSED     │ │
│     │                              │           └──────────────┘ │
│     │                              │                  ▲         │
│     │                              ▼                  │         │
│     │                        ┌───────────┐            │         │
│     └───────────────────────▶│ CANCELLED │────────────┘         │
│                              └───────────┘                      │
│                                                                  │
│  Auto-close: Resolved tickets auto-close after 7 days           │
│  if no further response from submitter                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Admin Ticket Interface (electisSpace)

```
┌────────────────────────────────────────────────────────────────┐
│ 🎫 Support Tickets                           [+ New Ticket]    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Filters: [All ▼] [All Priorities ▼] [All Categories ▼] [🔍]  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ #142 — ESL not updating after check-in                   │  │
│ │ 🔴 High │ 🐛 Bug │ Status: In Progress │ Mar 3, 2026    │  │
│ │ Assigned to: SoluM Support Team                          │  │
│ │ Last reply: 2 hours ago                                  │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ #141 — Request: Custom booking duration per space type   │  │
│ │ 🟡 Medium │ 💡 Feature Request │ Status: New │ Mar 2     │  │
│ │ Awaiting assignment                                      │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ #139 — How to configure LDAP sync?                       │  │
│ │ 🟢 Low │ ❓ Question │ Status: Resolved │ Mar 1          │  │
│ │ Resolved by: SoluM Support                               │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ Showing 1-20 of 47 tickets                   [◀ 1 2 3 ▶]     │
└────────────────────────────────────────────────────────────────┘
```

### 2.4 New Ticket Dialog

```
┌────────────────────────────────────────────────────────────────┐
│ 📝 Submit Support Ticket                              [Close] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Category:                                                      │
│ [🐛 Bug Report ▼]                                             │
│  Options: Bug Report, Feature Request, Question,              │
│           Integration Issue, Billing, Other                    │
│                                                                │
│ Priority:                                                      │
│ [🟡 Medium ▼]                                                 │
│  Options: Low, Medium, High, Critical                         │
│                                                                │
│ Subject:                                                       │
│ [____________________________________________]                 │
│                                                                │
│ Description:                                                   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ (Rich text editor with formatting)                       │  │
│ │                                                          │  │
│ │                                                          │  │
│ │                                                          │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ Attachments:                                                   │
│ [📎 Attach Files] (max 5 files, 10MB each)                    │
│                                                                │
│ 📸 Include system info:                                       │
│ [✅] App version, browser, company, branch (auto-collected)   │
│                                                                │
│ [Submit Ticket]                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.5 Employee Facility Tickets (Compass)

Employees can submit facility-related requests from Compass:

```
┌─────────────────────────────────────┐
│ 📝 Report Issue                     │
├─────────────────────────────────────┤
│                                     │
│ Type:                               │
│ [🔧 Maintenance Request ▼]         │
│  Options: Maintenance, Cleanliness, │
│  Equipment, Temperature, Noise,     │
│  Safety, Other                      │
│                                     │
│ Space (auto-filled if checked in):  │
│ [A102 — Office, Floor 1 ▼]         │
│                                     │
│ Description:                        │
│ ┌─────────────────────────────────┐ │
│ │ Monitor on desk 3 not working  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📷 Add Photo]                      │
│                                     │
│ [Submit]                            │
└─────────────────────────────────────┘
```

Employee facility tickets are visible to company admins in electisSpace. Support tickets go to the SoluM team.

### 2.6 Ticket Data Model

```typescript
// server/src/features/tickets/tickets.types.ts

interface Ticket {
  id: string;
  ticketNumber: number;          // Auto-increment per company (e.g., #142)
  companyId: string;
  submitterId: string;           // User.id (admin) or CompanyUser.id (employee)
  submitterType: 'ADMIN' | 'EMPLOYEE';

  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  subject: string;
  description: string;           // Rich text (markdown)

  // Facility tickets
  spaceId?: string;              // Related space (for facility issues)
  facilityType?: FacilityIssueType;

  // System context (auto-collected)
  systemInfo?: {
    appVersion: string;
    browser: string;
    platform: string;
    companyName: string;
    branchName: string;
  };

  // Assignment
  assignedTo?: string;           // Support team member
  assignedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Attachments
  attachments: TicketAttachment[];

  createdAt: Date;
  updatedAt: Date;
}

type TicketCategory = 'BUG' | 'FEATURE_REQUEST' | 'QUESTION' | 'INTEGRATION' | 'BILLING' | 'FACILITY' | 'OTHER';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
type FacilityIssueType = 'MAINTENANCE' | 'CLEANLINESS' | 'EQUIPMENT' | 'TEMPERATURE' | 'NOISE' | 'SAFETY' | 'OTHER';

interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'ADMIN' | 'EMPLOYEE' | 'SUPPORT';
  content: string;               // Markdown
  isInternal: boolean;           // Internal notes (support-only, not visible to submitter)
  attachments: TicketAttachment[];
  createdAt: Date;
}

interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;                   // S3/MinIO presigned URL
}
```

### 2.7 Ticket API Endpoints

```
# Admin endpoints (electisSpace)
POST   /api/v2/admin/tickets                    → Create support ticket
GET    /api/v2/admin/tickets                    → List tickets (filterable)
GET    /api/v2/admin/tickets/:id                → Get ticket details
PUT    /api/v2/admin/tickets/:id                → Update ticket
POST   /api/v2/admin/tickets/:id/comments       → Add comment
POST   /api/v2/admin/tickets/:id/attachments     → Upload attachment
GET    /api/v2/admin/tickets/stats              → Ticket summary (open/resolved/avg response time)

# Employee endpoints (Compass — facility tickets only)
POST   /api/v2/compass/tickets                  → Submit facility ticket
GET    /api/v2/compass/tickets                  → List own tickets
GET    /api/v2/compass/tickets/:id              → Get ticket details
POST   /api/v2/compass/tickets/:id/comments     → Add comment

# Support team endpoints (internal — platform admin)
GET    /api/v2/platform/tickets                 → All tickets across companies
PUT    /api/v2/platform/tickets/:id/assign      → Assign to support member
PUT    /api/v2/platform/tickets/:id/status      → Update status
POST   /api/v2/platform/tickets/:id/comments     → Add comment (with isInternal option)
```

### 2.8 Notifications

| Event | Notify |
|-------|--------|
| Ticket created | Support team (email + in-app) |
| Comment added by support | Submitter (email + push for employees) |
| Comment added by submitter | Assigned support member |
| Status changed to Resolved | Submitter |
| Auto-close warning (5 days after Resolved) | Submitter |
| Critical ticket created | Support team lead (immediate email) |

---

## 3. Single Sign-On (SSO)

### 3.1 Overview

SSO support for both admin users (electisSpace) and employees (Compass). Enables enterprise customers to authenticate via their existing identity provider.

### 3.2 Supported Protocols

| Protocol | Use Case | Admin App | Compass App |
|----------|----------|-----------|-------------|
| **SAML 2.0** | Enterprise IdPs (Okta, Azure AD, OneLogin) | ✅ | ✅ |
| **OIDC** | Modern IdPs (Auth0, Google, Azure AD B2C) | ✅ | ✅ |
| **Microsoft Entra ID** | Microsoft 365 tenants (shortcut for OIDC) | ✅ | ✅ |
| **Google Workspace** | Google-based companies (shortcut for OIDC) | ✅ | ✅ |

### 3.3 SSO Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SSO Flow                                 │
│                                                                  │
│  User clicks "Sign in with SSO"                                 │
│       │                                                          │
│       ▼                                                          │
│  ┌────────────────────┐                                         │
│  │ Enter company email │  (or select from saved companies)      │
│  └────────┬───────────┘                                         │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────┐             │
│  │ API: Lookup SSO config by email domain          │             │
│  │ company.com → SAML 2.0, IdP: Okta              │             │
│  └────────┬───────────────────────────────────────┘             │
│           │                                                      │
│       ┌───┴────┐                                                │
│       │Protocol│                                                │
│       └┬──────┬┘                                                │
│     SAML     OIDC                                               │
│        │      │                                                  │
│        ▼      ▼                                                  │
│  ┌──────────────────────┐                                       │
│  │ Redirect to IdP      │                                       │
│  │ (Okta / Azure AD /   │                                       │
│  │  Google / custom)     │                                       │
│  └──────────┬───────────┘                                       │
│             │ User authenticates at IdP                          │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────┐               │
│  │ Callback: /api/v2/auth/sso/callback          │               │
│  │                                              │               │
│  │ SAML: parse SAMLResponse assertion           │               │
│  │ OIDC: exchange code → tokens → userinfo      │               │
│  │                                              │               │
│  │ Extract: email, name, groups                 │               │
│  └──────────┬───────────────────────────────────┘               │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────┐               │
│  │ Match to User/CompanyUser by email            │               │
│  │                                              │               │
│  │ Admin app: find User → issue admin JWT       │               │
│  │ Compass:   find CompanyUser → issue compass  │               │
│  │            JWT + device token                │               │
│  │                                              │               │
│  │ If no match + auto-provision enabled:        │               │
│  │   → Create CompanyUser from SSO claims       │               │
│  └──────────┬───────────────────────────────────┘               │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │ Redirect to app with │                                       │
│  │ access token          │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 SSO Configuration (Admin Settings)

```
┌────────────────────────────────────────────────────────────────┐
│ 🔐 SSO Configuration                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ SSO Enabled: [━━━● On]                                        │
│                                                                │
│ Protocol: [SAML 2.0 ▼]                                        │
│                                                                │
│ ── SAML Configuration ──────────────────────────────────────  │
│                                                                │
│ IdP Entity ID:                                                 │
│ [https://company.okta.com/app/abc123___________________]       │
│                                                                │
│ IdP SSO URL:                                                   │
│ [https://company.okta.com/app/abc123/sso/saml_________]       │
│                                                                │
│ IdP Certificate:                                               │
│ [📁 Upload X.509 Certificate]  ✅ Valid until 2027-01-15      │
│                                                                │
│ ── Service Provider Details (copy to your IdP) ──────────── │
│                                                                │
│ SP Entity ID:       https://app.solumesl.co.il/saml/metadata  │
│ SP ACS URL:         https://app.solumesl.co.il/api/v2/auth/   │
│                     sso/callback                               │
│ SP SLO URL:         https://app.solumesl.co.il/api/v2/auth/   │
│                     sso/logout                                 │
│                                                                │
│ [📋 Copy SP Metadata XML]                                     │
│                                                                │
│ ── Advanced ─────────────────────────────────────────────────│
│                                                                │
│ Email domain:       [company.com________________]              │
│ Auto-provision:     [✅] Create employee accounts from SSO    │
│ Default branch:     [Tel Aviv HQ ▼]                           │
│ Force SSO:          [☐] Disable email+code login              │
│ Admin SSO:          [☐] Also use for admin login              │
│                                                                │
│ [🔄 Test SSO]  [Save Configuration]                           │
└────────────────────────────────────────────────────────────────┘
```

### 3.5 SSO Data Model

```typescript
// server/src/features/sso/sso.types.ts

interface SsoConfig {
  id: string;
  companyId: string;
  isActive: boolean;
  protocol: 'SAML' | 'OIDC';

  // Domain mapping
  emailDomains: string[];         // ["company.com", "company.co.il"]

  // SAML fields
  samlIdpEntityId?: string;
  samlIdpSsoUrl?: string;
  samlIdpCertificate?: string;    // X.509 PEM
  samlIdpSloUrl?: string;

  // OIDC fields
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;      // Encrypted
  oidcScopes?: string[];

  // Behavior
  autoProvision: boolean;         // Create CompanyUser from SSO claims
  defaultBranchId?: string;       // Branch for auto-provisioned users
  forceSso: boolean;              // Disable email+code fallback
  adminSso: boolean;              // Use for admin login too

  // Claim mapping
  claimMapping: {
    email: string;                // Default: 'email' or 'nameidentifier'
    firstName: string;            // Default: 'givenname'
    lastName: string;             // Default: 'surname'
    groups?: string;              // Optional: for role mapping
    department?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 3.6 SSO API Endpoints

```
# SSO config (admin)
POST   /api/v2/admin/sso                        → Create SSO config
GET    /api/v2/admin/sso                        → Get SSO config
PUT    /api/v2/admin/sso                        → Update SSO config
DELETE /api/v2/admin/sso                        → Delete SSO config
POST   /api/v2/admin/sso/test                   → Test SSO connection
GET    /api/v2/admin/sso/metadata               → SP metadata XML

# SSO auth flow
GET    /api/v2/auth/sso/login?email=user@co.com → Initiate SSO (redirect to IdP)
POST   /api/v2/auth/sso/callback                → SAML assertion consumer / OIDC callback
POST   /api/v2/auth/sso/logout                  → Single logout (SLO)
GET    /api/v2/auth/sso/check?email=user@co.com → Check if email domain has SSO configured
```

### 3.7 Compass Login Screen with SSO

```
┌─────────────────────────────────────┐
│                                     │
│        🧭 electisCompass            │
│                                     │
│  Enter your work email:             │
│  ┌─────────────────────────────────┐│
│  │ dan@company.com                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │       Continue →                 ││
│  └─────────────────────────────────┘│
│                                     │
│  (If SSO configured for domain:)    │
│  ┌─────────────────────────────────┐│
│  │  🔐 Sign in with SSO            ││
│  │  company.com via Okta           ││
│  └─────────────────────────────────┘│
│                                     │
│  ─── or ───                         │
│                                     │
│  [📧 Use email code instead]       │
│  (hidden if forceSso = true)        │
│                                     │
└─────────────────────────────────────┘
```

### 3.8 Libraries

| Protocol | Library | Notes |
|----------|---------|-------|
| SAML 2.0 | `@node-saml/passport-saml` | Mature, well-maintained |
| OIDC | `openid-client` | Certified OIDC library |
| JWT | `jsonwebtoken` (existing) | For issuing access tokens post-SSO |

---

## 4. Live Chat

### 4.1 Overview

In-app live chat enabling:
- **Admins ↔ Support team:** Direct communication channel for urgent issues
- **Employees ↔ Company admins:** Facility questions, booking help
- **Chatbot (Phase 2):** AI-powered FAQ bot before escalation to human

### 4.2 Chat Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Chat System                                │
│                                                                    │
│  ┌──────────────────┐                                             │
│  │ Chat Widget       │ ← Embedded in electisSpace & Compass      │
│  │ (React component) │                                             │
│  └────────┬─────────┘                                             │
│           │ Socket.IO                                              │
│           ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Chat Service                                │ │
│  │                                                                │ │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌───────────────┐ │ │
│  │  │ Conversation   │  │ Message Store   │  │ Presence      │ │ │
│  │  │ Manager        │  │ (PostgreSQL)    │  │ (Redis)       │ │ │
│  │  └────────────────┘  └─────────────────┘  └───────────────┘ │ │
│  │                                                                │ │
│  │  ┌────────────────┐  ┌─────────────────┐                     │ │
│  │  │ Routing Engine │  │ Notification    │                     │ │
│  │  │ (assign to     │  │ Service         │                     │ │
│  │  │  available     │  │ (email if       │                     │ │
│  │  │  agent)        │  │  offline)       │                     │ │
│  │  └────────────────┘  └─────────────────┘                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Socket.IO namespaces:                                            │
│    /chat/admin  — admin ↔ support                                 │
│    /chat/compass — employee ↔ admin                               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Chat Widget (Both Apps)

```
┌─────────────────────────────────────┐
│ (Floating button — bottom right)    │
│                                     │
│                           ┌───────┐ │
│                           │ 💬  2 │ │
│                           └───────┘ │
└─────────────────────────────────────┘

(Expanded — click to open)
┌─────────────────────────────────────┐
│ 💬 Live Chat                    [✕] │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 Support Team    Online      │ │
│ │    Avg response: < 5 min       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────┐            │
│ │ 🤖 Hi! How can we   │ 10:30 AM  │
│ │ help you today?      │           │
│ └─────────────────────┘            │
│                                     │
│         ┌─────────────────────────┐ │
│ 10:31   │ I can't check in to    │ │
│         │ my booking             │ │
│         └─────────────────────────┘ │
│                                     │
│ ┌─────────────────────┐            │
│ │ I see your booking   │ 10:31 AM  │
│ │ for A102. The check  │           │
│ │ in window opens at   │           │
│ │ 09:00. It's currently│           │
│ │ 08:45. Please try    │           │
│ │ again in 15 min.     │           │
│ └─────────────────────┘            │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Type a message...      [📎][➤]│  │
│ └─────────────────────────────┘    │
│                                     │
│ [📋 Create Ticket from Chat]       │
└─────────────────────────────────────┘
```

### 4.4 Chat Data Model

```typescript
interface ChatConversation {
  id: string;
  companyId: string;
  type: 'ADMIN_TO_SUPPORT' | 'EMPLOYEE_TO_ADMIN';
  status: 'ACTIVE' | 'WAITING' | 'RESOLVED' | 'CLOSED';

  initiatorId: string;
  initiatorType: 'ADMIN' | 'EMPLOYEE';
  assignedAgentId?: string;

  subject?: string;
  linkedTicketId?: string;        // Can create ticket from chat

  lastMessageAt: Date;
  createdAt: Date;
  closedAt?: Date;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'ADMIN' | 'EMPLOYEE' | 'SUPPORT' | 'BOT';
  content: string;
  attachments?: ChatAttachment[];
  readAt?: Date;
  createdAt: Date;
}
```

### 4.5 Chat API & Socket Events

```
# REST API
POST   /api/v2/chat/conversations              → Start conversation
GET    /api/v2/chat/conversations              → List my conversations
GET    /api/v2/chat/conversations/:id/messages → Message history
POST   /api/v2/chat/conversations/:id/messages → Send message (fallback for offline)
POST   /api/v2/chat/conversations/:id/close    → Close conversation
POST   /api/v2/chat/conversations/:id/ticket   → Convert to ticket

# Socket.IO events (real-time)
→ chat:join        { conversationId }         → Join conversation room
→ chat:message     { conversationId, content } → Send message
→ chat:typing      { conversationId }         → Typing indicator
← chat:message     { message }                ← Receive message
← chat:typing      { userId }                 ← Peer typing
← chat:read        { messageId }              ← Read receipt
← chat:assigned    { agentId, agentName }     ← Agent assigned
```

---

## 5. Webhooks

### 5.1 Overview

Webhook system allowing companies to subscribe to Compass events and receive HTTP callbacks to their own systems. Enables integration with internal tools (Slack, Teams, HR systems, facility management, ERP).

### 5.2 Available Events

| Event | Payload | Use Case |
|-------|---------|----------|
| `booking.created` | Booking + Space + User | Notify Slack channel, update ERP |
| `booking.checked_in` | Booking + Space + User | Update facility system, door access |
| `booking.released` | Booking + Space + User | Trigger cleaning schedule |
| `booking.cancelled` | Booking + Space + User + reason | Analytics, HR tracking |
| `booking.no_show` | Booking + Space + User | HR notification, pattern detection |
| `booking.auto_released` | Booking + Space + User | Facility management |
| `space.status_changed` | Space + old/new status | Facility dashboard |
| `employee.created` | CompanyUser (no sensitive data) | HR system sync |
| `employee.deactivated` | CompanyUser | Access revocation |
| `occupancy.threshold` | Branch + floor + current % | Alert when over/under threshold |
| `ticket.created` | Ticket summary | Route to internal ticketing system |
| `integration.sync_completed` | Summary stats | Monitoring dashboard |

### 5.3 Webhook Configuration (Admin UI)

```
┌────────────────────────────────────────────────────────────────┐
│ 🔗 Webhooks                                   [+ Add Webhook] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 🟢 Slack Notifications                                   │  │
│ │ URL: https://hooks.slack.com/services/T00/B00/xxxx       │  │
│ │ Events: booking.created, booking.no_show                 │  │
│ │ Last delivery: 2 min ago ✅                              │  │
│ │ [Edit] [Test] [Disable] [Logs]                           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 🟢 HR System Sync                                       │  │
│ │ URL: https://hr.company.com/api/webhooks/compass         │  │
│ │ Events: employee.created, employee.deactivated           │  │
│ │ Last delivery: 1 hour ago ✅                             │  │
│ │ [Edit] [Test] [Disable] [Logs]                           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 🔴 Facility System (failing)                             │  │
│ │ URL: https://facility.company.com/webhooks               │  │
│ │ Events: booking.released, space.status_changed           │  │
│ │ Last delivery: 3 hours ago ❌ (503 — 5 consecutive)     │  │
│ │ Auto-disabled. [Re-enable] [Edit] [Logs]                 │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 5.4 Webhook Data Model

```typescript
// server/src/features/webhooks/webhooks.types.ts

interface WebhookEndpoint {
  id: string;
  companyId: string;
  name: string;
  url: string;
  secret: string;                // HMAC-SHA256 signing secret
  events: string[];              // Event types subscribed to
  isActive: boolean;
  headers?: Record<string, string>;  // Custom headers

  // Retry policy
  maxRetries: number;            // Default: 3
  retryBackoffMs: number;        // Default: 1000 (exponential)

  // Health tracking
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: number;   // HTTP status code
  consecutiveFailures: number;
  autoDisabledAt?: Date;         // Auto-disable after 10 consecutive failures

  createdAt: Date;
  updatedAt: Date;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: object;
  requestHeaders: Record<string, string>;
  responseStatus: number | null;
  responseBody: string | null;   // First 1KB
  duration: number;              // ms
  attempt: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}
```

### 5.5 Webhook Delivery System

```typescript
// server/src/features/webhooks/webhooks.service.ts

export class WebhookService {
  constructor(
    private readonly endpointRepo: WebhookEndpointRepository,
    private readonly deliveryRepo: WebhookDeliveryRepository,
    private readonly queue: BullMQ.Queue,
  ) {}

  async dispatch(companyId: string, event: string, payload: object): Promise<void> {
    const endpoints = await this.endpointRepo.findActiveByEvent(companyId, event);

    for (const endpoint of endpoints) {
      await this.queue.add('webhook-delivery', {
        endpointId: endpoint.id,
        event,
        payload,
        attempt: 1,
      }, {
        attempts: endpoint.maxRetries + 1,
        backoff: { type: 'exponential', delay: endpoint.retryBackoffMs },
      });
    }
  }
}

// Worker
async function processWebhookDelivery(job: BullMQ.Job): Promise<void> {
  const { endpointId, event, payload, attempt } = job.data;
  const endpoint = await endpointRepo.findById(endpointId);

  const timestamp = Date.now();
  const signature = createHmac('sha256', endpoint.secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'X-Compass-Event': event,
    'X-Compass-Signature': `sha256=${signature}`,
    'X-Compass-Timestamp': String(timestamp),
    'X-Compass-Delivery': job.id,
    ...endpoint.headers,
  };

  const start = Date.now();
  try {
    const response = await axios.post(endpoint.url, {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    }, { headers, timeout: 10000 });

    await deliveryRepo.create({
      endpointId, event, payload, requestHeaders: headers,
      responseStatus: response.status, responseBody: truncate(response.data, 1024),
      duration: Date.now() - start, attempt, success: true,
    });

    await endpointRepo.resetFailures(endpointId);
  } catch (error) {
    const status = error.response?.status || null;
    await deliveryRepo.create({
      endpointId, event, payload, requestHeaders: headers,
      responseStatus: status, responseBody: truncate(error.response?.data, 1024),
      duration: Date.now() - start, attempt, success: false,
      error: error.message,
    });

    await endpointRepo.incrementFailures(endpointId);

    // Auto-disable after 10 consecutive failures
    const failures = await endpointRepo.getConsecutiveFailures(endpointId);
    if (failures >= 10) {
      await endpointRepo.autoDisable(endpointId);
    }

    throw error; // Let BullMQ handle retry
  }
}
```

### 5.6 Webhook Security

| Measure | Implementation |
|---------|---------------|
| **HMAC signature** | Every delivery signed with `X-Compass-Signature: sha256=<hmac>`. Receiver verifies. |
| **Timestamp** | `X-Compass-Timestamp` included. Receiver should reject deliveries older than 5 minutes. |
| **Secret rotation** | Admin can regenerate webhook secret. Old secret valid for 24h grace period. |
| **URL validation** | Only HTTPS URLs accepted. No localhost/private IPs. DNS resolution verified. |
| **Timeout** | 10-second timeout per delivery. Slow endpoints don't block the queue. |
| **Rate limit** | Max 100 deliveries/minute per endpoint. Burst protection. |

### 5.7 Webhook API Endpoints

```
POST   /api/v2/admin/webhooks                   → Create endpoint
GET    /api/v2/admin/webhooks                   → List endpoints
GET    /api/v2/admin/webhooks/:id               → Get endpoint details
PUT    /api/v2/admin/webhooks/:id               → Update endpoint
DELETE /api/v2/admin/webhooks/:id               → Delete endpoint
POST   /api/v2/admin/webhooks/:id/test          → Send test delivery
POST   /api/v2/admin/webhooks/:id/rotate-secret → Rotate signing secret
GET    /api/v2/admin/webhooks/:id/deliveries    → Delivery history (paginated)
POST   /api/v2/admin/webhooks/:id/enable        → Re-enable auto-disabled endpoint
```

---

## 6. Company API

### 6.1 Overview

Public REST API allowing companies to programmatically interact with their Compass data. Secured with API keys, rate-limited, and scoped to the company's own data.

### 6.2 API Key Management

```
┌────────────────────────────────────────────────────────────────┐
│ 🔑 API Keys                                    [+ Create Key] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Production Key                                           │  │
│ │ Key: ck_live_••••••••••••••••••3f2a                      │  │
│ │ Created: Mar 1, 2026                                     │  │
│ │ Last used: 2 min ago                                     │  │
│ │ Scopes: bookings:read, spaces:read, employees:read      │  │
│ │ Rate limit: 100 req/min                                  │  │
│ │ [Revoke] [Edit Scopes]                                   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Development Key                                          │  │
│ │ Key: ck_test_••••••••••••••••••9b1c                      │  │
│ │ Created: Feb 28, 2026                                    │  │
│ │ Last used: 3 days ago                                    │  │
│ │ Scopes: bookings:*, spaces:*, employees:read             │  │
│ │ Rate limit: 50 req/min                                   │  │
│ │ [Revoke] [Edit Scopes]                                   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ── Usage (This Month) ──────────────────────────────────────  │
│ Total requests: 12,847                                        │
│ Avg response time: 45ms                                       │
│ Error rate: 0.3%                                              │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 API Key Data Model

```typescript
interface ApiKey {
  id: string;
  companyId: string;
  name: string;
  keyPrefix: string;             // "ck_live_" or "ck_test_"
  keyHash: string;               // SHA-256 hash of full key
  lastFourChars: string;         // For display: "3f2a"
  scopes: ApiScope[];
  rateLimit: number;             // Requests per minute
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;              // Optional expiry
  createdAt: Date;
  createdBy: string;             // Admin user who created it
}

type ApiScope =
  | 'bookings:read'
  | 'bookings:write'
  | 'bookings:*'
  | 'spaces:read'
  | 'spaces:write'
  | 'spaces:*'
  | 'employees:read'
  | 'employees:write'
  | 'employees:*'
  | 'buildings:read'
  | 'analytics:read'
  | 'webhooks:manage';
```

### 6.4 Company API Endpoints

All endpoints under `/api/v2/public/` — authenticated with `Authorization: Bearer ck_live_...`

```
# Bookings
GET    /api/v2/public/bookings                  → List bookings (filterable by date, space, user)
GET    /api/v2/public/bookings/:id              → Get booking details
POST   /api/v2/public/bookings                  → Create booking (on behalf of employee)
PUT    /api/v2/public/bookings/:id/cancel       → Cancel booking
GET    /api/v2/public/bookings/active            → Active bookings right now

# Spaces
GET    /api/v2/public/spaces                    → List spaces (with availability status)
GET    /api/v2/public/spaces/:id                → Space details
GET    /api/v2/public/spaces/available           → Available spaces (real-time)

# Buildings & Floors
GET    /api/v2/public/buildings                 → List buildings
GET    /api/v2/public/buildings/:id/floors      → List floors in building

# Employees
GET    /api/v2/public/employees                 → List employees (scoped to company)
GET    /api/v2/public/employees/:id             → Employee details
POST   /api/v2/public/employees                 → Create employee
PUT    /api/v2/public/employees/:id             → Update employee
PUT    /api/v2/public/employees/:id/deactivate  → Deactivate employee

# Analytics (read-only)
GET    /api/v2/public/analytics/occupancy       → Current occupancy stats
GET    /api/v2/public/analytics/bookings        → Booking stats for date range

# API key management
GET    /api/v2/admin/api-keys                   → List API keys (admin only)
POST   /api/v2/admin/api-keys                   → Create API key
DELETE /api/v2/admin/api-keys/:id               → Revoke API key
PUT    /api/v2/admin/api-keys/:id               → Update key scopes/limits
GET    /api/v2/admin/api-keys/:id/usage         → Key usage statistics
```

### 6.5 API Authentication Middleware

```typescript
// server/src/shared/middleware/apiKeyAuth.ts

export function apiKeyAuth(...requiredScopes: ApiScope[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'MISSING_API_KEY',
        message: 'Provide API key via Authorization: Bearer ck_live_...',
      });
    }

    // Lookup by hash (never store raw keys)
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyRecord = await apiKeyRepo.findByHash(keyHash);

    if (!keyRecord || !keyRecord.isActive) {
      return res.status(401).json({ error: 'INVALID_API_KEY' });
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API_KEY_EXPIRED' });
    }

    // Check scopes
    for (const scope of requiredScopes) {
      if (!hasScope(keyRecord.scopes, scope)) {
        return res.status(403).json({
          error: 'INSUFFICIENT_SCOPE',
          required: scope,
          granted: keyRecord.scopes,
        });
      }
    }

    // Rate limiting (per key)
    const allowed = await rateLimiter.check(`api:${keyRecord.id}`, keyRecord.rateLimit, 60);
    if (!allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      });
    }

    // Update last used
    apiKeyRepo.updateLastUsed(keyRecord.id);

    req.companyId = keyRecord.companyId;
    req.apiKeyId = keyRecord.id;
    next();
  };
}

function hasScope(granted: ApiScope[], required: ApiScope): boolean {
  const [resource, action] = required.split(':');
  return granted.some(s => {
    const [r, a] = s.split(':');
    return r === resource && (a === '*' || a === action);
  });
}
```

### 6.6 API Response Format

```typescript
// Success
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 234,
    "hasMore": true
  }
}

// Error
{
  "error": "SPACE_ALREADY_BOOKED",
  "message": "Space A102 has a conflicting booking from 09:00 to 18:00",
  "details": {
    "conflictingBookingId": "uuid-here",
    "conflictStart": "2026-03-04T09:00:00Z",
    "conflictEnd": "2026-03-04T18:00:00Z"
  }
}

// Rate limit headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709561000
```

### 6.7 API Documentation

Serve interactive API docs at `/api/v2/public/docs` using OpenAPI/Swagger:

```typescript
// server/src/features/api-docs/api-docs.routes.ts

import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './openapi-spec';

router.use('/api/v2/public/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiSpec()));
```

---

## 7. Implementation Priority

| Capability | Priority | Phase | Dependencies |
|------------|----------|-------|-------------|
| **Advanced Analytics** | P1 | Phase 2 | Bookings data available |
| **Webhooks** | P1 | Phase 2 | Booking events + BullMQ |
| **Company API** | P1 | Phase 2 | Core CRUD endpoints ready |
| **Service Tickets** | P2 | Phase 3 | Basic UI framework |
| **SSO** | P2 | Phase 3 | Auth system finalized |
| **Live Chat** | P3 | Phase 4 | Socket.IO infrastructure + tickets |

### Dependency Graph

```
Phase 1 (Core Compass)
    │
    ├──▶ Phase 2: Analytics + Webhooks + Company API
    │    (these need booking/space data flowing)
    │
    ├──▶ Phase 3: SSO + Service Tickets
    │    (SSO needs auth system stable; tickets need UI patterns)
    │
    └──▶ Phase 4: Live Chat
         (needs Socket.IO + tickets for escalation)
```

---

## 8. Infrastructure Impact

| Capability | RAM Impact | CPU Impact | Disk Impact | New Dependencies |
|------------|-----------|-----------|-------------|-----------------|
| Analytics | +256 MB (materialized views) | Medium (aggregation queries) | +2 GB/year (stats data) | `recharts`, `exceljs` |
| Tickets | +64 MB | Low | +1 GB/year (attachments) | File storage (S3/MinIO) |
| SSO | +32 MB | Low (token validation) | Negligible | `@node-saml/passport-saml`, `openid-client` |
| Live Chat | +128 MB (Socket.IO connections) | Low-Medium | +500 MB/year (messages) | — (uses existing Socket.IO) |
| Webhooks | +64 MB (queue) | Low (async delivery) | +200 MB/year (delivery logs) | — (uses existing BullMQ) |
| Company API | +32 MB | Medium (additional API traffic) | Negligible | `swagger-ui-express` |

**Total additional RAM for all 6 capabilities: ~576 MB** — fits within the buffer allocation in the medium deployment tier (doc 11).
