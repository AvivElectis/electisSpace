/**
 * EditCompanyTabs - Edit mode with Basic Info and Features tabs
 * AIMS configuration is accessed via the unified AIMSSettingsDialog
 */
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    Tabs,
    Tab,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stack,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import TuneIcon from '@mui/icons-material/Tune';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';

const AIMSSettingsDialog = lazy(() => import('../AIMSSettingsDialog'));

function TabPanel({ children, value, index }: { children?: React.ReactNode; index: number; value: number }) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

type State = ReturnType<typeof useCompanyDialogState>;

interface Props {
    state: State;
    onClose: () => void;
}

export function EditCompanyTabs({ state, onClose }: Props) {
    const { t } = useTranslation();
    const [aimsDialogOpen, setAimsDialogOpen] = useState(false);

    return (
        <>
            <DialogTitle>{t('settings.companies.editTitle')}</DialogTitle>
            <DialogContent dividers>
                {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => state.setError(null)}>
                        {state.error}
                    </Alert>
                )}
                <Tabs
                    value={state.activeTab}
                    onChange={(_, newValue) => state.setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant="fullWidth"
                >
                    <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.basicInfo')} sx={{ minHeight: 48 }} />
                    <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.featuresTab', 'Features')} sx={{ minHeight: 48 }} />
                </Tabs>

                {/* Basic Info Tab */}
                <TabPanel value={state.activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={state.code}
                            disabled
                            inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
                        />
                        <TextField
                            label={t('settings.companies.nameLabel')}
                            value={state.name}
                            onChange={(e) => state.setName(e.target.value)}
                            required
                            inputProps={{ maxLength: 100 }}
                        />
                        <TextField
                            label={t('settings.companies.locationLabel')}
                            value={state.location}
                            onChange={(e) => state.setLocation(e.target.value)}
                            placeholder={t('settings.companies.locationPlaceholder')}
                            inputProps={{ maxLength: 255 }}
                        />
                        <TextField
                            label={t('settings.companies.descriptionLabel')}
                            value={state.description}
                            onChange={(e) => state.setDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder={t('settings.companies.descriptionPlaceholder')}
                        />
                        <FormControlLabel
                            control={<Switch checked={state.isActive} onChange={(e) => state.setIsActive(e.target.checked)} />}
                            label={t('settings.companies.activeLabel')}
                        />

                        {/* AIMS Settings Quick Access */}
                        <Divider />
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" gap={1}>
                                <CloudIcon fontSize="small" color={state.isConnected ? 'success' : 'disabled'} />
                                <Typography variant="body2">
                                    {t('settings.aims.dialogTitle', 'AIMS Settings')}
                                </Typography>
                                {state.isConnected ? (
                                    <Chip label={t('settings.companies.connectedToAims')} size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} />
                                ) : state.company?.aimsConfigured ? (
                                    <Chip label={t('settings.companies.aimsConfigured')} size="small" color="warning" variant="outlined" />
                                ) : (
                                    <Chip label={t('settings.companies.aimsNotConfigured')} size="small" variant="outlined" icon={<CloudOffIcon />} />
                                )}
                            </Stack>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CloudIcon />}
                                onClick={() => setAimsDialogOpen(true)}
                            >
                                {t('settings.aims.configure', 'Configure')}
                            </Button>
                        </Stack>
                    </Box>
                </TabPanel>

                {/* Features Tab */}
                <TabPanel value={state.activeTab} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>{t('settings.companies.spaceTypeLabel', 'Space Type')}</InputLabel>
                            <Select
                                value={state.spaceType}
                                label={t('settings.companies.spaceTypeLabel', 'Space Type')}
                                onChange={(e) => state.setSpaceType(e.target.value as any)}
                            >
                                <MenuItem value="office">{t('settings.offices')}</MenuItem>
                                <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                                <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                                <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
                            </Select>
                        </FormControl>

                        <Divider />

                        <Typography variant="subtitle2">{t('settings.companies.enabledFeatures', 'Enabled Features')}</Typography>

                        {/* Spaces / People — single toggle with mode selector */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={state.companyFeatures.spacesEnabled || state.companyFeatures.peopleEnabled}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                state.handleFeatureToggle('peopleEnabled', true);
                                            } else {
                                                state.handleFeatureToggle('spacesEnabled', false);
                                                state.handleFeatureToggle('peopleEnabled', false);
                                            }
                                        }}
                                    />
                                }
                                label={t('settings.companies.spacesOrPeopleLabel', 'Spaces / People')}
                                sx={{ minWidth: 180 }}
                            />
                            {(state.companyFeatures.spacesEnabled || state.companyFeatures.peopleEnabled) && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <Select
                                        value={state.companyFeatures.spacesEnabled ? 'spaces' : 'people'}
                                        onChange={(e) => {
                                            if (e.target.value === 'spaces') {
                                                state.handleFeatureToggle('spacesEnabled', true);
                                            } else {
                                                state.handleFeatureToggle('peopleEnabled', true);
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
                                        checked={state.companyFeatures.conferenceEnabled}
                                        onChange={(e) => state.handleFeatureToggle('conferenceEnabled', e.target.checked)}
                                    />
                                }
                                label={t('navigation.conference')}
                                sx={{ minWidth: 180 }}
                            />
                            {state.companyFeatures.conferenceEnabled && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <Select
                                        value={state.companyFeatures.simpleConferenceMode ? 'simple' : 'standard'}
                                        onChange={(e) => state.handleFeatureToggle('simpleConferenceMode', e.target.value === 'simple')}
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
                                    checked={state.companyFeatures.labelsEnabled}
                                    onChange={(e) => state.handleFeatureToggle('labelsEnabled', e.target.checked)}
                                />
                            }
                            label={t('labels.title')}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.companyFeatures.aimsManagementEnabled}
                                    onChange={(e) => state.handleFeatureToggle('aimsManagementEnabled', e.target.checked)}
                                />
                            }
                            label={t('settings.companies.aimsManagement', 'AIMS Management')}
                        />
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={state.submitting}>{t('common.cancel')}</Button>
                <Button variant="contained" onClick={state.handleEditSubmit} disabled={state.submitting || !state.isEditValid()} startIcon={state.submitting ? <CircularProgress size={16} /> : null}>
                    {t('common.save')}
                </Button>
            </DialogActions>

            {/* AIMS Settings Dialog */}
            {state.company && (
                <Suspense fallback={null}>
                    {aimsDialogOpen && (
                        <AIMSSettingsDialog
                            open={true}
                            onClose={() => setAimsDialogOpen(false)}
                            company={state.company}
                        />
                    )}
                </Suspense>
            )}
        </>
    );
}
