import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography, Box } from '@mui/material';

import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

import type { Space } from '@shared/domain/types';

/**
 * NativeSpaceFormPage — Android-native create / edit space form.
 * - Create mode: no `id` param → /spaces/new
 * - Edit mode: `id` param → /spaces/:id/edit
 *
 * Mirrors field logic from SpaceDialog (SOLUM_API mode + SFTP mode).
 */
export function NativeSpaceFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'he';

    const isEditMode = !!id;

    const settings = useSettingsStore((state) => state.settings);
    const spaces = useSpacesStore((state) => state.spaces);
    const { getLabel } = useSpaceTypeLabels();
    const { push } = useBackendSyncContext();

    const spaceController = useSpaceController({
        csvConfig: settings.csvConfig || { delimiter: ',', columns: [], mapping: {}, conferenceEnabled: false },
        onSync: settings.workingMode === 'SOLUM_API' ? async () => { await push(); } : undefined,
        solumMappingConfig: settings.solumMappingConfig,
    });

    const existingSpace = useMemo(
        () => (id ? spaces.find((s) => s.id === id) : undefined),
        [id, spaces]
    );

    // ── Dynamic fields (mirrors SpaceDialog) ──────────────────────────────────
    const nameFieldKey = useMemo(() => {
        if (settings.workingMode === 'SOLUM_API') return undefined;
        return 'roomName';
    }, [settings.workingMode]);

    const dynamicFields = useMemo(() => {
        if (settings.workingMode === 'SOLUM_API' && settings.solumMappingConfig) {
            const uniqueIdField = settings.solumMappingConfig.uniqueIdField;
            const globalFieldKeys = Object.keys(settings.solumMappingConfig.globalFieldAssignments || {});

            return Object.entries(settings.solumMappingConfig.fields)
                .filter(([fieldKey, fieldConfig]) => {
                    if (!fieldConfig.visible) return false;
                    if (fieldKey === uniqueIdField) return false;
                    if (nameFieldKey && fieldKey === nameFieldKey) return false;
                    if (globalFieldKeys.includes(fieldKey)) return false;
                    return true;
                })
                .sort(([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity))
                .map(([fieldKey, fieldConfig]) => {
                    const labelHe = (fieldConfig.friendlyNameHe && fieldConfig.friendlyNameHe !== fieldKey)
                        ? fieldConfig.friendlyNameHe
                        : fieldKey;
                    const labelEn = (fieldConfig.friendlyNameEn && fieldConfig.friendlyNameEn !== fieldKey)
                        ? fieldConfig.friendlyNameEn
                        : fieldKey;
                    return { key: fieldKey, labelEn, labelHe };
                });
        } else {
            const csvColumns = settings.csvConfig?.columns || [];
            return csvColumns
                .filter((col) => col.name !== 'id' && col.name !== nameFieldKey)
                .map((col) => ({ key: col.name, labelEn: col.name, labelHe: col.name }));
        }
    }, [settings.workingMode, settings.solumMappingConfig, settings.csvConfig, nameFieldKey]);

    // ── Form state ─────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState<Partial<Space>>({ id: '', data: {} });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Initialize on open / id change
    useEffect(() => {
        if (existingSpace) {
            setFormData({
                id: existingSpace.id,
                externalId: existingSpace.externalId,
                data: { ...existingSpace.data },
            });
        } else {
            setFormData({ id: '', data: {} });
        }
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingSpace?.id, dynamicFields.length]);

    const handleIdChange = (value: string) => {
        setFormData((prev) => ({ ...prev, id: value }));
        if (!existingSpace) {
            const existingIds = spaces.map((s) => s.id);
            if (existingIds.includes(value.trim())) {
                setErrors((prev) => ({ ...prev, id: t('errors.idExists') }));
            } else if (!value.trim()) {
                setErrors((prev) => ({ ...prev, id: t('errors.required') }));
            } else {
                setErrors((prev) => {
                    const e = { ...prev };
                    delete e.id;
                    return e;
                });
            }
        }
    };

    const handleDynamicChange = (fieldKey: string, value: string) => {
        setFormData((prev) => ({ ...prev, data: { ...prev.data, [fieldKey]: value } }));
    };

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        if (!existingSpace) {
            if (!formData.id?.trim()) {
                newErrors.id = t('errors.required');
            } else if (spaces.map((s) => s.id).includes(formData.id.trim())) {
                newErrors.id = t('errors.idExists');
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [existingSpace, formData.id, spaces, t]);

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (isEditMode && existingSpace) {
                await spaceController.updateSpace(existingSpace.id, {
                    data: formData.data,
                });
            } else {
                await spaceController.addSpace(formData);
            }
            navigate(-1);
        } catch {
            // Error surfaced via store
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !existingSpace) return;
        setDeleting(true);
        try {
            await spaceController.deleteSpace(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    const spaceTypeLabel = getLabel('singular');
    const pageTitle = isEditMode
        ? `${t('common.edit')} ${spaceTypeLabel}`
        : `${t('common.add')} ${spaceTypeLabel}`;

    return (
        <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
            {/* Space Details */}
            <NativeFormSection title={t('spaces.native.details', 'Space Details')}>
                {/* ID */}
                <NativeTextField
                    label={t('spaces.id')}
                    value={isEditMode ? (formData.externalId || formData.id || '') : (formData.id || '')}
                    onChange={(e) => handleIdChange(e.target.value)}
                    disabled={isEditMode}
                    autoFocus={!isEditMode}
                    helperText={
                        errors.id ||
                        (isEditMode ? t('spaces.idCannotChange') : t('spaces.uniqueIdentifier'))
                    }
                    error={!!errors.id}
                />

                {/* Name field (SFTP mode only) */}
                {nameFieldKey && (
                    <NativeTextField
                        label={t('spaces.name')}
                        value={formData.data?.[nameFieldKey] || ''}
                        onChange={(e) => handleDynamicChange(nameFieldKey, e.target.value)}
                    />
                )}

                {/* Dynamic fields */}
                {dynamicFields.map((field) => (
                    <NativeTextField
                        key={field.key}
                        label={isRtl ? field.labelHe : field.labelEn}
                        value={formData.data?.[field.key] || ''}
                        onChange={(e) => handleDynamicChange(field.key, e.target.value)}
                    />
                ))}
            </NativeFormSection>

            {/* Label Info (edit mode only) */}
            {isEditMode && existingSpace && (existingSpace.labelCode || (existingSpace.assignedLabels && existingSpace.assignedLabels.length > 0)) && (
                <NativeFormSection title={t('spaces.native.labelInfo', 'Label Info')}>
                    {existingSpace.labelCode && (
                        <Typography variant="body2" color="text.secondary">
                            {t('spaces.labelCode')}: {existingSpace.labelCode}
                        </Typography>
                    )}
                    {existingSpace.assignedLabels && existingSpace.assignedLabels.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                            {t('spaces.native.assignedLabels', 'Assigned labels')}: {existingSpace.assignedLabels.join(', ')}
                        </Typography>
                    )}
                    {existingSpace.syncStatus && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: existingSpace.syncStatus === 'SYNCED'
                                    ? 'success.main'
                                    : existingSpace.syncStatus === 'ERROR'
                                    ? 'error.main'
                                    : 'warning.main',
                            }}
                        >
                            {t(`spaces.sync.${existingSpace.syncStatus.toLowerCase()}`, existingSpace.syncStatus)}
                        </Typography>
                    )}
                </NativeFormSection>
            )}

            {/* Delete button (edit mode only) */}
            {isEditMode && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                    <NativeDeleteButton
                        onDelete={handleDelete}
                        isDeleting={deleting}
                        itemName={
                            existingSpace
                                ? (existingSpace.externalId || existingSpace.id)
                                : undefined
                        }
                        label={`${t('spaces.delete')} ${spaceTypeLabel}`}
                    />
                </Box>
            )}
        </NativeFormPage>
    );
}
