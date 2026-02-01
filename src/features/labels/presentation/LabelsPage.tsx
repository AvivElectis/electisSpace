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

} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Link as LinkIcon,
    LinkOff as UnlinkIcon,
    Add as AddIcon,
    SignalCellularAlt as SignalIcon,
    Battery0Bar as BatteryIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLabelsStore } from '../infrastructure/labelsStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { LinkLabelDialog } from './LinkLabelDialog';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { logger } from '@shared/infrastructure/services/logger';

/**
 * Labels Management Page
 * Shows all labels and their linked articles from AIMS
 */
export function LabelsPage() {
    const { t } = useTranslation();
    const solumConfig = useSettingsStore((state) => state.settings.solumConfig);
    const { confirm, ConfirmDialog } = useConfirmDialog();
    
    const {
        labels,
        isLoading,
        error,
        searchQuery,
        filterLinkedOnly,
        fetchLabels,
        linkLabelToArticle,
        unlinkLabelFromArticle,
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

    // Check if SOLUM is configured
    const isSolumConfigured = useMemo(() => {
        return !!(
            solumConfig?.tokens?.accessToken &&
            solumConfig.storeNumber &&
            solumConfig.companyName
        );
    }, [solumConfig]);

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

    // Fetch labels on mount
    useEffect(() => {
        if (isSolumConfigured && solumConfig) {
            fetchLabels(solumConfig, solumConfig.storeNumber!, solumConfig.tokens!.accessToken);
        }
    }, [isSolumConfigured]);

    const handleRefresh = () => {
        if (isSolumConfigured && solumConfig) {
            fetchLabels(solumConfig, solumConfig.storeNumber!, solumConfig.tokens!.accessToken);
        }
    };

    const handleOpenLinkDialog = (labelCode = '') => {
        setSelectedLabelCode(labelCode);
        setLinkDialogOpen(true);
    };

    const handleLink = async (labelCode: string, articleId: string, templateName?: string) => {
        if (!solumConfig) return;
        await linkLabelToArticle(
            solumConfig,
            solumConfig.storeNumber!,
            solumConfig.tokens!.accessToken,
            labelCode,
            articleId,
            templateName
        );
    };

    const handleUnlink = async (labelCode: string) => {
        const confirmed = await confirm({
            title: t('labels.unlink.confirmTitle', 'Unlink Label'),
            message: t('labels.unlink.confirmMessage', 'Are you sure you want to unlink this label from its article?'),

        });

        if (confirmed && solumConfig) {
            try {
                await unlinkLabelFromArticle(
                    solumConfig,
                    solumConfig.storeNumber!,
                    solumConfig.tokens!.accessToken,
                    labelCode
                );
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
    if (!isSolumConfigured) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">
                    {t('labels.notConfigured', 'SOLUM API is not configured. Please configure your SOLUM settings first.')}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4" component="h1">
                        {t('labels.title', 'Labels Management')}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenLinkDialog()}
                        sx={{ 
                            fontWeight: 'bold',
                            px: 3,
                        }}
                    >
                        {t('labels.linkNew', 'Link Label')}
                    </Button>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={isLoading}
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
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
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
                    <FormControlLabel
                        control={
                            <Switch
                                checked={filterLinkedOnly}
                                onChange={(e) => setFilterLinkedOnly(e.target.checked)}
                            />
                        }
                        label={t('labels.filterLinkedOnly', 'Show linked only')}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                        {t('labels.totalCount', '{{count}} labels', { count: filteredLabels.length })}
                    </Typography>
                </Box>
            </Paper>

            {/* Labels Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('labels.table.labelCode', 'Label Code')}</TableCell>
                                <TableCell>{t('labels.table.articleId', 'Article ID')}</TableCell>
                                <TableCell>{t('labels.table.articleName', 'Article Name')}</TableCell>
                                <TableCell>{t('labels.table.signal', 'Signal')}</TableCell>
                                <TableCell>{t('labels.table.battery', 'Battery')}</TableCell>
                                <TableCell>{t('labels.table.status', 'Status')}</TableCell>
                                <TableCell align="right">{t('labels.table.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading && !paginatedLabels.length ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedLabels.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {t('labels.noLabels', 'No labels found')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLabels.map((label, index) => (
                                    <TableRow key={`${label.labelCode}-${label.articleId}-${index}`} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {label.labelCode}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {label.articleId ? (
                                                <Chip
                                                    label={label.articleId}
                                                    size="small"
                                                    icon={<LinkIcon />}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('labels.notLinked', 'Not linked')}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {label.articleName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {label.signal ? (
                                                <Chip
                                                    icon={<SignalIcon />}
                                                    label={label.signal}
                                                    size="small"
                                                    color={getSignalColor(label.signal) as any}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {label.battery ? (
                                                <Chip
                                                    icon={<BatteryIcon />}
                                                    label={label.battery}
                                                    size="small"
                                                    color={getBatteryColor(label.battery) as any}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {label.status ? (
                                                <Chip label={label.status} size="small" />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'flex-end' }}>
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
                                            </Box>
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

            {/* Link Dialog */}
            <LinkLabelDialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                onLink={handleLink}
                initialLabelCode={selectedLabelCode}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog />
        </Box>
    );
}
