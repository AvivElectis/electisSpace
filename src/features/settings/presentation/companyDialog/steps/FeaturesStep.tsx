/**
 * Wizard Step 5: Feature Selection
 * All features disabled by default. User enables what they need.
 */
import {
    Box,
    Typography,
    Switch,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Paper,
    Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';

interface FeaturesStepProps {
    features: CompanyFeatures;
    spaceType: SpaceType;
    hasConferenceMapping: boolean;
    onUpdate: (features: CompanyFeatures, spaceType: SpaceType) => void;
}

export function FeaturesStep({
    features,
    spaceType,
    hasConferenceMapping,
    onUpdate,
}: FeaturesStepProps) {
    const { t } = useTranslation();

    const handleToggle = (key: keyof CompanyFeatures, value: boolean) => {
        const updated = { ...features, [key]: value };

        // Enforce mutual exclusivity
        if (key === 'spacesEnabled' && value) {
            updated.peopleEnabled = false;
        } else if (key === 'peopleEnabled' && value) {
            updated.spacesEnabled = false;
        }
        // Disable simple mode if conference is off
        if (key === 'conferenceEnabled' && !value) {
            updated.simpleConferenceMode = false;
        }
        // Compass locks spaces, people, and conference
        if (key === 'compassEnabled' && value) {
            updated.spacesEnabled = false;
            updated.peopleEnabled = false;
            updated.conferenceEnabled = false;
            updated.simpleConferenceMode = false;
        }

        onUpdate(updated, spaceType);
    };

    const handleSpaceTypeChange = (value: SpaceType) => {
        onUpdate(features, value);
    };

    const featureCards = [
        {
            key: 'spacesEnabled' as const,
            label: t('settings.companies.featureSpaces'),
            desc: t('settings.companies.featureSpacesDesc'),
            enabled: features.spacesEnabled,
        },
        {
            key: 'peopleEnabled' as const,
            label: t('settings.companies.featurePeople'),
            desc: t('settings.companies.featurePeopleDesc'),
            enabled: features.peopleEnabled,
        },
        {
            key: 'conferenceEnabled' as const,
            label: t('settings.companies.featureConference'),
            desc: t('settings.companies.featureConferenceDesc'),
            enabled: features.conferenceEnabled,
        },
        {
            key: 'labelsEnabled' as const,
            label: t('settings.companies.featureLabels'),
            desc: t('settings.companies.featureLabelsDesc'),
            enabled: features.labelsEnabled,
        },
        {
            key: 'aimsManagementEnabled' as const,
            label: t('settings.companies.featureAims'),
            desc: t('settings.companies.featureAimsDesc'),
            enabled: features.aimsManagementEnabled,
        },
        {
            key: 'compassEnabled' as const,
            label: t('settings.companies.featureCompass'),
            desc: t('settings.companies.featureCompassDesc'),
            enabled: features.compassEnabled,
        },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" variant="outlined">
                {t('settings.companies.allFeaturesDisabled')}
            </Alert>

            {/* Space Type */}
            <FormControl fullWidth size="small">
                <InputLabel>{t('settings.companies.spaceTypeLabel')}</InputLabel>
                <Select
                    value={spaceType}
                    label={t('settings.companies.spaceTypeLabel')}
                    onChange={(e) => handleSpaceTypeChange(e.target.value as SpaceType)}
                >
                    <MenuItem value="office">{t('settings.offices')}</MenuItem>
                    <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                    <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                    <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
                </Select>
            </FormControl>

            {/* Feature cards */}
            <Stack spacing={1}>
                {featureCards.map((card) => (
                    <Paper key={card.key} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={card.enabled}
                                            onChange={(e) => handleToggle(card.key, e.target.checked)}
                                            size="small"
                                            disabled={
                                                features.compassEnabled &&
                                                ['spacesEnabled', 'peopleEnabled', 'conferenceEnabled'].includes(card.key)
                                            }
                                        />
                                    }
                                    label={
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {card.label}
                                        </Typography>
                                    }
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ms: 5.5 }}>
                                    {card.desc}
                                </Typography>

                                {/* Conference mode selector */}
                                {card.key === 'conferenceEnabled' && card.enabled && (
                                    <Box sx={{ ms: 5.5, mt: 1 }}>
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <Select
                                                value={features.simpleConferenceMode ? 'simple' : 'full'}
                                                onChange={(e) => handleToggle('simpleConferenceMode', e.target.value === 'simple')}
                                            >
                                                <MenuItem value="full">{t('settings.companies.conferenceModeFull')}</MenuItem>
                                                <MenuItem value="simple">{t('settings.companies.conferenceModeSimple')}</MenuItem>
                                            </Select>
                                        </FormControl>
                                        {!hasConferenceMapping && (
                                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                                                {t('settings.companies.requiresConferenceMapping')}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                ))}
            </Stack>

            {/* Mutual exclusivity warning */}
            {features.spacesEnabled && features.peopleEnabled && (
                <Alert severity="warning">{t('settings.companies.mutualExclusiveWarning')}</Alert>
            )}
        </Box>
    );
}
