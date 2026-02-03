import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    TextField,
    InputAdornment,
    Button,
    Chip,
    Tooltip,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Stack,
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Link as LinkIcon,
    LinkOff as UnlinkIcon,
    Add as AddIcon,
    SignalCellularAlt as SignalIcon,
    Battery0Bar as BatteryIcon,
    Image as ImageIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLabelsStore } from '../infrastructure/labelsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { LinkLabelDialog } from './LinkLabelDialog';
import { LabelImagesDialog } from './LabelImagesDialog';
import { LabelImagePreview } from './LabelImagePreview';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Labels Management Page
 * Shows all labels and their linked articles from AIMS
 * Uses server-side AIMS credentials via the labels API
 */
export function LabelsPage() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isRtl = i18n.language === 'he';
    const { activeStoreId } = useAuthStore();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    
    const {
        labels,
        isLoading,
        error,
        searchQuery,
        filterLinkedOnly,
        selectedLabelImages,
        isLoadingImages,
        imagesError,
        aimsConfigured,
        aimsConnected,
        fetchLabels,
        fetchLabelImages,
        clearLabelImages,
        linkLabelToArticle,
        unlinkLabelFromArticle,
        checkAimsStatus,
        setSearchQuery,
        setFilterLinkedOnly,
        clearError,
    } = useLabelsStore();

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Link dialog
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [selectedLabelCode, setSelectedLabelCode] = useState('');

    // Images dialog
    const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
    const [imagesLabelCode, setImagesLabelCode] = useState('');

    // Check if AIMS is configured (via server)
    const isSolumConfigured = !!activeStoreId && (aimsConfigured || !error);

    // Filtered labels
    const filteredLabels = useMemo(() => {
        let result = [...labels];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (l) =>
                    l.labelCode.toLowerCase().includes(query) ||
                    l.articleId.toLowerCase().includes(query) ||
                    l.articleName?.toLowerCase().includes(query)
            );
        }

        // Filter linked only
        if (filterLinkedOnly) {
            result = result.filter((l) => l.articleId);
        }

        return result;
    }, [labels, searchQuery, filterLinkedOnly]);

    // Paginated labels
    const paginatedLabels = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredLabels.slice(start, start + rowsPerPage);
    }, [filteredLabels, page, rowsPerPage]);

    // Check AIMS status and fetch labels on mount
    useEffect(() => {
        if (activeStoreId) {
            checkAimsStatus(activeStoreId);
            fetchLabels(activeStoreId);
        }
    }, [activeStoreId]);

    const handleRefresh = () => {
        if (activeStoreId) {
            fetchLabels(activeStoreId);
        }
    };

    const handleOpenLinkDialog = (labelCode = '') => {
        setSelectedLabelCode(labelCode);
        setLinkDialogOpen(true);
    };

    const handleOpenImagesDialog = async (labelCode: string) => {
        setImagesLabelCode(labelCode);
        setImagesDialogOpen(true);
        if (activeStoreId) {
            await fetchLabelImages(activeStoreId, labelCode);
        }
    };

    const handleCloseImagesDialog = () => {
        setImagesDialogOpen(false);
        setImagesLabelCode('');
        clearLabelImages();
    };

    const handleLink = async (labelCode: string, articleId: string, templateName?: string) => {
        if (!activeStoreId) return;
        await linkLabelToArticle(activeStoreId, labelCode, articleId, templateName);
    };

    const handleUnlink = async (labelCode: string) => {
        const confirmed = await confirm({
            title: t('labels.unlink.confirmTitle', 'Unlink Label'),
            message: t('labels.unlink.confirmMessage', 'Are you sure you want to unlink this label from its article?'),

        });

        if (confirmed && activeStoreId) {
            try {
                await unlinkLabelFromArticle(activeStoreId, labelCode);
            } catch (err: any) {
                logger.error('LabelsPage', 'Failed to unlink label', { error: err.message });
            }
        }
    };

    const getSignalColor = (signal?: string) => {
        switch (signal?.toUpperCase()) {
            case 'EXCELLENT': return 'success';
            case 'GOOD': return 'success';
            case 'NORMAL': return 'warning';
            case 'BAD': return 'error';
            default: return 'default';
        }
    };

    const getBatteryColor = (battery?: string) => {
        switch (battery?.toUpperCase()) {
            case 'GOOD': return 'success';
            case 'LOW': return 'warning';
            case 'CRITICAL': return 'error';
            default: return 'default';
        }
    };

    // Not configured view
    if (!activeStoreId) {
        return (
            <Box sx={{ p: { xs: 1, md: 3 } }}>
                <Alert severity="warning">
                    {t('labels.noStore', 'No store selected. Please select a store to view labels.')}
                </Alert>
            </Box>
        );
    }

    // AIMS not configured on server
    if (!isSolumConfigured && error) {
        return (
            <Box sx={{ p: { xs: 1, md: 3 } }}>
                <Alert severity="warning">
                    {t('labels.notConfigured', 'SOLUM API is not configured. Please configure AIMS credentials in Company Settings.')}
                </Alert>
            </Box>
        );
    }

    // Mobile card view for a single label
    const MobileLabelCard = ({ label, index }: { label: typeof paginatedLabels[0]; index: number }) => (
        <Card 
            key={`${label.labelCode}-${label.articleId}-${index}`}
            sx={{ 
                mb: 1.5, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack gap={1.5}>
                    {/* Label Code */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                            {label.labelCode}
                        </Typography>
                        <Stack direction="row" gap={0.5}>
                            <Tooltip title={t('labels.images.view', 'View Images')}>
                                <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => handleOpenImagesDialog(label.labelCode)}
                                >
                                    <ImageIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {label.articleId ? (
                                <Tooltip title={t('labels.unlink.button', 'Unlink')}>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleUnlink(label.labelCode)}
                                    >
                                        <UnlinkIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Tooltip title={t('labels.link.button', 'Link')}>
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleOpenLinkDialog(label.labelCode)}
                                    >
                                        <LinkIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    </Stack>
                    
                    {/* Article Info */}
                    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                        {label.articleId ? (
                            <Chip
                                label={label.articleId}
                                size="small"
                                icon={<LinkIcon />}
                                variant="outlined"
                                color="primary"
                                sx={{ p: 1 }}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {t('labels.notLinked', 'Not linked')}
                            </Typography>
                        )}
                        {label.articleName && (
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                                {label.articleName}
                            </Typography>
                        )}
                    </Stack>
                    
                    {/* Status chips */}
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        {label.signal && (
                            <Chip
                                icon={<SignalIcon />}
                                label={label.signal}
                                size="small"
                                color={getSignalColor(label.signal) as any}
                                sx={{ p: 1 }}
                            />
                        )}
                        {label.battery && (
                            <Chip
                                icon={<BatteryIcon />}
                                label={label.battery}
                                size="small"
                                color={getBatteryColor(label.battery) as any}
                                sx={{ p: 1 }}
                            />
                        )}
                        {label.status && (
                            <Chip label={label.status} size="small" sx={{ p: 1 }} />
                        )}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, width: '100%' }}>
            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'stretch', sm: 'center' }, 
                mb: { xs: 2, md: 3 },
                gap: 2,
            }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
                    <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                        {t('labels.title', 'Labels Management')}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size={isMobile ? 'medium' : 'large'}
                        startIcon={<AddIcon />}    
                        onClick={() => handleOpenLinkDialog()}
                        fullWidth={isMobile}
                        sx={{ 
                            fontSize: { xs: '1rem', md: '1.25rem' },
                            py: { xs: 1, md: 1.5 },
                            px: { xs: 2, md: 4 },
                        }}
                    >
                        {t('labels.linkNew', 'Link Label')}
                    </Button>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={isLoading}
                    fullWidth={isMobile}
                >
                    {t('common.refresh', 'Refresh')}
                </Button>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
                <Stack 
                    direction={{ xs: 'column', md: 'row' }} 
                    gap={2} 
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TextField
                        placeholder={t('labels.search', 'Search labels or articles...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        fullWidth={isMobile}
                        sx={{ minWidth: { md: 300 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={filterLinkedOnly}
                                    onChange={(e) => setFilterLinkedOnly(e.target.checked)}
                                />
                            }
                            label={t('labels.filterLinkedOnly', 'Show linked only')}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ ml: { md: 'auto' }, pt: { xs: 1, md: 0, }, px: 5 }}>
                            {t('labels.totalCount', '{{count}} labels', { count: filteredLabels.length })}
                        </Typography>
                    </Stack>
                </Stack>
            </Paper>

            {/* Labels - Mobile Card View or Desktop Table */}
            {isMobile ? (
                /* Mobile Card View */
                <Box>
                    {isLoading && !paginatedLabels.length ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : paginatedLabels.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                                {t('labels.noLabels', 'No labels found')}
                            </Typography>
                        </Box>
                    ) : (
                        paginatedLabels.map((label, index) => (
                            <MobileLabelCard key={`${label.labelCode}-${label.articleId}-${index}`} label={label} index={index} />
                        ))
                    )}
                    <TablePagination
                        component="div"
                        count={filteredLabels.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                    />
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
                        <Table stickyHeader sx={{ minWidth: 900 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.labelCode', 'Label Code')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.articleId', 'Article ID')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.articleName', 'Article Name')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.signal', 'Signal')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.battery', 'Battery')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.status', 'Status')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.images', 'Images')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.actions', 'Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && !paginatedLabels.length ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLabels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {t('labels.noLabels', 'No labels found')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLabels.map((label, index) => (
                                        <TableRow key={`${label.labelCode}-${label.articleId}-${index}`} hover>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {label.labelCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.articleId ? (
                                                    <Chip
                                                        label={label.articleId}
                                                        size="small"
                                                        icon={<LinkIcon />}
                                                        variant="outlined"
                                                        sx={{ p: 1 }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {t('labels.notLinked', 'Not linked')}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.articleName || '-'}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.signal ? (
                                                    <Chip
                                                        icon={<SignalIcon />}
                                                        label={label.signal}
                                                        size="small"
                                                        color={getSignalColor(label.signal) as any}
                                                        sx={{ p: 1 }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.battery ? (
                                                    <Chip
                                                        icon={<BatteryIcon />}
                                                        label={label.battery}
                                                        size="small"
                                                        color={getBatteryColor(label.battery) as any}
                                                        sx={{ p: 1 }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.status ? (
                                                    <Chip label={label.status} size="small" sx={{ p: 1 }} />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left', py: 0.5, px: 1 }}>
                                                <LabelImagePreview
                                                    labelCode={label.labelCode}
                                                    storeId={activeStoreId!}
                                                    onClick={() => handleOpenImagesDialog(label.labelCode)}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left', py: 0.5, px: 1 }}>
                                                <Stack direction="row" gap={0.5} justifyContent={!isRtl ? 'flex-end' : 'flex-start'}>
                                                    {label.articleId ? (
                                                        <Tooltip title={t('labels.unlink.button', 'Unlink')}>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleUnlink(label.labelCode)}
                                                            >
                                                                <UnlinkIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title={t('labels.link.button', 'Link')}>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleOpenLinkDialog(label.labelCode)}
                                                            >
                                                                <LinkIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={filteredLabels.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </Paper>
            )}

            {/* Link Dialog */}
            <LinkLabelDialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                onLink={handleLink}
                initialLabelCode={selectedLabelCode}
            />

            {/* Images Dialog */}
            <LabelImagesDialog
                open={imagesDialogOpen}
                onClose={handleCloseImagesDialog}
                labelCode={imagesLabelCode}
                imagesData={selectedLabelImages}
                isLoading={isLoadingImages}
                error={imagesError}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog />
        </Box>
    );
}
