/**
 * Label Status History Component
 */

import { useState } from 'react';
import {
    Box, TextField, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Alert,
    InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useLabelHistory } from '../application/useLabelHistory';

interface LabelHistoryProps {
    storeId: string;
}

function getStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'SUCCESS' || s === 'COMPLETED') return 'success';
    if (s === 'PROCESSING' || s === 'PENDING') return 'warning';
    if (s === 'TIMEOUT' || s === 'FAIL' || s === 'FAILED' || s === 'ERROR') return 'error';
    return 'default';
}

export function LabelHistory({ storeId }: LabelHistoryProps) {
    const { t } = useTranslation();
    const [searchCode, setSearchCode] = useState('');
    const { history, loading, error, fetchHistory } = useLabelHistory(storeId);

    const handleSearch = () => {
        if (searchCode.trim()) {
            fetchHistory(searchCode.trim());
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                    size="small"
                    placeholder={t('aims.searchLabelCode', 'Enter label code...')}
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                        },
                    }}
                    sx={{ flex: 1, maxWidth: 400 }}
                />
                <Button variant="contained" onClick={handleSearch} disabled={loading || !searchCode.trim()}>
                    {t('common.search', 'Search')}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}

            {!loading && history && (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {t('aims.statusHistory', 'Status History')} — {searchCode}
                    </Typography>
                    {Array.isArray(history.content) && history.content.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('aims.timestamp', 'Timestamp')}</TableCell>
                                        <TableCell>{t('aims.status', 'Status')}</TableCell>
                                        <TableCell>{t('aims.gateway', 'Gateway')}</TableCell>
                                        <TableCell>{t('aims.signal', 'Signal')}</TableCell>
                                        <TableCell>{t('aims.battery', 'Battery')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {history.content.map((entry: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</TableCell>
                                            <TableCell>
                                                <Chip label={entry.status || '—'} color={getStatusColor(entry.status)} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace">{(typeof entry.gateway === 'object' ? entry.gateway?.name : entry.gateway) || '—'}</Typography></TableCell>
                                            <TableCell>{entry.signal ?? '—'}</TableCell>
                                            <TableCell>{entry.battery ?? '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Alert severity="info">{t('aims.noHistory', 'No status history found for this label.')}</Alert>
                    )}
                </Box>
            )}

            {!loading && !history && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {t('aims.searchPrompt', 'Enter a label code above to view its status history.')}
                </Typography>
            )}
        </Box>
    );
}
