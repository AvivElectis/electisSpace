/**
 * Company Dialog
 *
 * @description Dialog for creating and editing companies.
 * CREATE mode: Wizard stepper — Step 1: Code + AIMS credentials → Connect → Step 2: Pick stores
 * EDIT mode: Tabs — Basic Info + AIMS Config
 * Only PLATFORM_ADMIN can create companies; COMPANY_ADMIN+ can edit.
 *
 * Split into sub-components for maintainability:
 * - useCompanyDialogState: all state, effects, and handlers
 * - EditCompanyTabs: edit mode tab layout
 * - CreateCompanyWizard: create mode wizard steps
 */
import { Dialog } from '@mui/material';
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
    const state = useCompanyDialogState({ open, onSave, company });

    return (
        <Dialog
            open={open}
            onClose={state.submitting || state.connecting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { maxHeight: '90vh' } }}
        >
            {state.isEdit
                ? <EditCompanyTabs state={state} onClose={onClose} />
                : <CreateCompanyWizard state={state} onClose={onClose} />
            }
        </Dialog>
    );
}

export default CompanyDialog;
