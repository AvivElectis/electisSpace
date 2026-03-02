/**
 * Articles Tab Component
 *
 * Displays a searchable, paginated article table with sort and detail dialog.
 * Follows the same pattern as LabelsOverview for table + search.
 */

import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, TextField, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Typography, TablePagination, Chip, CircularProgress,
    Alert, InputAdornment, Stack, TableSortLabel, useMediaQuery, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useArticles } from '../application/useArticles';
import { ArticleDetailDialog } from './ArticleDetailDialog';

interface ArticlesTabProps {
    storeId: string;
}

type SortField = 'articleId' | 'articleName' | 'nfcUrl' | 'linkedLabels';
type SortDir = 'asc' | 'desc';

export function ArticlesTab({ storeId }: ArticlesTabProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        articles, articlesLoading, articlesError, articlesTotalElements,
        fetchArticles, fetchArticleDetail, fetchArticleHistory,
        selectedArticle, articleHistory,
    } = useArticles(storeId);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>('articleId');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    useEffect(() => {
        fetchArticles({ page, size: rowsPerPage });
    }, [fetchArticles, page, rowsPerPage]);

    // Filter and sort articles
    const filtered = useMemo(() => {
        let result = articles;

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter((a: any) =>
                (a.articleId || a.id || '').toLowerCase().includes(term) ||
                (a.articleName || a.name || '').toLowerCase().includes(term) ||
                (a.nfcUrl || '').toLowerCase().includes(term)
            );
        }

        // Sort
        result = [...result].sort((a: any, b: any) => {
            let aVal = '';
            let bVal = '';
            switch (sortField) {
                case 'articleId':
                    aVal = a.articleId || a.id || '';
                    bVal = b.articleId || b.id || '';
                    break;
                case 'articleName':
                    aVal = a.articleName || a.name || '';
                    bVal = b.articleName || b.name || '';
                    break;
                case 'nfcUrl':
                    aVal = a.nfcUrl || '';
                    bVal = b.nfcUrl || '';
                    break;
                case 'linkedLabels':
                    aVal = String(a.assignedLabel?.length || a.labelCount || 0);
                    bVal = String(b.assignedLabel?.length || b.labelCount || 0);
                    return sortDir === 'asc'
                        ? Number(aVal) - Number(bVal)
                        : Number(bVal) - Number(aVal);
            }
            const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [articles, searchTerm, sortField, sortDir]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleRowClick = (article: any) => {
        const id = article.articleId || article.id;
        if (id) {
            fetchArticleDetail(id);
            fetchArticleHistory(id);
        }
        setDetailOpen(true);
    };

    const handleDetailClose = () => {
        setDetailOpen(false);
    };

    if (articlesLoading && articles.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {articlesError && <Alert severity="error" sx={{ mb: 2 }}>{articlesError}</Alert>}

            {/* Search */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder={t('aims.searchByArticle')}
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
                    sx={{ width: { xs: '100%', sm: 400 } }}
                />
                {searchTerm && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {filtered.length} / {articles.length}
                    </Typography>
                )}
            </Box>

            {/* Article list */}
            {articles.length > 0 ? (
                isMobile ? (
                    // Mobile: card-style list
                    <Stack gap={1}>
                        {filtered.slice(0, 100).map((article: any, i: number) => {
                            const id = article.articleId || article.id || '';
                            const name = article.articleName || article.name || '';
                            const labelCount = article.assignedLabel?.length || article.labelCount || 0;
                            return (
                                <Paper
                                    key={id || i}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                    onClick={() => handleRowClick(article)}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                            {id}
                                        </Typography>
                                        <Chip
                                            label={`${labelCount} ${t('aims.labels')}`}
                                            size="small"
                                            variant="outlined"
                                            color={labelCount > 0 ? 'primary' : 'default'}
                                        />
                                    </Box>
                                    {name && (
                                        <Typography variant="body2" color="text.secondary">
                                            {name}
                                        </Typography>
                                    )}
                                    {article.nfcUrl && (
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {article.nfcUrl}
                                        </Typography>
                                    )}
                                </Paper>
                            );
                        })}
                        {filtered.length > 100 && (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                {t('aims.searchByArticle')} ({filtered.length - 100} more)
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    // Desktop: table
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'articleId'}
                                            direction={sortField === 'articleId' ? sortDir : 'asc'}
                                            onClick={() => handleSort('articleId')}
                                        >
                                            {t('aims.articleId')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'articleName'}
                                            direction={sortField === 'articleName' ? sortDir : 'asc'}
                                            onClick={() => handleSort('articleName')}
                                        >
                                            {t('aims.articleName')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortField === 'nfcUrl'}
                                            direction={sortField === 'nfcUrl' ? sortDir : 'asc'}
                                            onClick={() => handleSort('nfcUrl')}
                                        >
                                            {t('aims.nfcUrl')}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right">
                                        <TableSortLabel
                                            active={sortField === 'linkedLabels'}
                                            direction={sortField === 'linkedLabels' ? sortDir : 'asc'}
                                            onClick={() => handleSort('linkedLabels')}
                                        >
                                            {t('aims.linkedLabels')}
                                        </TableSortLabel>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.slice(0, 200).map((article: any, i: number) => {
                                    const id = article.articleId || article.id || '';
                                    const name = article.articleName || article.name || '';
                                    const labelCount = article.assignedLabel?.length || article.labelCount || 0;
                                    return (
                                        <TableRow
                                            key={id || i}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleRowClick(article)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{name || '\u2014'}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                                    {article.nfcUrl || '\u2014'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={labelCount}
                                                    size="small"
                                                    variant="outlined"
                                                    color={labelCount > 0 ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && !articlesLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                {t('aims.noArticles')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            ) : (
                !articlesLoading && (
                    <Alert severity="info">{t('aims.noArticles')}</Alert>
                )
            )}

            {filtered.length > 200 && !isMobile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {t('aims.searchByArticle')} ({filtered.length - 200} more)
                </Typography>
            )}

            {/* Pagination */}
            {articles.length > 0 && (
                <TablePagination
                    component="div"
                    count={articlesTotalElements || articles.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}

            {/* Article detail dialog */}
            <ArticleDetailDialog
                open={detailOpen}
                onClose={handleDetailClose}
                article={selectedArticle}
                articleHistory={articleHistory}
                storeId={storeId}
                onFetchHistory={fetchArticleHistory}
            />
        </Box>
    );
}
