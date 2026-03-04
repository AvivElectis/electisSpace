# electisCompass — Clean Code Guidelines

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Principle:** Compass is a flagship feature — code quality must be premium.

---

## 1. SOLID Principles Applied

### Single Responsibility (SRP)

Each module has ONE reason to change:

| Module | Responsibility | NOT responsible for |
|--------|---------------|---------------------|
| `BookingService` | Booking business logic (create, check-in, release) | HTTP handling, data access, ESL sync |
| `BookingController` | Parse HTTP request → call service → format response | Business rules, database queries |
| `BookingRepository` | Prisma queries for bookings table | Business logic, HTTP concerns |
| `BookingRuleEngine` | Resolve applicable rules for a context | Rule storage, rule CRUD UI |
| `ProximityService` | Calculate space proximity to friends | Friendship management, space CRUD |
| `AimsSyncQueue` | Queue and throttle AIMS updates | AIMS API calls, booking logic |

**Anti-pattern to avoid:**
```typescript
// BAD — controller does everything
async function createBooking(req, res) {
  const rules = await prisma.bookingRule.findMany({ where: { branchId: req.body.branchId } });
  // 50 lines of rule validation...
  const booking = await prisma.booking.create({ data: { ... } });
  await aimsApi.pushArticle(booking.spaceId, { ... });
  res.json(booking);
}

// GOOD — controller delegates to service
async function createBooking(req: Request, res: Response) {
  const dto = createBookingSchema.parse(req.body);
  const booking = await bookingService.createBooking(req.userId, dto);
  res.status(201).json({ data: BookingMapper.toDto(booking) });
}
```

### Open/Closed Principle (OCP)

The booking rule engine is extensible without modification:

```typescript
// Rule types are data, not code branches
// Adding a new rule type = add a row to the database, not edit the engine

// BAD — switch statement grows with each new rule
switch (rule.type) {
  case 'MAX_DURATION': ...
  case 'CHECK_IN_WINDOW': ...
  case 'NEW_RULE_TYPE': ... // Must modify engine
}

// GOOD — rules are key-value, engine is generic
const resolved = { ...PLATFORM_DEFAULTS };
for (const rule of rules) {
  if (rule.ruleType in resolved) {
    resolved[rule.ruleType] = parseValue(rule);
  }
}
```

### Liskov Substitution (LSP)

Repository interfaces allow swapping implementations:

```typescript
// Production: PrismaBookingRepository
// Testing: InMemoryBookingRepository
// Both implement BookingRepository interface

const service = new BookingService(
  new PrismaBookingRepository(prisma),  // or InMemoryBookingRepository()
  ruleEngine,
  syncQueue,
);
```

### Interface Segregation (ISP)

Clients depend only on methods they use:

```typescript
// BAD — one massive interface
interface DataAccess {
  findBooking(id: string): Promise<Booking>;
  findSpace(id: string): Promise<Space>;
  findUser(id: string): Promise<User>;
  createBooking(...): Promise<Booking>;
  // 30 more methods...
}

// GOOD — focused interfaces per domain
interface BookingRepository {
  findById(id: string): Promise<BookingEntity | null>;
  findActiveBySpace(spaceId: string, range: TimeRange): Promise<BookingEntity[]>;
  create(data: CreateBookingData): Promise<BookingEntity>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingEntity>;
}
```

### Dependency Inversion (DIP)

Services depend on abstractions, not implementations:

```typescript
// Service constructor receives interfaces
export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,    // Interface
    private readonly ruleEngine: BookingRuleEngine,      // Interface
    private readonly syncQueue: AimsSyncQueue,           // Interface
    private readonly eventBus: EventBus,                 // Interface
  ) {}
}

// Wiring in composition root (app setup):
const bookingService = new BookingService(
  new PrismaBookingRepository(prisma),
  new RedisBookingRuleEngine(ruleRepo, redis),
  new BullMQAimsSyncQueue(queue),
  new SocketIOEventBus(io),
);
```

