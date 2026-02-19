/**
 * UserStoreSection - Store assignments with roles and features
 * Used in both create (stepper) and edit modes
 */
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StoreAssignment, type StoreAssignmentData } from '../StoreAssignment';
import type { CompanyRole } from './types';

interface Props {
    companyId: string;
    isCreatingCompany: boolean;
    companyRole: CompanyRole;
    allStoresAccess: boolean;
    assignments: StoreAssignmentData[];
    onAssignmentsChange: (assignments: StoreAssignmentData[]) => void;
    isEdit: boolean;
    isEditing: boolean;
    companyEnabledFeatures?: string[];
}

export function UserStoreSection({
    companyId, isCreatingCompany, companyRole,
    allStoresAccess,
    assignments, onAssignmentsChange,
    isEdit, isEditing, companyEnabledFeatures,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('settings.users.storeAssignments')}
            </Typography>
            <StoreAssignment
                companyId={isCreatingCompany ? '' : companyId}
                companyRole={companyRole}
                allStoresAccess={allStoresAccess}
                onAllStoresAccessChange={() => {}}
                assignments={assignments}
                onAssignmentsChange={onAssignmentsChange}
                disabled={isEdit && !isEditing}
                companyEnabledFeatures={companyEnabledFeatures}
            />
        </Box>
    );
}
