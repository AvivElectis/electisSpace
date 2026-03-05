import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Button, TextField,
    MenuItem, Stack, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import api from '@shared/infrastructure/services/apiClient';

interface BookingRule {
    id: string;
    name: string;
    ruleType: string;
    isActive: boolean;
    priority: number;
    config: Record<string, any>;
    applyTo: string;
}

const RULE_TYPES = [
    'MAX_DURATION',
    'MAX_ADVANCE_BOOKING',
    'MAX_CONCURRENT',
    'CHECK_IN_WINDOW',
    'AUTO_RELEASE',
    'BLOCKED_TIMES',
];

const ruleTypeLabels: Record<string, string> = {
    MAX_DURATION: 'Max Duration',
    MAX_ADVANCE_BOOKING: 'Max Advance Booking',
    MAX_CONCURRENT: 'Max Concurrent',
    CHECK_IN_WINDOW: 'Check-in Window',
    AUTO_RELEASE: 'Auto Release',
    BLOCKED_TIMES: 'Blocked Times',
};

export function CompassRulesTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();
    const [rules, setRules] = useState<BookingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('MAX_DURATION');
    const [newValue, setNewValue] = useState('');

    const fetchRules = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const res = await api.get(`/v2/admin/compass/rules/${activeCompanyId}`);
            setRules(res.data.data || []);
            setError(null);
        } catch {
            setError('Failed to load rules');
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const handleToggle = async (rule: BookingRule) => {
        try {
            await api.put(`/v2/admin/compass/rules/${activeCompanyId}/${rule.id}`, { isActive: !rule.isActive });
            fetchRules();
        } catch {
            setError('Failed to update rule');
        }
    };

    const handleDelete = async (ruleId: string) => {
        try {
            await api.delete(`/v2/admin/compass/rules/${activeCompanyId}/${ruleId}`);
            fetchRules();
        } catch {
            setError('Failed to delete rule');
        }
    };

    const handleAdd = async () => {
        if (!newName.trim() || !activeCompanyId) return;
        try {
            await api.post(`/v2/admin/compass/rules/${activeCompanyId}`, {
                name: newName.trim(),
                ruleType: newType,
                config: { value: Number(newValue) || 0 },
            });
            setNewName('');
            setNewValue('');
            setAddOpen(false);
            fetchRules();
        } catch {
            setError('Failed to add rule');
        }
    };

    const getConfigSummary = (rule: BookingRule) => {
        const cfg = rule.config || {};
        if (cfg.value !== undefined) return `${cfg.value}`;
        return JSON.stringify(cfg);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                    {t('common.add', 'Add')} {t('compass.navigation.rules')}
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
                                        <Chip label={ruleTypeLabels[rule.ruleType] || rule.ruleType} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{getConfigSummary(rule)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={rule.applyTo === 'ALL_BRANCHES' ? 'All' : 'Selected'}
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
                                        <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
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
                <DialogTitle>{t('common.add', 'Add')} {t('compass.navigation.rules')}</DialogTitle>
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
                            <MenuItem key={rt} value={rt}>{ruleTypeLabels[rt]}</MenuItem>
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
        </Box>
    );
}
