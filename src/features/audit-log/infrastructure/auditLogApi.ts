import { api } from '@shared/infrastructure/services/apiClient';

export interface AuditLogEntry {
  id: string;
  storeId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  permissionChecked: string | null;
  wasAuthorized: boolean;
  createdAt: string;
  user?: { id: string; email: string; firstName: string | null; lastName: string | null };
  store?: { id: string; name: string; code: string };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  storeId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const auditLogApi = {
  async list(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.storeId) params.set('storeId', filters.storeId);
    if (filters.action) params.set('action', filters.action);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    const res = await api.get(`/admin/audit-log?${params.toString()}`);
    return res.data;
  },
};
