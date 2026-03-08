import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Button, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, Switch,
    FormControlLabel, Radio, RadioGroup, FormControl, FormLabel,
    Autocomplete, InputAdornment, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { BookingRule, RuleType, CompassSpaceType } from '../domain/types';

// ── Constants ──────────────────────────────────────────────────────────

const RULE_TYPES: RuleType[] = [
    'MAX_DURATION',
    'MAX_ADVANCE_BOOKING',
    'MAX_CONCURRENT',
    'CHECK_IN_WINDOW',
    'AUTO_RELEASE',
    'MIN_DURATION',
    'BOOKING_GRANULARITY',
];

const SPACE_TYPES: CompassSpaceType[] = [
    'DESK',
    'MEETING_ROOM',
    'PHONE_BOOTH',
    'COLLABORATION_ZONE',
    'PARKING',
    'LOCKER',
    'EVENT_SPACE',
];

/** Returns the unit label for a given rule type */
function getValueUnit(ruleType: RuleType): string {
    switch (ruleType) {
        case 'MAX_DURATION':
        case 'MIN_DURATION':
        case 'CHECK_IN_WINDOW':
        case 'AUTO_RELEASE':
        case 'BOOKING_GRANULARITY':
            return 'min';
        case 'MAX_ADVANCE_BOOKING':
            return 'days';
        case 'MAX_CONCURRENT':
            return 'bookings';
        default:
            return '';
    }
}

/** Returns a human-readable hint for the value field */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getValueHint(ruleType: RuleType, t: any): string {
    switch (ruleType) {
        case 'MAX_DURATION':
            return t('compass.ruleHint.maxDuration', 'Maximum booking duration in minutes');
        case 'MIN_DURATION':
            return t('compass.ruleHint.minDuration', 'Minimum booking duration in minutes');
        case 'MAX_ADVANCE_BOOKING':
            return t('compass.ruleHint.maxAdvance', 'How many days in advance bookings are allowed');
        case 'MAX_CONCURRENT':
            return t('compass.ruleHint.maxConcurrent', 'Maximum simultaneous active bookings per user');
        case 'CHECK_IN_WINDOW':
            return t('compass.ruleHint.checkIn', 'Minutes before/after start to allow check-in');
        case 'AUTO_RELEASE':
            return t('compass.ruleHint.autoRelease', 'Minutes after start to auto-release if not checked in');
        case 'BOOKING_GRANULARITY':
            return t('compass.ruleHint.granularity', 'Booking time slots snap to this interval (minutes)');
        default:
            return '';
    }
}

/** Formats a value with its unit for table display */
function formatValueWithUnit(value: number | undefined, ruleType: RuleType): string {
    if (value === undefined || value === null) return '-';
    const unit = getValueUnit(ruleType);
    return `${value} ${unit}`;
}

// ── Form State ─────────────────────────────────────────────────────────

interface RuleFormState {
    name: string;
    ruleType: RuleType;
    value: string;
    priority: string;
    applyTo: 'ALL_BRANCHES' | 'SELECTED_BRANCHES';
    targetBranchIds: string[];
    targetSpaceTypes: CompassSpaceType[];
    isActive: boolean;
}

const INITIAL_FORM: RuleFormState = {
    name: '',
    ruleType: 'MAX_DURATION',
    value: '',
    priority: '0',
    applyTo: 'ALL_BRANCHES',
    targetBranchIds: [],
    targetSpaceTypes: [],
    isActive: true,
};

// ── Component ──────────────────────────────────────────────────────────

