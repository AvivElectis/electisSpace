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
