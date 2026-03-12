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
    ToggleButtonGroup,
    ToggleButton,
    IconButton,
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
import ViewListIcon from '@mui/icons-material/ViewList';
import CodeIcon from '@mui/icons-material/Code';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { companyService, type CompanyStore } from '@shared/infrastructure/services/companyService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig, SolumFieldMapping } from '@features/settings/domain/types';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

const AIMSSettingsDialog = lazy(() => import('../AIMSSettingsDialog'));

// Lazy load the heavy JSON editor (~1MB vanilla-jsoneditor)
const ArticleFormatEditor = lazy(() =>
    import('@features/configuration/presentation/ArticleFormatEditor').then(m => ({ default: m.ArticleFormatEditor }))
);

/** Generate initial mapping from article format data fields */
function generateInitialMapping(articleFormat: ArticleFormat): SolumMappingConfig {
    const fields: Record<string, SolumFieldMapping> = {};
    (articleFormat.articleData || []).forEach((field, index) => {
        fields[field] = {
            friendlyNameEn: field,
            friendlyNameHe: field,
            visible: true,
            order: index,
        };
    });
    return {
        uniqueIdField: articleFormat.mappingInfo?.articleId || articleFormat.articleData?.[0] || '',
        fields,
        conferenceMapping: {
            meetingName: '',
            meetingTime: '',
            participants: '',
        },
        mappingInfo: articleFormat.mappingInfo ? { ...articleFormat.mappingInfo } : undefined,
    };
}

