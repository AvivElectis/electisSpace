export interface PaginationInfo {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export type BookingStatus = 'BOOKED' | 'CHECKED_IN' | 'RELEASED' | 'AUTO_RELEASED' | 'CANCELLED' | 'NO_SHOW';
export type SpaceMode = 'AVAILABLE' | 'PERMANENT' | 'MAINTENANCE' | 'EXCLUDED';
export type RuleType = 'MAX_DURATION' | 'MAX_ADVANCE_BOOKING' | 'MAX_CONCURRENT' | 'CHECK_IN_WINDOW' | 'AUTO_RELEASE' | 'MIN_DURATION' | 'BOOKING_GRANULARITY';

export interface Booking {
    id: string;
    companyUser: { displayName: string; email: string };
    space: { name: string; type: string };
    startTime: string;
    endTime: string | null;
    status: BookingStatus;
    checkedInAt: string | null;
    notes: string | null;
    recurrenceRule: string | null;
    recurrenceGroupId: string | null;
    isRecurrence: boolean;
}

export interface BookingRule {
    id: string;
    name: string;
    ruleType: RuleType;
    isActive: boolean;
    priority: number;
    config: Record<string, unknown>;
    applyTo: 'ALL_BRANCHES' | 'SELECTED_BRANCHES';
    targetBranchIds?: string[];
    targetSpaceTypes?: CompassSpaceType[];
}

export type CompassSpaceType = 'DESK' | 'MEETING_ROOM' | 'PHONE_BOOTH' | 'COLLABORATION_ZONE' | 'PARKING' | 'LOCKER' | 'EVENT_SPACE';

export interface CompassSpace {
    id: string;
    name: string;
    type: string;
    compassMode: SpaceMode | null;
    compassSpaceType: CompassSpaceType | null;
    compassCapacity: number | null;
    minCapacity: number | null;
    maxCapacity: number | null;
    sortOrder: number;
    buildingId: string | null;
    floorId: string | null;
    areaId: string | null;
    neighborhoodId: string | null;
    building?: { id: string; name: string } | null;
    floor?: { id: string; name: string } | null;
    area?: { id: string; name: string } | null;
    neighborhood?: { id: string; name: string } | null;
    permanentAssignee?: { id: string; displayName: string } | null;
    structuredAmenities?: Array<{
        quantity: number;
        amenity: { id: string; name: string; nameHe: string | null; icon: string | null; category: string };
    }>;
}

export interface Employee {
    id: string;
    email: string;
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    displayName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    departmentId: string | null;
    jobTitle: string | null;
    employeeNumber: string | null;
    isRemote: boolean;
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

export interface TeamMember {
    id: string;
    companyUser: { id: string; displayName: string; email: string };
    role: string;
}

export interface Team {
    id: string;
    name: string;
    department: { id: string; name: string } | null;
    lead: { id: string; displayName: string } | null;
    color: string | null;
    members: TeamMember[];
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
