/**
 * Article Detail Dialog
 *
 * Shows article metadata, linked labels, update history, and raw data fields.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
    Stack,
} from '@mui/material';
import Close from '@mui/icons-material/Close';

interface ArticleDetailDialogProps {
    open: boolean;
    onClose: () => void;
    article: any;
    articleHistory: any;
    storeId: string;
    onFetchHistory: (articleId: string, page?: number) => void;
}

export function ArticleDetailDialog({ open, onClose, article, articleHistory, storeId: _storeId, onFetchHistory: _onFetchHistory }: ArticleDetailDialogProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0);

    if (!article) return null;

    const articleId = article.articleId || article.id || '';
    const articleName = article.articleName || article.name || '';
    const historyContent = articleHistory?.content || (Array.isArray(articleHistory) ? articleHistory : []);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('aims.articleDetail')}</Typography>
                    <IconButton onClick={onClose} size="small"><Close /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {/* Article metadata */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
                        {articleId}
                    </Typography>
                    {articleName && (
                        <Typography variant="body2" color="text.secondary">
                            {articleName}
                        </Typography>
                    )}
                    {article.nfcUrl && (
                        <Chip label={article.nfcUrl} size="small" sx={{ mt: 1 }} />
                    )}
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={t('aims.linkedLabels')} />
                    <Tab label={t('aims.articleHistory')} />
                    <Tab label={t('common.details') || 'Data'} />
                </Tabs>

                {/* Linked labels tab */}
                {tab === 0 && (
                    <Box sx={{ mt: 2 }}>
                        {Array.isArray(article.assignedLabel) && article.assignedLabel.length > 0 ? (
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {article.assignedLabel.map((label: string, i: number) => (
                                    <Chip
                                        key={i}
                                        label={label}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontFamily: 'monospace' }}
                                    />
                                ))}
                            </Stack>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                {t('aims.noArticles').replace(/articles/i, 'linked labels')}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Update history tab */}
                {tab === 1 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('aims.timestamp')}</TableCell>
                                    <TableCell>{t('aims.status')}</TableCell>
                                    <TableCell>{t('aims.labelCode')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {historyContent.map((entry: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            {entry.timestamp || entry.updateTime
                                                ? new Date(entry.timestamp || entry.updateTime).toLocaleString()
                                                : '\u2014'}
                                        </TableCell>
                                        <TableCell>
                                            {entry.status ? (
                                                <Chip
                                                    label={entry.status}
                                                    size="small"
                                                    variant="outlined"
                                                    color={
                                                        entry.status.toUpperCase() === 'SUCCESS' || entry.status.toUpperCase() === 'COMPLETED'
                                                            ? 'success'
                                                            : entry.status.toUpperCase() === 'FAILED' || entry.status.toUpperCase() === 'ERROR'
                                                                ? 'error'
                                                                : 'default'
                                                    }
                                                />
                                            ) : '\u2014'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {entry.labelCode || entry.label || entry.message || entry.detail || '\u2014'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {historyContent.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">
                                            <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                                                {t('aims.noHistory')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Data tab -- raw article data fields */}
                {tab === 2 && (
                    <Box sx={{ mt: 2, maxHeight: 350, overflow: 'auto' }}>
                        {article.data && typeof article.data === 'object' ? (
                            <Table size="small">
                                <TableBody>
                                    {Object.entries(article.data).map(([key, value]) => (
                                        <TableRow key={key}>
                                            <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                                            <TableCell>{String(value ?? '')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            // Show all top-level article fields as fallback
                            <Table size="small">
                                <TableBody>
                                    {Object.entries(article)
                                        .filter(([key]) => !['assignedLabel', 'data'].includes(key))
                                        .map(([key, value]) => (
                                            <TableRow key={key}>
                                                <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                                                <TableCell>
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
