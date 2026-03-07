# electisCompass — Low-Level Design (LLD)

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Draft
**Key Constraint:** Compass mode is mutually exclusive with Spaces/People/Conference modes. When Compass is enabled, those features are locked. Compass is a flagship feature — quality must be premium.

---

## 1. Server Module Design

### 1.1 Feature Module Structure

Each new server feature follows clean architecture:

```
server/src/features/<feature>/
  <feature>.routes.ts       ← Express router definitions + middleware
  <feature>.controller.ts   ← HTTP request/response handling
  <feature>.service.ts      ← Pure business logic (no Express, no Prisma)
  <feature>.repository.ts   ← Data access layer (Prisma queries)
  <feature>.types.ts        ← Zod schemas + TypeScript interfaces
  <feature>.mapper.ts       ← Entity ↔ DTO mapping (clean separation)
  __tests__/
    <feature>.service.test.ts
    <feature>.controller.test.ts
```

**Clean Code Rule:** Services NEVER import Prisma directly. They receive a repository interface. This enables unit testing with mocks and enforces Dependency Inversion.

### 1.2 Booking Module (Core)

```typescript
// server/src/features/bookings/bookings.types.ts

import { z } from 'zod';

// ─── Schemas ────────────────────────────────────────

export const createBookingSchema = z.object({
  spaceId: z.string().uuid(),
  branchId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(), // null = permanent
  notes: z.string().max(500).optional(),
});

export const extendBookingSchema = z.object({
  newEndTime: z.string().datetime(),
});

// ─── Interfaces ─────────────────────────────────────

export interface BookingRepository {
  findById(id: string): Promise<BookingEntity | null>;
  findActiveBySpace(spaceId: string, timeRange: TimeRange): Promise<BookingEntity[]>;
  findByUser(userId: string, status?: BookingStatus[]): Promise<BookingEntity[]>;
  findExpiredBookings(cutoff: Date): Promise<BookingEntity[]>;
  findNoShows(cutoff: Date, checkInWindow: number): Promise<BookingEntity[]>;
  create(data: CreateBookingData): Promise<BookingEntity>;
  updateStatus(id: string, status: BookingStatus, metadata?: Partial<BookingEntity>): Promise<BookingEntity>;
  countActiveByUser(userId: string): Promise<number>;
}

export interface BookingEntity {
  id: string;
  spaceId: string;
  userId: string;
  branchId: string;
  startTime: Date;
  endTime: Date | null;
  status: BookingStatus;
  checkedInAt: Date | null;
  releasedAt: Date | null;
  autoReleased: boolean;
  bookedBy: string | null;
  notes: string | null;
  createdAt: Date;
}

export type BookingStatus =
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'RELEASED'
  | 'AUTO_RELEASED'
  | 'CANCELLED'
  | 'NO_SHOW';
```

