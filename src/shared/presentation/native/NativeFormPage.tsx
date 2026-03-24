import { type ReactNode } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NativePage } from './NativePage';
import { useSetNativeTitle } from './NativePageTitleContext';

interface NativeFormPageProps {
    title: string;
    children: ReactNode;
    onSave: () => void | Promise<void>;
    isSaving?: boolean;
    saveLabel?: string;
    hideDelete?: boolean;
}

async function triggerSaveHaptic() {
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
        // Haptics not available on web — ignore
    }
}

export function NativeFormPage({
    title,
    children,
    onSave,
    isSaving = false,
    saveLabel,
}: NativeFormPageProps) {
    const { t } = useTranslation();

    const handleSave = async () => {
        await triggerSaveHaptic();
        await onSave();
    };

    const saveButton = (
        <Button
            onClick={handleSave}
            disabled={isSaving}
            sx={{
                color: 'primary.contrastText',
                fontWeight: 700,
                minWidth: 56,
                textTransform: 'none',
            }}
            size="small"
        >
            {isSaving ? (
                <CircularProgress size={18} sx={{ color: 'primary.contrastText' }} />
            ) : (
                saveLabel ?? t('common.save')
            )}
        </Button>
    );

    useSetNativeTitle(title, true, saveButton, isSaving);

    return <NativePage>{children}</NativePage>;
}
