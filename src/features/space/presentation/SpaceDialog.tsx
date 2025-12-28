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
}: SpaceDialogProps) {
    const { i18n, t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const currentLanguage = i18n.language as 'en' | 'he';
    const [id, setId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [dynamicData, setDynamicData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (space) {
                // Edit mode
                setId(space.id);
                setRoomName(space.roomName);
                setDynamicData(space.data || {});
            } else {
                // Add mode - reset
                setId('');
                setRoomName('');
                setDynamicData({});
            }
        }
    }, [open, space]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const spaceData: Partial<Space> = {
                id: space ? space.id : id, // Don't allow ID change in edit mode
                roomName,
                data: dynamicData,
            };

            await onSave(spaceData);
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

    const handleDynamicDataChange = (field: string, value: string) => {
        setDynamicData(prev => ({
            ...prev,
            [field]: value,
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
                        label={t('common.id')}
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        disabled={!!space}
                        required
                        helperText={space ? t('spaces.idCannotChange') : t('spaces.uniqueIdentifier')}
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
                                    value={dynamicData[field.key] || ''}
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
                    disabled={saving || (!space && !id)}
                >
                    {saving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
