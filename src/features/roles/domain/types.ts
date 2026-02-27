export type Resource = 'spaces' | 'people' | 'conference' | 'settings' | 'users' |
    'audit' | 'sync' | 'labels' | 'stores' | 'companies' | 'aims-management';

export type Action = 'view' | 'create' | 'edit' | 'delete' |
    'import' | 'assign' | 'toggle' | 'trigger' | 'manage' | 'link' | 'unlink' |
    'read' | 'update';

export type PermissionsMap = Partial<Record<Resource, Action[]>>;

export interface Role {
    id: string;
    name: string;
    description?: string;
    scope: 'SYSTEM' | 'COMPANY';
    companyId?: string | null;
    permissions: PermissionsMap;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PermissionsMatrix {
    [resource: string]: string[];
}
