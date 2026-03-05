import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { useTranslation } from 'react-i18next';

interface BiometricEnrollDialogProps {
    open: boolean;
    onEnable: () => void;
    onSkip: () => void;
}

export function BiometricEnrollDialog({ open, onEnable, onSkip }: BiometricEnrollDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                <FingerprintIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                    {t('auth.biometricTitle')}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    {t('auth.biometricDescription')}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" onClick={onEnable}>
                    {t('auth.enableBiometric')}
                </Button>
                <Button fullWidth color="inherit" onClick={onSkip}>
                    {t('auth.notNow')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
