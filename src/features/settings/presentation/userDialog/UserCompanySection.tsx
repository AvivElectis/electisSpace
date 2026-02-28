/**
 * UserCompanySection - Company selector and role dropdown
 * Uses DB-backed roles from useRolesStore instead of hardcoded enum.
 */
import {
    Box,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CompanySelector } from '../CompanySelector';
import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import type { Company } from '@shared/infrastructure/services/companyService';

interface Props {
    selectedCompanyId: string;
    isCreatingCompany: boolean;
    newCompanyData: { code: string; name: string; location?: string };
    companyRoleId: string;
    allStoresAccess: boolean;
    isPlatformAdmin: boolean;
    accessibleCompanyId: string | null;
    isEdit: boolean;
    isEditing: boolean;
    profileMode?: boolean;
    onCompanyChange: (companyId: string, company?: Company) => void;
    onCreateModeChange: (creating: boolean) => void;
    onNewCompanyDataChange: (data: { code: string; name: string; location?: string }) => void;
    onCompanyRoleChange: (roleId: string) => void;
    onAllStoresAccessChange: (value: boolean) => void;
}

export function UserCompanySection({
    selectedCompanyId, isCreatingCompany, newCompanyData, companyRoleId,
    allStoresAccess,
    isPlatformAdmin, accessibleCompanyId,
    isEdit, isEditing, profileMode = false,
    onCompanyChange, onCreateModeChange, onNewCompanyDataChange,
    onCompanyRoleChange, onAllStoresAccessChange,
}: Props) {
    const { t } = useTranslation();
    const { roles, fetchRoles } = useRolesStore();

    useEffect(() => {
        if (roles.length === 0) {
            fetchRoles();
        }
    }, [roles.length, fetchRoles]);

    // Filter to roles usable at company level (non-system roles)
    // Non-platform-admins cannot assign the admin role to other users
    const companyRoles = roles.filter(r =>
        !r.isSystem && (isPlatformAdmin || r.id !== 'role-admin')
    );

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {t('settings.users.companyAssignment')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <CompanySelector
                    value={selectedCompanyId}
                    onChange={onCompanyChange}
                    isCreatingNew={isCreatingCompany}
                    onCreateModeChange={onCreateModeChange}
                    newCompanyData={newCompanyData}
                    onNewCompanyDataChange={onNewCompanyDataChange}
                    allowCreate={isPlatformAdmin}
                    disabled={(isEdit && !isEditing) || (!isPlatformAdmin && !!accessibleCompanyId)}
                />

                <Divider sx={{ my: 1 }} />

                <FormControl fullWidth size="small" disabled={profileMode || (isEdit && !isEditing)}>
                    <InputLabel>{t('settings.users.companyRole')}</InputLabel>
                    <Select
                        value={companyRoles.some(r => r.id === companyRoleId) ? companyRoleId : ''}
                        label={t('settings.users.companyRole')}
                        onChange={(e) => onCompanyRoleChange(e.target.value)}
                    >
                        {companyRoles.map(role => (
                            <MenuItem key={role.id} value={role.id}>
                                <Box>
                                    <Typography variant="body1">
                                        {t(`roles.${role.name.toLowerCase()}`, role.name)}
                                    </Typography>
                                    {role.description && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t(`roles.${role.name.toLowerCase()}_desc`, role.description)}
                                        </Typography>
                                    )}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={allStoresAccess}
                            onChange={(e) => onAllStoresAccessChange(e.target.checked)}
                            disabled={profileMode || (isEdit && !isEditing)}
                        />
                    }
                    label={t('settings.users.allStoresAccess', 'Access to all stores')}
                />
            </Box>
        </Box>
    );
}
