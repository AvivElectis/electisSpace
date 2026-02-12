/**
 * CreateCompanyWizard - 2-step wizard for creating companies
 * Step 1: Company code + AIMS credentials → Connect
 * Step 2: Pick store from AIMS + company details
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
    InputAdornment,
    IconButton,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stepper,
    Step,
    StepLabel,
    Checkbox,
    Chip,
    Paper,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import BusinessIcon from '@mui/icons-material/Business';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';

type State = ReturnType<typeof useCompanyDialogState>;

interface Props {
    state: State;
    onClose: () => void;
}

export function CreateCompanyWizard({ state, onClose }: Props) {
    const { t } = useTranslation();

    const wizardSteps = [
        t('settings.companies.wizardStepCredentials'),
        t('settings.companies.wizardStepStores'),
    ];

    return (
        <>
            <DialogTitle>{t('settings.companies.createTitle')}</DialogTitle>
            <DialogContent dividers>
                {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => state.setError(null)}>
                        {state.error}
                    </Alert>
                )}

                <Stepper activeStep={state.wizardStep} sx={{ mb: 3, mt: 1 }}>
                    {wizardSteps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Step 1: Code + AIMS Credentials */}
                {state.wizardStep === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('settings.companies.wizardStep1Info')}
                        </Typography>

                        {/* Company Code */}
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={state.code}
                            onChange={(e) => state.handleCodeChange(e.target.value)}
                            required
                            error={!!state.codeError}
                            helperText={state.codeError || t('settings.companies.codeHelp')}
                            InputProps={{
                                endAdornment: state.code.length >= 3 && (
                                    <InputAdornment position="end">
                                        {state.codeValidating ? (
                                            <CircularProgress size={20} />
                                        ) : state.codeValid === true ? (
                                            <CheckCircleIcon color="success" />
                                        ) : state.codeValid === false ? (
                                            <ErrorIcon color="error" />
                                        ) : null}
                                    </InputAdornment>
                                )
                            }}
                            inputProps={{ maxLength: 10, style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
                        />

                        <Divider sx={{ my: 1 }}>
                            <Chip icon={<CloudIcon />} label={t('settings.companies.aimsConfig')} size="small" />
                        </Divider>

                        {/* Cluster */}
                        <FormControl fullWidth>
                            <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                            <Select
                                value={state.aimsCluster || 'c1'}
                                label={t('settings.companies.aimsCluster')}
                                onChange={(e) => {
                                    const cluster = e.target.value;
                                    state.setAimsCluster(cluster);
                                    const baseUrl = cluster === 'common' ? 'https://eu.common.solumesl.com/common' : 'https://eu.common.solumesl.com/c1/common';
                                    state.setAimsBaseUrl(baseUrl);
                                    state.setConnectError(null);
                                }}
                            >
                                <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                                <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Username */}
                        <TextField
                            label={t('settings.companies.aimsUsername')}
                            value={state.aimsUsername}
                            onChange={(e) => { state.setAimsUsername(e.target.value); state.setConnectError(null); }}
                            placeholder="admin@company.com"
                            required
                        />

                        {/* Password */}
                        <Box sx={{ display: 'flex', flexDirection: state.isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.companies.aimsPassword')}
                                type={state.showPassword ? 'text' : 'password'}
                                value={state.aimsPassword}
                                onChange={(e) => { state.setAimsPassword(e.target.value); state.setConnectError(null); }}
                                sx={{ flex: 1 }}
                                required
                            />
                            <IconButton
                                onClick={() => state.setShowPassword(!state.showPassword)}
                                sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, width: 40, height: 40 }}
                            >
                                {state.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                        </Box>

                        {state.connectError && (
                            <Alert severity="error" onClose={() => state.setConnectError(null)}>
                                {state.connectError}
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Step 2: Pick Store + Company Details */}
                {state.wizardStep === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('settings.companies.wizardStep2Info')}
                        </Typography>

                        {/* Store Selection */}
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StorefrontIcon fontSize="small" />
                            {t('settings.companies.selectStore')} ({state.aimsStores.length})
                        </Typography>

                        <Box sx={{ maxHeight: 220, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            {state.aimsStores.map((store) => (
                                <Paper
                                    key={store.code}
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        bgcolor: state.selectedStoreCode === store.code ? 'action.selected' : 'transparent',
                                        '&:hover': { bgcolor: state.selectedStoreCode === store.code ? 'action.selected' : 'action.hover' },
                                        '&:last-child': { borderBottom: 0 },
                                    }}
                                    onClick={() => state.handleSelectStore(store.code)}
                                >
                                    <Checkbox
                                        checked={state.selectedStoreCode === store.code}
                                        size="small"
                                        sx={{ p: 0 }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {store.name || store.code}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('settings.companies.storeCode')}: {store.code}
                                            {store.city && ` · ${store.city}`}
                                            {store.country && `, ${store.country}`}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {store.labelCount} {t('settings.companies.labels')} · {store.gatewayCount} {t('settings.companies.gateways')}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>

                        {state.selectedStoreCode && (
                            <>
                                <Divider sx={{ my: 1 }}>
                                    <Chip icon={<BusinessIcon />} label={t('settings.companies.companyDetails')} size="small" />
                                </Divider>

                                <TextField
                                    label={t('settings.companies.storeFriendlyName')}
                                    value={state.storeFriendlyName}
                                    onChange={(e) => state.setStoreFriendlyName(e.target.value)}
                                    placeholder={state.aimsStores.find(s => s.code === state.selectedStoreCode)?.name || ''}
                                    helperText={t('settings.companies.storeFriendlyNameHelp')}
                                    inputProps={{ maxLength: 100 }}
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
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Box>
                    {state.wizardStep > 0 && (
                        <Button onClick={() => state.setWizardStep(0)} disabled={state.submitting}>
                            {t('common.back')}
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onClose} disabled={state.submitting}>
                        {t('common.cancel')}
                    </Button>
                    {state.wizardStep === 0 && (
                        <Button
                            variant="contained"
                            onClick={state.handleConnectAndFetch}
                            disabled={!state.isStep1Valid() || state.connecting}
                            startIcon={state.connecting ? <CircularProgress size={16} /> : <CloudIcon />}
                        >
                            {t('settings.companies.connectAndFetch')}
                        </Button>
                    )}
                    {state.wizardStep === 1 && (
                        <Button
                            variant="contained"
                            onClick={state.handleCreateSubmit}
                            disabled={!state.isStep2Valid() || state.submitting}
                            startIcon={state.submitting ? <CircularProgress size={16} /> : null}
                        >
                            {t('common.create')}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </>
    );
}
