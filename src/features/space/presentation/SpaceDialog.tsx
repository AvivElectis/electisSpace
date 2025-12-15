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
import { useState, useEffect } from 'react';
import type { Space, CSVConfig } from '@shared/domain/types';

interface SpaceDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (space: Partial<Space>) => Promise<void>;
    space?: Space;
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
    csvConfig,
    spaceTypeLabel,
}: SpaceDialogProps) {
    const [id, setId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [labelCode, setLabelCode] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [dynamicData, setDynamicData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (space) {
                // Edit mode
                setId(space.id);
                setRoomName(space.roomName);
                setLabelCode(space.labelCode || '');
                setTemplateName(space.templateName || '');
                setDynamicData(space.data || {});
            } else {
                // Add mode - reset
                setId('');
                setRoomName('');
                setLabelCode('');
                setTemplateName('');
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
                labelCode: labelCode || undefined,
                templateName: templateName || undefined,
                data: dynamicData,
            };

            await onSave(spaceData);
            onClose();
        } catch (error) {
            alert(`Failed to save ${spaceTypeLabel.toLowerCase()}: ${error}`);
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

    // Get dynamic fields from CSV config
    const dynamicFields = csvConfig.columns
        .filter(col => col.name !== 'id' && col.name !== 'roomName')
        .map(col => col.name);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {space ? `Edit ${spaceTypeLabel}` : `Add ${spaceTypeLabel}`}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* ID - only editable in add mode */}
                    <TextField
                        fullWidth
                        label="ID"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        disabled={!!space}
                        required
                        helperText={space ? 'ID cannot be changed' : 'Unique identifier'}
                    />

                    {/* Room Name */}
                    <TextField
                        fullWidth
                        label="Name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                    />

                    <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                        Label Information (Optional)
                    </Typography>

                    {/* Label Code */}
                    <TextField
                        fullWidth
                        label="Label Code"
                        value={labelCode}
                        onChange={(e) => setLabelCode(e.target.value)}
                        helperText="ESL label barcode"
                    />

                    {/* Template Name */}
                    <TextField
                        fullWidth
                        label="Template Name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        helperText="SoluM template name"
                    />

                    {/* Dynamic Fields */}
                    {dynamicFields.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>
                                Additional Information
                            </Typography>
                            {dynamicFields.map((field) => (
                                <TextField
                                    key={field}
                                    fullWidth
                                    label={field}
                                    value={dynamicData[field] || ''}
                                    onChange={(e) => handleDynamicDataChange(field, e.target.value)}
                                />
                            ))}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || !roomName || (!space && !id)}
                >
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
