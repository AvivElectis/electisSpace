/**
 * EditCompanyTabs - Edit mode with 5 tabs matching wizard sections:
 * 1. Basic Info (company details + AIMS connection)
 * 2. Stores (existing store list, link to StoresDialog)
 * 3. Article Format (display saved format, re-fetch from AIMS)
 * 4. Field Mapping (editable field mapping with save)
 * 5. Features (space type + feature toggles)
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
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Autocomplete,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TuneIcon from '@mui/icons-material/Tune';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { companyService, type CompanyStore } from '@shared/infrastructure/services/companyService';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [aimsDialogOpen, setAimsDialogOpen] = useState(false);

    // Stores tab state
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [storesLoading, setStoresLoading] = useState(false);

    // Article format tab state
    const [articleFormat, setArticleFormat] = useState<ArticleFormat | null>(null);
    const [articleFormatLoading, setArticleFormatLoading] = useState(false);
    const [articleFormatError, setArticleFormatError] = useState<string | null>(null);

    // Field mapping tab state
    const [fieldMapping, setFieldMapping] = useState<SolumMappingConfig | null>(null);
    const [fieldMappingSaving, setFieldMappingSaving] = useState(false);
    const [fieldMappingSaved, setFieldMappingSaved] = useState(false);

    // Fetch stores + settings on open
    useEffect(() => {
        if (!state.company?.id) return;
        const companyId = state.company.id;

        // Fetch stores
        setStoresLoading(true);
        companyService.getStores(companyId)
            .then(res => setStores(res.stores))
            .catch(() => {})
            .finally(() => setStoresLoading(false));

        // Fetch company settings (article format + field mapping)
        settingsService.getCompanySettings(companyId)
            .then(res => {
                if (res.settings.solumArticleFormat) {
                    setArticleFormat(res.settings.solumArticleFormat);
                }
                if (res.settings.solumMappingConfig) {
                    setFieldMapping(res.settings.solumMappingConfig);
                }
            })
            .catch(() => {});
    }, [state.company?.id]);

    // Re-fetch article format from AIMS
    const handleRefetchArticleFormat = useCallback(async () => {
        if (!state.company) return;
        setArticleFormatLoading(true);
        setArticleFormatError(null);
        try {
            const result = await companyService.fetchArticleFormat({
                baseUrl: state.company.aimsBaseUrl || '',
                cluster: state.company.aimsCluster || 'c1',
                username: state.company.aimsUsername || '',
                password: '', // Server will use stored password
                companyCode: state.company.code,
            });
            if (result.success && result.format) {
                setArticleFormat(result.format);
                // Save to company settings
                await settingsService.updateCompanySettings(state.company.id, {
                    solumArticleFormat: result.format,
                });
            } else {
                setArticleFormatError(result.error || t('settings.companies.articleFormatError'));
            }
        } catch (err: any) {
            setArticleFormatError(err.response?.data?.message || t('settings.companies.articleFormatError'));
        } finally {
            setArticleFormatLoading(false);
        }
    }, [state.company, t]);

    // Save field mapping
    const handleSaveFieldMapping = useCallback(async () => {
        if (!state.company?.id || !fieldMapping) return;
        setFieldMappingSaving(true);
        try {
            await settingsService.updateCompanySettings(state.company.id, {
                solumMappingConfig: fieldMapping,
            });
            setFieldMappingSaved(true);
            setTimeout(() => setFieldMappingSaved(false), 2000);
        } catch {
            state.setError(t('settings.companies.saveError'));
        } finally {
            setFieldMappingSaving(false);
        }
    }, [state.company?.id, fieldMapping, state, t]);

    // Field mapping helpers
    const articleDataFields = articleFormat?.articleData || [];

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
                    variant={isMobile ? 'scrollable' : 'fullWidth'}
                    scrollButtons={isMobile ? 'auto' : false}
                >
                    <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.basicInfo')} sx={{ minHeight: 48 }} />
                    <Tab icon={<StoreIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewStores', 'Stores')} sx={{ minHeight: 48 }} />
                    <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewArticleFormat', 'Article Format')} sx={{ minHeight: 48 }} />
                    <Tab icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewFieldMapping', 'Field Mapping')} sx={{ minHeight: 48 }} />
                    <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.featuresTab', 'Features')} sx={{ minHeight: 48 }} />
                </Tabs>

                {/* Tab 0: Basic Info */}
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

                {/* Tab 1: Stores */}
                <TabPanel value={state.activeTab} index={1}>
                    {storesLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : stores.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noStoresYet', 'No stores configured yet.')}
                        </Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('settings.companies.codeLabel')}</TableCell>
                                        <TableCell>{t('settings.companies.nameLabel')}</TableCell>
                                        <TableCell>{t('settings.companies.storeTimezone')}</TableCell>
                                        <TableCell align="center">{t('settings.companies.activeLabel')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stores.map((store) => (
                                        <TableRow key={store.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{store.code}</Typography>
                                            </TableCell>
                                            <TableCell>{store.name}</TableCell>
                                            <TableCell>{store.timezone}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    size="small"
                                                    label={store.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                                    color={store.isActive ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('settings.companies.storesManageHint', 'Use the Stores dialog from the settings page to add, edit, or remove stores.')}
                    </Typography>
                </TabPanel>

                {/* Tab 2: Article Format */}
                <TabPanel value={state.activeTab} index={2}>
                    {articleFormatError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setArticleFormatError(null)}>
                            {articleFormatError}
                        </Alert>
                    )}
                    {articleFormat ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.fileExtension')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.fileExtension}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.delimiter')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.delimeter || '—'}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.dataFields')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.articleData?.length || 0}</Typography>
                                </Paper>
                            </Stack>

                            {articleFormat.articleBasicInfo && articleFormat.articleBasicInfo.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('settings.companies.basicInfoFields')}</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {articleFormat.articleBasicInfo.map((f) => (
                                            <Chip key={f} label={f} size="small" variant="outlined" />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {articleFormat.articleData && articleFormat.articleData.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('settings.companies.dataFields')}</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {articleFormat.articleData.map((f) => (
                                            <Chip key={f} label={f} size="small" />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noArticleFormat', 'No article format stored. Fetch from AIMS to configure.')}
                        </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={articleFormatLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={handleRefetchArticleFormat}
                            disabled={articleFormatLoading || !state.company?.aimsConfigured}
                        >
                            {articleFormatLoading
                                ? t('settings.companies.fetchingArticleFormat')
                                : t('settings.companies.refetchArticleFormat', 'Re-fetch from AIMS')}
                        </Button>
                    </Box>
                </TabPanel>

                {/* Tab 3: Field Mapping */}
                <TabPanel value={state.activeTab} index={3}>
                    {fieldMapping ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Unique ID field */}
                            <Autocomplete
                                size="small"
                                options={articleDataFields}
                                value={fieldMapping.uniqueIdField || ''}
                                onChange={(_, value) => {
                                    setFieldMapping(prev => prev ? { ...prev, uniqueIdField: value || '' } : prev);
                                    setFieldMappingSaved(false);
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label={t('settings.companies.uniqueIdField')} />
                                )}
                            />

                            {/* Field table */}
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('settings.companies.aimsField')}</TableCell>
                                            <TableCell>{t('settings.companies.displayName')}</TableCell>
                                            <TableCell align="center">{t('settings.companies.visible')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(fieldMapping.fields).map(([key, field]) => (
                                            <TableRow key={key}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>{key}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        variant="standard"
                                                        value={field.friendlyNameEn}
                                                        onChange={(e) => {
                                                            setFieldMapping(prev => {
                                                                if (!prev) return prev;
                                                                return {
                                                                    ...prev,
                                                                    fields: {
                                                                        ...prev.fields,
                                                                        [key]: { ...field, friendlyNameEn: e.target.value },
                                                                    },
                                                                };
                                                            });
                                                            setFieldMappingSaved(false);
                                                        }}
                                                        fullWidth
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={field.visible}
                                                        onChange={(e) => {
                                                            setFieldMapping(prev => {
                                                                if (!prev) return prev;
                                                                return {
                                                                    ...prev,
                                                                    fields: {
                                                                        ...prev.fields,
                                                                        [key]: { ...field, visible: e.target.checked },
                                                                    },
                                                                };
                                                            });
                                                            setFieldMappingSaved(false);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Conference mapping */}
                            {fieldMapping.conferenceMapping && (
                                <>
                                    <Typography variant="subtitle2">{t('settings.companies.conferenceMappingTitle')}</Typography>
                                    <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.meetingName || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, meetingName: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.meetingNameField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.meetingTime || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, meetingTime: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.meetingTimeField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.participants || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, participants: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.participantsField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                    </Stack>
                                </>
                            )}

                            {/* Save mapping button */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                {fieldMappingSaved && (
                                    <Chip label={t('common.saved', 'Saved')} color="success" size="small" icon={<CheckCircleIcon />} />
                                )}
                                <Button
                                    variant="outlined"
                                    startIcon={fieldMappingSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                    onClick={handleSaveFieldMapping}
                                    disabled={fieldMappingSaving}
                                >
                                    {t('settings.companies.saveFieldMapping', 'Save Mapping')}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noFieldsConfigured')}
                        </Typography>
                    )}
                </TabPanel>

                {/* Tab 4: Features */}
                <TabPanel value={state.activeTab} index={4}>
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
