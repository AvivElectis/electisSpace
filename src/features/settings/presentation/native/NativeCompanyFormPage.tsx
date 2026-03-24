/**
 * NativeCompanyFormPage — Create/edit company.
 * Create mode: 2-step wizard (basic info, then features).
 * Edit mode: chip tabs — Details, Features, Stores.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Alert,
    FormControlLabel,
    Switch,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Chip,
    LinearProgress,
    CircularProgress,
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';

import { companyService, type Company, type CompanyStore } from '@shared/infrastructure/services/companyService';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';
import { DEFAULT_COMPANY_FEATURES } from '@shared/infrastructure/services/authService';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativePage } from '@shared/presentation/native/NativePage';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';
import { useAuthContext } from '@features/auth/application/useAuthContext';

type EditTab = 'details' | 'features' | 'stores';

export function NativeCompanyFormPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin } = useAuthContext();

    const isEditMode = !!id;
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(isEditMode);

    // Wizard step for create mode
    const [wizardStep, setWizardStep] = useState(0);
    // Edit mode tabs
    const [editTab, setEditTab] = useState<EditTab>('details');

    // Details fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');

    // Features
    const [features, setFeatures] = useState<CompanyFeatures>({ ...DEFAULT_COMPANY_FEATURES });
    const [spaceType, setSpaceType] = useState<SpaceType>('office');

    // Stores (edit mode only)
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [storesLoading, setStoresLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useSetNativeTitle(isEditMode ? t('settings.companies.editTitle', 'Edit Company') : t('settings.companies.createTitle'));

    useEffect(() => {
        if (id) {
            setLoading(true);
            companyService.getAll({ limit: 200 })
                .then((resp) => {
                    const found = resp.data.find((c) => c.id === id);
                    if (found) {
                        setCompany(found);
                        setName(found.name);
                        setCode(found.code);
                        setLocation(found.location || '');
                        setDescription(found.description || '');
                        if (found.companyFeatures) {
                            setFeatures(found.companyFeatures);
                        }
                        if (found.spaceType) {
                            setSpaceType(found.spaceType);
                        }
                    }
                })
                .catch(() => setError(t('common.error')))
                .finally(() => setLoading(false));

            // Load stores
            setStoresLoading(true);
            companyService.getStores(id, { limit: 100 })
                .then((resp) => setStores(resp.stores))
                .catch(() => setError(t('common.error')))
                .finally(() => setStoresLoading(false));
        }
    }, [id]);

    const handleFeatureToggle = (key: keyof CompanyFeatures, value: boolean) => {
        setFeatures((prev) => {
            const updated = { ...prev, [key]: value };
            if (key === 'spacesEnabled' && value) updated.peopleEnabled = false;
            else if (key === 'peopleEnabled' && value) updated.spacesEnabled = false;
            if (key === 'conferenceEnabled' && !value) updated.simpleConferenceMode = false;
            return updated;
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t('validation.required', { field: t('settings.companies.name') }));
            return;
        }
        if (!isEditMode && !code.trim()) {
            setError(t('validation.required', { field: t('settings.companies.code') }));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (isEditMode && id) {
                await companyService.update(id, {
                    name: name.trim(),
                    location: location.trim() || undefined,
                    description: description.trim() || undefined,
                    companyFeatures: features,
                    spaceType,
                });
            } else {
                // Basic create (no AIMS wizard on native — AIMS can be configured in desktop)
                await companyService.create({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    location: location.trim() || undefined,
                    description: description.trim() || undefined,
                    companyFeatures: features,
                    spaceType,
                });
            }
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await companyService.delete(id);
            navigate(-1);
        } finally {
            setDeleting(false);
        }
    };

    const SPACE_TYPES: SpaceType[] = ['office', 'room', 'chair', 'person-tag'];
    const spaceTypeLabels: Record<SpaceType, string> = {
        office: t('settings.offices'),
        room: t('settings.rooms'),
        chair: t('settings.chairs'),
        'person-tag': t('settings.personTags'),
    };

    const detailsContent = (
        <NativeFormSection title={t('settings.companies.basicInfo', 'Basic Info')}>
            {!isEditMode && (
                <NativeTextField
                    label={t('settings.companies.code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                    autoFocus={!isEditMode}
                    inputProps={{ maxLength: 10, style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
                />
            )}
            <NativeTextField
                label={t('settings.companies.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={isEditMode}
            />
            <NativeTextField
                label={t('settings.companies.location')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
            />
            <NativeTextField
                label={t('settings.companies.description', 'Description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
            />
        </NativeFormSection>
    );

    const featuresContent = (
        <NativeFormSection title={t('settings.companies.enabledFeatures', 'Features')}>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>{t('settings.companies.spaceTypeLabel', 'Space Type')}</InputLabel>
                <Select
                    value={spaceType}
                    label={t('settings.companies.spaceTypeLabel', 'Space Type')}
                    onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                >
                    {SPACE_TYPES.map((st) => (
                        <MenuItem key={st} value={st}>{spaceTypeLabels[st]}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={features.spacesEnabled || features.peopleEnabled}
                                onChange={(e) => {
                                    if (e.target.checked) handleFeatureToggle('spacesEnabled', true);
                                    else {
                                        handleFeatureToggle('spacesEnabled', false);
                                        handleFeatureToggle('peopleEnabled', false);
                                    }
                                }}
                            />
                        }
                        label={t('settings.companies.spacesOrPeopleLabel', 'Spaces / People')}
                        sx={{ flex: 1, mr: 0 }}
                    />
                    {(features.spacesEnabled || features.peopleEnabled) && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                                value={features.spacesEnabled ? 'spaces' : 'people'}
                                onChange={(e) => {
                                    if (e.target.value === 'spaces') handleFeatureToggle('spacesEnabled', true);
                                    else handleFeatureToggle('peopleEnabled', true);
                                }}
                            >
                                <MenuItem value="spaces">{t('navigation.spaces')}</MenuItem>
                                <MenuItem value="people">{t('navigation.people')}</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={features.conferenceEnabled}
                                onChange={(e) => handleFeatureToggle('conferenceEnabled', e.target.checked)}
                            />
                        }
                        label={t('navigation.conference')}
                        sx={{ flex: 1, mr: 0 }}
                    />
                    {features.conferenceEnabled && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                                value={features.simpleConferenceMode ? 'simple' : 'standard'}
                                onChange={(e) => handleFeatureToggle('simpleConferenceMode', e.target.value === 'simple')}
                            >
                                <MenuItem value="standard">{t('settings.companies.conferenceStandard', 'Standard')}</MenuItem>
                                <MenuItem value="simple">{t('settings.companies.conferenceSimple', 'Simple')}</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={features.labelsEnabled}
                            onChange={(e) => handleFeatureToggle('labelsEnabled', e.target.checked)}
                        />
                    }
                    label={t('labels.title')}
                />
            </Box>
        </NativeFormSection>
    );

    const storesContent = (
        <NativeFormSection title={t('settings.companies.stores')}>
            {storesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : stores.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t('settings.stores.noStores', 'No stores yet')}
                </Typography>
            ) : (
                stores.map((store) => (
                    <NativeCard
                        key={store.id}
                        onClick={() => navigate(`/settings/companies/${id}/stores/${store.id}`)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>{store.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{store.code} · {store.timezone}</Typography>
                            </Box>
                            <Chip
                                label={store.isActive ? t('common.active') : t('common.inactive')}
                                size="small"
                                color={store.isActive ? 'success' : 'default'}
                            />
                        </Box>
                    </NativeCard>
                ))
            )}
            {id && (
                <Box
                    onClick={() => navigate(`/settings/companies/${id}/stores/new`)}
                    sx={{
                        mt: 1,
                        p: 1.5,
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <StoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.stores.createTitle')}
                    </Typography>
                </Box>
            )}
        </NativeFormSection>
    );

    if (loading) {
        return (
            <NativePage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </NativePage>
        );
    }

    if (isEditMode) {
        const editChips = [
            { label: t('settings.companies.details', 'Details'), value: 'details' },
            { label: t('settings.companies.features', 'Features'), value: 'features' },
            { label: t('settings.companies.stores'), value: 'stores' },
        ];

        return (
            <NativeFormPage
                title={t('settings.companies.editTitle', 'Edit Company')}
                onSave={handleSave}
                isSaving={saving}
            >
                {error && (
                    <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                    </Box>
                )}

                <NativeChipBar
                    chips={editChips}
                    activeValue={editTab}
                    onChange={(v) => setEditTab(v as EditTab)}
                />

                <Box sx={{ px: 0 }}>
                    {editTab === 'details' && detailsContent}
                    {editTab === 'features' && featuresContent}
                    {editTab === 'stores' && storesContent}
                </Box>

                {isPlatformAdmin && editTab === 'details' && (
                    <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                        <NativeDeleteButton
                            onDelete={handleDelete}
                            isDeleting={deleting}
                            itemName={company?.name}
                            label={t('settings.companies.delete', 'Delete Company')}
                        />
                    </Box>
                )}
            </NativeFormPage>
        );
    }

    // Create mode — simple 2-step wizard
    const STEPS = [
        t('settings.companies.wizardStep1', 'Company Info'),
        t('settings.companies.wizardStep5', 'Features'),
    ];

    return (
        <NativeFormPage
            title={t('settings.companies.createTitle')}
            onSave={wizardStep < STEPS.length - 1
                ? () => { setWizardStep((p) => p + 1); }
                : handleSave}
            isSaving={saving}
            saveLabel={wizardStep < STEPS.length - 1 ? t('common.next') : t('common.create')}
        >
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            {/* Step progress */}
            <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1, pb: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>{STEPS[wizardStep]}</Typography>
                    <Typography variant="caption" color="text.secondary">{wizardStep + 1} / {STEPS.length}</Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={((wizardStep + 1) / STEPS.length) * 100}
                    sx={{ height: 4, borderRadius: 2 }}
                />
            </Box>

            {wizardStep === 0 && detailsContent}
            {wizardStep === 1 && featuresContent}
        </NativeFormPage>
    );
}
