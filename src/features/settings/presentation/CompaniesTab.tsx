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
    Alert
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

// Lazy load dialogs - using default exports
const CompanyDialog = lazy(() => import('./CompanyDialog'));
const StoresDialog = lazy(() => import('./StoresDialog'));

/**
 * Companies Settings Tab Component
 * For PLATFORM_ADMIN users to manage companies
 */
export function CompaniesTab() {
    const { t } = useTranslation();
    const { isPlatformAdmin } = useAuthContext();
    const { confirm, ConfirmDialog } = useConfirmDialog();

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
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Check authorization
    if (!isPlatformAdmin) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {t('settings.companies.unauthorizedAccess', 'You do not have permission to manage companies.')}
            </Alert>
        );
    }

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
            console.error('Failed to fetch companies:', err);
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

    const handleDelete = async (company: Company) => {
        const storeCount = company._count?.stores || 0;
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
                console.error('Failed to delete company:', err);
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
                spacing={2}
                sx={{ mb: 2 }}
            >
                <Typography variant="h6" component="h2">
                    {t('settings.companies.title', 'Companies')}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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

                    {/* Add Button */}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {t('settings.companies.addCompany')}
                    </Button>
                </Stack>
            </Stack>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Companies Table */}
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
                                                sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
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
                                                    label={company._count?.stores || 0}
                                                    size="small"
                                                    onClick={() => handleManageStores(company)}
                                                    sx={{ cursor: 'pointer' }}
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
                                            />
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(company.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
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
                                                <Tooltip title={t('common.delete')}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(company)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
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
        </Box>
    );
}

export default CompaniesTab;