```typescript
// server/src/features/bookings/bookings.service.ts

export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly spaceRepo: SpaceRepository,
    private readonly ruleEngine: BookingRuleEngine,
    private readonly syncQueue: AimsSyncQueue,
    private readonly eventBus: EventBus,
    private readonly notificationService: NotificationService,
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto): Promise<BookingEntity> {
    // 1. Resolve applicable rules
    const rules = await this.ruleEngine.resolveRules(dto.branchId, dto.spaceId);

    // 2. Validate against rules
    this.validateBookingRules(dto, rules);

    // 3. Check concurrent booking limit
    const activeCount = await this.bookingRepo.countActiveByUser(userId);
    if (activeCount >= rules.maxConcurrentBookings) {
      throw new BusinessError('MAX_CONCURRENT_BOOKINGS_EXCEEDED', {
        current: activeCount,
        max: rules.maxConcurrentBookings,
      });
    }

    // 4. Acquire lock and check conflicts (repository handles SELECT FOR UPDATE)
    const conflicts = await this.bookingRepo.findActiveBySpace(dto.spaceId, {
      start: new Date(dto.startTime),
      end: dto.endTime ? new Date(dto.endTime) : null,
    });
    if (conflicts.length > 0) {
      throw new ConflictError('SPACE_ALREADY_BOOKED', { conflictingBooking: conflicts[0].id });
    }

    // 5. Create booking
    const booking = await this.bookingRepo.create({
      spaceId: dto.spaceId,
      userId,
      branchId: dto.branchId,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      status: 'BOOKED',
      notes: dto.notes,
    });

    // 6. Side effects (fire-and-forget, non-blocking)
    this.syncQueue.enqueue({ spaceId: dto.spaceId, action: 'BOOKING_CREATED', booking });
    this.eventBus.emit('booking:created', { booking });
    this.notificationService.sendBookingConfirmation(userId, booking);

    return booking;
  }

  /**
   * Admin booking creation — bypasses rule validation.
   * Allows null endTime for open-ended "until cancellation" reservations.
   * Uses Serializable transaction isolation for atomic conflict detection.
   * Sets bookedBy to 'ADMIN' to distinguish from employee-created bookings.
   */
  async adminCreateBooking(params: {
    companyUserId: string;
    companyId: string;
    branchId: string;
    spaceId: string;
    startTime: Date;
    endTime: Date | null;
    notes?: string;
  }): Promise<BookingEntity> {
    // 1. Verify space belongs to branch + employee exists in company
    // 2. Atomic conflict check + create in Serializable transaction
    //    - For open-ended: conflict = any active booking with startTime >= param.startTime
    //    - For finite: conflict = overlapping time range
    // 3. Create booking with bookedBy: 'ADMIN', status: 'BOOKED'
    // 4. Emit space:booked event via Socket.IO
    // 5. Queue AIMS sync
  }

  async checkIn(bookingId: string, userId: string): Promise<BookingEntity> {
    const booking = await this.getBookingOrFail(bookingId, userId);

    if (booking.status !== 'BOOKED') {
      throw new BusinessError('INVALID_BOOKING_STATUS', { current: booking.status, expected: 'BOOKED' });
    }

    const rules = await this.ruleEngine.resolveRules(booking.branchId, booking.spaceId);
    const checkInDeadline = addMinutes(booking.startTime, rules.checkInWindow);

    if (new Date() < booking.startTime) {
      throw new BusinessError('CHECK_IN_TOO_EARLY', { opensAt: booking.startTime });
    }
    if (new Date() > checkInDeadline) {
      throw new BusinessError('CHECK_IN_WINDOW_EXPIRED', { deadline: checkInDeadline });
    }

    const updated = await this.bookingRepo.updateStatus(bookingId, 'CHECKED_IN', {
      checkedInAt: new Date(),
    });

    this.syncQueue.enqueue({ spaceId: booking.spaceId, action: 'CHECKED_IN', booking: updated });
    this.eventBus.emit('booking:checked_in', { booking: updated });

    return updated;
  }

  async release(bookingId: string, userId: string): Promise<BookingEntity> {
    const booking = await this.getBookingOrFail(bookingId, userId);

    if (booking.status !== 'CHECKED_IN') {
      throw new BusinessError('INVALID_BOOKING_STATUS', { current: booking.status, expected: 'CHECKED_IN' });
    }

    const updated = await this.bookingRepo.updateStatus(bookingId, 'RELEASED', {
      releasedAt: new Date(),
    });

    this.syncQueue.enqueue({ spaceId: booking.spaceId, action: 'RELEASED', booking: updated });
    this.eventBus.emit('booking:released', { booking: updated });

    return updated;
  }

  private validateBookingRules(dto: CreateBookingDto, rules: ResolvedRules): void {
    if (dto.endTime) {
      const durationMinutes = differenceInMinutes(new Date(dto.endTime), new Date(dto.startTime));

      if (durationMinutes < rules.minBookingDuration) {
        throw new BusinessError('BOOKING_TOO_SHORT', { min: rules.minBookingDuration });
      }
      if (durationMinutes > rules.maxBookingDuration) {
        throw new BusinessError('BOOKING_TOO_LONG', { max: rules.maxBookingDuration });
      }
    }

    const advanceDays = differenceInDays(new Date(dto.startTime), new Date());
    if (advanceDays > rules.advanceBookingDays) {
      throw new BusinessError('BOOKING_TOO_FAR_AHEAD', { maxDays: rules.advanceBookingDays });
    }
  }

  private async getBookingOrFail(id: string, userId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundError('BOOKING_NOT_FOUND');
    if (booking.userId !== userId) throw new ForbiddenError('NOT_YOUR_BOOKING');
    return booking;
  }
}
```

