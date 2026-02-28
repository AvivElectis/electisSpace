/**
 * UserStoreSection - Store assignments with roles and features
 * Used in both create (stepper) and edit modes
 */
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StoreAssignment, type StoreAssignmentData } from '../StoreAssignment';

interface Props {
    companyId: string;
    isCreatingCompany: boolean;
    allStoresAccess: boolean;
    assignments: StoreAssignmentData[];
    onAssignmentsChange: (assignments: StoreAssignmentData[]) => void;
    isEdit: boolean;
    isEditing: boolean;
    companyEnabledFeatures?: string[];
}

export function UserStoreSection({
    companyId, isCreatingCompany, allStoresAccess,
    assignments, onAssignmentsChange,
    isEdit, isEditing, companyEnabledFeatures,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {t('settings.users.storeAssignments')}
            </Typography>
            <StoreAssignment
                companyId={isCreatingCompany ? '' : companyId}
                allStoresAccess={allStoresAccess}
                assignments={assignments}
                onAssignmentsChange={onAssignmentsChange}
                disabled={isEdit && !isEditing}
                companyEnabledFeatures={companyEnabledFeatures}
            />
        </Box>
    );
}
