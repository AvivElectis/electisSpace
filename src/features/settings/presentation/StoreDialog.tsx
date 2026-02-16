/**
 * Store Dialog
 * 
 * @description Dialog for creating and editing stores within a company.
 * Includes store name, code, timezone, and sync settings.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    InputAdornment,
    Autocomplete,
    Divider,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    companyService,
    type CompanyStore,
    type CreateStoreDto,
    type UpdateStoreDto,
} from '@shared/infrastructure/services/companyService';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';
import { DEFAULT_COMPANY_FEATURES } from '@shared/infrastructure/services/authService';

// Common timezones
const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Seoul',
    'Asia/Singapore',
    'Asia/Dubai',
    'Asia/Jerusalem',
    'Australia/Sydney',
    'Pacific/Auckland'
];

interface StoreDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    companyId: string;
    store?: CompanyStore | null; // If provided, edit mode
}

export function StoreDialog({ open, onClose, onSave, companyId, store }: StoreDialogProps) {
    const { t } = useTranslation();
    const isEdit = !!store;

    // State
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [isActive, setIsActive] = useState(true);

    // Code Validation
    const [codeValidating, setCodeValidating] = useState(false);
    const [codeValid, setCodeValid] = useState<boolean | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);

    // Store feature overrides
    const [overrideEnabled, setOverrideEnabled] = useState(false);
    const [storeFeatures, setStoreFeatures] = useState<CompanyFeatures>({ ...DEFAULT_COMPANY_FEATURES });
    const [storeSpaceType, setStoreSpaceType] = useState<SpaceType>('office');

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (store) {
                // Edit mode
                setName(store.name);
                setCode(store.code);
                setTimezone(store.timezone);
                setSyncEnabled(store.syncEnabled);
                setIsActive(store.isActive);
                setCodeValid(true); // Existing code is valid
                // Initialize feature overrides
                if (store.storeFeatures) {
                    setOverrideEnabled(true);
                    setStoreFeatures(store.storeFeatures);
                    setStoreSpaceType(store.storeSpaceType ?? 'office');
                } else {
                    setOverrideEnabled(false);
                    setStoreFeatures({ ...DEFAULT_COMPANY_FEATURES });
                    setStoreSpaceType('office');
                }
            } else {
                // Create mode
                setName('');
                setCode('');
                setTimezone('UTC');
                setSyncEnabled(true);
                setIsActive(true);
                setCodeValid(null);
                setOverrideEnabled(false);
                setStoreFeatures({ ...DEFAULT_COMPANY_FEATURES });
                setStoreSpaceType('office');
            }
            setError(null);
            setCodeError(null);
        }
    }, [open, store]);

    // Code validation with debounce
    useEffect(() => {
        if (!open || isEdit) return;
        if (!code) {
            setCodeValid(null);
            setCodeError(null);
            return;
        }

        // Validate code format (numeric string)
        const isValidFormat = /^\d{1,10}$/.test(code);
        if (!isValidFormat) {
            setCodeValid(false);
            setCodeError(t('settings.stores.codeInvalidFormat'));
            return;
        }

        const handler = setTimeout(async () => {
            setCodeValidating(true);
            try {
                const result = await companyService.validateStoreCode(companyId, code);
                setCodeValid(result.available);
                setCodeError(result.available ? null : t('settings.stores.codeExists'));
            } catch {
                setCodeError(t('settings.stores.codeValidationError'));
            } finally {
                setCodeValidating(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [code, open, isEdit, companyId, t]);

    // Handle code input - only allow digits
    const handleCodeChange = (value: string) => {
        setCode(value.replace(/[^0-9]/g, '').slice(0, 10));
    };

    // Validate form
    const isValid = () => {
        if (!name.trim()) return false;
        if (!isEdit && (!code || !codeValid)) return false;
        return true;
    };

    const handleStoreFeatureToggle = (feature: keyof CompanyFeatures, value: boolean) => {
        setStoreFeatures(prev => {
            const updated = { ...prev, [feature]: value };
            if (feature === 'spacesEnabled' && value) updated.peopleEnabled = false;
            else if (feature === 'peopleEnabled' && value) updated.spacesEnabled = false;
            if (feature === 'conferenceEnabled' && !value) updated.simpleConferenceMode = false;
            return updated;
        });
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!isValid()) return;

        setSubmitting(true);
        setError(null);

        try {
            if (isEdit && store) {
                // Update store
                const updateData: UpdateStoreDto = {
                    name: name.trim(),
                    timezone,
                    syncEnabled,
                    isActive,
                    storeFeatures: overrideEnabled ? storeFeatures : null,
                    storeSpaceType: overrideEnabled ? storeSpaceType : null,
                };
                console.log('[StoreDialog] Updating store:', store.id, updateData);
                await companyService.updateStore(store.id, updateData);
            } else {
                // Create store
                const createData: CreateStoreDto = {
                    name: name.trim(),
                    code: code.trim(),
                    timezone,
                    syncEnabled
                };
                console.log('[StoreDialog] Creating store for company:', companyId, createData);
                const result = await companyService.createStore(companyId, createData);
                console.log('[StoreDialog] Create result:', result);
            }

            console.log('[StoreDialog] Calling onSave callback');
            onSave();
        } catch (err: any) {
            console.error('[StoreDialog] Failed to save store:', err);
            console.error('[StoreDialog] Error response:', err.response?.data);
            setError(err.response?.data?.message || t('settings.stores.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={submitting ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle>
                {isEdit 
                    ? t('settings.stores.editTitle')
                    : t('settings.stores.createTitle')}
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Code (only editable on create) */}
                    <TextField
                        label={t('settings.stores.codeLabel')}
                        value={code}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        disabled={isEdit}
                        required={!isEdit}
                        error={!!codeError}
                        helperText={
                            codeError ||
                            t('settings.stores.codeHelp')
                        }
                        InputProps={{
                            endAdornment: code && (
                                <InputAdornment position="end">
                                    {codeValidating ? (
                                        <CircularProgress size={20} />
                                    ) : codeValid === true ? (
                                        <CheckCircleIcon color="success" />
                                    ) : codeValid === false ? (
                                        <ErrorIcon color="error" />
                                    ) : null}
                                </InputAdornment>
                            )
                        }}
                        inputProps={{ 
                            maxLength: 10,
                            style: { fontFamily: 'monospace' }
                        }}
                    />

                    {/* Name */}
                    <TextField
                        label={t('settings.stores.nameLabel')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        inputProps={{ maxLength: 100 }}
                        placeholder={t('settings.stores.namePlaceholder')}
                    />

                    {/* Timezone */}
                    <Autocomplete
                        value={timezone}
                        onChange={(_, newValue) => setTimezone(newValue || 'UTC')}
                        options={TIMEZONES}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t('settings.stores.timezoneLabel')}
                                helperText={t('settings.stores.timezoneHelp')}
                            />
                        )}
                        freeSolo
                        disableClearable
                    />

                    {/* Sync Enabled */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={syncEnabled}
                                onChange={(e) => setSyncEnabled(e.target.checked)}
                            />
                        }
                        label={t('settings.stores.syncEnabledLabel')}
                    />

                    {/* Active Status (only in edit mode) */}
                    {isEdit && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                            }
                            label={t('settings.stores.activeLabel')}
                        />
                    )}

                    {/* Feature Override Section (edit mode only) */}
                    {isEdit && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={overrideEnabled}
                                        onChange={(e) => setOverrideEnabled(e.target.checked)}
                                    />
                                }
                                label={t('settings.stores.overrideCompanyFeatures', 'Override Company Features')}
                            />
                            {!overrideEnabled && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    {t('settings.stores.inheritingFromCompany', 'Inheriting features from company defaults')}
                                </Alert>
                            )}
                            {overrideEnabled && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>{t('settings.companies.spaceTypeLabel', 'Space Type')}</InputLabel>
                                        <Select
                                            value={storeSpaceType}
                                            label={t('settings.companies.spaceTypeLabel', 'Space Type')}
                                            onChange={(e) => setStoreSpaceType(e.target.value as SpaceType)}
                                        >
                                            <MenuItem value="office">{t('settings.offices')}</MenuItem>
                                            <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                                            <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                                            <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Typography variant="caption" color="text.secondary">
                                        {t('settings.companies.enabledFeatures', 'Enabled Features')}
                                    </Typography>

                                    {/* Spaces / People — single toggle with mode selector */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={storeFeatures.spacesEnabled || storeFeatures.peopleEnabled}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            handleStoreFeatureToggle('peopleEnabled', true);
                                                        } else {
                                                            handleStoreFeatureToggle('spacesEnabled', false);
                                                            handleStoreFeatureToggle('peopleEnabled', false);
                                                        }
                                                    }}
                                                    size="small"
                                                />
                                            }
                                            label={t('settings.companies.spacesOrPeopleLabel', 'Spaces / People')}
                                            sx={{ minWidth: 160 }}
                                        />
                                        {(storeFeatures.spacesEnabled || storeFeatures.peopleEnabled) && (
                                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                                <Select
                                                    value={storeFeatures.spacesEnabled ? 'spaces' : 'people'}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'spaces') {
                                                            handleStoreFeatureToggle('spacesEnabled', true);
                                                        } else {
                                                            handleStoreFeatureToggle('peopleEnabled', true);
                                                        }
                                                    }}
                                                >
                                                    <MenuItem value="spaces">{t('navigation.spaces')}</MenuItem>
                                                    <MenuItem value="people">{t('navigation.people')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    </Box>

                                    {/* Conference — single toggle with mode selector */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={storeFeatures.conferenceEnabled}
                                                    onChange={(e) => handleStoreFeatureToggle('conferenceEnabled', e.target.checked)}
                                                    size="small"
                                                />
                                            }
                                            label={t('navigation.conference')}
                                            sx={{ minWidth: 160 }}
                                        />
                                        {storeFeatures.conferenceEnabled && (
                                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                                <Select
                                                    value={storeFeatures.simpleConferenceMode ? 'simple' : 'standard'}
                                                    onChange={(e) => handleStoreFeatureToggle('simpleConferenceMode', e.target.value === 'simple')}
                                                >
                                                    <MenuItem value="standard">{t('settings.companies.conferenceStandard', 'Standard')}</MenuItem>
                                                    <MenuItem value="simple">{t('settings.companies.conferenceSimple', 'Simple')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        )}
                                    </Box>

                                    <FormControlLabel
                                        control={<Switch checked={storeFeatures.labelsEnabled} onChange={(e) => handleStoreFeatureToggle('labelsEnabled', e.target.checked)} size="small" />}
                                        label={t('labels.title')}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || !isValid()}
                    startIcon={submitting ? <CircularProgress size={16} /> : null}
                >
                    {isEdit ? t('common.save') : t('common.create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default StoreDialog;
