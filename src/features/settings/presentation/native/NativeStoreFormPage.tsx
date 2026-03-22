/**
 * NativeStoreFormPage — Create/edit store within a company.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Alert, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import {
    companyService,
    type CompanyStore,
    type CreateStoreDto,
    type UpdateStoreDto,
} from '@shared/infrastructure/services/companyService';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';
import { NativeDeleteButton } from '@shared/presentation/native/NativeDeleteButton';
import { NativePage } from '@shared/presentation/native/NativePage';
import { nativeSpacing, nativeColors } from '@shared/presentation/themes/nativeTokens';

export function NativeStoreFormPage() {
    const { id: companyId, sid } = useParams<{ id: string; sid: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const isEditMode = !!sid;

    const [store, setStore] = useState<CompanyStore | null>(null);
    const [loading, setLoading] = useState(isEditMode);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [isActive, setIsActive] = useState(true);

    // Code validation
    const [codeValidating, setCodeValidating] = useState(false);
    const [codeValid, setCodeValid] = useState<boolean | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (sid && companyId) {
            setLoading(true);
            companyService.getStores(companyId, { limit: 200 })
                .then((resp) => {
                    const found = resp.stores.find((s: CompanyStore) => s.id === sid);
                    if (found) {
                        setStore(found);
                        setName(found.name);
                        setCode(found.code);
                        setTimezone(found.timezone);
                        setSyncEnabled(found.syncEnabled);
                        setIsActive(found.isActive);
                        setCodeValid(true);
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [sid, companyId]);

    // Code validation with debounce (create mode)
    useEffect(() => {
        if (!companyId || isEditMode || !code) {
            if (!code) { setCodeValid(null); setCodeError(null); }
            return;
        }
        const isValidFormat = /^\d{1,10}$/.test(code);
        if (!isValidFormat) {
            setCodeValid(false);
            setCodeError(t('settings.stores.codeInvalidFormat'));
            return;
        }
        const timer = setTimeout(async () => {
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
        return () => clearTimeout(timer);
    }, [code, companyId, isEditMode, t]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t('validation.required', { field: t('settings.stores.nameLabel') }));
            return;
        }
        if (!isEditMode && (!code || !codeValid)) {
            setError(codeError || t('settings.stores.codeInvalidFormat'));
            return;
        }
        if (!companyId) return;

        setSaving(true);
        setError(null);
        try {
            if (isEditMode && sid) {
                const updateData: UpdateStoreDto = {
                    name: name.trim(),
                    timezone,
                    syncEnabled,
                    isActive,
                };
                await companyService.updateStore(sid, updateData);
            } else {
                const createData: CreateStoreDto = {
                    name: name.trim(),
                    code: code.trim(),
                    timezone,
                    syncEnabled,
                };
                await companyService.createStore(companyId, createData);
            }
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.stores.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!sid) return;
        setDeleting(true);
        try {
            await companyService.deleteStore(sid);
            navigate(-1);
        } finally {
            setDeleting(false);
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

    const pageTitle = isEditMode
        ? t('settings.stores.editTitle')
        : t('settings.stores.createTitle');

    const codeEndAdornment = !isEditMode && code ? (
        codeValidating ? <CircularProgress size={16} /> :
        codeValid === true ? <CheckCircleIcon sx={{ fontSize: 18, color: nativeColors.status.success }} /> :
        codeValid === false ? <ErrorIcon sx={{ fontSize: 18, color: nativeColors.status.error }} /> :
        null
    ) : null;

    return (
        <NativeFormPage title={pageTitle} onSave={handleSave} isSaving={saving}>
            {error && (
                <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                </Box>
            )}

            <NativeFormSection title={t('settings.stores.storeInfo', 'Store Info')}>
                {!isEditMode && (
                    <NativeTextField
                        label={t('settings.stores.codeLabel')}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        helperText={codeError || t('settings.stores.codeHelp')}
                        error={!!codeError}
                        InputProps={{ endAdornment: codeEndAdornment }}
                        inputProps={{ maxLength: 10, style: { fontFamily: 'monospace' } }}
                    />
                )}
                <NativeTextField
                    label={t('settings.stores.nameLabel')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />
                <NativeTextField
                    label={t('settings.stores.timezoneLabel')}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    helperText={t('settings.stores.timezoneHelp')}
                />
            </NativeFormSection>

            <NativeFormSection title={t('common.options', 'Options')}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={syncEnabled}
                            onChange={(e) => setSyncEnabled(e.target.checked)}
                        />
                    }
                    label={t('settings.stores.syncEnabledLabel')}
                />
                {isEditMode && (
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
            </NativeFormSection>

            {isEditMode && sid && (
                <>
                    <Box
                        onClick={() => navigate(`/settings/companies/${companyId}/stores/${sid}/features`)}
                        sx={{
                            mx: `${nativeSpacing.pagePadding}px`,
                            mb: 1,
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        <span style={{ fontSize: '0.875rem' }}>
                            {t('settings.stores.overrideCompanyFeatures', 'Override Company Features')} →
                        </span>
                    </Box>

                    <Box sx={{ px: `${nativeSpacing.pagePadding}px`, pb: 4 }}>
                        <NativeDeleteButton
                            onDelete={handleDelete}
                            isDeleting={deleting}
                            itemName={store?.name}
                            label={t('settings.stores.deleteStore', 'Delete Store')}
                        />
                    </Box>
                </>
            )}
        </NativeFormPage>
    );
}
