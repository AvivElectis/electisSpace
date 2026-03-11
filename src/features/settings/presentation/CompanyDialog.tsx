/**
 * Company Dialog
 *
 * @description Dialog for creating and editing companies.
 * CREATE mode: 6-step wizard — Connection → Stores → Article Format → Field Mapping → Features → Review
 * EDIT mode: Tabs — Basic Info + AIMS Config + Features
 * Only PLATFORM_ADMIN can create companies; COMPANY_ADMIN+ can edit.
 */
import { Dialog, useMediaQuery, useTheme } from '@mui/material';
import { useCompanyDialogState } from './companyDialog/useCompanyDialogState';
import { EditCompanyTabs } from './companyDialog/EditCompanyTabs';
import { CreateCompanyWizard } from './companyDialog/CreateCompanyWizard';
import type { Company } from '@shared/infrastructure/services/companyService';

interface CompanyDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    company?: Company | null;
}

export function CompanyDialog({ open, onClose, onSave, company }: CompanyDialogProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isEdit = !!company;

    // Edit mode still uses the existing hook
    const state = useCompanyDialogState({ open, onSave, company });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{ sx: { maxHeight: isMobile ? '100%' : '90vh', borderRadius: isMobile ? 0 : undefined } }}
        >
            {isEdit
                ? <EditCompanyTabs state={state} onClose={onClose} />
                : <CreateCompanyWizard onClose={onClose} onSave={onSave} />
            }
        </Dialog>
    );
}

export default CompanyDialog;
