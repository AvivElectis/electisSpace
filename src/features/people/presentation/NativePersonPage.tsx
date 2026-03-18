/**
 * NativePersonPage
 *
 * Route target for /people/new and /people/:id/edit on native.
 * Loads person from store, renders PersonForm inside NativePage wrapper.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { NativePage } from '@shared/presentation/layouts/NativePage';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useAndroidBackButton } from '@shared/presentation/hooks/useAndroidBackButton';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { PersonForm } from './PersonForm';

export function NativePersonPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const people = usePeopleStore(s => s.people);
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [isDirty, setIsDirty] = useState(false);

    const isEditMode = !!id;
    const person = isEditMode ? people.find(p => p.id === id) : undefined;

    // Dirty form guard for Android back button
    useAndroidBackButton({
        onCloseDialog: useCallback(() => {
            if (isDirty) {
                confirm({
                    title: t('common.unsavedChanges'),
                    message: t('common.discardChanges'),
                    confirmLabel: t('common.discard'),
                    severity: 'warning',
                }).then(discard => {
                    if (discard) navigate(-1);
                });
                return true;
            }
            return false;
        }, [isDirty, confirm, navigate, t]),
    });

    const title = isEditMode ? t('people.editPerson') : t('people.addPerson');

    // Guard: editing a person that doesn't exist in store
    if (isEditMode && !person) {
        return (
            <>
                <NativePage title={title} onBack={() => navigate(-1)}>
                    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                        <Typography>{t('common.notFound')}</Typography>
                    </Box>
                </NativePage>
                <ConfirmDialog />
            </>
        );
    }

    return (
        <>
            <NativePage
                title={title}
                viewTransitionName={person?.id}
            >
                <PersonForm
                    person={person}
                    onSave={() => navigate(-1)}
                    onCancel={() => navigate(-1)}
                    onDirtyChange={setIsDirty}
                />
            </NativePage>
            <ConfirmDialog />
        </>
    );
}
