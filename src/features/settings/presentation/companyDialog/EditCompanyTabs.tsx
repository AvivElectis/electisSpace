/**
 * EditCompanyTabs - Edit mode with Basic Info and AIMS Config tabs
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
    IconButton,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';

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
                    <Tab icon={<CloudIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.aimsConfig')} sx={{ minHeight: 48 }} />
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
                    </Box>
                </TabPanel>

                {/* AIMS Config Tab */}
                <TabPanel value={state.activeTab} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {state.isConnected ? (
                            <Alert severity="success" sx={{ mb: 1 }}>{t('settings.companies.connectedToAims')}</Alert>
                        ) : (
                            <Alert severity="info" sx={{ mb: 1 }}>{t('settings.companies.aimsConfigInfo')}</Alert>
                        )}
                        <FormControl fullWidth disabled={state.isConnected}>
                            <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                            <Select
                                value={state.aimsCluster || 'c1'}
                                label={t('settings.companies.aimsCluster')}
                                onChange={(e) => {
                                    const cluster = e.target.value;
                                    state.handleAimsFieldChange(state.setAimsCluster)(cluster);
                                    const baseUrl = cluster === 'common' ? 'https://eu.common.solumesl.com/common' : 'https://eu.common.solumesl.com/c1/common';
                                    state.handleAimsFieldChange(state.setAimsBaseUrl)(baseUrl);
                                }}
                            >
                                <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                                <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label={t('settings.companies.aimsBaseUrl')} value={state.aimsBaseUrl} disabled helperText={t('settings.companies.aimsBaseUrlHelp')} />
                        <TextField
                            label={t('settings.companies.aimsUsername')}
                            value={state.aimsUsername}
                            onChange={(e) => state.handleAimsFieldChange(state.setAimsUsername)(e.target.value)}
                            placeholder="admin@company.com"
                            disabled={state.isConnected}
                        />
                        <Box sx={{ display: 'flex', flexDirection: state.isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.companies.aimsPassword')}
                                type={state.showPassword ? 'text' : 'password'}
                                value={state.aimsPassword}
                                onChange={(e) => state.handleAimsFieldChange(state.setAimsPassword)(e.target.value)}
                                placeholder={t('settings.companies.aimsPasswordPlaceholder')}
                                sx={{ flex: 1 }}
                                disabled={state.isConnected}
                            />
                            <IconButton
                                onClick={() => state.setShowPassword(!state.showPassword)}
                                disabled={state.isConnected}
                                sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, width: 40, height: 40 }}
                            >
                                {state.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                        </Box>
                        {state.company && (
                            <>
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {state.isConnected ? (
                                            <>
                                                <CheckCircleIcon color="success" fontSize="small" />
                                                <Typography variant="body2" color="success.main">{t('settings.companies.connectedToAims')}</Typography>
                                            </>
                                        ) : state.company.aimsConfigured ? (
                                            <>
                                                <ErrorIcon color="warning" fontSize="small" />
                                                <Typography variant="body2" color="warning.main">{t('settings.companies.aimsConfigured')}</Typography>
                                            </>
                                        ) : (
                                            <>
                                                <ErrorIcon color="warning" fontSize="small" />
                                                <Typography variant="body2" color="warning.main">{t('settings.companies.aimsNotConfigured')}</Typography>
                                            </>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {state.isConnected && (
                                            <Button size="small" variant="outlined" color="warning" startIcon={<LinkOffIcon />} onClick={state.handleDisconnect}>
                                                {t('settings.companies.disconnect')}
                                            </Button>
                                        )}
                                        {!state.isConnected && (state.company.aimsConfigured || (state.aimsBaseUrl && state.aimsCluster && state.aimsUsername)) && (
                                            <Button
                                                size="small" variant="outlined"
                                                startIcon={state.testingConnection ? <CircularProgress size={14} /> : <RefreshIcon />}
                                                onClick={state.handleTestConnection}
                                                disabled={state.testingConnection}
                                            >
                                                {state.aimsChanged ? t('settings.companies.saveAndTest') : t('settings.companies.testConnection')}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                                {state.connectionTestResult && (
                                    <Alert severity={state.connectionTestResult.success ? 'success' : 'error'} sx={{ mt: 1 }} onClose={() => state.setConnectionTestResult(null)}>
                                        {state.connectionTestResult.message}
                                    </Alert>
                                )}
                                {state.aimsChanged && !state.isConnected && (
                                    <Alert severity="info" sx={{ mt: 1 }}>{t('settings.companies.aimsChangesPending')}</Alert>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={state.submitting}>{t('common.cancel')}</Button>
                <Button variant="contained" onClick={state.handleEditSubmit} disabled={state.submitting || !state.isEditValid()} startIcon={state.submitting ? <CircularProgress size={16} /> : null}>
                    {t('common.save')}
                </Button>
            </DialogActions>
        </>
    );
}