### 1.3 Booking Rule Engine

```typescript
// server/src/shared/infrastructure/services/bookingRuleEngine.ts

export interface ResolvedRules {
  maxBookingDuration: number;   // minutes
  minBookingDuration: number;   // minutes
  bookingGranularity: number;   // minutes
  advanceBookingDays: number;
  checkInWindow: number;        // minutes
  autoReleaseOnNoShow: boolean;
  cooldownMinutes: number;
  maxConcurrentBookings: number;
  allowSelfBooking: boolean;
  requireApproval: boolean;
  restrictToFloor: boolean;
  restrictToArea: boolean;
}

const PLATFORM_DEFAULTS: ResolvedRules = {
  maxBookingDuration: 600,      // 10 hours (end of day)
  minBookingDuration: 30,
  bookingGranularity: 30,
  advanceBookingDays: 7,
  checkInWindow: 15,
  autoReleaseOnNoShow: true,
  cooldownMinutes: 0,
  maxConcurrentBookings: 1,
  allowSelfBooking: true,
  requireApproval: false,
  restrictToFloor: false,
  restrictToArea: false,
};

export class BookingRuleEngine {
  constructor(
    private readonly ruleRepo: BookingRuleRepository,
    private readonly cache: CacheService,
  ) {}

  async resolveRules(branchId: string, spaceId?: string): Promise<ResolvedRules> {
    const cacheKey = `rules:${branchId}:${spaceId || 'all'}`;
    const cached = await this.cache.get<ResolvedRules>(cacheKey);
    if (cached) return cached;

    // Fetch all rules applicable to this context
    const rules = await this.ruleRepo.findApplicable(branchId, spaceId);

    // Start with platform defaults
    const resolved = { ...PLATFORM_DEFAULTS };

    // Apply rules in priority order: company → branch → space
    // Higher specificity overrides lower
    for (const rule of this.sortBySpecificity(rules)) {
      if (rule.isActive && rule.ruleType in resolved) {
        (resolved as Record<string, unknown>)[rule.ruleType] = this.parseRuleValue(rule);
      }
    }

    await this.cache.set(cacheKey, resolved, 300); // 5 minute TTL
    return resolved;
  }

  private sortBySpecificity(rules: BookingRuleEntity[]): BookingRuleEntity[] {
    return rules.sort((a, b) => {
      // Space-level > Branch-level > Company-level
      const specificity = (r: BookingRuleEntity) =>
        (r.spaceId ? 3 : 0) + (r.branchId ? 2 : 0) + 1;
      return specificity(a) - specificity(b); // lower specificity first, higher overwrites
    });
  }

  async invalidateCache(branchId: string): Promise<void> {
    await this.cache.deletePattern(`rules:${branchId}:*`);
  }
}
```

### 1.4 Proximity Service

```typescript
// server/src/shared/infrastructure/services/proximityService.ts

export interface ProximityResult {
  space: SpaceEntity;
  distance: number;           // sortOrder distance
  proximity: 'SAME_FLOOR' | 'SAME_BUILDING' | 'DIFFERENT_BUILDING';
  friendName: string;
  friendSpaceNumber: string;
}

export class ProximityService {
  constructor(private readonly spaceRepo: SpaceRepository) {}

  async findSpacesNearFriend(
    friendSpaceId: string,
    branchId: string,
    filters?: SpaceFilters,
  ): Promise<ProximityResult[]> {
    const friendSpace = await this.spaceRepo.findById(friendSpaceId);
    if (!friendSpace) return [];

    const available = await this.spaceRepo.findAvailable(branchId, filters);

    return available
      .map(space => ({
        space,
        ...this.calculateProximity(space, friendSpace),
        friendName: '', // Populated by caller
        friendSpaceNumber: friendSpace.number,
      }))
      .sort((a, b) => {
        // Primary: proximity tier (same floor > same building > different)
        const tierOrder = { SAME_FLOOR: 0, SAME_BUILDING: 1, DIFFERENT_BUILDING: 2 };
        const tierDiff = tierOrder[a.proximity] - tierOrder[b.proximity];
        if (tierDiff !== 0) return tierDiff;
        // Secondary: sortOrder distance within same tier
        return a.distance - b.distance;
      });
  }

  private calculateProximity(
    space: SpaceEntity,
    friend: SpaceEntity,
  ): { distance: number; proximity: ProximityResult['proximity'] } {
    if (space.buildingId === friend.buildingId && space.floorId === friend.floorId) {
      return {
        distance: Math.abs(space.sortOrder - friend.sortOrder),
        proximity: 'SAME_FLOOR',
      };
    }
    if (space.buildingId === friend.buildingId) {
      return {
        distance: Math.abs(space.sortOrder - friend.sortOrder),
        proximity: 'SAME_BUILDING',
      };
    }
    return {
      distance: Infinity,
      proximity: 'DIFFERENT_BUILDING',
    };
  }
}
```

