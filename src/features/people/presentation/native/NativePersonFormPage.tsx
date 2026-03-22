import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import { usePeopleController } from '../../application/usePeopleController';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeBottomSheet } from '@shared/presentation/native/NativeBottomSheet';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import type { NativeBottomSheetItem } from '@shared/presentation/native/NativeBottomSheet';
import { nativeColors, nativeSpacing } from '@shared/presentation/themes/nativeTokens';

import type { Person } from '../../domain/types';

/**
 * NativePersonFormPage — Android-native create / edit person form.
 * - Create mode: no `id` param
 * - Edit mode: `id` param present, loads person from store
 *
 * Mirrors the field logic of PersonDialog but as a full-page routed component.
 */
export function NativePersonFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'he';

    const isEditMode = !!id;

    const settings = useSettingsStore((state) => state.settings);
    const people = usePeopleStore((state) => state.people);
    const peopleController = usePeopleController();
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type labels
    const tWithSpaceType = useCallback((key: string, options?: Record<string, unknown>) => {
        return t(key, {
            ...options,
            spaceTypeSingular: getLabel('singular').toLowerCase(),
            spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
            spaceTypePlural: getLabel('plural').toLowerCase(),
            spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
        });
    }, [t, getLabel]);

    // Derive existing person (edit mode)
    const existingPerson = useMemo(
        () => (id ? people.find((p) => p.id === id) : undefined),
        [id, people]
    );

    // Determine the dedicated name field from mapping config (mirrors PersonDialog)
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

    // Determine editable fields (mirrors PersonDialog - excludes id, name, global fields)
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

    // Form state
    const [formData, setFormData] = useState<{ data: Record<string, string>; assignedSpaceId?: string }>({
        data: {},
        assignedSpaceId: undefined,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [spaceSheetOpen, setSpaceSheetOpen] = useState(false);

    // Initialize form when person data arrives (edit mode) or on create
    useEffect(() => {
        if (existingPerson) {
            setFormData({
                data: { ...existingPerson.data },
                assignedSpaceId: existingPerson.assignedSpaceId,
            });
        } else {
            const emptyData: Record<string, string> = {};
            if (nameField) {
                emptyData[nameField.key] = '';
            }
            editableFields.forEach((field) => {
                emptyData[field.key] = '';
            });
            setFormData({ data: emptyData, assignedSpaceId: undefined });
        }
        setErrors({});
        // Only re-run when person identity or config changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingPerson?.id, editableFields.length, nameField?.key]);

    const handleFieldChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, data: { ...prev.data, [key]: value } }));
    };

    // Validate (same rules as PersonDialog)
    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;

        if (formData.assignedSpaceId) {
            const spaceNum = parseInt(formData.assignedSpaceId, 10);
            if (isNaN(spaceNum) || spaceNum < 1) {
                newErrors.assignedSpaceId = t('validation.invalidSpaceId', { defaultValue: 'Invalid space ID' });
            } else if (totalSpaces > 0 && spaceNum > totalSpaces) {
                newErrors.assignedSpaceId = tWithSpaceType('people.spaceExceedsTotal');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData.assignedSpaceId, settings.peopleManagerConfig, t, tWithSpaceType]);

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const globalFields = settings.solumMappingConfig?.globalFieldAssignments || {};
            const dataWithGlobals = { ...formData.data, ...globalFields };

            if (isEditMode && id) {
                await peopleController.updatePerson(id, {
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
            navigate(-1);
        } catch (error) {
            // Error surfaced via store; stay on page
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await peopleController.deletePerson(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    // Build space options for bottom sheet
    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;
    const spaceSheetItems = useMemo((): NativeBottomSheetItem[] => {
        if (totalSpaces === 0) return [];

        const assignedSpaces = new Map<string, string>();
        people.forEach((person) => {
            if (person.assignedSpaceId && person.id !== id) {
                const displayName = Object.values(person.data)[0] || person.id;
                assignedSpaces.set(person.assignedSpaceId, displayName);
            }
        });

        const items: NativeBottomSheetItem[] = [];
        for (let i = 1; i <= totalSpaces; i++) {
            const spaceId = String(i);
            const takenBy = assignedSpaces.get(spaceId);
            // Only show available spaces
            if (!takenBy) {
                items.push({
                    id: spaceId,
                    label: `${tWithSpaceType('people.space')} ${spaceId}`,
                });
            }
        }

        return items;
    }, [totalSpaces, people, id, tWithSpaceType]);

    const handleSpaceSelect = (item: NativeBottomSheetItem) => {
        setFormData((prev) => ({ ...prev, assignedSpaceId: item.id }));
    };

    const handleUnassignSpace = () => {
        setFormData((prev) => ({ ...prev, assignedSpaceId: undefined }));
    };

    // Display name for form page title
    const pageTitle = isEditMode
        ? t('people.editPerson')
        : t('people.addPerson');

    // Sync status chip (edit mode only)
    const syncStatus = existingPerson?.aimsSyncStatus;

    return (
        <NativeFormPage
            title={pageTitle}
            onSave={handleSave}
            isSaving={saving}
        >
            {/* Personal Information section */}
            <NativeFormSection title={t('people.personalInfo')}>
                {/* Dedicated name field */}
                {nameField && (
                    <NativeTextField
                        label={isRtl ? nameField.labelHe : nameField.labelEn}
                        value={formData.data[nameField.key] ?? ''}
                        onChange={(e) => handleFieldChange(nameField.key, e.target.value)}
                        autoFocus={!isEditMode}
                    />
                )}

                {/* Dynamic editable fields */}
                {editableFields.map((field) => (
                    <NativeTextField
                        key={field.key}
                        label={isRtl ? field.labelHe : field.labelEn}
                        value={formData.data[field.key] ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    />
                ))}
            </NativeFormSection>

            {/* Space Assignment section */}
            <NativeFormSection title={tWithSpaceType('people.spaceAssignment')}>
                {formData.assignedSpaceId ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            {tWithSpaceType('people.space')} #{formData.assignedSpaceId}
                        </Typography>
                        <Stack direction="row" gap={1}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSpaceSheetOpen(true)}
                            >
                                {t('common.edit')}
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={handleUnassignSpace}
                            >
                                {tWithSpaceType('people.unassignSpace')}
                            </Button>
                        </Stack>
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {t('people.unassigned')}
                        </Typography>
                        {totalSpaces > 0 ? (
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => setSpaceSheetOpen(true)}
                            >
                                {tWithSpaceType('people.assignSpace')}
                            </Button>
                        ) : (
                            <Typography variant="caption" color="error">
                                {tWithSpaceType('people.noSpacesConfigured')}
                            </Typography>
                        )}
                    </Box>
                )}
                {errors.assignedSpaceId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {errors.assignedSpaceId}
                    </Typography>
                )}
            </NativeFormSection>

            {/* Linked Device / AIMS Status (edit mode only) */}
            {isEditMode && existingPerson && (
                <NativeFormSection title={t('people.aimsStatus')}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 0.5,
                        }}
                    >
                        {syncStatus === 'synced' && (
                            <CheckCircleIcon sx={{ color: nativeColors.status.success, fontSize: 20 }} />
                        )}
                        {syncStatus === 'error' && (
                            <ErrorIcon sx={{ color: nativeColors.status.error, fontSize: 20 }} />
                        )}
                        {syncStatus === 'pending' && (
                            <HourglassEmptyIcon sx={{ color: nativeColors.status.warning, fontSize: 20 }} />
                        )}
                        <Box>
                            <Typography variant="body2" fontWeight={600}>
                                {syncStatus === 'synced' && t('people.syncedToAims')}
                                {syncStatus === 'error' && t('people.syncError')}
                                {syncStatus === 'pending' && t('people.syncPending')}
                                {!syncStatus && t('people.notSynced')}
                            </Typography>
                            {existingPerson.lastSyncedAt && (
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(existingPerson.lastSyncedAt).toLocaleString()}
                                </Typography>
                            )}
                        </Box>
                        {existingPerson.assignedLabels && existingPerson.assignedLabels.length > 0 && (
                            <Chip
                                label={`${existingPerson.assignedLabels.length} label${existingPerson.assignedLabels.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    ml: 'auto',
                                    bgcolor: `${nativeColors.status.info}22`,
                                    color: nativeColors.status.info,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </Box>
                </NativeFormSection>
            )}

            {/* Delete button (edit mode only) */}
            {isEditMode && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                    <NativeDeleteButton
                        onDelete={handleDelete}
                        isDeleting={deleting}
                        itemName={
                            nameField
                                ? formData.data[nameField.key] || undefined
                                : Object.values(formData.data)[0] || undefined
                        }
                        label={t('people.deletePerson')}
                    />
                </Box>
            )}

            {/* Space picker bottom sheet */}
            <NativeBottomSheet
                open={spaceSheetOpen}
                onClose={() => setSpaceSheetOpen(false)}
                onSelect={handleSpaceSelect}
                items={spaceSheetItems}
                title={tWithSpaceType('people.selectSpace')}
                selectedId={formData.assignedSpaceId}
                searchable={totalSpaces > 10}
            />
        </NativeFormPage>
    );
}