export function CompassRulesTab() {
    const { t } = useTranslation();
    const activeCompanyId = useAuthStore(s => s.activeCompanyId);
    const user = useAuthStore(s => s.user);

    // Branches (stores) available to the user
    const branches = useMemo(() => {
        return user?.stores?.map(s => ({ id: s.id, name: s.name })) ?? [];
    }, [user?.stores]);

    const [rules, setRules] = useState<BookingRule[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [form, setForm] = useState<RuleFormState>(INITIAL_FORM);

    // Delete confirmation
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Data Fetching ──────────────────────────────────────────────────

    const fetchRules = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listRules(activeCompanyId);
            setRules(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed', 'Failed to load rules'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId, t]);

    useEffect(() => { fetchRules(true); }, [fetchRules]);

    // ── Form Helpers ───────────────────────────────────────────────────

    const updateForm = (patch: Partial<RuleFormState>) => {
        setForm(prev => ({ ...prev, ...patch }));
    };

    const openAddDialog = () => {
        setEditingRuleId(null);
        setForm(INITIAL_FORM);
        setDialogOpen(true);
    };

    const openEditDialog = (rule: BookingRule) => {
        setEditingRuleId(rule.id);
        setForm({
            name: rule.name,
            ruleType: rule.ruleType,
            value: String((rule.config?.value as number) ?? ''),
            priority: String(rule.priority ?? 0),
            applyTo: rule.applyTo === 'SELECTED_BRANCHES' ? 'SELECTED_BRANCHES' : 'ALL_BRANCHES',
            targetBranchIds: rule.targetBranchIds ?? [],
            targetSpaceTypes: rule.targetSpaceTypes ?? [],
            isActive: rule.isActive,
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingRuleId(null);
    };

    // ── CRUD Handlers ──────────────────────────────────────────────────

    const handleSave = async () => {
        if (!form.name.trim() || !activeCompanyId) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                ruleType: form.ruleType,
                config: { value: Number(form.value) || 0 },
                priority: Math.min(100, Math.max(0, Number(form.priority) || 0)),
                applyTo: form.applyTo,
                targetBranchIds: form.applyTo === 'SELECTED_BRANCHES' ? form.targetBranchIds : [],
                targetSpaceTypes: form.targetSpaceTypes,
                isActive: form.isActive,
            };

            if (editingRuleId) {
                await compassAdminApi.updateRule(activeCompanyId, editingRuleId, payload);
            } else {
                await compassAdminApi.createRule(activeCompanyId, payload);
            }
            closeDialog();
            fetchRules();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save rule'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (rule: BookingRule) => {
        try {
            await compassAdminApi.updateRule(activeCompanyId!, rule.id, { isActive: !rule.isActive });
            fetchRules();
        } catch {
            setError(t('errors.saveFailed', 'Failed to save rule'));
        }
    };

    const handleDelete = async (ruleId: string) => {
        setDeleting(true);
        try {
            await compassAdminApi.deleteRule(activeCompanyId!, ruleId);
            fetchRules();
        } catch {
            setError(t('errors.saveFailed', 'Failed to delete rule'));
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
        }
    };

    // ── Render: Loading ────────────────────────────────────────────────

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    // ── Render: Main ───────────────────────────────────────────────────

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAddDialog}>
                    {t('compass.addRule', 'Add Rule')}
                </Button>
            </Stack>

            {/* ── Rules Table ─────────────────────────────────────── */}

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('common.type', 'Type')}</TableCell>
                            <TableCell>{t('common.value', 'Value')}</TableCell>
                            <TableCell>{t('common.priority', 'Priority')}</TableCell>
                            <TableCell>{t('common.scope', 'Scope')}</TableCell>
                            <TableCell>{t('compass.targetSpaceTypes', 'Space Types')}</TableCell>
                            <TableCell>{t('common.active', 'Active')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {rule.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={t(`compass.ruleType.${rule.ruleType}`, rule.ruleType)}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatValueWithUnit(rule.config?.value as number | undefined, rule.ruleType)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{rule.priority ?? 0}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {rule.applyTo === 'ALL_BRANCHES' ? (
                                            <Chip
                                                label={t('compass.scope.all', 'All Branches')}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Chip
                                                label={t('compass.scope.selectedCount', '{{count}} branches', {
                                                    count: rule.targetBranchIds?.length ?? 0,
                                                })}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {(rule.targetSpaceTypes?.length ?? 0) > 0 ? (
                                                rule.targetSpaceTypes!.map((st) => (
                                                    <Chip
                                                        key={st}
                                                        label={t(`compass.spaceType.${st}`, st)}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ))
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('compass.allSpaceTypes', 'All')}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            size="small"
                                            checked={rule.isActive}
                                            onChange={() => handleToggle(rule)}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={t('common.edit', 'Edit')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => openEditDialog(rule)}
                                                aria-label={t('common.edit', 'Edit')}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('common.delete', 'Delete')}>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => setConfirmDelete(rule.id)}
                                                aria-label={t('compass.deleteRule', 'Delete rule')}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Add/Edit Rule Dialog ────────────────────────────── */}

            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingRuleId
                        ? t('compass.editRule', 'Edit Rule')
                        : t('compass.addRule', 'Add Rule')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        {/* Name */}
                        <TextField
                            fullWidth
                            required
                            label={t('common.name', 'Name')}
                            value={form.name}
                            onChange={(e) => updateForm({ name: e.target.value })}
                        />

                        {/* Rule Type */}
                        <TextField
                            fullWidth
                            select
                            label={t('common.type', 'Type')}
                            value={form.ruleType}
                            onChange={(e) => updateForm({ ruleType: e.target.value as RuleType })}
                        >
                            {RULE_TYPES.map((rt) => (
                                <MenuItem key={rt} value={rt}>
                                    {t(`compass.ruleType.${rt}`, rt)}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Value with contextual unit */}
                        <TextField
                            fullWidth
                            label={t('common.value', 'Value')}
                            type="number"
                            value={form.value}
                            onChange={(e) => updateForm({ value: e.target.value })}
                            helperText={getValueHint(form.ruleType, t)}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {getValueUnit(form.ruleType)}
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        {/* Priority */}
                        <TextField
                            fullWidth
                            label={t('common.priority', 'Priority')}
                            type="number"
                            value={form.priority}
                            onChange={(e) => {
                                const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                updateForm({ priority: String(v) });
                            }}
                            helperText={t('compass.priorityHint', 'Higher priority rules take precedence (0-100)')}
                            slotProps={{
                                htmlInput: { min: 0, max: 100 },
                            }}
                        />

                        {/* Apply To */}
                        <FormControl>
                            <FormLabel>{t('compass.applyTo', 'Apply To')}</FormLabel>
                            <RadioGroup
                                row
                                value={form.applyTo}
                                onChange={(e) => updateForm({
                                    applyTo: e.target.value as 'ALL_BRANCHES' | 'SELECTED_BRANCHES',
                                    targetBranchIds: e.target.value === 'ALL_BRANCHES' ? [] : form.targetBranchIds,
                                })}
                            >
                                <FormControlLabel
                                    value="ALL_BRANCHES"
                                    control={<Radio />}
                                    label={t('compass.scope.all', 'All Branches')}
                                />
                                <FormControlLabel
                                    value="SELECTED_BRANCHES"
                                    control={<Radio />}
                                    label={t('compass.scope.selected', 'Selected Branches')}
                                />
                            </RadioGroup>
                        </FormControl>

                        {/* Target Branches (only when SELECTED_BRANCHES) */}
                        {form.applyTo === 'SELECTED_BRANCHES' && (
                            <Autocomplete
                                multiple
                                options={branches}
                                getOptionLabel={(opt) => opt.name}
                                value={branches.filter((b) => form.targetBranchIds.includes(b.id))}
                                onChange={(_, selected) => updateForm({
                                    targetBranchIds: selected.map((s) => s.id),
                                })}
                                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={t('compass.targetBranches', 'Target Branches')}
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...rest } = getTagProps({ index });
                                        return (
                                            <Chip
                                                key={key}
                                                label={option.name}
                                                size="small"
                                                {...rest}
                                            />
                                        );
                                    })
                                }
                            />
                        )}

                        {/* Target Space Types */}
                        <Autocomplete
                            multiple
                            options={SPACE_TYPES}
                            getOptionLabel={(opt) => t(`compass.spaceType.${opt}`, opt)}
                            value={form.targetSpaceTypes}
                            onChange={(_, selected) => updateForm({ targetSpaceTypes: selected })}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('compass.targetSpaceTypes', 'Target Space Types')}
                                    helperText={t('compass.spaceTypesHint', 'Leave empty to apply to all space types')}
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...rest } = getTagProps({ index });
                                    return (
                                        <Chip
                                            key={key}
                                            label={t(`compass.spaceType.${option}`, option)}
                                            size="small"
                                            {...rest}
                                        />
                                    );
                                })
                            }
                        />

                        {/* Active toggle */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.isActive}
                                    onChange={(e) => updateForm({ isActive: e.target.checked })}
                                />
                            }
                            label={t('common.active', 'Active')}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>{t('common.cancel', 'Cancel')}</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!form.name.trim() || saving}
                    >
                        {saving
                            ? <CircularProgress size={20} />
                            : editingRuleId
                                ? t('common.save', 'Save')
                                : t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirmation Dialog ──────────────────────── */}

            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
                <DialogTitle>{t('common.confirm', 'Confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.confirmDelete', 'Are you sure you want to delete this item?')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button
                        color="error"
                        disabled={deleting}
                        onClick={() => {
                            if (confirmDelete) handleDelete(confirmDelete);
                        }}
                    >
                        {deleting ? <CircularProgress size={20} /> : t('common.delete', 'Delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
