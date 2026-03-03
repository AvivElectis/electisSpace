/**
 * Unified History Tab
 *
 * Combines three sub-views under a single tab:
 *   0 - Batch Updates  (existing ProductHistory component)
 *   1 - Article Updates (paginated table of all article update events)
 *   2 - Label History   (existing LabelHistory search component)
 */

import { useState, useEffect } from 'react';
import {
    Box, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Chip, CircularProgress, Alert, TablePagination, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ProductHistory } from './ProductHistory';
import { LabelHistory } from './LabelHistory';
import { useArticleUpdatesHistory } from '../application/useArticleUpdatesHistory';

// ─── Article Updates Sub-view ────────────────────────────────────────────────

interface ArticleUpdatesListProps {
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

function ArticleUpdatesList({ storeId }: ArticleUpdatesListProps) {
    const { t } = useTranslation();
    const { data, loading, error, fetchAll } = useArticleUpdatesHistory(storeId);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    useEffect(() => {
        fetchAll(page, rowsPerPage);
    }, [fetchAll, page, rowsPerPage]);

    if (loading && !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    // SoluM may return paginated { content: [...] } or a direct array
    const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    const totalElements = data?.totalElements ?? rows.length;

    if (rows.length === 0 && !loading) {
        return <Alert severity="info">{t('aims.noArticleUpdates')}</Alert>;
    }

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('aims.updateTime')}</TableCell>
                            <TableCell>{t('aims.articleId')}</TableCell>
                            <TableCell>{t('aims.status')}</TableCell>
                            <TableCell>{t('aims.labelCode')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((entry: any, i: number) => (
                            <TableRow key={entry.id ?? i} hover>
                                <TableCell>
                                    {entry.timestamp || entry.updatedAt
                                        ? new Date(entry.timestamp || entry.updatedAt).toLocaleString()
                                        : '—'}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {entry.articleId || entry.productId || '—'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={entry.status || '—'}
                                        color={getStatusColor(entry.status)}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {entry.labelCode || '—'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {totalElements > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={totalElements}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            )}
        </Box>
    );
}

// ─── Unified History Tab ─────────────────────────────────────────────────────

interface HistoryTabProps {
    storeId: string;
}

export function HistoryTab({ storeId }: HistoryTabProps) {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState(0);

    return (
        <Box>
            <Tabs
                value={subTab}
                onChange={(_, v) => setSubTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
                <Tab label={t('aims.batchUpdates')} />
                <Tab label={t('aims.articleUpdates')} />
                <Tab label={t('aims.labelUpdates')} />
            </Tabs>

            {subTab === 0 && <ProductHistory storeId={storeId} />}
            {subTab === 1 && <ArticleUpdatesList storeId={storeId} />}
            {subTab === 2 && <LabelHistory storeId={storeId} />}
        </Box>
    );
}
