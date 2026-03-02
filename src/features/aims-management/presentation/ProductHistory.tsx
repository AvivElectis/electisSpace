/**
 * Product Batch Update History Component
 */

import { useEffect, useState, useMemo, Fragment } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, CircularProgress, Alert, IconButton, Tooltip, Collapse,
    TextField, Button, Stack, Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useProductHistory } from '../application/useProductHistory';

interface ProductHistoryProps {
    storeId: string;
}

export function ProductHistory({ storeId }: ProductHistoryProps) {
    const { t } = useTranslation();
    const {
        batchHistory, batchDetail, loading, error,
        batchErrors, batchErrorsLoading,
        articleHistory, articleHistoryLoading,
        fetchBatchHistory, fetchBatchDetail, fetchBatchErrors, fetchArticleHistory,
    } = useProductHistory(storeId);

    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
    const [errorsForBatch, setErrorsForBatch] = useState<string | null>(null);
    const [articleDrilldown, setArticleDrilldown] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => { fetchBatchHistory(); }, [fetchBatchHistory]);

    const handleRefresh = () => {
        const params: any = {};
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        fetchBatchHistory(params);
    };

    const handleClearFilter = () => {
        setFromDate('');
        setToDate('');
        fetchBatchHistory();
    };

    const handleExpandBatch = (batchName: string) => {
        if (expandedBatch === batchName) {
            setExpandedBatch(null);
            setErrorsForBatch(null);
            setArticleDrilldown(null);
        } else {
            setExpandedBatch(batchName);
            setErrorsForBatch(null);
            setArticleDrilldown(null);
            fetchBatchDetail(batchName);
        }
    };

    const handleViewErrors = (batch: any) => {
        const batchId = batch.id || batch.batchId || batch.batchName || batch.name || '';
        const name = batch.batchName || batch.name || '';
        setErrorsForBatch(name);
        setArticleDrilldown(null);
        fetchBatchErrors(batchId);
    };

    const handleViewArticleHistory = (articleId: string) => {
        setArticleDrilldown(articleId);
        setErrorsForBatch(null);
        fetchArticleHistory(articleId);
    };

    // Summary stats
    const summaryStats = useMemo(() => {
        // SoluM may return paginated { content: [...] }, direct array, or named list field
    const batches = Array.isArray(batchHistory?.content) ? batchHistory.content
        : Array.isArray(batchHistory) ? batchHistory
        : Array.isArray(batchHistory?.batchHistoryList) ? batchHistory.batchHistoryList
        : [];
        if (batches.length === 0) return null;

        const totalBatches = batches.length;
        const totalProcessed = batches.reduce((sum: number, b: any) => sum + (b.totalArticles || 0), 0);
        const totalSuccess = batches.reduce((sum: number, b: any) => sum + (b.successCount || 0), 0);
        const successRate = totalProcessed > 0 ? Math.round((totalSuccess / totalProcessed) * 100) : 0;

        return { totalBatches, totalProcessed, successRate };
    }, [batchHistory]);

    if (loading && !batchHistory) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    // SoluM may return paginated { content: [...] }, direct array, or named list field
    const batches = Array.isArray(batchHistory?.content) ? batchHistory.content
        : Array.isArray(batchHistory) ? batchHistory
        : Array.isArray(batchHistory?.batchHistoryList) ? batchHistory.batchHistoryList
        : [];

    return (
        <Box>
            {/* Header with date filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{t('aims.productUpdates')}</Typography>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <TextField
                        size="small"
                        type="date"
                        label={t('aims.dateFrom')}
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 160 }}
                    />
                    <TextField
                        size="small"
                        type="date"
                        label={t('aims.dateTo')}
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 160 }}
                    />
                    {(fromDate || toDate) && (
                        <Tooltip title={t('aims.clearFilter')}>
                            <IconButton size="small" onClick={handleClearFilter}><ClearIcon fontSize="small" /></IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={t('common.refresh')}>
                        <IconButton onClick={handleRefresh} disabled={loading}><RefreshIcon /></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Summary stats */}
            {summaryStats && (
                <Stack direction="row" gap={3} sx={{ mb: 2, px: 1 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{t('aims.totalBatches')}</Typography>
                        <Typography variant="body2" fontWeight={600}>{summaryStats.totalBatches}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{t('aims.totalProcessed')}</Typography>
                        <Typography variant="body2" fontWeight={600}>{summaryStats.totalProcessed}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{t('aims.successRate')}</Typography>
                        <Typography variant="body2" fontWeight={600}>{summaryStats.successRate}%</Typography>
                    </Box>
                </Stack>
            )}

            {batches.length === 0 ? (
                <Alert severity="info">{t('aims.noBatches')}</Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={40} />
                                <TableCell>{t('aims.batchName')}</TableCell>
                                <TableCell>{t('aims.timestamp')}</TableCell>
                                <TableCell align="right">{t('aims.totalArticles')}</TableCell>
                                <TableCell align="right">{t('aims.success')}</TableCell>
                                <TableCell align="right">{t('aims.failed')}</TableCell>
                                <TableCell>{t('aims.status')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {batches.map((batch: any, i: number) => {
                                const name = batch.batchName || batch.name || `batch-${i}`;
                                const isExpanded = expandedBatch === name;
                                const hasErrors = (batch.failCount || 0) > 0;
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
                                                            {/* Batch action buttons */}
                                                            <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                                                                {hasErrors && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="error"
                                                                        startIcon={<ErrorOutlineIcon />}
                                                                        onClick={(e) => { e.stopPropagation(); handleViewErrors(batch); }}
                                                                    >
                                                                        {t('aims.viewErrors')} ({batch.failCount})
                                                                    </Button>
                                                                )}
                                                            </Stack>

                                                            {/* Batch errors view */}
                                                            {errorsForBatch === name && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('aims.batchErrors')}</Typography>
                                                                    {batchErrorsLoading ? (
                                                                        <CircularProgress size={20} />
                                                                    ) : batchErrors && Array.isArray(batchErrors.errors || batchErrors) && (batchErrors.errors || batchErrors).length > 0 ? (
                                                                        <Table size="small">
                                                                            <TableHead>
                                                                                <TableRow>
                                                                                    <TableCell>{t('aims.articleId')}</TableCell>
                                                                                    <TableCell>{t('aims.errorMessage')}</TableCell>
                                                                                </TableRow>
                                                                            </TableHead>
                                                                            <TableBody>
                                                                                {(batchErrors.errors || batchErrors).map((err: any, j: number) => (
                                                                                    <TableRow key={j}>
                                                                                        <TableCell>{err.articleId || err.labelCode || '—'}</TableCell>
                                                                                        <TableCell>{err.errorMessage || err.message || err.error || '—'}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    ) : (
                                                                        <Alert severity="info" variant="outlined">{t('aims.noErrors')}</Alert>
                                                                    )}
                                                                </Box>
                                                            )}

                                                            {/* Article history drill-down */}
                                                            {articleDrilldown && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                                        {t('aims.articleHistory')} — {articleDrilldown}
                                                                    </Typography>
                                                                    {articleHistoryLoading ? (
                                                                        <CircularProgress size={20} />
                                                                    ) : articleHistory && Array.isArray(articleHistory.content || articleHistory) && (articleHistory.content || articleHistory).length > 0 ? (
                                                                        <Table size="small">
                                                                            <TableHead>
                                                                                <TableRow>
                                                                                    <TableCell>{t('aims.updateTime')}</TableCell>
                                                                                    <TableCell>{t('aims.status')}</TableCell>
                                                                                    <TableCell>{t('aims.labelCode')}</TableCell>
                                                                                </TableRow>
                                                                            </TableHead>
                                                                            <TableBody>
                                                                                {(articleHistory.content || articleHistory).map((entry: any, j: number) => (
                                                                                    <TableRow key={j}>
                                                                                        <TableCell>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</TableCell>
                                                                                        <TableCell>
                                                                                            <Chip
                                                                                                label={entry.status || '—'}
                                                                                                size="small"
                                                                                                variant="outlined"
                                                                                                color={entry.status === 'SUCCESS' ? 'success' : entry.status === 'FAILED' ? 'error' : 'default'}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell>{entry.labelCode || '—'}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    ) : (
                                                                        <Typography variant="body2" color="text.secondary">{t('aims.noDetails')}</Typography>
                                                                    )}
                                                                </Box>
                                                            )}

                                                            {/* Batch detail labels */}
                                                            {loading ? (
                                                                <CircularProgress size={20} />
                                                            ) : batchDetail?.labels ? (
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell>{t('aims.labelCode')}</TableCell>
                                                                            <TableCell>{t('aims.articleId')}</TableCell>
                                                                            <TableCell>{t('aims.status')}</TableCell>
                                                                            <TableCell />
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {batchDetail.labels.map((l: any, j: number) => (
                                                                            <TableRow key={j}>
                                                                                <TableCell>{l.labelCode || '—'}</TableCell>
                                                                                <TableCell>
                                                                                    {l.articleId ? (
                                                                                        <Link
                                                                                            component="button"
                                                                                            variant="body2"
                                                                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleViewArticleHistory(l.articleId); }}
                                                                                            sx={{ fontFamily: 'monospace' }}
                                                                                        >
                                                                                            {l.articleId}
                                                                                        </Link>
                                                                                    ) : '—'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Chip label={l.status || '—'} size="small" variant="outlined"
                                                                                        color={l.status === 'SUCCESS' ? 'success' : l.status === 'FAILED' ? 'error' : 'default'} />
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {l.articleId && (
                                                                                        <Button
                                                                                            size="small"
                                                                                            onClick={(e) => { e.stopPropagation(); handleViewArticleHistory(l.articleId); }}
                                                                                        >
                                                                                            {t('aims.viewArticleHistory')}
                                                                                        </Button>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {t('aims.noDetails')}
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
