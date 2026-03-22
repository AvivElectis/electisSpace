import {
    Dialog,
    DialogTitle,
    DialogContent,
    useMediaQuery,
    useTheme,
    Button,
    TextField,
    Stack,
    Typography,
    Divider,
} from '@mui/material';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeopleController } from '../application/usePeopleController';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { SpaceSelector } from './SpaceSelector';
import type { Person } from '../domain/types';

interface PersonDialogProps {
    open: boolean;
    onClose: () => void;
    person?: Person;
}

/**
 * Person Add/Edit Dialog
 * Contains the full form inline (PersonForm was merged in as part of Phase 1 cleanup).
 */
export function PersonDialog({ open, onClose, person }: PersonDialogProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isRtl = i18n.language === 'he';
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const settings = useSettingsStore((state) => state.settings);
    const peopleController = usePeopleController();
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback((key: string, options?: Record<string, unknown>) => {
        return t(key, {
            ...options,
            spaceTypeSingular: getLabel('singular').toLowerCase(),
            spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
            spaceTypePlural: getLabel('plural').toLowerCase(),
            spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
        });
    }, [t, getLabel]);

    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;

    const [formData, setFormData] = useState<{ id: string; data: Record<string, string>; assignedSpaceId?: string }>({
        id: '',
        data: {},
        assignedSpaceId: undefined,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const isEditMode = !!person;

    // Get editable fields from mapping config
    const editableFields = useMemo(() => {
        if (!settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settings.solumMappingConfig.mappingInfo?.articleId;
        const nameFieldKey = settings.solumMappingConfig.mappingInfo?.articleName;
        const globalFields = settings.solumMappingConfig.globalFieldAssignments || {};
        const globalFieldKeys = Object.keys(globalFields);

        return Object.entries(settings.solumMappingConfig.fields)
            .filter(([fieldKey, config]) => {
                if (idFieldKey && fieldKey === idFieldKey) return false;
                if (nameFieldKey && fieldKey === nameFieldKey) return false;
                if (globalFieldKeys.includes(fieldKey)) return false;
                if (config.visible === false) return false;
                return true;
            })
            .map(([fieldKey, config]) => {
                const labelEn = (config.friendlyNameEn && config.friendlyNameEn !== fieldKey)
                    ? config.friendlyNameEn
                    : fieldKey;
                const labelHe = (config.friendlyNameHe && config.friendlyNameHe !== fieldKey)
                    ? config.friendlyNameHe
                    : fieldKey;
                return { key: fieldKey, labelEn, labelHe };
            });
    }, [settings.solumMappingConfig]);

    // Get the dedicated name field (articleName from mappingInfo)
    const nameField = useMemo(() => {
        const nameFieldKey = settings.solumMappingConfig?.mappingInfo?.articleName;
        if (!nameFieldKey) return null;
        const fieldConfig = settings.solumMappingConfig?.fields?.[nameFieldKey];
        const labelEn = (fieldConfig?.friendlyNameEn && fieldConfig.friendlyNameEn !== nameFieldKey)
            ? fieldConfig.friendlyNameEn
            : t('people.name');
        const labelHe = (fieldConfig?.friendlyNameHe && fieldConfig.friendlyNameHe !== nameFieldKey)
            ? fieldConfig.friendlyNameHe
            : t('people.name');
        return { key: nameFieldKey, labelEn, labelHe };
    }, [settings.solumMappingConfig, t]);

    // Initialize form data when dialog opens or person changes
    useEffect(() => {
        if (person) {
            setFormData({
                id: person.id,
                data: { ...person.data },
                assignedSpaceId: person.assignedSpaceId,
            });
        } else {
            const emptyData: Record<string, string> = {};
            if (nameField) {
                emptyData[nameField.key] = '';
            }
            editableFields.forEach(field => {
                emptyData[field.key] = '';
            });
            setFormData({
                id: '',
                data: emptyData,
                assignedSpaceId: undefined,
            });
        }
        setErrors({});
    }, [person, editableFields, nameField]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (formData.assignedSpaceId) {
            const spaceNum = parseInt(formData.assignedSpaceId, 10);
            if (isNaN(spaceNum) || spaceNum < 1) {
                newErrors.assignedSpaceId = t('validation.invalidSpaceId');
            } else if (totalSpaces > 0 && spaceNum > totalSpaces) {
                newErrors.assignedSpaceId = tWithSpaceType('people.spaceExceedsTotal');
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const globalFields = settings.solumMappingConfig?.globalFieldAssignments || {};
            const dataWithGlobals = { ...formData.data, ...globalFields };
            if (isEditMode) {
                await peopleController.updatePerson(person!.id, {
                    data: dataWithGlobals,
                    assignedSpaceId: formData.assignedSpaceId,
                });
            } else {
                const newPerson: Person = {
                    id: '',
                    data: dataWithGlobals,
                    assignedSpaceId: formData.assignedSpaceId,
                };
                await peopleController.addPerson(newPerson);
            }
            onClose();
        } catch (error) {
            await confirm({
                title: t('common.error'),
                message: `${t('people.saveFailed')}: ${error}`,
                confirmLabel: t('common.close'),
                severity: 'error',
                showCancel: false
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            data: { ...prev.data, [key]: value }
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile} dir={isRtl ? 'rtl' : 'ltr'}>
            <DialogTitle sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                {person ? t('people.editPerson') : t('people.addPerson')}
            </DialogTitle>
            <DialogContent>
                <Stack gap={2} sx={{ mt: 1 }}>
                    {/* Dedicated Name Field */}
                    {nameField && (
                        <TextField
                            label={isRtl ? nameField.labelHe : nameField.labelEn}
                            value={formData.data[nameField.key] || ''}
                            onChange={(e) => handleFieldChange(nameField.key, e.target.value)}
                            fullWidth
                            autoFocus
                            slotProps={{
                                input: {
                                    sx: { textAlign: isRtl ? 'right' : 'left' }
                                }
                            }}
                        />
                    )}

                    {/* Dynamic Fields */}
                    {editableFields.map(field => (
                        <TextField
                            key={field.key}
                            label={isRtl ? field.labelHe : field.labelEn}
                            value={formData.data[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            fullWidth
                            slotProps={{
                                input: {
                                    sx: { textAlign: isRtl ? 'right' : 'left' }
                                }
                            }}
                        />
                    ))}

                    <Divider sx={{ my: 1 }} />

                    {/* Space Assignment */}
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                        {tWithSpaceType('people.spaceAssignment')}
                    </Typography>

                    <SpaceSelector
                        value={formData.assignedSpaceId}
                        onChange={(spaceId) => {
                            setFormData(prev => ({ ...prev, assignedSpaceId: spaceId }));
                        }}
                        error={!!errors.assignedSpaceId}
                        helperText={errors.assignedSpaceId}
                        excludePersonId={person?.id}
                    />

                    {/* Save / Cancel buttons */}
                    <Stack direction={isRtl ? 'row-reverse' : 'row'} gap={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button onClick={onClose} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSave} variant="contained" disabled={saving}>
                            {saving ? t('common.saving') : t('common.save')}
                        </Button>
                    </Stack>
                </Stack>
            </DialogContent>
            <ConfirmDialog />
        </Dialog>
    );
}
