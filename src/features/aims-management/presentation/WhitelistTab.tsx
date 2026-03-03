/**
 * Whitelist Tab Component
 *
 * Displays whitelisted labels with search, add/remove, box whitelist, and sync actions.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, TextField, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Typography, TablePagination, Chip, CircularProgress,
    Alert, InputAdornment, Stack, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import RouterIcon from '@mui/icons-material/Router';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useWhitelist } from '../application/useWhitelist';

interface WhitelistTabProps {
    storeId: string;
}

export function WhitelistTab({ storeId }: WhitelistTabProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        whitelist, whitelistLoading, whitelistError, whitelistTotalElements,
        fetchWhitelist, addToWhitelist, removeFromWhitelist,
        whitelistBox, syncToStorage, syncToGateways,
    } = useWhitelist(storeId);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Add dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addCodes, setAddCodes] = useState('');

    // Box dialog
    const [boxDialogOpen, setBoxDialogOpen] = useState(false);
    const [boxId, setBoxId] = useState('');

    // Sync state
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchWhitelist({ page, size: rowsPerPage });
    }, [fetchWhitelist, page, rowsPerPage]);

    // Filter
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return whitelist;
        const term = searchTerm.trim().toLowerCase();
        return whitelist.filter((item: any) =>
            (item.labelCode || item.code || '').toLowerCase().includes(term) ||
            (item.labelModel || item.model || '').toLowerCase().includes(term) ||
            (item.macAddress || item.mac || '').toLowerCase().includes(term)
        );
    }, [whitelist, searchTerm]);

    const toggleSelect = useCallback((code: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    }, []);

    const handleAdd = async () => {
        const codes = addCodes.split(/[\n,;]+/).map(c => c.trim()).filter(Boolean);
        if (codes.length === 0) return;
        try {
            await addToWhitelist(codes);
            setAddDialogOpen(false);
            setAddCodes('');
        } catch {
            // Error handled in hook
        }
    };

    const handleRemoveSelected = async () => {
        if (selected.size === 0) return;
        try {
            await removeFromWhitelist(Array.from(selected));
            setSelected(new Set());
        } catch {
            // Error handled in hook
        }
    };

    const handleBoxWhitelist = async () => {
        if (!boxId.trim()) return;
        try {
            await whitelistBox(boxId.trim());
            setBoxDialogOpen(false);
            setBoxId('');
        } catch {
            // Error handled in hook
        }
    };

    const handleSyncStorage = async () => {
        setSyncLoading(true);
        setSyncMessage(null);
        try {
            await syncToStorage(false);
            setSyncMessage({ type: 'success', text: t('aims.whitelistSyncStorageSuccess') });
        } catch {
            setSyncMessage({ type: 'error', text: t('aims.whitelistSyncFailed') });
        } finally {
            setSyncLoading(false);
        }
    };

    const handleSyncGateways = async () => {
        setSyncLoading(true);
        setSyncMessage(null);
        try {
            await syncToGateways(false);
            setSyncMessage({ type: 'success', text: t('aims.whitelistSyncGatewaySuccess') });
        } catch {
            setSyncMessage({ type: 'error', text: t('aims.whitelistSyncFailed') });
        } finally {
            setSyncLoading(false);
        }
    };

    if (whitelistLoading && whitelist.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {whitelistError && <Alert severity="error" sx={{ mb: 2 }}>{whitelistError}</Alert>}
            {syncMessage && (
                <Alert severity={syncMessage.type} sx={{ mb: 2 }} onClose={() => setSyncMessage(null)}>
                    {syncMessage.text}
                </Alert>
            )}

            {/* Toolbar: Search + Actions */}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
                <TextField
                    size="small"
                    placeholder={t('aims.searchWhitelist')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ width: { xs: '100%', sm: 300 } }}
                />
                {searchTerm && (
                    <Typography variant="caption" color="text.secondary">
                        {filtered.length} / {whitelist.length}
                    </Typography>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
                        {t('aims.whitelistAdd')}
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<Inventory2OutlinedIcon />} onClick={() => setBoxDialogOpen(true)}>
                        {t('aims.whitelistBox')}
                    </Button>
                    {selected.size > 0 && (
                        <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleRemoveSelected}>
                            {t('aims.whitelistRemove')} ({selected.size})
                        </Button>
                    )}
                    <Tooltip title={t('aims.whitelistSyncStorage')}>
                        <span>
                            <IconButton size="small" onClick={handleSyncStorage} disabled={syncLoading}>
                                <StorageIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={t('aims.whitelistSyncGateway')}>
                        <span>
                            <IconButton size="small" onClick={handleSyncGateways} disabled={syncLoading}>
                                <RouterIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Whitelist table */}
            {whitelist.length > 0 ? (
                isMobile ? (
                    <Stack gap={1}>
                        {filtered.slice(0, 100).map((item: any, i: number) => {
                            const code = item.labelCode || item.code || '';
                            const model = item.labelModel || item.model || '';
                            const mac = item.macAddress || item.mac || '';
                            const isSelected = selected.has(code);
                            return (
                                <Paper
                                    key={code || i}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        bgcolor: isSelected ? 'action.selected' : undefined,
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                    onClick={() => code && toggleSelect(code)}
                                >
                                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                        {code}
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                        {model && <Chip label={model} size="small" variant="outlined" />}
                                        {mac && (
                                            <Typography variant="caption" color="text.secondary">
                                                {mac}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox" />
                                    <TableCell>{t('aims.whitelistLabelCode')}</TableCell>
                                    <TableCell>{t('aims.whitelistModel')}</TableCell>
                                    <TableCell>{t('aims.whitelistMac')}</TableCell>
                                    <TableCell>{t('aims.whitelistCreatedTime')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.slice(0, 200).map((item: any, i: number) => {
                                    const code = item.labelCode || item.code || '';
                                    const model = item.labelModel || item.model || '';
                                    const mac = item.macAddress || item.mac || '';
                                    const createdTime = item.createdTime || item.createdAt || '';
                                    const isSelected = selected.has(code);
                                    return (
                                        <TableRow
                                            key={code || i}
                                            hover
                                            selected={isSelected}
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => code && toggleSelect(code)}
                                        >
                                            <TableCell padding="checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => code && toggleSelect(code)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {code}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{model || '\u2014'}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {mac || '\u2014'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {createdTime ? new Date(createdTime).toLocaleString() : '\u2014'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && !whitelistLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                {t('aims.noWhitelist')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            ) : (
                !whitelistLoading && (
                    <Alert severity="info">{t('aims.noWhitelist')}</Alert>
                )
            )}

            {/* Pagination */}
            {whitelist.length > 0 && (
                <TablePagination
                    component="div"
                    count={whitelistTotalElements || whitelist.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}

            {/* Add labels dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('aims.whitelistAddTitle')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('aims.whitelistAddHelp')}
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        placeholder={"036FE049B09B\n036FE049B09C\n036FE049B09D"}
                        value={addCodes}
                        onChange={(e) => setAddCodes(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={handleAdd} disabled={!addCodes.trim()}>
                        {t('aims.whitelistAdd')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Box whitelist dialog */}
            <Dialog open={boxDialogOpen} onClose={() => setBoxDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('aims.whitelistBoxTitle')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('aims.whitelistBoxHelp')}
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('aims.whitelistBoxId')}
                        placeholder="O252600122"
                        value={boxId}
                        onChange={(e) => setBoxId(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBoxDialogOpen(false)}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={handleBoxWhitelist} disabled={!boxId.trim()}>
                        {t('aims.whitelistBoxAction')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