---

## 2. Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Feature route | `<feature>.routes.ts` | `bookings.routes.ts` |
| Controller | `<feature>.controller.ts` | `bookings.controller.ts` |
| Service | `<feature>.service.ts` | `bookings.service.ts` |
| Repository | `<feature>.repository.ts` | `bookings.repository.ts` |
| Types/schemas | `<feature>.types.ts` | `bookings.types.ts` |
| Mapper | `<feature>.mapper.ts` | `bookings.mapper.ts` |
| React component | `PascalCase.tsx` | `SpaceCard.tsx` |
| Zustand store | `use<Feature>Store.ts` | `useBookingStore.ts` |
| Custom hook | `use<Action>.ts` | `useBooking.ts` |
| API client | `<feature>Api.ts` | `bookingApi.ts` |

### Variables & Functions

```typescript
// Functions: verb + noun, clear intent
async function findAvailableSpaces(branchId: string, filters: SpaceFilters) { ... }
function calculateProximityScore(space: Space, friendSpace: Space) { ... }
function isWithinCheckInWindow(booking: Booking, windowMinutes: number) { ... }

// Booleans: is/has/can/should prefix
const isAvailable = space.mode === 'AVAILABLE';
const hasConflict = conflicts.length > 0;
const canCheckIn = isWithinCheckInWindow(booking, rules.checkInWindow);
const shouldAutoRelease = rules.autoReleaseOnNoShow;

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_CHECK_IN_WINDOW_MINUTES = 15;
const SYNC_THROTTLE_SECONDS = 30;
const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;
```

### Types & Interfaces

```typescript
// Domain entities: plain name
interface BookingEntity { ... }
interface SpaceEntity { ... }
interface CompanyUserEntity { ... }

// DTOs: action + Dto suffix
interface CreateBookingDto { ... }
interface ExtendBookingDto { ... }

// API responses: action + Response suffix
interface BookingResponse { ... }
interface SpaceListResponse { ... }

// Enums: PascalCase values
type BookingStatus = 'BOOKED' | 'CHECKED_IN' | 'RELEASED' | 'AUTO_RELEASED' | 'CANCELLED' | 'NO_SHOW';
type SpaceMode = 'AVAILABLE' | 'EXCLUDED' | 'MAINTENANCE' | 'PERMANENT';
type SpaceType = 'OFFICE' | 'DESK' | 'CONFERENCE' | 'PHONE_BOOTH' | 'LOUNGE' | 'STORAGE' | 'PARKING';
```

---

## 3. Function Design Rules

### Max 30 lines per function

```typescript
// BAD — 80-line function doing too much
async function createBooking(userId, dto) {
  // fetch rules... validate... check conflicts... create... sync... notify...
}

// GOOD — decomposed into focused functions
async function createBooking(userId: string, dto: CreateBookingDto): Promise<BookingEntity> {
  const rules = await this.ruleEngine.resolveRules(dto.branchId, dto.spaceId);
  this.validateBookingRules(dto, rules);
  await this.enforceBookingLimits(userId, rules);
  await this.ensureNoConflicts(dto.spaceId, dto.startTime, dto.endTime);
  const booking = await this.bookingRepo.create(buildBookingData(userId, dto));
  this.dispatchSideEffects(booking);
  return booking;
}
```

### Pure functions where possible

```typescript
// Pure — no side effects, easy to test
function isBookingExpired(booking: BookingEntity, now: Date): boolean {
  return booking.endTime !== null && booking.endTime < now;
}

function calculateProximityTier(space: SpaceEntity, friend: SpaceEntity): ProximityTier {
  if (space.buildingId === friend.buildingId && space.floorId === friend.floorId) return 'SAME_FLOOR';
  if (space.buildingId === friend.buildingId) return 'SAME_BUILDING';
  return 'DIFFERENT_BUILDING';
}

function snapToGranularity(time: Date, granularityMinutes: number): Date {
  const minutes = time.getMinutes();
  const snapped = Math.ceil(minutes / granularityMinutes) * granularityMinutes;
  return set(time, { minutes: snapped, seconds: 0, milliseconds: 0 });
}
```