### 1.5 Compass Auth Module

```typescript
// server/src/features/compass-auth/compass-auth.service.ts

export class CompassAuthService {
  constructor(
    private readonly userRepo: CompanyUserRepository,
    private readonly tokenRepo: DeviceTokenRepository,
    private readonly emailService: EmailService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  async requestLoginCode(email: string): Promise<void> {
    await this.rateLimiter.check(`compass-login:${email}`, 5, 60);

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists — still return success
      return;
    }
    if (!user.isActive) {
      throw new ForbiddenError('ACCOUNT_DEACTIVATED');
    }

    const code = this.generateCode();          // 6-digit
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = addMinutes(new Date(), 10);

    await this.userRepo.saveVerificationCode(user.id, hash, expiresAt);
    await this.emailService.sendLoginCode(user.email, code, user.language);
  }

  async verifyCode(email: string, code: string): Promise<AuthTokens> {
    await this.rateLimiter.check(`compass-verify:${email}`, 5, 60);

    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError('INVALID_CREDENTIALS');

    const stored = await this.userRepo.getVerificationCode(user.id);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('CODE_EXPIRED');
    }

    const valid = await bcrypt.compare(code, stored.hash);
    if (!valid) throw new UnauthorizedError('INVALID_CODE');

    // Clear used code
    await this.userRepo.clearVerificationCode(user.id);

    // Issue tokens
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    const deviceToken = crypto.randomBytes(32).toString('hex');

    await this.tokenRepo.create(user.id, deviceToken, 'WEB');

    return { accessToken, refreshToken, deviceToken };
  }

  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private signAccessToken(user: CompanyUserEntity): string {
    return jwt.sign(
      { sub: user.id, companyId: user.companyId, branchId: user.branchId, type: 'compass' },
      COMPASS_JWT_SECRET,
      { expiresIn: '15m' },
    );
  }
}
```

---

## 2. Client Module Design

### 2.1 Compass Feature Modules

```
compass/src/features/
  auth/
    domain/
      types.ts                 ← AuthState, LoginFormData
      schemas.ts               ← Zod validation schemas
    application/
      useAuthStore.ts          ← Zustand store (tokens, user, login state)
      useAuth.ts               ← Custom hook wrapping store actions
    infrastructure/
      compassAuthApi.ts        ← Axios calls to /api/v2/compass/auth/*
    presentation/
      LoginScreen.tsx          ← Email input + code verification
      VerifyCodeScreen.tsx     ← 6-digit code entry

  booking/
    domain/
      types.ts                 ← Booking, Space, SpaceType, BookingStatus
      schemas.ts               ← Zod: createBooking, extendBooking
    application/
      useBookingStore.ts       ← Active bookings, booking history
      useSpacesStore.ts        ← Available spaces, filters, search
      useBooking.ts            ← Hook: create, checkIn, release, cancel
    infrastructure/
      bookingApi.ts            ← /api/v2/compass/bookings/*
      spacesApi.ts             ← /api/v2/branches/:id/spaces/available
    presentation/
      HomeScreen.tsx           ← Active booking card + quick actions
      FindSpaceScreen.tsx      ← Filters + available space list
      SpaceCard.tsx            ← Individual space with BOOK button
      BookingConfirmDialog.tsx ← Time selection + confirm
      MyBookingsScreen.tsx     ← Active + upcoming + past
      BookingCard.tsx          ← Booking details with actions

  friends/
    domain/
      types.ts                 ← Friend, FriendLocation, Proximity
    application/
      useFriendsStore.ts       ← Friend list, locations, requests
    infrastructure/
      friendsApi.ts            ← /api/v2/compass/friends/*
    presentation/
      FriendsScreen.tsx        ← Friend list + locations
      AddFriendDialog.tsx      ← Search + send request
      FriendCard.tsx           ← Name + location + proximity

  profile/
    domain/
      types.ts                 ← UserProfile, Preferences
    application/
      useProfileStore.ts       ← Profile data, preferences
    infrastructure/
      profileApi.ts            ← /api/v2/compass/profile
    presentation/
      ProfileScreen.tsx        ← Settings: language, theme, location visibility
```

