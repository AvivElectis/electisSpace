import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
    FormControlLabel,
    Checkbox,
    Divider,
    Box,
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
 * Dynamically generates form fields based on SoluM mapping configuration
 */
export function PersonDialog({ open, onClose, person }: PersonDialogProps) {
    const { t, i18n } = useTranslation();
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

    // Single source of truth: totalSpaces from settings
    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;

    const [formData, setFormData] = useState<{ id: string; data: Record<string, string>; assignedSpaceId?: string }>({
        id: '',
        data: {},
        assignedSpaceId: undefined,
    });
    const [postToAims, setPostToAims] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const isEditMode = !!person;

    // Get editable fields from mapping config
    const editableFields = useMemo(() => {
        if (!settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settings.solumMappingConfig.mappingInfo?.articleId;
        const globalFields = settings.solumMappingConfig.globalFieldAssignments || {};
        const globalFieldKeys = Object.keys(globalFields);

        return Object.entries(settings.solumMappingConfig.fields)
            .filter(([fieldKey]) => {
                // Exclude ID field and global fields
                if (idFieldKey && fieldKey === idFieldKey) return false;
                if (globalFieldKeys.includes(fieldKey)) return false;
                return true;
            })
            .map(([fieldKey, config]) => ({
                key: fieldKey,
                labelEn: config.friendlyNameEn,
                labelHe: config.friendlyNameHe,
            }));
    }, [settings.solumMappingConfig]);

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (person) {
                // Edit mode
                setFormData({
                    id: person.id,
                    data: { ...person.data },
                    assignedSpaceId: person.assignedSpaceId,
                });
            } else {
                // Add mode - reset (ID will be auto-generated)
                const emptyData: Record<string, string> = {};
                editableFields.forEach(field => {
                    emptyData[field.key] = '';
                });
                setFormData({
                    id: '', // Will be auto-generated on save
                    data: emptyData,
                    assignedSpaceId: undefined,
                });
            }
            setPostToAims(false);
            setErrors({});
        }
    }, [open, person, editableFields]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        // No need to validate ID for add mode - it will be auto-generated

        // Check if assigned space ID is within range
        if (formData.assignedSpaceId) {
            const spaceNum = parseInt(formData.assignedSpaceId, 10);
            if (isNaN(spaceNum) || spaceNum < 1) {
                newErrors.assignedSpaceId = t('validation.invalidSpaceId');
            } else if (spaceNum > totalSpaces) {
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
            if (isEditMode) {
                // Update existing person (now async with auto-sync)
                await peopleController.updatePerson(person!.id, {
                    data: formData.data,
                    assignedSpaceId: formData.assignedSpaceId,
                });
            } else {
                // Add new person with auto-sync
                // The controller will generate UUID and virtual pool ID
                const newPerson: Person = {
                    id: '', // Will be replaced by controller with UUID
                    data: formData.data,
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

    // Determine text direction based on language
    const isRtl = i18n.language === 'he';

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                maxWidth="sm" 
                fullWidth
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <DialogTitle sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                    {isEditMode ? t('people.editPerson') : t('people.addPerson')}
                </DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        {/* Dynamic Fields */}
                        {editableFields.map(field => (
                            <TextField
                                key={field.key}
                                label={i18n.language === 'he' ? field.labelHe : field.labelEn}
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
                            onChange={(spaceId) => setFormData(prev => ({
                                ...prev,
                                assignedSpaceId: spaceId
                            }))}
                            error={!!errors.assignedSpaceId}
                            helperText={errors.assignedSpaceId}
                            excludePersonId={person?.id}
                        />

                        {/* Post to AIMS option */}
                        {formData.assignedSpaceId && (
                            <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={postToAims}
                                            onChange={(e) => setPostToAims(e.target.checked)}
                                        />
                                    }
                                    label={t('people.postToAimsOnSave')}
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                    {t('people.postToAimsDescription')}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <Button onClick={onClose} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={saving}
                    >
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
            <ConfirmDialog />
        </>
    );
}
