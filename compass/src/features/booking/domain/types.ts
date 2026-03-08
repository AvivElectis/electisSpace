// ─── Booking Types ──────────────────────────────────

export type BookingStatus =
    | 'BOOKED'
    | 'CHECKED_IN'
    | 'RELEASED'
    | 'AUTO_RELEASED'
    | 'NO_SHOW'
    | 'CANCELLED';

export interface Booking {
    id: string;
    spaceId: string;
    userId: string;
    storeId: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    checkedInAt: string | null;
    releasedAt: string | null;
    notes: string | null;
    recurrenceRule: string | null;
    recurrenceGroupId: string | null;
    isRecurrence: boolean;
    createdAt: string;
    updatedAt: string;
    space?: SpaceSummary;
}

// ─── Space Types ────────────────────────────────────

export type SpaceMode = 'AVAILABLE' | 'EXCLUDED' | 'MAINTENANCE' | 'PERMANENT';

export type CompassSpaceType =
    | 'DESK'
    | 'MEETING_ROOM'
    | 'PHONE_BOOTH'
    | 'COLLABORATION_ZONE'
    | 'PARKING'
    | 'LOCKER'
    | 'EVENT_SPACE';

export interface AmenityInfo {
    id: string;
    name: string;
    nameHe: string | null;
    icon: string | null;
    category: string;
}

export interface SpaceSummary {
    id: string;
    externalId: string;
    storeId: string;
    compassMode: SpaceMode;
    compassCapacity: number | null;
    compassAmenities: string[];
    compassSpaceType: CompassSpaceType | null;
    structuredAmenities: AmenityInfo[];
    buildingName: string | null;
    floorName: string | null;
    floorSortOrder: number | null;
    areaName: string | null;
    displayName: string;
}

export interface SpaceWithAvailability extends SpaceSummary {
    available: boolean;
    nextAvailableAt: string | null;
    currentBooking: {
        id: string;
        startTime: string;
        endTime: string;
        status: BookingStatus;
    } | null;
    friendsNearby: FriendNearby[];
}

export interface FriendNearby {
    id: string;
    displayName: string;
    spaceName: string;
    distance: number;
}

// ─── Building / Floor Hierarchy ─────────────────────

export interface Building {
    id: string;
    name: string;
    floors: Floor[];
}

export interface Floor {
    id: string;
    name: string;
    sortOrder: number;
    areas: Area[];
}

export interface Area {
    id: string;
    name: string;
}

// ─── Filter & Query Types ───────────────────────────

export interface SpaceFilters {
    buildingId?: string;
    floorId?: string;
    areaId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    search?: string;
    sort?: 'name' | 'floor' | 'nearFriends';
    spaceType?: CompassSpaceType;
    amenityIds?: string[];
}

export type CancelScope = 'instance' | 'future' | 'all';

export interface CreateBookingRequest {
    spaceId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    recurrenceRule?: string;
}

export interface ExtendBookingRequest {
    newEndTime: string;
}