### 2.2 Zustand Store Design

```typescript
// compass/src/features/booking/application/useBookingStore.ts

interface BookingState {
  // Data
  activeBooking: Booking | null;
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  pastBookingsPage: number;
  hasMorePast: boolean;

  // Loading states
  isLoading: boolean;
  isBooking: boolean;
  isCheckingIn: boolean;

  // Actions
  fetchActiveBooking: () => Promise<void>;
  fetchUpcomingBookings: () => Promise<void>;
  fetchPastBookings: (page?: number) => Promise<void>;
  createBooking: (data: CreateBookingDto) => Promise<Booking>;
  checkIn: (bookingId: string) => Promise<void>;
  release: (bookingId: string) => Promise<void>;
  cancel: (bookingId: string) => Promise<void>;
  extend: (bookingId: string, newEndTime: string) => Promise<void>;
  autoAssign: () => Promise<Booking>;

  // Socket.IO handlers
  handleBookingCreated: (booking: Booking) => void;
  handleBookingReleased: (data: { bookingId: string; spaceId: string }) => void;
}
```

```typescript
// compass/src/features/booking/application/useSpacesStore.ts

interface SpacesState {
  // Data
  availableSpaces: Space[];
  filters: SpaceFilters;
  sortMode: 'default' | 'nearFriends' | 'byType';

  // Loading
  isLoading: boolean;

  // Actions
  fetchAvailable: (branchId: string) => Promise<void>;
  setFilters: (filters: Partial<SpaceFilters>) => void;
  setSortMode: (mode: SpacesState['sortMode']) => void;
  searchSpaces: (query: string) => void;

  // Socket.IO handlers
  handleSpaceStatusChanged: (data: { spaceId: string; newStatus: SpaceStatus }) => void;
}

interface SpaceFilters {
  buildingId?: string;
  floorId?: string;
  areaId?: string;
  spaceType?: SpaceType;
  amenities?: string[];
  date?: string;     // ISO date
}
```

### 2.3 Socket.IO Integration

```typescript
// compass/src/shared/hooks/useSocket.ts

export function useSocket(branchId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { handleBookingCreated, handleBookingReleased } = useBookingStore();
  const { handleSpaceStatusChanged } = useSpacesStore();
  const { handleFriendLocationChanged } = useFriendsStore();

  useEffect(() => {
    if (!branchId) return;

    const socket = io(API_BASE_URL, {
      path: '/socket.io',
      namespace: '/compass',
      auth: { token: getAccessToken() },
    });

    socket.on('connect', () => {
      socket.emit('join:branch', branchId);
    });

    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:released', handleBookingReleased);
    socket.on('booking:checked_in', handleBookingCreated);
    socket.on('booking:auto_released', handleBookingReleased);
    socket.on('space:status_changed', handleSpaceStatusChanged);
    socket.on('friend:location_changed', handleFriendLocationChanged);

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [branchId]);

  return socketRef;
}
```

---

## 3. Database Design Details

### 3.1 Space Enhancement Columns (Additive)

```sql
-- Migration: Add Compass columns to Space (all nullable, no breaking changes)
ALTER TABLE spaces ADD COLUMN building_id UUID REFERENCES buildings(id);
ALTER TABLE spaces ADD COLUMN floor_id UUID REFERENCES floors(id);
ALTER TABLE spaces ADD COLUMN area_id UUID REFERENCES areas(id);
ALTER TABLE spaces ADD COLUMN space_type TEXT DEFAULT NULL;
ALTER TABLE spaces ADD COLUMN space_mode TEXT DEFAULT NULL;  -- AVAILABLE, EXCLUDED, MAINTENANCE, PERMANENT
ALTER TABLE spaces ADD COLUMN sort_order INT DEFAULT 0;
ALTER TABLE spaces ADD COLUMN capacity INT DEFAULT 1;
ALTER TABLE spaces ADD COLUMN amenities TEXT[] DEFAULT '{}';
ALTER TABLE spaces ADD COLUMN permanent_assignee_id UUID;
ALTER TABLE spaces ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Indexes for Compass queries
CREATE INDEX idx_spaces_compass ON spaces(store_id, space_type, space_mode) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_building ON spaces(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_floor ON spaces(floor_id) WHERE deleted_at IS NULL;
```

