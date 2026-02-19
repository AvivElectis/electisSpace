/**
 * UserCompanySection - Company selector and role dropdown
 * Used in both create (stepper) and edit modes
 */
import {
    Box,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CompanySelector } from '../CompanySelector';
import { COMPANY_ROLES, type CompanyRole } from './types';
import type { Company } from '@shared/infrastructure/services/companyService';

interface Props {
    selectedCompanyId: string;
    isCreatingCompany: boolean;
    newCompanyData: { code: string; name: string; location?: string };
    companyRole: CompanyRole;
    isPlatformAdmin: boolean;
    accessibleCompanyId: string | null;
    isEdit: boolean;
    isEditing: boolean;
    onCompanyChange: (companyId: string, company?: Company) => void;
    onCreateModeChange: (creating: boolean) => void;
    onNewCompanyDataChange: (data: { code: string; name: string; location?: string }) => void;
    onCompanyRoleChange: (role: CompanyRole) => void;
}

export function UserCompanySection({
    selectedCompanyId, isCreatingCompany, newCompanyData, companyRole,
    isPlatformAdmin, accessibleCompanyId,
    isEdit, isEditing,
    onCompanyChange, onCreateModeChange, onNewCompanyDataChange, onCompanyRoleChange,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
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

                <FormControl fullWidth size="small" disabled={isEdit && !isEditing}>
                    <InputLabel>{t('settings.users.companyRole')}</InputLabel>
                    <Select
                        value={companyRole}
                        label={t('settings.users.companyRole')}
                        onChange={(e) => onCompanyRoleChange(e.target.value as CompanyRole)}
                    >
                        {COMPANY_ROLES.map(role => (
                            <MenuItem key={role} value={role}>
                                <Box>
                                    <Typography variant="body1">
                                        {t(`roles.${role.toLowerCase()}`)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {role === 'COMPANY_ADMIN' && t('settings.users.companyAdminDesc')}
                                        {role === 'STORE_ADMIN' && t('settings.users.storeAdminDesc')}
                                        {role === 'STORE_VIEWER' && t('settings.users.storeViewerDesc')}
                                        {role === 'VIEWER' && t('settings.users.viewerDesc')}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );
}
