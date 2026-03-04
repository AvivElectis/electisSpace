# electisCompass — Non-Functional Requirements

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft

---

## 1. Performance

### NFR-PERF-01: API Response Time
- Space availability queries SHALL respond within **200ms** for up to 500 spaces per branch
- Booking creation SHALL complete within **500ms** including lock acquisition
- Auto-assign algorithm SHALL complete within **300ms**
- Friend proximity calculation SHALL complete within **100ms**

### NFR-PERF-02: Real-Time Latency
- Socket.IO events SHALL be delivered to connected clients within **1 second** of the triggering action
- ESL label updates (via AIMS sync queue) SHALL be queued within **2 seconds** of booking change
- End-to-end latency (booking → ESL physical update) target: **< 30 seconds** (depends on AIMS)

### NFR-PERF-03: Database Query Performance
- Available spaces query SHALL use indexes: `Space(storeId, spaceType, spaceMode)`, `Booking(spaceId, status, startTime)`
- Auto-release job SHALL use partial index: `Booking(status, endTime) WHERE status = 'BOOKED'`
- Booking conflict check SHALL use `tsrange` exclusion constraint for O(1) conflict detection
- All list queries SHALL be paginated (default 50, max 250)

### NFR-PERF-04: Caching
- Resolved booking rules SHALL be cached in Redis (TTL: 5 minutes, invalidate on rule CRUD)
- Company settings SHALL be cached in Redis (TTL: 10 minutes)
- Space availability counts per floor SHALL be cached (TTL: 30 seconds, invalidate on booking change)

### NFR-PERF-05: Background Job Efficiency
- Auto-release job SHALL process a full scan in **< 5 seconds** for up to 10,000 active bookings
- No-show detection job SHALL use indexed queries, not full table scans
- All BullMQ jobs SHALL have configurable concurrency and retry limits

---

## 2. Scalability

### NFR-SCALE-01: Concurrent Users
- The system SHALL support **1,000 concurrent Compass users** per server instance
- The system SHALL support **50 concurrent Socket.IO connections** per branch
- Horizontal scaling: add instances behind load balancer with Redis adapter for Socket.IO

### NFR-SCALE-02: Data Volume
- The system SHALL handle companies with up to **10,000 spaces** across multiple branches
- The system SHALL handle up to **50,000 bookings per month** per company
- Booking history SHALL be retained indefinitely (archival strategy for > 1 year: separate table)

### NFR-SCALE-03: Multi-Tenancy
- All queries SHALL be scoped by companyId/branchId (no cross-tenant data leakage)
- Database indexes SHALL include tenant scope columns as leading keys
- Redis cache keys SHALL include companyId prefix

### NFR-SCALE-04: Socket.IO Scaling
- Socket.IO SHALL use Redis adapter (`@socket.io/redis-adapter`) for multi-instance deployment
- Compass SHALL use a dedicated namespace `/compass` separate from admin SSE
- Each branch SHALL map to a Socket.IO room for targeted event delivery

---

## 3. Availability & Reliability

### NFR-AVAIL-01: Uptime Target
- System availability target: **99.5%** (allows ~43 hours downtime/year)
- Planned maintenance windows: Sunday 02:00-04:00 IST

### NFR-AVAIL-02: Graceful Degradation
- If Redis is unavailable: booking rules SHALL be fetched directly from DB (slower, no cache)
- If Socket.IO is unavailable: Compass SHALL fall back to periodic polling (every 30 seconds)
- If AIMS sync queue is down: booking operations SHALL proceed, sync items SHALL queue locally and retry

### NFR-AVAIL-03: Database Resilience
- All booking mutations SHALL use database transactions
- Failed transactions SHALL be retried once with exponential backoff
- Database connection pool: min 5, max 20 per server instance

