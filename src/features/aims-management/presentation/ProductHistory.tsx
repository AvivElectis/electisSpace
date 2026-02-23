/**
 * Product Batch Update History Component
 */

import { useEffect, useState, Fragment } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, CircularProgress, Alert, IconButton, Tooltip, Collapse,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useProductHistory } from '../application/useProductHistory';

interface ProductHistoryProps {
    storeId: string;
}

export function ProductHistory({ storeId }: ProductHistoryProps) {
    const { t } = useTranslation();
    const { batchHistory, batchDetail, loading, error, fetchBatchHistory, fetchBatchDetail } = useProductHistory(storeId);
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

    useEffect(() => { fetchBatchHistory(); }, [fetchBatchHistory]);

    const handleExpandBatch = (batchName: string) => {
        if (expandedBatch === batchName) {
            setExpandedBatch(null);
        } else {
            setExpandedBatch(batchName);
            fetchBatchDetail(batchName);
        }
    };

    if (loading && !batchHistory) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    const batches = Array.isArray(batchHistory?.content) ? batchHistory.content : (Array.isArray(batchHistory) ? batchHistory : []);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">{t('aims.productUpdates', 'Product Updates')}</Typography>
                <Tooltip title={t('common.refresh', 'Refresh')}>
                    <IconButton onClick={() => fetchBatchHistory()} disabled={loading}><RefreshIcon /></IconButton>
                </Tooltip>
            </Box>

            {batches.length === 0 ? (
                <Alert severity="info">{t('aims.noBatches', 'No product update batches found.')}</Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={40} />
                                <TableCell>{t('aims.batchName', 'Batch')}</TableCell>
                                <TableCell>{t('aims.timestamp', 'Timestamp')}</TableCell>
                                <TableCell align="right">{t('aims.totalArticles', 'Total')}</TableCell>
                                <TableCell align="right">{t('aims.success', 'Success')}</TableCell>
                                <TableCell align="right">{t('aims.failed', 'Failed')}</TableCell>
                                <TableCell>{t('aims.status', 'Status')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {batches.map((batch: any, i: number) => {
                                const name = batch.batchName || batch.name || `batch-${i}`;
                                const isExpanded = expandedBatch === name;
                                return (
                                    <Fragment key={name}>
                                        <TableRow hover onClick={() => handleExpandBatch(name)} sx={{ cursor: 'pointer' }}>
                                            <TableCell>
                                                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                            </TableCell>
                                            <TableCell><Typography variant="body2" fontFamily="monospace">{name}</Typography></TableCell>
                                            <TableCell>{batch.timestamp ? new Date(batch.timestamp).toLocaleString() : '—'}</TableCell>
                                            <TableCell align="right">{batch.totalArticles ?? '—'}</TableCell>
                                            <TableCell align="right">{batch.successCount ?? '—'}</TableCell>
                                            <TableCell align="right">{batch.failCount ?? '—'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={batch.status || '—'} 
                                                    color={batch.status === 'COMPLETED' || batch.status === 'SUCCESS' ? 'success' : batch.status === 'FAILED' ? 'error' : 'default'} 
                                                    size="small" 
                                                    variant="outlined" 
                                                />
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ p: 0 }}>
                                                    <Collapse in={isExpanded}>
                                                        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                                                            {loading ? (
                                                                <CircularProgress size={20} />
                                                            ) : batchDetail?.labels ? (
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell>{t('aims.labelCode', 'Label')}</TableCell>
                                                                            <TableCell>{t('aims.articleId', 'Article')}</TableCell>
                                                                            <TableCell>{t('aims.status', 'Status')}</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {batchDetail.labels.map((l: any, j: number) => (
                                                                            <TableRow key={j}>
                                                                                <TableCell>{l.labelCode || '—'}</TableCell>
                                                                                <TableCell>{l.articleId || '—'}</TableCell>
                                                                                <TableCell>
                                                                                    <Chip label={l.status || '—'} size="small" variant="outlined"
                                                                                        color={l.status === 'SUCCESS' ? 'success' : l.status === 'FAILED' ? 'error' : 'default'} />
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {t('aims.noDetails', 'No details available.')}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
