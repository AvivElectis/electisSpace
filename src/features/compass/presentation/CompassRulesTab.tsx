import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Button, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { compassAdminApi } from '../infrastructure/compassAdminApi';
import type { BookingRule, RuleType } from '../domain/types';

const RULE_TYPES: RuleType[] = [
    'MAX_DURATION',
    'MAX_ADVANCE_BOOKING',
    'MAX_CONCURRENT',
    'CHECK_IN_WINDOW',
    'AUTO_RELEASE',
];

// ruleTypeLabels moved to use t() calls inside the component

export function CompassRulesTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();
    const [rules, setRules] = useState<BookingRule[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('MAX_DURATION');
    const [newValue, setNewValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchRules = useCallback(async (showLoading = false) => {
        if (!activeCompanyId) return;
        if (showLoading) setInitialLoading(true);
        try {
            const res = await compassAdminApi.listRules(activeCompanyId);
            setRules(res.data.data || []);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setInitialLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => { fetchRules(true); }, [fetchRules]);

    const handleToggle = async (rule: BookingRule) => {
        try {
            await compassAdminApi.updateRule(activeCompanyId!, rule.id, { isActive: !rule.isActive });
            fetchRules();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const handleDelete = async (ruleId: string) => {
        setDeleting(true);
        try {
            await compassAdminApi.deleteRule(activeCompanyId!, ruleId);
            fetchRules();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setDeleting(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim() || !activeCompanyId) return;
        try {
            await compassAdminApi.createRule(activeCompanyId, {
                name: newName.trim(),
                ruleType: newType,
                config: { value: Number(newValue) || 0 },
            });
            setNewName('');
            setNewValue('');
            setAddOpen(false);
            fetchRules();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const getConfigSummary = (rule: BookingRule) => {
        const cfg = rule.config || {};
        if (cfg.value !== undefined) return `${cfg.value}`;
        return JSON.stringify(cfg);
    };

    if (initialLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                    {t('compass.addRule')}
                </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.name', 'Name')}</TableCell>
                            <TableCell>{t('common.type', 'Type')}</TableCell>
                            <TableCell>{t('common.value', 'Value')}</TableCell>
                            <TableCell>{t('common.scope', 'Scope')}</TableCell>
                            <TableCell>{t('common.active', 'Active')}</TableCell>
                            <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                        {t('common.noResults', 'No results found')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{rule.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={t(`compass.ruleType.${rule.ruleType}`, rule.ruleType)} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{getConfigSummary(rule)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={rule.applyTo === 'ALL_BRANCHES' ? t('compass.scope.all') : t('compass.scope.selected')}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            size="small"
                                            checked={rule.isActive}
                                            onChange={() => handleToggle(rule)}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(rule.id)} aria-label={t('compass.deleteRule')}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('compass.addRule')}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('common.name', 'Name')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        select
                        label={t('common.type', 'Type')}
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        {RULE_TYPES.map(rt => (
                            <MenuItem key={rt} value={rt}>{t(`compass.ruleType.${rt}`, rt)}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('common.value', 'Value')}
                        type="number"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button variant="contained" onClick={handleAdd} disabled={!newName.trim()}>
                        {t('common.add', 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation dialog for deleting a rule */}
            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.confirmDelete')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
                    <Button
                        color="error"
                        disabled={deleting}
                        onClick={async () => {
                            if (confirmDelete) await handleDelete(confirmDelete);
                            setConfirmDelete(null);
                        }}
                    >
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