### NFR-AVAIL-04: Background Job Resilience
- BullMQ jobs SHALL have retry: 3 attempts with exponential backoff (1s, 5s, 30s)
- Failed jobs after all retries SHALL be moved to dead letter queue
- Dead letter queue SHALL trigger alert to ops channel

---

## 4. Security

### NFR-SEC-01: Authentication Security
- Verification codes SHALL be hashed (bcrypt, cost factor 10) before storage
- Device tokens SHALL be cryptographically random (256-bit)
- JWT access tokens SHALL use RS256 signing (separate key from admin tokens)
- Compass auth middleware SHALL be separate from admin auth middleware

### NFR-SEC-02: Authorization
- All API endpoints SHALL validate the caller's role and scope
- Compass endpoints SHALL only be accessible with CompanyUser tokens (not admin User tokens)
- Admin endpoints SHALL only be accessible with admin User tokens
- Cross-tenant access SHALL be impossible by design (tenant scoping in all queries)

### NFR-SEC-03: Data Protection
- Integration credentials (OAuth secrets, LDAP passwords) SHALL be encrypted at rest (AES-256)
- Employee PII (email, phone, name) SHALL be accessible only within the employee's company
- API responses SHALL never include password hashes or security tokens of other users

### NFR-SEC-04: Rate Limiting & Abuse Prevention
- Auth endpoints: 5 requests/minute per email
- Booking endpoints: 20 requests/minute per user
- Space queries: 60 requests/minute per user
- All rate limits SHALL use Redis-backed sliding window counters

### NFR-SEC-05: Input Validation
- All API inputs SHALL be validated with Zod schemas at the controller layer
- No raw SQL queries — all database access through Prisma ORM
- XSS prevention: all user-provided text SHALL be sanitized before display
- CORS SHALL be configured to allow only `compass.solumesl.co.il` and `app.solumesl.co.il`

### NFR-SEC-06: Privacy (GDPR Compliance)
- Location sharing SHALL be opt-in with explicit consent (isLocationVisible preference)
- Employees SHALL be able to request data export of their booking history
- Account deactivation SHALL anonymize personal data after retention period (configurable)
- Company admin SHALL NOT be able to track individual employee locations without opt-in

---

## 5. Usability

### NFR-UX-01: Mobile-First Design
- All Compass screens SHALL be designed mobile-first (320px minimum width)
- Touch targets SHALL be minimum 44x44px
- One-handed operation: primary actions (book, check-in, release) reachable with thumb
- Maximum 3 taps from Home to booking confirmation

### NFR-UX-02: Accessibility
- All interactive elements SHALL have ARIA labels
- Color SHALL NOT be the only indicator of state (use icons + text alongside color)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Screen reader support for critical flows (booking, check-in)

### NFR-UX-03: Responsive Breakpoints
- Mobile: < 600px (fullscreen dialogs, stacked layouts, bottom nav)
- Tablet: 600-960px (side-by-side where appropriate, bottom nav)
- Desktop: > 960px (wider layouts, sidebar optional)

### NFR-UX-04: Loading States
- All async operations SHALL show loading indicators within 200ms
- Skeleton screens SHALL be used for list/card loading (not spinners)
- Optimistic UI updates for check-in and release actions

### NFR-UX-05: Error Handling UX
- Errors SHALL be shown as user-friendly messages (not technical errors)
- Booking conflicts SHALL suggest alternatives: "Space just taken. 3 nearby spaces available"
- Network errors SHALL show retry option with clear offline indicator

---

## 6. Maintainability & Clean Code

### NFR-MAINT-01: Code Organization
- Feature code SHALL follow DDD structure: `domain/`, `application/`, `infrastructure/`, `presentation/`
- Shared code SHALL reside in `src/shared/` (electisSpace) or `compass/src/shared/` (Compass)
- Cross-feature imports SHALL go through barrel exports (index.ts)

### NFR-MAINT-02: Type Safety
- TypeScript strict mode SHALL be enabled (`strict: true` in tsconfig)
- No use of `any` type except in well-documented adapter boundaries
- API request/response types SHALL be generated from Zod schemas (single source of truth)
- Prisma-generated types SHALL be used for database layer

