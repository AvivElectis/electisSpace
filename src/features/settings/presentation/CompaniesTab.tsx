/**
 * Companies Settings Tab
 *
 * @description Tab for managing companies. Only visible to PLATFORM_ADMIN users.
 * Displays a list of companies with options to create, edit, and delete.
 * Includes company details, AIMS configuration status, and store counts.
 */
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Typography,
    Chip,
    TablePagination,
    CircularProgress,
    Stack,
    Tooltip,
    TextField,
    InputAdornment,
    Alert,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { companyService, type Company, type CompanyQueryParams } from '@shared/infrastructure/services/companyService';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { logger } from '@shared/infrastructure/services/logger';

// Lazy load dialogs - using default exports
const CompanyDialog = lazy(() => import('./CompanyDialog'));
const StoresDialog = lazy(() => import('./StoresDialog'));
const AIMSSettingsDialog = lazy(() => import('./AIMSSettingsDialog'));

/**
 * Companies Settings Tab Component
 * For PLATFORM_ADMIN users to manage companies
 */
export function CompaniesTab() {
    const { t } = useTranslation();
    const { isPlatformAdmin, isCompanyAdmin } = useAuthContext();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // State
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog State
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [storesDialogOpen, setStoresDialogOpen] = useState(false);
    const [aimsDialogOpen, setAimsDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Fetch Companies
    const fetchCompanies = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: CompanyQueryParams = {
                page: page + 1, // API is 1-indexed
                limit,
            };
            if (searchQuery) {
                params.search = searchQuery;
            }
            const response = await companyService.getAll(params);
            setCompanies(response.data);
            setTotal(response.pagination.total);
        } catch (err) {
            logger.error('Settings', 'Failed to fetch companies', { error: err instanceof Error ? err.message : String(err) });
            setError(t('settings.companies.fetchError', 'Failed to load companies'));
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchQuery, t]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    // Search handler with debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setPage(0); // Reset to first page on search
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Check authorization (after all hooks to avoid Rules of Hooks violation)
    if (!isPlatformAdmin && !isCompanyAdmin) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {t('settings.companies.unauthorizedAccess', 'You do not have permission to manage companies.')}
            </Alert>
        );
    }

    // Handlers
    const handleAdd = () => {
        setSelectedCompany(null);
        setCompanyDialogOpen(true);
    };

    const handleEdit = (company: Company) => {
        setSelectedCompany(company);
        setCompanyDialogOpen(true);
    };

    const handleManageStores = (company: Company) => {
        setSelectedCompany(company);
        setStoresDialogOpen(true);
    };

    const handleAimsSettings = (company: Company) => {
        setSelectedCompany(company);
        setAimsDialogOpen(true);
    };

    const handleAimsDialogClose = () => {
        setAimsDialogOpen(false);
        setSelectedCompany(null);
        fetchCompanies();
    };

    const handleDelete = async (company: Company) => {
        const storeCount = company.storeCount ?? company._count?.stores ?? 0;
        const confirmMessage = storeCount > 0
            ? t('settings.companies.deleteConfirmWithStores', `Are you sure you want to delete "${company.name}"? This will also delete ${storeCount} store(s) and all their data.`)
            : t('settings.companies.deleteConfirm', `Are you sure you want to delete "${company.name}"?`);

        const confirmed = await confirm({
            title: t('settings.companies.deleteTitle', 'Delete Company'),
            message: confirmMessage,
            confirmLabel: t('common.delete', 'Delete'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await companyService.delete(company.id);
                fetchCompanies();
            } catch (err) {
                logger.error('Settings', 'Failed to delete company', { error: err instanceof Error ? err.message : String(err) });
                setError(t('settings.companies.deleteError', 'Failed to delete company'));
            }
        }
    };

    const handleDialogClose = () => {
        setCompanyDialogOpen(false);
        setSelectedCompany(null);
    };

    const handleStoresDialogClose = () => {
        setStoresDialogOpen(false);
        setSelectedCompany(null);
        // Refresh list to get updated store counts
        fetchCompanies();
    };

    const handleSave = async () => {
        setCompanyDialogOpen(false);
        setSelectedCompany(null);
        fetchCompanies();
        // Refresh auth to pick up updated effectiveFeatures for nav tabs
        useAuthStore.getState().validateSession();
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Box>
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                sx={{ mb: 2 }}
            >
                <Typography variant="h6" component="h2">
                    {t('settings.companies.title', 'Companies')}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder={t('settings.companies.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: { xs: '100%', sm: 200 } }}
                    />

                    {/* Add Button - platform admins only */}
                    {isPlatformAdmin && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAdd}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            {t('settings.companies.addCompany')}
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Companies Table / Mobile Cards */}
            {isMobile ? (
                <>
                    {/* Mobile Card View */}
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : companies.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary">
                                {searchQuery
                                    ? t('settings.companies.noSearchResults')
                                    : t('settings.companies.noCompanies')}
                            </Typography>
                        </Box>
                    ) : (
                        companies.map((company) => (
                            <Card key={company.id} sx={{ mb: 1.5, overflow: 'hidden' }}>
                                <Box sx={{ height: 3, background: company.isActive ? `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})` : theme.palette.grey[300] }} />
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    {/* Header: Company Code + Name + Actions */}
                                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Chip label={company.code} size="small" variant="outlined" sx={{ px: 1.5, fontFamily: 'monospace', fontWeight: 'bold' }} />
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>{company.name}</Typography>
                                            {company.location && <Typography variant="caption" color="text.secondary">{company.location}</Typography>}
                                        </Box>
                                        <Stack direction="row" gap={0.5}>
                                            <Tooltip title={t('settings.aims.dialogTitle', 'AIMS Settings')}>
                                                <IconButton size="small" onClick={() => handleAimsSettings(company)}>
                                                    {company.aimsConfigured ? (
                                                        <CloudIcon fontSize="small" color="success" />
                                                    ) : (
                                                        <CloudOffIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('settings.companies.manageStores')}>
                                                <IconButton size="small" onClick={() => handleManageStores(company)}>
                                                    <StoreIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.edit')}>
                                                <IconButton size="small" onClick={() => handleEdit(company)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {isPlatformAdmin && (
                                                <Tooltip title={t('common.delete')}>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(company)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Stack>
                                    <Divider sx={{ my: 1.5 }} />
                                    {/* Details Row */}
                                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                                        <Chip
                                            icon={<StoreIcon fontSize="small" />}
                                            label={company.storeCount ?? company._count?.stores ?? 0}
                                            size="small"
                                            onClick={() => handleManageStores(company)}
                                            sx={{ px: 2, cursor: 'pointer' }}
                                        />
                                        <Tooltip title={company.aimsConfigured ? t('settings.companies.aimsConfigured') : t('settings.companies.aimsNotConfigured')}>
                                            <Chip
                                                icon={company.aimsConfigured ? <CloudIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />}
                                                label={t('settings.aims.dialogTitle', 'AIMS Settings')}
                                                size="small"
                                                onClick={() => handleAimsSettings(company)}
                                                color={company.aimsConfigured ? 'success' : 'default'}
                                                variant="outlined"
                                                sx={{ px: 2, cursor: 'pointer' }}
                                            />
                                        </Tooltip>
                                        <Chip
                                            label={company.isActive ? t('common.active') : t('common.inactive')}
                                            size="small"
                                            color={company.isActive ? 'success' : 'default'}
                                            variant={company.isActive ? 'filled' : 'outlined'}
                                            sx={{ px: 2 }}
                                        />
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {/* Mobile Pagination */}
                    <Paper sx={{ borderRadius: 3 }}>
                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={limit}
                            onRowsPerPageChange={(e) => {
                                setLimit(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            labelRowsPerPage=""
                            sx={{
                                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                    margin: 0,
                                },
                                '.MuiTablePagination-toolbar': {
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: 1,
                                },
                            }}
                        />
                    </Paper>
                </>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: { xs: 400, md: 500 } }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 80 }}>{t('settings.companies.code')}</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>{t('settings.companies.name')}</TableCell>
                                    <TableCell sx={{ minWidth: 100, display: { xs: 'none', md: 'table-cell' } }}>{t('settings.companies.location')}</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 80 }}>{t('settings.companies.stores')}</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 60, display: { xs: 'none', sm: 'table-cell' } }}>{t('settings.companies.aimsStatus')}</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 80 }}>{t('settings.companies.status')}</TableCell>
                                    <TableCell sx={{ minWidth: 100, display: { xs: 'none', lg: 'table-cell' } }}>{t('settings.companies.created')}</TableCell>
                                    <TableCell align="right" sx={{ minWidth: 100 }}>{t('common.actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <CircularProgress size={32} />
                                        </TableCell>
                                    </TableRow>
                                ) : companies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {searchQuery
                                                    ? t('settings.companies.noSearchResults')
                                                    : t('settings.companies.noCompanies')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    companies.map((company) => (
                                        <TableRow key={company.id} hover>
                                            <TableCell>
                                                <Chip
                                                    label={company.code}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ p: 1, px: 1.5, fontFamily: 'monospace', fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium" noWrap>
                                                    {company.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    {company.location || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title={t('settings.companies.manageStores')}>
                                                    <Chip
                                                        icon={<StoreIcon fontSize="small" />}
                                                        label={company.storeCount ?? company._count?.stores ?? 0}
                                                        size="small"
                                                        onClick={() => handleManageStores(company)}
                                                        sx={{ p: 1, px: 1.5, cursor: 'pointer' }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                <Tooltip
                                                    title={company.aimsConfigured
                                                        ? t('settings.companies.aimsConfigured')
                                                        : t('settings.companies.aimsNotConfigured')}
                                                >
                                                    {company.aimsConfigured ? (
                                                        <CloudIcon color="success" fontSize="small" />
                                                    ) : (
                                                        <CloudOffIcon color="disabled" fontSize="small" />
                                                    )}
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={company.isActive
                                                        ? t('common.active')
                                                        : t('common.inactive')}
                                                    size="small"
                                                    color={company.isActive ? 'success' : 'default'}
                                                    variant={company.isActive ? 'filled' : 'outlined'}
                                                    sx={{ p: 1, px: 1.5 }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(company.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" gap={0.5} justifyContent="flex-end">
                                                    <Tooltip title={t('settings.aims.dialogTitle', 'AIMS Settings')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleAimsSettings(company)}
                                                        >
                                                            {company.aimsConfigured ? (
                                                                <CloudIcon fontSize="small" color="success" />
                                                            ) : (
                                                                <CloudOffIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('settings.companies.manageStores')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleManageStores(company)}
                                                        >
                                                            <StoreIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('common.edit')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(company)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {isPlatformAdmin && (
                                                        <Tooltip title={t('common.delete')}>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDelete(company)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
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

                    {/* Pagination */}
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={limit}
                        onRowsPerPageChange={(e) => {
                            setLimit(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={t('common.rowsPerPage')}
                        sx={{
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                margin: 0,
                            },
                            '.MuiTablePagination-toolbar': {
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 1,
                            },
                        }}
                    />
                </Paper>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog />

            {/* Company Dialog (Create/Edit) */}
            <Suspense fallback={null}>
                {companyDialogOpen && (
                    <CompanyDialog
                        open={true}
                        onClose={handleDialogClose}
                        onSave={handleSave}
                        company={selectedCompany}
                    />
                )}
            </Suspense>

            {/* Stores Dialog */}
            <Suspense fallback={null}>
                {storesDialogOpen && selectedCompany && (
                    <StoresDialog
                        open={true}
                        onClose={handleStoresDialogClose}
                        company={selectedCompany}
                    />
                )}
            </Suspense>

            {/* AIMS Settings Dialog */}
            <Suspense fallback={null}>
                {aimsDialogOpen && selectedCompany && (
                    <AIMSSettingsDialog
                        open={true}
                        onClose={handleAimsDialogClose}
                        company={selectedCompany}
                        onSave={fetchCompanies}
                    />
                )}
            </Suspense>
        </Box>
    );
}

export default CompaniesTab;
