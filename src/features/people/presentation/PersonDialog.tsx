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
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeopleController } from '../application/usePeopleController';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
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
    const people = usePeopleStore((state) => state.people);

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
                // Add mode - reset
                const emptyData: Record<string, string> = {};
                editableFields.forEach(field => {
                    emptyData[field.key] = '';
                });
                setFormData({
                    id: '',
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

        if (!formData.id?.trim()) {
            newErrors.id = t('validation.required');
        } else if (!isEditMode && people.some(p => p.id === formData.id.trim())) {
            newErrors.id = t('errors.idExists');
        }

        // Check if assigned space ID is within range
        if (formData.assignedSpaceId) {
            const spaceNum = parseInt(formData.assignedSpaceId, 10);
            if (isNaN(spaceNum) || spaceNum < 1) {
                newErrors.assignedSpaceId = t('validation.invalidSpaceId');
            } else if (spaceNum > totalSpaces) {
                newErrors.assignedSpaceId = t('people.spaceExceedsTotal');
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
                // Update existing person
                peopleController.updatePerson(person!.id, {
                    data: formData.data,
                    assignedSpaceId: formData.assignedSpaceId,
                });

                // Post to AIMS if requested
                if (postToAims && formData.assignedSpaceId) {
                    await peopleController.postSelectedToAims([person!.id]);
                }
            } else {
                // Add new person
                const newPerson: Person = {
                    id: formData.id.trim(),
                    data: formData.data,
                    assignedSpaceId: formData.assignedSpaceId,
                };
                peopleController.addPerson(newPerson);

                // Post to AIMS if requested
                if (postToAims && formData.assignedSpaceId) {
                    await peopleController.postSelectedToAims([newPerson.id]);
                }
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
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {isEditMode ? t('people.editPerson') : t('people.addPerson')}
                </DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        {/* ID Field */}
                        <TextField
                            label={t('people.id')}
                            value={formData.id}
                            onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                            error={!!errors.id}
                            helperText={errors.id || (isEditMode ? t('spaces.idCannotChange') : '')}
                            disabled={isEditMode}
                            required
                            fullWidth
                        />

                        {/* Dynamic Fields */}
                        {editableFields.map(field => (
                            <TextField
                                key={field.key}
                                label={i18n.language === 'he' ? field.labelHe : field.labelEn}
                                value={formData.data[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                fullWidth
                            />
                        ))}

                        <Divider sx={{ my: 1 }} />

                        {/* Space Assignment */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('people.spaceAssignment')}
                        </Typography>

                        <TextField
                            label={t('people.assignedSpace')}
                            type="number"
                            value={formData.assignedSpaceId || ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                assignedSpaceId: e.target.value || undefined
                            }))}
                            error={!!errors.assignedSpaceId}
                            helperText={errors.assignedSpaceId || t('people.spaceIdHelper', { max: totalSpaces })}
                            inputProps={{ min: 1, max: totalSpaces }}
                            fullWidth
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
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {t('people.postToAimsDescription')}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
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
