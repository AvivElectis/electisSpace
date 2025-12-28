import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Space, CSVConfig, WorkingMode } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface SpaceDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (space: Partial<Space>) => Promise<void>;
    space?: Space;
    workingMode: WorkingMode;
    solumMappingConfig?: SolumMappingConfig;
    csvConfig: CSVConfig;
    spaceTypeLabel: string;
    existingIds?: string[];
}

/**
 * Space Add/Edit Dialog
 */
export function SpaceDialog({
    open,
    onClose,
    onSave,
    space,
    workingMode,
    solumMappingConfig,
    csvConfig,
    spaceTypeLabel,
    existingIds = []
}: SpaceDialogProps) {
    const { i18n, t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const currentLanguage = i18n.language as 'en' | 'he';
    const [formData, setFormData] = useState<Partial<Space>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (space) {
                // Edit mode
                setFormData({
                    id: space.id,
                    roomName: space.roomName,
                    data: space.data || {},
                });
            } else {
                // Add mode - reset
                setFormData({
                    id: '',
                    roomName: '',
                    data: {}
                });
            }
            setErrors({});
        }
    }, [open, space]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.id?.trim()) {
            newErrors.id = t('errors.required');
        } else if (existingIds.includes(formData.id.trim()) && (!space || space.id !== formData.id)) {
            newErrors.id = t('errors.idExists');
        }

        // Room Name is optional in some contexts, but let's check if it was required before.
        // It was not strictly required in the previous code's types, but let's keep it safe.
        // If it was required, add: if (!formData.roomName?.trim()) newErrors.roomName = t('errors.required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            await confirm({
                title: t('common.error'),
                message: `Failed to save ${spaceTypeLabel.toLowerCase()}: ${error}`,
                confirmLabel: t('common.close'),
                severity: 'error',
                showCancel: false
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof Space, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Live Validation
        if (field === 'id') {
            const trimmedId = (value as string).trim();
            if (existingIds.includes(trimmedId) && (!space || space.id !== trimmedId)) {
                setErrors(prev => ({ ...prev, id: t('errors.idExists') }));
            } else if (!trimmedId) {
                setErrors(prev => ({ ...prev, id: t('errors.required') }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.id;
                    return newErrors;
                });
            }
        } else {
            // Clear error when user types for other fields
            if (errors[field]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
            }
        }
    };

    const handleDynamicDataChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [field]: value
            }
        }));
    };

    // Get dynamic fields based on working mode
    const dynamicFields = useMemo(() => {
        if (workingMode === 'SOLUM_API' && solumMappingConfig) {
            // SoluM mode: Show visible fields with friendly names
            // Filter out uniqueIdField since it's already shown as ID
            const uniqueIdField = solumMappingConfig.uniqueIdField;
            return Object.entries(solumMappingConfig.fields)
                .filter(([fieldKey, fieldConfig]) => fieldConfig.visible && fieldKey !== uniqueIdField)
                .map(([fieldKey, fieldConfig]) => ({
                    key: fieldKey,
                    label: currentLanguage === 'he' ? fieldConfig.friendlyNameHe : fieldConfig.friendlyNameEn,
                }));
        } else {
            // SFTP mode: Show CSV columns
            return csvConfig.columns
                .filter(col => col.name !== 'id' && col.name !== 'roomName')
                .map(col => ({
                    key: col.name,
                    label: col.name,
                }));
        }
    }, [workingMode, solumMappingConfig, csvConfig, currentLanguage]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {space ? `${t('common.edit')} ${spaceTypeLabel}` : `${t('common.add')} ${spaceTypeLabel}`}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* ID - only editable in add mode */}
                    <TextField
                        fullWidth
                        label={t('spaces.id')}
                        value={formData.id || ''}
                        onChange={(e) => handleChange('id', e.target.value)}
                        disabled={!!space}
                        required
                        error={!!errors.id}
                        helperText={errors.id || (space ? t('spaces.idCannotChange') : t('spaces.uniqueIdentifier'))}
                    />

                    {/* Room Name - Standard Field */}
                    <TextField
                        fullWidth
                        label={t('spaces.name')}
                        value={formData.roomName || ''}
                        onChange={(e) => handleChange('roomName', e.target.value)}
                    />

                    {/* Dynamic Fields */}
                    {dynamicFields.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                                {t('spaces.additionalInfo')}
                            </Typography>
                            {dynamicFields.map((field) => (
                                <TextField
                                    key={field.key}
                                    fullWidth
                                    label={field.label}
                                    value={formData.data?.[field.key] || ''}
                                    onChange={(e) => handleDynamicDataChange(field.key, e.target.value)}
                                />
                            ))}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
