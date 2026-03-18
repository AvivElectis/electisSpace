import {
    Dialog,
    DialogTitle,
    DialogContent,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PersonForm } from './PersonForm';
import type { Person } from '../domain/types';

interface PersonDialogProps {
    open: boolean;
    onClose: () => void;
    person?: Person;
}

/**
 * Person Add/Edit Dialog
 * Thin wrapper around PersonForm that provides Dialog chrome.
 */
export function PersonDialog({ open, onClose, person }: PersonDialogProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isRtl = i18n.language === 'he';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile} dir={isRtl ? 'rtl' : 'ltr'}>
            <DialogTitle sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                {person ? t('people.editPerson') : t('people.addPerson')}
            </DialogTitle>
            <DialogContent>
                <PersonForm person={person} onSave={onClose} onCancel={onClose} />
            </DialogContent>
        </Dialog>
    );
}