### 3.2 Booking Table with Exclusion Constraint

```sql
-- Prevent overlapping bookings using PostgreSQL range exclusion
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    space_id WITH =,
    tsrange(start_time, end_time) WITH &&
  )
  WHERE (status IN ('BOOKED', 'CHECKED_IN'));
```

### 3.3 Partial Indexes for Background Jobs

```sql
-- Auto-release job: only scan active bookings
CREATE INDEX idx_bookings_auto_release
  ON bookings(status, end_time)
  WHERE status = 'BOOKED';

-- No-show detection: only scan bookings awaiting check-in
CREATE INDEX idx_bookings_no_show
  ON bookings(status, start_time)
  WHERE status = 'BOOKED';
```

---

## 4. Feature Gating: Compass Mode

### 4.1 Mutual Exclusivity Rules

```typescript
// Compass mode is MUTUALLY EXCLUSIVE with Spaces, People, and Conference modes
// When compassEnabled is true:
//   - spacesEnabled MUST be false (LOCKED)
//   - peopleEnabled MUST be false (LOCKED)
//   - conferenceEnabled MUST be false (LOCKED)
//   - simpleConferenceMode MUST be false (LOCKED)
// labelsEnabled and aimsManagementEnabled CAN be independently enabled

export interface CompanyFeatures {
  compassEnabled: boolean;      // NEW — master toggle for Compass
  spacesEnabled: boolean;       // LOCKED when compass=true
  peopleEnabled: boolean;       // LOCKED when compass=true
  conferenceEnabled: boolean;   // LOCKED when compass=true
  simpleConferenceMode: boolean; // LOCKED when compass=true
  labelsEnabled: boolean;       // Independent
  aimsManagementEnabled: boolean; // Independent
}

export function validateFeatureCombination(features: CompanyFeatures): CompanyFeatures {
  if (features.compassEnabled) {
    return {
      ...features,
      spacesEnabled: false,
      peopleEnabled: false,
      conferenceEnabled: false,
      simpleConferenceMode: false,
    };
  }
  return features;
}
```

### 4.2 Wizard Expansion When Compass Enabled

When user toggles `compassEnabled` in the Company Wizard's Features step, the wizard EXPANDS with additional steps:

```
Standard Wizard (6 steps):
  1. AIMS Connection + Company Info
  2. Store Selection
  3. Article Format
  4. Field Mapping
  5. Features            ← Compass toggle here
  6. Review & Create

Expanded Wizard (when Compass enabled — 10 steps):
  1. AIMS Connection + Company Info
  2. Store Selection
  3. Article Format
  4. Field Mapping
  5. Features            ← Compass enabled → wizard expands
  6. Building & Floor Setup        (NEW)
  7. Space Type Configuration      (NEW)
  8. Booking Rules Configuration   (NEW)
  9. Employee Setup (CSV/Manual)   (NEW)
  10. Review & Create
```

---

## 5. Error Handling Architecture

```typescript
// server/src/shared/domain/errors.ts

// Clean error hierarchy — all business errors extend BusinessError
export class BusinessError extends Error {
  constructor(
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
    public readonly statusCode: number = 400,
  ) {
    super(code);
    this.name = 'BusinessError';
  }
}

export class ConflictError extends BusinessError {
  constructor(code: string, details?: Record<string, unknown>) {
    super(code, details, 409);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(code: string = 'NOT_FOUND') {
    super(code, undefined, 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends BusinessError {
  constructor(code: string = 'FORBIDDEN') {
    super(code, undefined, 403);
    this.name = 'ForbiddenError';
  }
}

// Error codes are i18n keys — client resolves to localized messages
// e.g., 'MAX_CONCURRENT_BOOKINGS_EXCEEDED' → t('errors.maxConcurrentBookings')
```
