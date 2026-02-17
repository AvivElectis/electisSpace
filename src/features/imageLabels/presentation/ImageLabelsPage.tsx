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
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Stack,
    Fab,
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Image as ImageIcon,
    Add as AddIcon,
    SignalCellularAlt as SignalIcon,
    Battery0Bar as BatteryIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLabelsStore } from '@features/labels/infrastructure/labelsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { LabelImagePreview } from '@features/labels/presentation/LabelImagePreview';
import { LabelImagesDialog } from '@features/labels/presentation/LabelImagesDialog';
import { AssignImageDialog } from './AssignImageDialog';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Image Labels Page
 * Shows all labels with image previews and allows assigning images directly to labels.
 * Reuses existing labels store and label image preview components.
 */
export function ImageLabelsPage() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isRtl = i18n.language === 'he';
    const { activeStoreId, isAppReady } = useAuthStore();

    const {
        labels,
        isLoading,
        error,
        selectedLabelImages,
        isLoadingImages,
        imagesError,
        fetchLabels,
        fetchLabelImages,
        clearLabelImages,
        checkAimsStatus,
        clearError,
    } = useLabelsStore();

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignLabelCode, setAssignLabelCode] = useState('');
    const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
    const [imagesLabelCode, setImagesLabelCode] = useState('');

    // Filtered labels
    const filteredLabels = useMemo(() => {
        if (!searchQuery) return labels;
        const query = searchQuery.toLowerCase();
        return labels.filter(
            (l) =>
                l.labelCode.toLowerCase().includes(query) ||
                l.articleId?.toLowerCase().includes(query) ||
                l.articleName?.toLowerCase().includes(query)
        );
    }, [labels, searchQuery]);

    // Paginated labels
    const paginatedLabels = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredLabels.slice(start, start + rowsPerPage);
    }, [filteredLabels, page, rowsPerPage]);

    // Fetch labels on mount
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            checkAimsStatus(activeStoreId);
            fetchLabels(activeStoreId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    const handleRefresh = () => {
        if (activeStoreId) {
            fetchLabels(activeStoreId);
        }
    };

    const handleOpenAssignDialog = (labelCode = '') => {
        setAssignLabelCode(labelCode);
        setAssignDialogOpen(true);
    };

    const handleAssignSuccess = () => {
        logger.info('ImageLabelsPage', 'Image assigned, refreshing labels');
        if (activeStoreId) {
            fetchLabels(activeStoreId);
        }
    };

    const handleOpenImagesDialog = async (labelCode: string) => {
        setImagesLabelCode(labelCode);
        setImagesDialogOpen(true);
        if (activeStoreId) {
            try {
                await fetchLabelImages(activeStoreId, labelCode);
            } catch (err: any) {
                logger.error('ImageLabelsPage', 'Failed to fetch label images', { error: err.message });
            }
        }
    };

    const handleCloseImagesDialog = () => {
        setImagesDialogOpen(false);
        setImagesLabelCode('');
        clearLabelImages();
    };

    const getSignalColor = (signal?: string) => {
        switch (signal?.toUpperCase()) {
            case 'EXCELLENT': case 'GOOD': return 'success';
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

    // No store selected
    if (!activeStoreId) {
        return (
            <Box sx={{ p: { xs: 1, md: 3 } }}>
                <Alert severity="warning">
                    {t('imageLabels.noStore', 'No store selected. Please select a store to view image labels.')}
                </Alert>
            </Box>
        );
    }

    // Mobile card view
    const MobileLabelCard = ({ label, index }: { label: typeof paginatedLabels[0]; index: number }) => (
        <Card
            key={`${label.labelCode}-${index}`}
            sx={{
                mb: 1,
                borderRadius: 2,
                borderInlineStart: '4px solid',
                borderColor: 'primary.main',
            }}
        >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack gap={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2" fontFamily="monospace" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                {label.labelCode}
                            </Typography>
                            <LabelImagePreview
                                labelCode={label.labelCode}
                                storeId={activeStoreId!}
                                onClick={() => handleOpenImagesDialog(label.labelCode)}
                            />
                        </Stack>
                        <Tooltip title={t('imageLabels.assignImage', 'Assign Image')}>
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenAssignDialog(label.labelCode)}
                            >
                                <ImageIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                        {label.status && (
                            <Chip label={label.status} size="small" sx={{ height: 22, fontSize: '0.65rem' }} />
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
                    {t('imageLabels.title', 'Image Labels')}
                </Typography>
                <Stack direction="row" gap={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        size={isMobile ? 'small' : 'large'}
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAssignDialog()}
                        sx={{
                            fontSize: { xs: '0.8rem', md: '1.25rem' },
                            whiteSpace: 'nowrap',
                            display: { xs: 'none', md: 'inline-flex' },
                        }}
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
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={isLoading}
                        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                        {t('common.refresh', 'Refresh')}
                    </Button>
                </Stack>
            </Stack>

            {/* Error */}
            {error && (
                <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" gap={2} alignItems="center">
                    <TextField
                        placeholder={t('imageLabels.search', 'Search labels...')}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        size="small"
                        sx={{ minWidth: { xs: '100%', md: 300 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
                        {t('labels.totalCount', '{{count}} labels', { count: filteredLabels.length })}
                    </Typography>
                </Stack>
            </Paper>

            {/* Labels - Mobile or Desktop */}
            {isMobile ? (
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
                            <MobileLabelCard key={`${label.labelCode}-${index}`} label={label} index={index} />
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
                        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                    />
                </Box>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
                        <Table stickyHeader sx={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('imageLabels.table.preview', 'Preview')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.labelCode', 'Label Code')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.status', 'Status')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.signal', 'Signal')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.battery', 'Battery')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{t('labels.table.actions', 'Actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && !paginatedLabels.length ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLabels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {t('labels.noLabels', 'No labels found')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLabels.map((label, index) => (
                                        <TableRow key={`${label.labelCode}-${index}`} hover>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left', py: 0.5, px: 1 }}>
                                                <LabelImagePreview
                                                    labelCode={label.labelCode}
                                                    storeId={activeStoreId!}
                                                    onClick={() => handleOpenImagesDialog(label.labelCode)}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {label.labelCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                                                {label.status ? (
                                                    <Chip label={label.status} size="small" sx={{ p: 1 }} />
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                                )}
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
                                            <TableCell sx={{ textAlign: isRtl ? 'right' : 'left', py: 0.5, px: 1 }}>
                                                <Tooltip title={t('imageLabels.assignImage', 'Assign Image')}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenAssignDialog(label.labelCode)}
                                                    >
                                                        <ImageIcon />
                                                    </IconButton>
                                                </Tooltip>
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

            {/* Mobile FAB */}
            {isMobile && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={() => handleOpenAssignDialog()}
                    sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1050 }}
                >
                    <AddIcon sx={{ mr: 1 }} />
                    {t('imageLabels.assignImage', 'Assign Image')}
                </Fab>
            )}

            {/* Assign Image Dialog */}
            <AssignImageDialog
                open={assignDialogOpen}
                onClose={() => setAssignDialogOpen(false)}
                onSuccess={handleAssignSuccess}
                initialLabelCode={assignLabelCode}
            />

            {/* Images Dialog (reused from labels feature) */}
            <LabelImagesDialog
                open={imagesDialogOpen}
                onClose={handleCloseImagesDialog}
                labelCode={imagesLabelCode}
                imagesData={selectedLabelImages}
                isLoading={isLoadingImages}
                error={imagesError}
            />
        </Box>
    );
}
