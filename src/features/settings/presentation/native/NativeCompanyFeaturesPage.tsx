/**
 * NativeCompanyFeaturesPage — Feature toggles for a company.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Alert, FormControlLabel, Switch, MenuItem, Select, FormControl, InputLabel, CircularProgress } from '@mui/material';

import { companyService } from '@shared/infrastructure/services/companyService';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';
import { DEFAULT_COMPANY_FEATURES } from '@shared/infrastructure/services/authService';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativePage } from '@shared/presentation/native/NativePage';
import { nativeSpacing } from '@shared/presentation/themes/nativeTokens';

export function NativeCompanyFeaturesPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [features, setFeatures] = useState<CompanyFeatures>({ ...DEFAULT_COMPANY_FEATURES });
    const [spaceType, setSpaceType] = useState<SpaceType>('office');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            companyService.getAll({ limit: 200 })
                .then((resp) => {
                    const found = resp.data.find((c) => c.id === id);
                    if (found) {
                        if (found.companyFeatures) setFeatures(found.companyFeatures);
                        if (found.spaceType) setSpaceType(found.spaceType);
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
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
        if (!id) return;
        setSaving(true);
        setError(null);
        try {
            await companyService.update(id, { companyFeatures: features, spaceType });
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <NativePage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </NativePage>
        );
    }

    return (
        <NativeFormPage
            title={t('settings.companies.features', 'Features')}
            onSave={handleSave}
            isSaving={saving}
        >
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            <NativeFormSection title={t('settings.companies.enabledFeatures', 'Enabled Features')}>
                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                    <InputLabel>{t('settings.companies.spaceTypeLabel', 'Space Type')}</InputLabel>
                    <Select
                        value={spaceType}
                        label={t('settings.companies.spaceTypeLabel', 'Space Type')}
                        onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                    >
                        <MenuItem value="office">{t('settings.offices')}</MenuItem>
                        <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                        <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                        <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
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
        </NativeFormPage>
    );
}
