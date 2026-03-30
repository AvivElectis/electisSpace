import { type ReactNode, memo, useState } from 'react';
import { Button, CircularProgress, LinearProgress } from '@mui/material';
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

function triggerSaveHaptic() {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export const NativeFormPage = memo(function NativeFormPage({
    title,
    children,
    onSave,
    isSaving = false,
    saveLabel,
}: NativeFormPageProps) {
    const { t } = useTranslation();

    const [localSaving, setLocalSaving] = useState(false);
    const effectivelySaving = isSaving || localSaving;

    const handleSave = async () => {
        if (effectivelySaving) return;
        setLocalSaving(true);
        try {
            await triggerSaveHaptic();
            await onSave();
        } finally {
            setLocalSaving(false);
        }
    };

    const saveButton = (
        <Button
            onClick={handleSave}
            disabled={effectivelySaving}
            sx={{
                color: 'primary.contrastText',
                fontWeight: 700,
                minWidth: 56,
                textTransform: 'none',
            }}
            size="small"
        >
            {effectivelySaving ? (
                <CircularProgress size={18} sx={{ color: 'primary.contrastText' }} />
            ) : (
                saveLabel ?? t('common.save')
            )}
        </Button>
    );

    useSetNativeTitle(title, true, saveButton, effectivelySaving);

    return (
        <NativePage>
            {/* Subtle save-progress indicator below the app bar */}
            {effectivelySaving && (
                <LinearProgress
                    sx={{
                        position: 'sticky',
                        top: 0,
                        mx: -2,
                        zIndex: 10,
                        height: 3,
                        borderRadius: 0,
                    }}
                />
            )}
            {children}
        </NativePage>
    );
});
