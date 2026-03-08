export type BookingStatus = 'BOOKED' | 'CHECKED_IN' | 'RELEASED' | 'AUTO_RELEASED' | 'CANCELLED' | 'NO_SHOW';
export type SpaceMode = 'AVAILABLE' | 'PERMANENT' | 'MAINTENANCE' | 'EXCLUDED';
export type RuleType = 'MAX_DURATION' | 'MAX_ADVANCE_BOOKING' | 'MAX_CONCURRENT' | 'CHECK_IN_WINDOW' | 'AUTO_RELEASE';

export interface Booking {
    id: string;
    companyUser: { displayName: string; email: string };
    space: { name: string; type: string };
    startTime: string;
    endTime: string | null;
    status: BookingStatus;
    checkedInAt: string | null;
    notes: string | null;
}

export interface BookingRule {
    id: string;
    name: string;
    ruleType: RuleType;
    isActive: boolean;
    priority: number;
    config: Record<string, unknown>;
    applyTo: string;
}

export interface CompassSpace {
    id: string;
    name: string;
    type: string;
    compassMode: SpaceMode | null;
    building?: { name: string } | null;
    floor?: { name: string } | null;
    area?: { name: string } | null;
    permanentAssignee?: { displayName: string } | null;
}

export interface Employee {
    id: string;
    email: string;
    displayName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export interface Department {
    id: string;
    name: string;
    code: string | null;
    parentId: string | null;
    manager: { id: string; displayName: string } | null;
    color: string | null;
    sortOrder: number;
    _count: { members: number; children: number };
}

export interface Team {
    id: string;
    name: string;
    department: { id: string; name: string } | null;
    lead: { id: string; displayName: string } | null;
    color: string | null;
    _count: { members: number };
}

export interface Amenity {
    id: string;
    name: string;
    nameHe: string | null;
    icon: string | null;
    category: string;
    isActive: boolean;
}

export interface Neighborhood {
    id: string;
    name: string;
    color: string | null;
    description: string | null;
    sortOrder: number;
    department: { id: string; name: string } | null;
    _count: { spaces: number };
}

export type CompassSpaceType = 'DESK' | 'MEETING_ROOM' | 'PHONE_BOOTH' | 'COLLABORATION_ZONE' | 'PARKING' | 'LOCKER' | 'EVENT_SPACE';
