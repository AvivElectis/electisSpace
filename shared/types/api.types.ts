/**
 * Shared API response shapes used by both Admin and Compass apps.
 */

/** Standard paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Standard single-item response */
export interface ApiResponse<T> {
  data: T;
}

/** Standard error response */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
