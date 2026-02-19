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
    Badge,
    Collapse,
    Fab,
    ClickAwayListener,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Link as LinkIcon,
    LinkOff as UnlinkIcon,
    Add as AddIcon,
    SignalCellularAlt as SignalIcon,
    Battery0Bar as BatteryIcon,
    Image as ImageIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTranslation } from 'react-i18next';
import { useLabelsStore } from '../infrastructure/labelsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { LinkLabelDialog } from './LinkLabelDialog';
import { LabelImagesDialog } from './LabelImagesDialog';
import { LabelImagePreview } from './LabelImagePreview';
import { AssignImageDialog } from './AssignImageDialog';
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
    const { activeStoreId, isAppReady } = useAuthStore();
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

    // Assign Image dialog
    const [assignImageDialogOpen, setAssignImageDialogOpen] = useState(false);
    const [assignImageLabelCode, setAssignImageLabelCode] = useState('');

    // Images dialog
    const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
    const [imagesLabelCode, setImagesLabelCode] = useState('');

    const [filtersOpen, setFiltersOpen] = useState(false);

    // Image preview toggle (off by default)
    const [showImagePreviews, setShowImagePreviews] = useState(false);

    // Mobile SpeedDial
    const [speedDialOpen, setSpeedDialOpen] = useState(false);

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

    // Check AIMS status and fetch labels when app is ready
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            checkAimsStatus(activeStoreId);
            fetchLabels(activeStoreId);
        }
        // checkAimsStatus and fetchLabels are Zustand store actions (stable references)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    const handleRefresh = () => {
        if (activeStoreId) {
            fetchLabels(activeStoreId);
        }
    };

    const handleOpenLinkDialog = (labelCode = '') => {
        setSelectedLabelCode(labelCode);
        setLinkDialogOpen(true);
    };

    const handleOpenAssignImageDialog = (labelCode = '') => {
        setAssignImageLabelCode(labelCode);
        setAssignImageDialogOpen(true);
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

    // Column count for table (dynamic based on image preview toggle)
    const colSpan = showImagePreviews ? 8 : 7;

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
    const MobileLabelCard = ({ label, index }: { label: typeof paginatedLabels[0]; index: number }) => {
        const isLinked = !!label.articleId;
        return (
            <Card
                key={`${label.labelCode}-${label.articleId}-${index}`}
                sx={{
                    mb: 1,
                    borderRadius: 2,
                    borderInlineStart: '4px solid',
                    borderColor: isLinked ? 'primary.main' : 'grey.300',
                }}
            >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack gap={1}>
                        {/* Row 1: Label code + image preview + actions */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" alignItems="center" gap={1}>
                                <Typography variant="body2" fontFamily="monospace" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                    {label.labelCode}
                                </Typography>
                                {showImagePreviews && (
                                    <LabelImagePreview
                                        labelCode={label.labelCode}
                                        storeId={activeStoreId!}
                                        onClick={() => handleOpenImagesDialog(label.labelCode)}
                                    />
                                )}
                            </Stack>
                            <Stack direction="row" gap={0}>
                                {isLinked ? (
                                    <IconButton
                                        size="medium"
                                        color="error"
                                        onClick={() => handleUnlink(label.labelCode)}
                                    >
                                        <UnlinkIcon />
                                    </IconButton>
                                ) : (
                                    <IconButton
                                        size="medium"
                                        color="primary"
                                        onClick={() => handleOpenLinkDialog(label.labelCode)}
                                    >
                                        <LinkIcon />
                                    </IconButton>
                                )}
                            </Stack>
                        </Stack>

                        {/* Row 2: Article info + status chips (compact) */}
                        <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                            {isLinked ? (
                                <Chip
                                    label={label.articleId}
                                    size="small"
                                    icon={<LinkIcon />}
                                    variant="outlined"
                                    color="primary"
                                    sx={{ height: 24, fontSize: '0.75rem' }}
                                />
                            ) : (
                                <Typography variant="caption" color="text.secondary">
                                    {t('labels.notLinked', 'Not linked')}
                                </Typography>
                            )}
                            {label.articleName && (
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                                    {label.articleName}
                                </Typography>
                            )}
                            {label.signal && (
                                <Chip
                                    icon={<SignalIcon />}
                                    label={label.signal}
                                    size="small"
                                    color={getSignalColor(label.signal) as any}
                                    sx={{ height: 22, fontSize: '0.65rem', '& .MuiChip-icon': { fontSize: 14 } }}
                                />
                            )}
                            {label.battery && (
                                <Chip
                                    icon={<BatteryIcon />}
                                    label={label.battery}
                                    size="small"
                                    color={getBatteryColor(label.battery) as any}
                                    sx={{ height: 22, fontSize: '0.65rem', '& .MuiChip-icon': { fontSize: 14 } }}
                                />
                            )}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, width: '100%' }}>
            {/* Header */}
            <Stack
                direction={isMobile ? 'row' : 'column'}
                justifyContent={isMobile ? 'space-between' : 'flex-start'}
                alignItems={isMobile ? 'center' : 'flex-start'}
                sx={{ mb: { xs: 2, md: 3 } }}
                gap={1}
            >
                <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.25rem', md: '2rem' }, fontWeight: 500 }}>
                    {t('labels.title', 'Labels Management')}
                </Typography>
                <Stack direction="row" gap={1}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenLinkDialog()}
                        sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                    >
                        {t('labels.linkNew', 'Link Label')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ImageIcon />}
                        onClick={() => handleOpenAssignImageDialog()}
                        sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                    >
                        {t('imageLabels.assignImage', 'Assign Image')}
                    </Button>
                    <Tooltip title={t('common.refresh', 'Refresh')}>
                        <IconButton
                            onClick={handleRefresh}
                            disabled={isLoading}
                            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="text"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={isLoading}
                        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                        {t('common.refresh', 'Refresh')}
                    </Button>
                </Stack>
            </Stack>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            {isMobile ? (
                <Box sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <IconButton
                            onClick={() => setFiltersOpen(!filtersOpen)}
                            color={(searchQuery || filterLinkedOnly) ? 'primary' : 'default'}
                        >
                            <Badge badgeContent={(searchQuery ? 1 : 0) + (filterLinkedOnly ? 1 : 0)} color="primary">
                                <FilterListIcon />
                            </Badge>
                        </IconButton>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            {filteredLabels.length} {t('labels.totalCountShort', 'labels')}
                        </Typography>
                    </Stack>
                    <Collapse in={filtersOpen}>
                        <Stack gap={1.5} sx={{ mt: 1 }}>
                            <TextField
                                placeholder={t('labels.search', 'Search labels or articles...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                size="small"
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={filterLinkedOnly}
                                        onChange={(e) => setFilterLinkedOnly(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                        {t('labels.filterLinkedOnly', 'Show linked only')}
                                    </Typography>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showImagePreviews}
                                        onChange={(e) => setShowImagePreviews(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                        {t('labels.showImagePreviews', 'Show image previews')}
                                    </Typography>
                                }
                            />
                        </Stack>
                    </Collapse>
                </Box>
            ) : (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack
                        direction="row"
                        gap={2}
                        alignItems="center"
                    >
                        <TextField
                            placeholder={t('labels.search', 'Search labels or articles...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{ minWidth: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: 'auto' }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={filterLinkedOnly}
                                        onChange={(e) => setFilterLinkedOnly(e.target.checked)}
                                        size="medium"
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        {t('labels.filterLinkedOnly', 'Show linked only')}
                                    </Typography>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showImagePreviews}
                                        onChange={(e) => setShowImagePreviews(e.target.checked)}
                                        size="medium"
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        {t('labels.showImagePreviews', 'Show image previews')}
                                    </Typography>
                                }
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.875rem' }}>
                                {filteredLabels.length} {t('labels.totalCountShort', 'labels')}
                            </Typography>
                        </Stack>
                    </Stack>
                </Paper>
            )}

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
                        labelRowsPerPage=""
                        sx={{ borderTop: '1px solid', borderColor: 'divider', '& .MuiTablePagination-toolbar': { minHeight: 48, px: 0.5 } }}
                    />
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: { sm: 'calc(100vh - 350px)', md: 'calc(100vh - 320px)' }, overflow: 'auto' }}>
                        <Table stickyHeader sx={{ minWidth: 750 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.labelCode', 'Label Code')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.articleId', 'Article ID')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.articleName', 'Article Name')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.signal', 'Signal')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.battery', 'Battery')}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.status', 'Status')}</TableCell>
                                    {showImagePreviews && (
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.images', 'Images')}</TableCell>
                                    )}
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.actions', 'Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && !paginatedLabels.length ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLabels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
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
                                            {showImagePreviews && (
                                                <TableCell sx={{ textAlign: isRtl ? 'right' : 'left', py: 0.5, px: 1 }}>
                                                    <LabelImagePreview
                                                        labelCode={label.labelCode}
                                                        storeId={activeStoreId!}
                                                        onClick={() => handleOpenImagesDialog(label.labelCode)}
                                                    />
                                                </TableCell>
                                            )}
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

            {/* Mobile FAB — Link Label + Assign Image (dashboard-style stacked buttons) */}
            {isMobile && (
                <ClickAwayListener onClickAway={() => speedDialOpen && setSpeedDialOpen(false)}>
                    <Box sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, insetInlineStart: { xs: 16, sm: 24 }, zIndex: 1050, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {/* Staggered action buttons */}
                        <Stack direction="column" spacing={1.5} sx={{ mb: 1.5, alignItems: 'stretch' }}>
                            {/* Link Label — primary, top button */}
                            <Box
                                sx={{
                                    opacity: speedDialOpen ? 1 : 0,
                                    transform: speedDialOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.85)',
                                    transition: speedDialOpen
                                        ? 'opacity 0.2s ease 0ms, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0ms'
                                        : 'opacity 0.15s ease 40ms, transform 0.15s ease 40ms',
                                    pointerEvents: speedDialOpen ? 'auto' : 'none',
                                }}
                            >
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<LinkIcon sx={{ fontSize: '1.5rem !important' }} />}
                                    onClick={() => {
                                        setSpeedDialOpen(false);
                                        handleOpenLinkDialog();
                                    }}
                                    sx={{
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 4,
                                        py: 2.5,
                                        fontSize: '1.3rem',
                                        minHeight: 72,
                                        boxShadow: (theme: any) =>
                                            `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                                    }}
                                >
                                    {t('labels.linkNew', 'Link Label')}
                                </Button>
                            </Box>

                            {/* Assign Image — secondary, closer to FAB */}
                            <Box
                                sx={{
                                    opacity: speedDialOpen ? 1 : 0,
                                    transform: speedDialOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.85)',
                                    transition: speedDialOpen
                                        ? 'opacity 0.2s ease 60ms, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) 60ms'
                                        : 'opacity 0.15s ease 0ms, transform 0.15s ease 0ms',
                                    pointerEvents: speedDialOpen ? 'auto' : 'none',
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<ImageIcon sx={{ fontSize: '1.5rem !important' }} />}
                                    onClick={() => {
                                        setSpeedDialOpen(false);
                                        handleOpenAssignImageDialog();
                                    }}
                                    sx={{
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 4,
                                        py: 2.5,
                                        fontSize: '1.3rem',
                                        minHeight: 72,
                                        borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.3),
                                        bgcolor: (theme: any) => alpha(theme.palette.background.paper, 0.85),
                                        backdropFilter: 'blur(12px)',
                                        '&:hover': {
                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    {t('imageLabels.assignImage', 'Assign Image')}
                                </Button>
                            </Box>
                        </Stack>

                        {/* FAB trigger */}
                        <Fab
                            color="primary"
                            size="large"
                            onClick={() => setSpeedDialOpen((prev) => !prev)}
                            sx={{
                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: speedDialOpen ? 'rotate(45deg)' : 'none',
                                width: 72,
                                height: 72,
                                '& .MuiSvgIcon-root': { fontSize: '2rem' },
                            }}
                        >
                            {speedDialOpen ? <CloseIcon /> : <AddIcon />}
                        </Fab>
                    </Box>
                </ClickAwayListener>
            )}

            {/* Link Dialog */}
            <LinkLabelDialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                onLink={handleLink}
                initialLabelCode={selectedLabelCode}
            />

            {/* Assign Image Dialog */}
            <AssignImageDialog
                open={assignImageDialogOpen}
                onClose={() => setAssignImageDialogOpen(false)}
                initialLabelCode={assignImageLabelCode}
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