/** Sortable row for field mapping table */
function SortableFieldRow({
    fieldKey,
    field,
    onNameEnChange,
    onNameHeChange,
    onVisibleChange,
}: {
    fieldKey: string;
    field: SolumFieldMapping;
    onNameEnChange: (value: string) => void;
    onNameHeChange: (value: string) => void;
    onVisibleChange: (value: boolean) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldKey });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell sx={{ width: 32, px: 0.5 }}>
                <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.disabled' }}>
                    <DragIndicatorIcon fontSize="small" />
                </Box>
            </TableCell>
            <TableCell>
                <Typography variant="body2" fontFamily="monospace" fontSize={12}>{fieldKey}</Typography>
            </TableCell>
            <TableCell>
                <TextField
                    size="small"
                    variant="standard"
                    value={field.friendlyNameEn}
                    onChange={(e) => onNameEnChange(e.target.value)}
                    fullWidth
                    placeholder="EN"
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small"
                    variant="standard"
                    value={field.friendlyNameHe}
                    onChange={(e) => onNameHeChange(e.target.value)}
                    fullWidth
                    placeholder="HE"
                    inputProps={{ dir: 'rtl' }}
                />
            </TableCell>
            <TableCell align="center">
                <Switch
                    size="small"
                    checked={field.visible}
                    onChange={(e) => onVisibleChange(e.target.checked)}
                />
            </TableCell>
        </TableRow>
    );
}

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
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [aimsDialogOpen, setAimsDialogOpen] = useState(false);

    // Stores tab state
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [storesLoading, setStoresLoading] = useState(false);

    // Article format tab state
    const [articleFormat, setArticleFormat] = useState<ArticleFormat | null>(null);
    const [articleFormatLoading, setArticleFormatLoading] = useState(false);
    const [articleFormatError, setArticleFormatError] = useState<string | null>(null);
    const [articleFormatViewMode, setArticleFormatViewMode] = useState<'visual' | 'json'>('visual');
    // Field mapping tab state
    const [fieldMapping, setFieldMapping] = useState<SolumMappingConfig | null>(null);
    const [fieldMappingSaving, setFieldMappingSaving] = useState(false);
    const [fieldMappingSaved, setFieldMappingSaved] = useState(false);

    // DnD sensors for field reordering
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Sorted field keys (by order), excluding unique ID, name field (people mode only), and global fields
    const isPeopleMode = state.companyFeatures.peopleEnabled;
    const sortedFieldKeys = useMemo(() => {
        if (!fieldMapping?.fields) return [];
        const idField = fieldMapping.uniqueIdField;
        // In people mode, articleName has its own dedicated selector — hide from list
        const nameField = isPeopleMode ? fieldMapping.mappingInfo?.articleName : undefined;
        const globalKeys = new Set(Object.keys(fieldMapping.globalFieldAssignments || {}));
        return Object.entries(fieldMapping.fields)
            .filter(([key]) => key !== idField && key !== nameField && !globalKeys.has(key))
            .sort(([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity))
            .map(([key]) => key);
    }, [fieldMapping?.fields, fieldMapping?.uniqueIdField, fieldMapping?.mappingInfo?.articleName, fieldMapping?.globalFieldAssignments, isPeopleMode]);

    // Handle drag end — recompute order for all fields
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !fieldMapping) return;

        const oldIndex = sortedFieldKeys.indexOf(active.id as string);
        const newIndex = sortedFieldKeys.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;

        // Reorder keys
        const reordered = [...sortedFieldKeys];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, active.id as string);

        // Update order on all fields
        const updatedFields = { ...fieldMapping.fields };
        reordered.forEach((key, idx) => {
            updatedFields[key] = { ...updatedFields[key], order: idx };
        });

        setFieldMapping({ ...fieldMapping, fields: updatedFields });
        setFieldMappingSaved(false);
    }, [fieldMapping, sortedFieldKeys]);

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

    // Re-fetch article format from AIMS (uses stored credentials via settings endpoint)
    const handleRefetchArticleFormat = useCallback(async () => {
        if (!state.company) return;
        setArticleFormatLoading(true);
        setArticleFormatError(null);
        try {
            const result = await fieldMappingService.getArticleFormat(state.company.id, true);
            if (result.articleFormat) {
                setArticleFormat(result.articleFormat);
                // Update Zustand store so rest of app sees fresh format
                useSettingsStore.getState().updateSettings({ solumArticleFormat: result.articleFormat as any });
                // Merge new article format fields into existing mapping (or generate fresh if empty)
                const format = result.articleFormat;
                setFieldMapping(prev => {
                    if (!prev || Object.keys(prev.fields).length === 0) {
                        return generateInitialMapping(format);
                    }
                    // Merge: add new fields, keep existing customizations, update mappingInfo
                    const existingFields = { ...prev.fields };
                    const maxOrder = Math.max(...Object.values(existingFields).map(f => f.order ?? 0), -1);
                    let nextOrder = maxOrder + 1;
                    (format.articleData || []).forEach((field) => {
                        if (!existingFields[field]) {
                            existingFields[field] = {
                                friendlyNameEn: field,
                                friendlyNameHe: field,
                                visible: true,
                                order: nextOrder++,
                            };
                        }
                    });
                    // Always preserve full mappingInfo from AIMS — mode handling is in SpacesManagementView
                    const freshMappingInfo = format.mappingInfo
                        ? { ...format.mappingInfo }
                        : prev.mappingInfo;
                    return {
                        ...prev,
                        fields: existingFields,
                        uniqueIdField: format.mappingInfo?.articleId || prev.uniqueIdField,
                        mappingInfo: freshMappingInfo as any,
                    };
                });
                setFieldMappingSaved(false);
            } else {
                setArticleFormatError(t('settings.companies.articleFormatError'));
            }
        } catch (err: any) {
            setArticleFormatError(err.response?.data?.message || t('settings.companies.articleFormatError'));
        } finally {
            setArticleFormatLoading(false);
        }
    }, [state.company, t]);

    // Save article format edits to server + update Zustand store
    const handleSaveArticleFormat = useCallback(async (newFormat: ArticleFormat): Promise<boolean> => {
        if (!state.company?.id) return false;
        setArticleFormatSaving(true);
        try {
            await fieldMappingService.updateArticleFormat(state.company.id, newFormat);
            setArticleFormat(newFormat);
            // Update the Zustand store so the rest of the app sees the new format
            useSettingsStore.getState().updateSettings({ solumArticleFormat: newFormat as any });
            return true;
        } catch {
            state.setError(t('settings.companies.saveError'));
            return false;
        } finally {
            setArticleFormatSaving(false);
        }
    }, [state.company?.id, state, t]);

    // Auto-generate field mapping from existing article format (with confirmation)
    const handleGenerateFieldMapping = useCallback(async () => {
        if (!articleFormat) return;
        const hasExisting = fieldMapping && Object.keys(fieldMapping.fields).length > 0;
        if (hasExisting) {
            const confirmed = await confirm({
                title: t('settings.companies.regenerateMapping', 'Regenerate from Format'),
                message: t('settings.companies.regenerateConfirm', 'This will overwrite the current field mapping configuration. Are you sure?'),
                confirmLabel: t('common.dialog.confirm', 'Confirm'),
                cancelLabel: t('common.dialog.cancel'),
                severity: 'warning',
            });
            if (!confirmed) return;
        }
        const generated = generateInitialMapping(articleFormat);
        setFieldMapping(generated);
        setFieldMappingSaved(false);
    }, [articleFormat, fieldMapping, confirm, t]);

    // Save field mapping via dedicated endpoint + update Zustand store so spaces table refreshes
    const handleSaveFieldMapping = useCallback(async () => {
        if (!state.company?.id || !fieldMapping) return;
        setFieldMappingSaving(true);
        try {
            await fieldMappingService.updateFieldMappings(state.company.id, fieldMapping);
            // Update the Zustand settings store so the spaces table columns refresh immediately
            useSettingsStore.getState().updateFieldMappings(fieldMapping);
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

                    {articleFormatLoading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                            <CircularProgress />
                            <Typography color="text.secondary">
                                {t('settings.companies.fetchingArticleFormat')}
                            </Typography>
                        </Box>
                    ) : articleFormat ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* View mode toggle + re-fetch button */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ToggleButtonGroup
                                    value={articleFormatViewMode}
                                    exclusive
                                    onChange={(_, v) => v && setArticleFormatViewMode(v)}
                                    size="small"
                                    sx={{ direction: 'ltr' }}
                                >
                                    <ToggleButton value="visual">
                                        <ViewListIcon sx={{ mr: 0.5 }} fontSize="small" />
                                        {t('settings.companies.visualView')}
                                    </ToggleButton>
                                    <ToggleButton value="json">
                                        <CodeIcon sx={{ mr: 0.5 }} fontSize="small" />
                                        {t('settings.companies.jsonView')}
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RefreshIcon />}
                                    onClick={handleRefetchArticleFormat}
                                    disabled={articleFormatLoading || !state.company?.aimsConfigured}
                                >
                                    {t('settings.companies.refetchArticleFormat', 'Re-fetch from AIMS')}
                                </Button>
                            </Box>

                            {articleFormatViewMode === 'visual' ? (
                                /* ===== Visual View ===== */
                                <>
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
                                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>{t('settings.companies.basicInfoFields')}</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {articleFormat.articleBasicInfo.map((f) => (
                                                    <Chip key={f} label={f} size="small" variant="outlined" color="primary" />
                                                ))}
                                            </Box>
                                        </Paper>
                                    )}

                                    {articleFormat.articleData && articleFormat.articleData.length > 0 && (
                                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                                {t('settings.companies.dataFields')} ({articleFormat.articleData.length})
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {articleFormat.articleData.map((f) => (
                                                    <Chip key={f} label={f} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Paper>
                                    )}

                                    {articleFormat.mappingInfo && (
                                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                                {t('settings.companies.mappingInfoTitle')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {Object.entries(articleFormat.mappingInfo).map(([key, value]) => (
                                                    <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" color="info" />
                                                ))}
                                            </Box>
                                        </Paper>
                                    )}
                                </>
                            ) : (
                                /* ===== JSON Editor View ===== */
                                <Box sx={{ mx: { xs: -2, sm: 0 } }}>
                                    <Suspense fallback={
                                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                            <CircularProgress />
                                        </Box>
                                    }>
                                        <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                                            {t('settings.companies.jsonEditHint')}
                                        </Alert>
                                        <ArticleFormatEditor
                                            schema={articleFormat}
                                            onSave={handleSaveArticleFormat}
                                            readOnly={false}
                                        />
                                    </Suspense>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('settings.companies.noArticleFormat', 'No article format stored. Fetch from AIMS to configure.')}
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={handleRefetchArticleFormat}
                                disabled={articleFormatLoading || !state.company?.aimsConfigured}
                            >
                                {t('settings.companies.refetchArticleFormat', 'Re-fetch from AIMS')}
                            </Button>
                        </Box>
                    )}
                </TabPanel>

                {/* Tab 3: Field Mapping */}
                <TabPanel value={state.activeTab} index={3}>
                    {fieldMapping && Object.keys(fieldMapping.fields).length > 0 ? (
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

                            {/* Name field selector — only in people mode */}
                            {state.companyFeatures.peopleEnabled && (
                                <Autocomplete
                                    size="small"
                                    options={articleDataFields}
                                    value={fieldMapping.mappingInfo?.articleName || ''}
                                    onChange={(_, value) => {
                                        setFieldMapping(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                mappingInfo: { ...prev.mappingInfo, articleName: value || '' } as any,
                                            };
                                        });
                                        setFieldMappingSaved(false);
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label={t('settings.companies.nameField', 'Name Field')} />
                                    )}
                                />
                            )}

                            {/* Field table with drag-and-drop reordering */}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={sortedFieldKeys} strategy={verticalListSortingStrategy}>
                                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: 32, px: 0.5 }} />
                                                    <TableCell>{t('settings.companies.aimsField')}</TableCell>
                                                    <TableCell>{t('settings.companies.displayNameEn', 'Display (EN)')}</TableCell>
                                                    <TableCell>{t('settings.companies.displayNameHe', 'Display (HE)')}</TableCell>
                                                    <TableCell align="center">{t('settings.companies.visible')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedFieldKeys.map((key) => {
                                                    const field = fieldMapping.fields[key];
                                                    if (!field) return null;
                                                    return (
                                                        <SortableFieldRow
                                                            key={key}
                                                            fieldKey={key}
                                                            field={field}
                                                            onNameEnChange={(value) => {
                                                                setFieldMapping(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        fields: {
                                                                            ...prev.fields,
                                                                            [key]: { ...field, friendlyNameEn: value },
                                                                        },
                                                                    };
                                                                });
                                                                setFieldMappingSaved(false);
                                                            }}
                                                            onNameHeChange={(value) => {
                                                                setFieldMapping(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        fields: {
                                                                            ...prev.fields,
                                                                            [key]: { ...field, friendlyNameHe: value },
                                                                        },
                                                                    };
                                                                });
                                                                setFieldMappingSaved(false);
                                                            }}
                                                            onVisibleChange={(value) => {
                                                                setFieldMapping(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        fields: {
                                                                            ...prev.fields,
                                                                            [key]: { ...field, visible: value },
                                                                        },
                                                                    };
                                                                });
                                                                setFieldMappingSaved(false);
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </SortableContext>
                            </DndContext>

                            {/* Conference mapping — only when conference feature is active */}
                            {state.companyFeatures.conferenceEnabled && fieldMapping.conferenceMapping && (
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

                            {/* Global Field Assignments */}
                            <Divider />
                            <Typography variant="subtitle2">{t('settings.companies.globalFieldAssignments')}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.companies.globalFieldAssignmentsHelp')}
                            </Typography>
                            {Object.entries(fieldMapping.globalFieldAssignments || {}).map(([gField, gValue]) => (
                                <Stack key={gField} direction="row" spacing={1} alignItems="center">
                                    <Autocomplete
                                        size="small"
                                        options={articleDataFields}
                                        value={gField}
                                        onChange={(_, newField) => {
                                            if (!newField || newField === gField) return;
                                            setFieldMapping(prev => {
                                                if (!prev) return prev;
                                                const updated = { ...prev.globalFieldAssignments };
                                                delete updated[gField];
                                                updated[newField] = gValue;
                                                return { ...prev, globalFieldAssignments: updated };
                                            });
                                            setFieldMappingSaved(false);
                                        }}
                                        renderInput={(params) => (
                                            <TextField {...params} label={t('settings.companies.aimsField')} />
                                        )}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        size="small"
                                        value={gValue}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFieldMapping(prev => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    globalFieldAssignments: { ...prev.globalFieldAssignments, [gField]: val },
                                                };
                                            });
                                            setFieldMappingSaved(false);
                                        }}
                                        label={t('settings.companies.globalFieldValue')}
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                            setFieldMapping(prev => {
                                                if (!prev) return prev;
                                                const updated = { ...prev.globalFieldAssignments };
                                                delete updated[gField];
                                                return { ...prev, globalFieldAssignments: updated };
                                            });
                                            setFieldMappingSaved(false);
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    // Find first available field not already assigned
                                    const assigned = new Set(Object.keys(fieldMapping.globalFieldAssignments || {}));
                                    const available = articleDataFields.find(f => !assigned.has(f));
                                    if (!available) return;
                                    setFieldMapping(prev => {
                                        if (!prev) return prev;
                                        return {
                                            ...prev,
                                            globalFieldAssignments: { ...prev.globalFieldAssignments, [available]: '' },
                                        };
                                    });
                                    setFieldMappingSaved(false);
                                }}
                                disabled={
                                    Object.keys(fieldMapping.globalFieldAssignments || {}).length >= articleDataFields.length
                                }
                            >
                                {t('common.add', 'Add')}
                            </Button>

                            {/* Action buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<AutoFixHighIcon />}
                                    onClick={handleGenerateFieldMapping}
                                    disabled={!articleFormat}
                                >
                                    {t('settings.companies.regenerateMapping', 'Regenerate from Format')}
                                </Button>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('settings.companies.noFieldsConfigured')}
                            </Typography>
                            {articleFormat ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<AutoFixHighIcon />}
                                    onClick={handleGenerateFieldMapping}
                                >
                                    {t('settings.companies.generateFromFormat', 'Generate from Article Format')}
                                </Button>
                            ) : (
                                <Alert severity="info" variant="outlined">
                                    {t('settings.companies.fetchFormatFirst', 'Fetch article format from AIMS first (Article Format tab), then generate field mappings.')}
                                </Alert>
                            )}
                        </Box>
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
            <ConfirmDialog />
        </>
    );
}
