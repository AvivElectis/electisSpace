/**
 * Booking-related types shared between Admin and Compass apps.
 */

/** Booking lifecycle states */
export type BookingStatus =
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'RELEASED'
  | 'AUTO_RELEASED'
  | 'CANCELLED'
  | 'NO_SHOW';

/**
 * Space mode — determines whether a space can participate in bookings.
 * Admin-controlled, not booking-driven.
 */
export type SpaceMode =
  | 'AVAILABLE'    // Appears in booking search, can be booked
  | 'EXCLUDED'     // Hidden from booking search, can only be assigned permanently
  | 'PERMANENT'    // Hidden from booking search, shows assignee on ESL
  | 'MAINTENANCE'; // Hidden from booking search, shows "Out of Service" on ESL

/** Per-space type (Compass uses per-space, legacy uses global company setting) */
export type SpaceType =
  | 'OFFICE'
  | 'DESK'
  | 'CONFERENCE'
  | 'PHONE_BOOTH'
  | 'LOUNGE'
  | 'PARKING';

/** Friendship lifecycle states */
export type FriendshipStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'BLOCKED';

/** Compass feature configuration stored in Company.compassConfig JSON */
export interface CompassFeatureConfig {
  /** Check-in window in minutes (default: 15) */
  checkInWindowMinutes: number;
  /** Maximum booking duration in hours (default: 12) */
  maxBookingDurationHours: number;
  /** Maximum advance booking in days (default: 14) */
  maxAdvanceBookingDays: number;
  /** Maximum concurrent bookings per employee (default: 2) */
  maxConcurrentBookings: number;
  /** Auto-release no-shows (default: true) */
  autoReleaseOnNoShow: boolean;
  /** Allow booking extensions (default: true) */
  allowExtensions: boolean;
  /** Allow friend location sharing (default: true) */
  friendLocationSharing: boolean;
}

/** Default Compass configuration values */
export const DEFAULT_COMPASS_CONFIG: CompassFeatureConfig = {
  checkInWindowMinutes: 15,
  maxBookingDurationHours: 12,
  maxAdvanceBookingDays: 14,
  maxConcurrentBookings: 2,
  autoReleaseOnNoShow: true,
  allowExtensions: true,
  friendLocationSharing: true,
};
