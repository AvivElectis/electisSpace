import { type ReactNode } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
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

export function NativeFormPage({
    title,
    children,
    onSave,
    isSaving = false,
    saveLabel,
}: NativeFormPageProps) {
    const { t } = useTranslation();

    const saveButton = (
        <Button
            onClick={onSave}
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

    useSetNativeTitle(title, true, saveButton);

    return <NativePage>{children}</NativePage>;
}