---

## 4. Error Handling

### Explicit error types, never generic throws

```typescript
// BAD
throw new Error('Booking failed');

// GOOD — typed errors with codes that map to i18n
throw new BusinessError('MAX_CONCURRENT_BOOKINGS_EXCEEDED', {
  current: activeCount,
  max: rules.maxConcurrentBookings,
});
```

### Never swallow errors

```typescript
// BAD
try { await sendNotification(booking); } catch (e) { /* silent */ }

// GOOD — log and continue for non-critical side effects
try {
  await sendNotification(booking);
} catch (error) {
  appLogger.warn('Failed to send booking notification', { bookingId: booking.id, error });
}
```

### Error boundary in client

```typescript
// Each feature has its own error boundary
<ErrorBoundary fallback={<BookingErrorFallback />}>
  <FindSpaceScreen />
</ErrorBoundary>
```

---

## 5. Testing Strategy

### Unit Tests — service layer focus

```typescript
// bookings.service.test.ts
describe('BookingService.createBooking', () => {
  it('creates a booking when space is available', async () => { ... });
  it('rejects when max concurrent bookings exceeded', async () => { ... });
  it('rejects when booking duration exceeds maximum', async () => { ... });
  it('rejects when space has conflicting booking', async () => { ... });
  it('queues AIMS sync after successful booking', async () => { ... });
  it('emits Socket.IO event after successful booking', async () => { ... });
});

describe('BookingRuleEngine.resolveRules', () => {
  it('returns platform defaults when no rules defined', async () => { ... });
  it('company rule overrides platform default', async () => { ... });
  it('branch rule overrides company rule', async () => { ... });
  it('space rule overrides branch rule', async () => { ... });
  it('uses cached rules when available', async () => { ... });
  it('fetches from DB when cache miss', async () => { ... });
});

describe('ProximityService.findSpacesNearFriend', () => {
  it('prioritizes same floor spaces', async () => { ... });
  it('sorts by sortOrder distance within same floor', async () => { ... });
  it('ranks same building above different building', async () => { ... });
  it('returns empty when friend has no active booking', async () => { ... });
});
```

### Repository tests use in-memory implementations

```typescript
class InMemoryBookingRepository implements BookingRepository {
  private bookings: BookingEntity[] = [];

  async findById(id: string) { return this.bookings.find(b => b.id === id) ?? null; }
  async create(data: CreateBookingData) { /* push to array */ }
  // ...
}
```

---

## 6. React Component Guidelines

### Component file max: 200 lines (excluding tests)

Split large components into:
- Container (data fetching + state) — `<SpaceListContainer />`
- Presenter (pure render) — `<SpaceCard />`
- Hook (logic extraction) — `useSpaceFilters()`

### No business logic in components

```typescript
// BAD — booking validation in component
function BookButton({ space }) {
  const handleBook = () => {
    if (activeBookings.length >= maxConcurrent) { /* ... */ }
    if (duration > maxDuration) { /* ... */ }
    // ...
  };
}

// GOOD — component calls store action, service validates
function BookButton({ space }: { space: Space }) {
  const { createBooking, isBooking } = useBookingStore();

  const handleBook = async () => {
    try {
      await createBooking({ spaceId: space.id, branchId: space.branchId, ... });
    } catch (error) {
      // Error already has user-friendly code for i18n lookup
      showError(t(`errors.${error.code}`));
    }
  };

  return <Button onClick={handleBook} loading={isBooking}>...</Button>;
}
```

### All text through i18n

```typescript
// BAD
<Typography>No spaces available</Typography>

// GOOD
<Typography>{t('compass.noSpacesAvailable')}</Typography>
```