### NFR-MAINT-03: Testing Coverage
- Server booking logic: **90%+ unit test coverage** (service layer)
- Booking rule engine: **100% branch coverage**
- Client components: unit tests for all form validation logic
- E2E: critical paths (login → book → check-in → release)

### NFR-MAINT-04: Clean Code Principles
- **Single Responsibility**: each module/class/function does one thing well
- **Open/Closed**: booking rule engine extensible via new rule types without modifying engine
- **Dependency Inversion**: services depend on interfaces, not concrete implementations
- **DRY**: shared types, validation, and utilities extracted to shared modules
- **Naming**: descriptive, intention-revealing names (no abbreviations except well-known: ID, URL, API)
- **Small functions**: max 30 lines per function, max 200 lines per file (excluding tests)
- **No magic numbers**: all thresholds and constants as named exports
- **Error handling**: explicit error types, never swallow errors silently

### NFR-MAINT-05: Documentation
- All public API endpoints SHALL have JSDoc comments
- Complex algorithms (rule resolution, proximity, auto-assign) SHALL have inline documentation
- Architecture decisions SHALL be documented in ADR format in `docs/architecture/`

---

## 7. Compatibility

### NFR-COMPAT-01: Browser Support
- Chrome 90+ (desktop & mobile)
- Safari 15+ (iOS)
- Firefox 90+ (desktop)
- Samsung Internet 15+ (Android)

### NFR-COMPAT-02: Mobile Platform Support
- Android 10+ (API level 29) via Capacitor 7
- iOS 15+ via Capacitor 7 (Phase 2)

### NFR-COMPAT-03: Backward Compatibility
- All existing electisSpace v1 API endpoints SHALL remain unchanged
- Existing AIMS sync behavior SHALL not be affected
- Existing SSE events SHALL continue to work alongside new Socket.IO
- Existing Prisma models (Space, Person, ConferenceRoom, Store) SHALL not be altered in breaking ways

---

## 8. Deployment & Operations

### NFR-OPS-01: Containerization
- Compass web app SHALL be deployable as a separate Docker container
- API server SHALL serve both apps from a single container
- Docker images SHALL support linux/amd64 and linux/arm64

### NFR-OPS-02: Configuration
- All environment-specific values SHALL be configurable via environment variables
- Compass-specific env vars SHALL use `COMPASS_` prefix
- Feature flags SHALL be stored in company settings (database), not env vars

### NFR-OPS-03: Monitoring
- All API endpoints SHALL emit structured JSON logs via `appLogger`
- Booking event metrics: creation rate, check-in rate, no-show rate, auto-release rate
- BullMQ queue depth SHALL be monitored (alert if > 100 pending items)
- Socket.IO connection count SHALL be logged per namespace

### NFR-OPS-04: Zero-Downtime Deployment
- Database migrations SHALL be additive (no column drops, no table renames in production)
- Application restart SHALL not terminate active Socket.IO connections (graceful shutdown with 30s drain)
- Rolling deployments: new version serves requests while old version drains

---

## 9. Observability

### NFR-OBS-01: Structured Logging
- All log entries SHALL include: timestamp, level, service, traceId, message, context
- Booking operations SHALL log: companyId, branchId, spaceId, userId, action, duration
- Error logs SHALL include stack trace and request context

### NFR-OBS-02: Health Checks
- `GET /health` SHALL return: server status, DB connectivity, Redis connectivity, BullMQ status
- `GET /health/ready` SHALL return readiness (DB migrations applied, queues connected)

### NFR-OBS-03: Metrics
- Booking count per hour/day/branch
- Average booking duration
- Check-in rate (checked-in / total bookings)
- No-show rate
- Space utilization (booked hours / available hours per space)
- API response time percentiles (p50, p95, p99)
