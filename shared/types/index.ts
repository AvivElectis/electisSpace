/**
 * @electis/shared — Cross-app type definitions
 *
 * Shared between electisSpace (admin) and electisCompass (employee app).
 * Import via: import { ... } from '@electis/shared/types';
 */

export type {
  BookingStatus,
  SpaceMode,
  SpaceType,
  FriendshipStatus,
  CompassFeatureConfig,
} from './booking.types';

export { DEFAULT_COMPASS_CONFIG } from './booking.types';

export type {
  PaginatedResponse,
  ApiResponse,
  ApiErrorResponse,
} from './api.types';
