/**
 * Stores Dialog
 * 
 * @description Dialog for managing stores within a company.
 * Lists all stores with options to add, edit, and delete.
 * Displays store details including sync status and entity counts.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    CircularProgress,
    Stack,
    Tooltip,
    Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import {
    companyService,
    type Company,
    type CompanyStore
} from '@shared/infrastructure/services/companyService';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

// Lazy load store dialog - using default export
const StoreDialog = lazy(() => import('./StoreDialog'));

interface StoresDialogProps {
    open: boolean;
    onClose: () => void;
    company: Company;
}

export function StoresDialog({ open, onClose, company }: StoresDialogProps) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // State
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Safe stores array to prevent undefined errors
    const safeStores = stores || [];

    // Dialog State
    const [storeDialogOpen, setStoreDialogOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<CompanyStore | null>(null);

    // Fetch stores
    const fetchStores = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await companyService.getStores(company.id);
            setStores(response?.stores || []);
        } catch (err) {
            console.error('[StoresDialog] Failed to fetch stores:', err);
            setError(t('settings.stores.fetchError'));
            setStores([]);
        } finally {
            setLoading(false);
        }
    }, [company.id, t]);

    useEffect(() => {
        if (open) {
            fetchStores();
        }
    }, [open, fetchStores]);

    // Handlers
    const handleAdd = () => {
        setSelectedStore(null);
        setStoreDialogOpen(true);
    };

    const handleEdit = (store: CompanyStore) => {
        setSelectedStore(store);
        setStoreDialogOpen(true);
    };

    const handleDelete = async (store: CompanyStore) => {
        const entityCount = 
            (store.spaceCount ?? store._count?.spaces ?? 0) + 
            (store.peopleCount ?? store._count?.people ?? 0) + 
            (store.conferenceRoomCount ?? store._count?.conferenceRooms ?? 0);

        const confirmMessage = entityCount > 0
            ? t('settings.stores.deleteConfirmWithData', { name: store.name, count: entityCount })
            : t('settings.stores.deleteConfirm', { name: store.name });

        const confirmed = await confirm({
            title: t('settings.stores.deleteTitle'),
            message: confirmMessage,
            confirmLabel: t('common.delete'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await companyService.deleteStore(store.id);
                fetchStores();
            } catch (err) {
                console.error('Failed to delete store:', err);
                setError(t('settings.stores.deleteError'));
            }
        }
    };

    const handleStoreDialogClose = () => {
        setStoreDialogOpen(false);
        setSelectedStore(null);
    };

    const handleStoreSave = async () => {
        setStoreDialogOpen(false);
        setSelectedStore(null);
        fetchStores();
        // Refresh auth to pick up updated effectiveFeatures for nav tabs
        useAuthStore.getState().validateSession();
    };

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    alignItems={{ xs: 'flex-start', sm: 'center' }} 
                    gap={1}
                    flexWrap="wrap"
                >
                    <Typography variant="h6">
                        {t('settings.stores.dialogTitle')}
                    </Typography>
                    <Chip label={company.code} size="small" variant="outlined" />
                    <Typography variant="body2" color="text.secondary">
                        {company.name}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Header with Add Button */}
                <Stack 
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between" 
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    gap={1}
                    sx={{ mb: 2 }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        {t('settings.stores.count', { count: safeStores.length })}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        size="small"
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {t('settings.stores.addStore')}
                    </Button>
                </Stack>

                {/* Stores Table */}
                <TableContainer sx={{ maxHeight: { xs: 300, sm: 400 } }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 80 }}>{t('settings.stores.code')}</TableCell>
                                <TableCell sx={{ minWidth: 120 }}>{t('settings.stores.name')}</TableCell>
                                <TableCell sx={{ minWidth: 100, display: { xs: 'none', sm: 'table-cell' } }}>{t('settings.stores.timezone')}</TableCell>
                                <TableCell align="center" sx={{ minWidth: 60 }}>{t('settings.stores.syncStatus')}</TableCell>
                                <TableCell align="center" sx={{ minWidth: 150, display: { xs: 'none', md: 'table-cell' } }}>{t('settings.stores.entities')}</TableCell>
                                <TableCell sx={{ minWidth: 150, display: { xs: 'none', lg: 'table-cell' } }}>{t('settings.stores.lastSync')}</TableCell>
                                <TableCell align="right" sx={{ minWidth: 100 }}>{t('common.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : safeStores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {t('settings.stores.noStores')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                safeStores.map((store) => (
                                    <TableRow key={store.id} hover>
                                        <TableCell>
                                            <Chip 
                                                label={store.code} 
                                                size="small" 
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: { xs: 100, sm: 150 } }}>
                                                {store.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {store.timezone}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip
                                                title={store.syncEnabled
                                                    ? t('settings.stores.syncEnabled')
                                                    : t('settings.stores.syncDisabled')}
                                            >
                                                {store.syncEnabled ? (
                                                    <SyncIcon color="success" fontSize="small" />
                                                ) : (
                                                    <SyncDisabledIcon color="disabled" fontSize="small" />
                                                )}
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                            <Stack 
                                                direction="row" 
                                                gap={0.5} 
                                                justifyContent="center"
                                                flexWrap="wrap"
                                            >
                                                <Tooltip title={t('settings.stores.spaces')}>
                                                    <Chip 
                                                        label={`🏷️ ${store.spaceCount ?? store._count?.spaces ?? 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                                <Tooltip title={t('settings.stores.people')}>
                                                    <Chip 
                                                        label={`👥 ${store.peopleCount ?? store._count?.people ?? 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                                <Tooltip title={t('settings.stores.conferenceRooms')}>
                                                    <Chip 
                                                        label={`🎤 ${store.conferenceRoomCount ?? store._count?.conferenceRooms ?? 0}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                            <Stack direction="row" alignItems="center" gap={0.5}>
                                                <AccessTimeIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    {formatDate(store.lastAimsSyncAt)}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" gap={0.5} justifyContent="flex-end">
                                                <Tooltip title={t('common.edit')}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(store)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('common.delete')}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(store)}
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
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose}>
                    {t('common.close')}
                </Button>
            </DialogActions>

            {/* Confirm Dialog */}
            <ConfirmDialog />

            {/* Store Dialog (Create/Edit) */}
            <Suspense fallback={null}>
                {storeDialogOpen && (
                    <StoreDialog
                        open={true}
                        onClose={handleStoreDialogClose}
                        onSave={handleStoreSave}
                        companyId={company.id}
                        store={selectedStore}
                    />
                )}
            </Suspense>
        </Dialog>
    );
}

export default StoresDialog;
