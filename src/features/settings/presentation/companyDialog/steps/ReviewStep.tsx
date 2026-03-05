/**
 * Wizard Step 6: Review & Create
 * Read-only summary of all previous steps. Sections clickable to jump back.
 */
import {
    Box,
    Typography,
    Paper,
    Chip,
    Stack,
    IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import type { WizardFormData } from '../wizardTypes';

interface ReviewStepProps {
    formData: WizardFormData;
    compassEnabled?: boolean;
    onGoToStep: (step: number) => void;
}

function SectionHeader({ title, step, onGoToStep }: { title: string; step: number; onGoToStep: (s: number) => void }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
            <IconButton size="small" onClick={() => onGoToStep(step)}>
                <EditIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

function FeatureChip({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <Chip
            size="small"
            label={label}
            icon={enabled ? <CheckCircleIcon /> : <CancelIcon />}
            color={enabled ? 'success' : 'default'}
            variant={enabled ? 'filled' : 'outlined'}
        />
    );
}

export function ReviewStep({ formData, compassEnabled, onGoToStep }: ReviewStepProps) {
    const { t } = useTranslation();

    const visibleFieldCount = formData.fieldMapping
        ? Object.values(formData.fieldMapping.fields).filter(f => f.visible).length
        : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                {t('settings.companies.reviewTitle')}
            </Typography>

            {/* Section 1: Company Info */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <SectionHeader title={t('settings.companies.reviewCompanyInfo')} step={0} onGoToStep={onGoToStep} />
                <Stack spacing={0.5}>
                    <Typography variant="body2">
                        <strong>{t('settings.companies.codeLabel')}:</strong> {formData.companyCode}
                    </Typography>
                    <Typography variant="body2">
                        <strong>{t('settings.companies.nameLabel')}:</strong> {formData.companyName}
                    </Typography>
                    {formData.location && (
                        <Typography variant="body2">
                            <strong>{t('settings.companies.locationLabel')}:</strong> {formData.location}
                        </Typography>
                    )}
                    <Typography variant="body2">
                        <strong>{t('settings.companies.aimsCluster')}:</strong> {formData.aimsCluster}
                    </Typography>
                    <Typography variant="body2">
                        <strong>{t('settings.companies.aimsUsername')}:</strong> {formData.aimsUsername}
                    </Typography>
                </Stack>
            </Paper>

            {/* Section 2: Stores */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <SectionHeader title={t('settings.companies.reviewStores')} step={1} onGoToStep={onGoToStep} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {formData.stores.map((store) => (
                        <Chip
                            key={store.code}
                            label={`${store.name} (${store.code}) — ${store.timezone}`}
                            size="small"
                            variant="outlined"
                        />
                    ))}
                </Box>
            </Paper>

            {/* Section 3: Article Format */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <SectionHeader title={t('settings.companies.reviewArticleFormat')} step={2} onGoToStep={onGoToStep} />
                {formData.articleFormat ? (
                    <Typography variant="body2">
                        {t('settings.companies.fileExtension')}: <strong>{formData.articleFormat.fileExtension}</strong>
                        {' · '}
                        {t('settings.companies.delimiter')}: <strong>{formData.articleFormat.delimeter}</strong>
                        {' · '}
                        {t('settings.companies.dataFields')}: <strong>{formData.articleFormat.articleData?.length || 0}</strong>
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                )}
            </Paper>

            {/* Section 4: Field Mapping */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <SectionHeader title={t('settings.companies.reviewFieldMapping')} step={3} onGoToStep={onGoToStep} />
                {formData.fieldMapping ? (
                    <Typography variant="body2">
                        {t('settings.companies.uniqueIdField')}: <strong>{formData.fieldMapping.uniqueIdField}</strong>
                        {' · '}
                        {t('settings.companies.fieldsVisible', { count: visibleFieldCount })}
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        {t('settings.companies.noFieldsConfigured')}
                    </Typography>
                )}
            </Paper>

            {/* Section 5: Features */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <SectionHeader title={t('settings.companies.reviewFeatures')} step={4} onGoToStep={onGoToStep} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <FeatureChip label={t('settings.companies.featureSpaces')} enabled={formData.features.spacesEnabled} />
                    <FeatureChip label={t('settings.companies.featurePeople')} enabled={formData.features.peopleEnabled} />
                    <FeatureChip label={t('settings.companies.featureConference')} enabled={formData.features.conferenceEnabled} />
                    <FeatureChip label={t('settings.companies.featureLabels')} enabled={formData.features.labelsEnabled} />
                    <FeatureChip label={t('settings.companies.featureAims')} enabled={formData.features.aimsManagementEnabled} />
                    <FeatureChip label={t('settings.companies.featureCompass')} enabled={formData.features.compassEnabled} />
                </Box>
            </Paper>

            {/* Section 6: Compass Config (only when enabled) */}
            {compassEnabled && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <SectionHeader title={t('settings.companies.reviewCompassConfig')} step={5} onGoToStep={onGoToStep} />
                    <Stack spacing={0.5}>
                        <Typography variant="body2">
                            <strong>{t('settings.companies.compassMaxDuration')}:</strong>{' '}
                            {formData.compassConfig.maxDurationMinutes} {t('settings.companies.compassMinutes')}
                        </Typography>
                        <Typography variant="body2">
                            <strong>{t('settings.companies.compassMaxAdvance')}:</strong>{' '}
                            {formData.compassConfig.maxAdvanceBookingDays} {t('settings.companies.compassDays')}
                        </Typography>
                        <Typography variant="body2">
                            <strong>{t('settings.companies.compassCheckInWindow')}:</strong>{' '}
                            {formData.compassConfig.checkInWindowMinutes} {t('settings.companies.compassMinutes')}
                        </Typography>
                        <Typography variant="body2">
                            <strong>{t('settings.companies.compassAutoRelease')}:</strong>{' '}
                            {formData.compassConfig.autoReleaseMinutes} {t('settings.companies.compassMinutes')}
                        </Typography>
                        <Typography variant="body2">
                            <strong>{t('settings.companies.compassMaxConcurrent')}:</strong>{' '}
                            {formData.compassConfig.maxConcurrentBookings} {t('settings.companies.compassBookings')}
                        </Typography>
                    </Stack>
                </Paper>
            )}

            {/* Section 7: Building Hierarchy (only when enabled) */}
            {compassEnabled && formData.buildings.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <SectionHeader title={t('settings.companies.reviewBuildings')} step={6} onGoToStep={onGoToStep} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {formData.buildings.map((building) => (
                            <Chip
                                key={building.name}
                                label={`${building.name} (${t('settings.companies.floorCount', { count: building.floors.length })})`}
                                size="small"
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
